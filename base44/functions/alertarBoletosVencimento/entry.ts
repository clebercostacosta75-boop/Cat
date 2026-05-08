import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import nodemailer from 'npm:nodemailer@6.9.10';

const ASAAS_BASE_URL = "https://api.asaas.com/v3";
const API_KEY = Deno.env.get("ASAAS_API_KEY");

const asaasHeaders = {
  "Content-Type": "application/json",
  "access_token": API_KEY,
};

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatMoney(value) {
  return `R$ ${parseFloat(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function sendEmail(transporter, { to, subject, body }) {
  if (!to) return;
  await transporter.sendMail({
    from: `"CAT Cursos" <${Deno.env.get("UOL_SMTP_EMAIL")}>`,
    to,
    subject,
    html: body,
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const smtpEmail = Deno.env.get("UOL_SMTP_EMAIL");
    const smtpPassword = Deno.env.get("UOL_SMTP_PASSWORD");

    if (!smtpEmail || !smtpPassword) {
      return Response.json({ error: "SMTP credentials not configured (UOL_SMTP_EMAIL / UOL_SMTP_PASSWORD)" }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.uol.com.br",
      port: 587,
      secure: false,
      auth: { user: smtpEmail, pass: smtpPassword },
    });

    // Busca admins para cópia
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminEmails = allUsers
      .filter(u => u.role === "admin" || u.role === "Administrador Master" || u.role === "gestor_master")
      .map(u => u.email)
      .filter(Boolean);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);

    const todayStr = today.toISOString().split("T")[0];
    const in7Str = in7Days.toISOString().split("T")[0];

    // Busca cobranças pendentes (próximos 7 dias) e atrasadas
    const [pendingRes, overdueRes] = await Promise.all([
      fetch(`${ASAAS_BASE_URL}/payments?status=PENDING&dueDateGe=${todayStr}&dueDateLe=${in7Str}&limit=100`, { headers: asaasHeaders }),
      fetch(`${ASAAS_BASE_URL}/payments?status=OVERDUE&limit=100`, { headers: asaasHeaders }),
    ]);

    const pendingData = await pendingRes.json();
    const overdueData = await overdueRes.json();

    const pendingCharges = pendingData.data || [];
    const overdueCharges = overdueData.data || [];

    let emailsSent = 0;
    const errors = [];

    // ─── Cobranças próximas do vencimento ────────────────────────────────────
    for (const charge of pendingCharges) {
      const dueDate = new Date(charge.dueDate + "T00:00:00");
      const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));

      if (![1, 3, 7].includes(diffDays)) continue;

      const label = diffDays === 1 ? "amanhã" : `em ${diffDays} dias`;

      let customer = {};
      try {
        const custRes = await fetch(`${ASAAS_BASE_URL}/customers/${charge.customer}`, { headers: asaasHeaders });
        customer = await custRes.json();
      } catch (e) {
        errors.push(`Erro ao buscar cliente ${charge.customer}: ${e.message}`);
        continue;
      }

      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">⚠️ Lembrete de Vencimento</h2>
          </div>
          <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p>Olá, <strong>${customer.name || "Aluno"}</strong>!</p>
            <p>Sua cobrança vence <strong>${label}</strong> (${formatDate(charge.dueDate)}).</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr style="background: #f9fafb;">
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><strong>Valor</strong></td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${formatMoney(charge.value)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><strong>Vencimento</strong></td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${formatDate(charge.dueDate)}</td>
              </tr>
              <tr style="background: #f9fafb;">
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><strong>Descrição</strong></td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${charge.description || "—"}</td>
              </tr>
            </table>
            ${charge.invoiceUrl ? `<p><a href="${charge.invoiceUrl}" style="background: #1d4ed8; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Visualizar / Pagar Fatura</a></p>` : ""}
            <p style="color: #6b7280; font-size: 12px;">CAT Cursos e Treinamentos</p>
          </div>
        </div>
      `;

      // E-mail para o aluno
      if (customer.email) {
        try {
          await sendEmail(transporter, {
            to: customer.email,
            subject: `⚠️ Seu boleto vence ${label} — ${formatMoney(charge.value)}`,
            body: emailBody,
          });
          emailsSent++;
        } catch (e) {
          errors.push(`Erro ao enviar e-mail para aluno ${customer.email}: ${e.message}`);
        }
      }

      // Cópia para admins
      for (const adminEmail of adminEmails) {
        try {
          await sendEmail(transporter, {
            to: adminEmail,
            subject: `[CAT] Boleto de ${customer.name} vence ${label}`,
            body: emailBody,
          });
          emailsSent++;
        } catch (e) {
          errors.push(`Erro ao enviar e-mail admin ${adminEmail}: ${e.message}`);
        }
      }
    }

    // ─── Cobranças atrasadas ──────────────────────────────────────────────────
    for (const charge of overdueCharges) {
      let customer = {};
      try {
        const custRes = await fetch(`${ASAAS_BASE_URL}/customers/${charge.customer}`, { headers: asaasHeaders });
        customer = await custRes.json();
      } catch (e) {
        errors.push(`Erro ao buscar cliente ${charge.customer}: ${e.message}`);
        continue;
      }

      const dueDate = new Date(charge.dueDate + "T00:00:00");
      const daysLate = Math.round((today - dueDate) / (1000 * 60 * 60 * 24));

      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">🔴 Boleto em Atraso</h2>
          </div>
          <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p>Olá, <strong>${customer.name || "Aluno"}</strong>!</p>
            <p>Sua cobrança está <strong>atrasada há ${daysLate} dia(s)</strong>. Por favor, regularize o quanto antes.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr style="background: #fef2f2;">
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><strong>Valor</strong></td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${formatMoney(charge.value)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><strong>Vencimento</strong></td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${formatDate(charge.dueDate)}</td>
              </tr>
              <tr style="background: #fef2f2;">
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><strong>Dias em atraso</strong></td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #dc2626;"><strong>${daysLate} dia(s)</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><strong>Descrição</strong></td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${charge.description || "—"}</td>
              </tr>
            </table>
            ${charge.invoiceUrl ? `<p><a href="${charge.invoiceUrl}" style="background: #dc2626; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Regularizar Pagamento</a></p>` : ""}
            <p style="color: #6b7280; font-size: 12px;">CAT Cursos e Treinamentos</p>
          </div>
        </div>
      `;

      if (customer.email) {
        try {
          await sendEmail(transporter, {
            to: customer.email,
            subject: `🔴 Boleto em atraso — ${daysLate} dia(s) — ${formatMoney(charge.value)}`,
            body: emailBody,
          });
          emailsSent++;
        } catch (e) {
          errors.push(`Erro ao enviar e-mail para aluno ${customer.email}: ${e.message}`);
        }
      }

      for (const adminEmail of adminEmails) {
        try {
          await sendEmail(transporter, {
            to: adminEmail,
            subject: `[CAT] ATRASO: Boleto de ${customer.name} — ${daysLate} dia(s)`,
            body: emailBody,
          });
          emailsSent++;
        } catch (e) {
          errors.push(`Erro ao enviar e-mail admin ${adminEmail}: ${e.message}`);
        }
      }
    }

    return Response.json({
      success: true,
      pendingAlertas: pendingCharges.length,
      overdueAlertas: overdueCharges.length,
      emailsSent,
      errors,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[alertarBoletosVencimento] Erro:', error);
    return Response.json({
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
});