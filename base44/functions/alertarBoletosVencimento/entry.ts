import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ASAAS_BASE_URL = "https://api.asaas.com/v3";
const API_KEY = Deno.env.get("ASAAS_API_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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

function limparTelefone(tel) {
  if (!tel) return "";
  let n = tel.replace(/\D/g, "");
  if (!n.startsWith("55")) n = "55" + n;
  return n;
}

function montarMensagemWhatsApp({ nome, curso, valor, vencimento, diasAtraso, tipo }) {
  if (tipo === "proximo_vencimento") {
    return `Olá, ${nome}.\n\nA CAT CURSOS informa que existe uma parcela próxima do vencimento referente ao curso ${curso}.\n\nValor: ${formatMoney(valor)}\nVencimento: ${formatDate(vencimento)}\n\nPara evitar atraso, regularize sua parcela até a data informada.\n\nSetor Financeiro CAT CURSOS:\n(91) 99182-9203`;
  }
  return `Olá, ${nome}.\n\nAqui é da CAT CURSOS.\n\nIdentificamos uma pendência financeira referente à sua matrícula no curso ${curso}.\n\nDados da pendência:\n\nValor: ${formatMoney(valor)}\nVencimento: ${formatDate(vencimento)}\nStatus: Vencido\nDias em atraso: ${diasAtraso}\n\nPara regularizar sua situação, fale com nosso setor financeiro:\n\nWhatsApp Financeiro:\n(91) 99182-9203\n\nCaso o pagamento já tenha sido realizado, favor desconsiderar esta mensagem e enviar o comprovante para atualização do sistema.\n\nCAT CURSOS\nSetor Financeiro`;
}

async function sendEmail({ to, subject, html }) {
  if (!to || !RESEND_API_KEY) return null;
  // Tenta com domínio personalizado primeiro, depois fallback para domínio padrão Resend
  const fromOptions = [
    "CAT Cursos <noreply@catcursos.com.br>",
    "CAT Cursos <onboarding@resend.dev>",
  ];
  for (const from of fromOptions) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (res.ok) return res.json();
    const err = await res.text();
    // Se erro não for de domínio, lança imediatamente
    if (!err.includes("domain") && !err.includes("from") && !err.includes("outside the app") && !err.includes("not verified")) {
      throw new Error(`Resend error: ${err}`);
    }
    console.log(`Fallback de remetente: ${from} falhou, tentando próximo...`);
  }
  throw new Error("Resend: nenhum remetente funcionou. Verifique o domínio catcursos.com.br no painel Resend.");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const resendConfigurado = !!RESEND_API_KEY;
    console.log(`RESEND_API_KEY configurada: ${resendConfigurado ? "Sim" : "Não"}`);

    // Usa asServiceRole para buscar usuários pois pode ser chamado por automação (sem sessão)
    let adminEmails = [];
    try {
      const allUsers = await base44.asServiceRole.entities.User.list();
      adminEmails = allUsers
        .filter(u => u.role === "admin" || u.role === "Administrador Master" || u.role === "gestor_master")
        .map(u => u.email)
        .filter(Boolean);
    } catch (e) {
      console.log("Aviso: não foi possível buscar admins:", e.message);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);
    const todayStr = today.toISOString().split("T")[0];
    const in7Str = in7Days.toISOString().split("T")[0];

    const [pendingRes, overdueRes] = await Promise.all([
      fetch(`${ASAAS_BASE_URL}/payments?status=PENDING&dueDateGe=${todayStr}&dueDateLe=${in7Str}&limit=100`, { headers: asaasHeaders }),
      fetch(`${ASAAS_BASE_URL}/payments?status=OVERDUE&limit=100`, { headers: asaasHeaders }),
    ]);

    const pendingData = await pendingRes.json();
    const overdueData = await overdueRes.json();
    const pendingCharges = pendingData.data || [];
    const overdueCharges = overdueData.data || [];

    // Buscar notificações geradas hoje para checar duplicidade
    const notificacoesHoje = await base44.asServiceRole.entities.FinancialNotification.filter({});
    const jaNotificadosHoje = new Set(
      notificacoesHoje
        .filter(n => n.data_geracao && n.data_geracao.startsWith(todayStr) && n.status !== "Ignorada por duplicidade")
        .map(n => n.boleto_id)
        .filter(Boolean)
    );

    let notificacoesGeradas = 0;
    let emailsEnviados = 0;
    const errors = [];

    // ─── Cobranças próximas do vencimento ────────────────────────────────────
    for (const charge of pendingCharges) {
      const dueDate = new Date(charge.dueDate + "T00:00:00");
      const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));
      if (![1, 3, 7].includes(diffDays)) continue;

      // Checar duplicidade
      if (jaNotificadosHoje.has(charge.id)) {
        await base44.asServiceRole.entities.FinancialNotification.create({
          boleto_id: charge.id,
          aluno_nome: "—",
          tipo: "proximo_vencimento",
          status: "Ignorada por duplicidade",
          observacoes: "Já existe notificação gerada hoje para este boleto.",
          data_geracao: new Date().toISOString(),
        });
        continue;
      }

      let customer = {};
      try {
        const custRes = await fetch(`${ASAAS_BASE_URL}/customers/${charge.customer}`, { headers: asaasHeaders });
        customer = await custRes.json();
      } catch (e) {
        errors.push(`Erro ao buscar cliente ${charge.customer}: ${e.message}`);
        continue;
      }

      const label = diffDays === 1 ? "amanhã" : `em ${diffDays} dias`;
      const mensagemWA = montarMensagemWhatsApp({
        nome: customer.name || "Aluno",
        curso: charge.description || "curso contratado",
        valor: charge.value,
        vencimento: charge.dueDate,
        diasAtraso: 0,
        tipo: "proximo_vencimento",
      });

      const telLimpo = limparTelefone(customer.mobilePhone || customer.phone || "");
      const waLink = telLimpo ? `https://wa.me/${telLimpo}?text=${encodeURIComponent(mensagemWA)}` : null;

      // Criar notificação interna
      let statusNotif = "Pendente de envio";
      let canalEnvio = "portal";

      if (!resendConfigurado) {
        statusNotif = "Pendente por falta de RESEND_API_KEY";
        console.log(`RESEND_API_KEY não configurada. E-mail não enviado para ${customer.email}. Alerta interno e WhatsApp manual disponíveis.`);
      }

      await base44.asServiceRole.entities.FinancialNotification.create({
        aluno_nome: customer.name || "Aluno",
        aluno_email: customer.email || "",
        aluno_whatsapp: customer.mobilePhone || customer.phone || "",
        curso_nome: charge.description || "Curso",
        boleto_id: charge.id,
        valor_vencido: charge.value,
        data_vencimento: charge.dueDate,
        dias_atraso: 0,
        tipo: "proximo_vencimento",
        canal_envio: canalEnvio,
        status: statusNotif,
        mensagem_whatsapp: mensagemWA,
        data_geracao: new Date().toISOString(),
        invoice_url: charge.invoiceUrl || "",
      });
      notificacoesGeradas++;

      // Envio por e-mail (apenas se Resend configurado)
      if (resendConfigurado && customer.email) {
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">⚠️ Lembrete de Vencimento</h2>
            </div>
            <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p>Olá, <strong>${customer.name || "Aluno"}</strong>!</p>
              <p>Sua cobrança vence <strong>${label}</strong> (${formatDate(charge.dueDate)}).</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr style="background: #f9fafb;"><td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><strong>Valor</strong></td><td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${formatMoney(charge.value)}</td></tr>
                <tr><td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><strong>Vencimento</strong></td><td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${formatDate(charge.dueDate)}</td></tr>
              </table>
              ${charge.invoiceUrl ? `<p><a href="${charge.invoiceUrl}" style="background: #1d4ed8; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Visualizar / Pagar Fatura</a></p>` : ""}
              <p style="color: #6b7280; font-size: 12px;">CAT Cursos e Treinamentos</p>
            </div>
          </div>`;
        try {
          await sendEmail({ to: customer.email, subject: `⚠️ Seu boleto vence ${label} — ${formatMoney(charge.value)}`, html });
          emailsEnviados++;
        } catch (e) {
          errors.push(`Erro e-mail ${customer.email}: ${e.message}`);
        }
        for (const adminEmail of adminEmails) {
          try {
            await sendEmail({ to: adminEmail, subject: `[CAT] Boleto de ${customer.name} vence ${label}`, html });
          } catch (e) { /* silencioso para admins */ }
        }
      }
    }

    // ─── Cobranças atrasadas ──────────────────────────────────────────────────
    for (const charge of overdueCharges) {
      if (jaNotificadosHoje.has(charge.id)) {
        await base44.asServiceRole.entities.FinancialNotification.create({
          boleto_id: charge.id,
          aluno_nome: "—",
          tipo: "boleto_vencido",
          status: "Ignorada por duplicidade",
          observacoes: "Já existe notificação gerada hoje para este boleto.",
          data_geracao: new Date().toISOString(),
        });
        continue;
      }

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

      const mensagemWA = montarMensagemWhatsApp({
        nome: customer.name || "Aluno",
        curso: charge.description || "curso contratado",
        valor: charge.value,
        vencimento: charge.dueDate,
        diasAtraso: daysLate,
        tipo: "boleto_vencido",
      });

      const telLimpo = limparTelefone(customer.mobilePhone || customer.phone || "");

      let statusNotif = "Pendente de envio";
      if (!resendConfigurado) {
        statusNotif = "Pendente por falta de RESEND_API_KEY";
        console.log(`RESEND_API_KEY não configurada. E-mail não enviado para ${customer.email}. WhatsApp manual disponível.`);
      }

      await base44.asServiceRole.entities.FinancialNotification.create({
        aluno_nome: customer.name || "Aluno",
        aluno_email: customer.email || "",
        aluno_whatsapp: customer.mobilePhone || customer.phone || "",
        curso_nome: charge.description || "Curso",
        boleto_id: charge.id,
        valor_vencido: charge.value,
        data_vencimento: charge.dueDate,
        dias_atraso: daysLate,
        tipo: "boleto_vencido",
        canal_envio: "portal",
        status: statusNotif,
        mensagem_whatsapp: mensagemWA,
        data_geracao: new Date().toISOString(),
        invoice_url: charge.invoiceUrl || "",
      });
      notificacoesGeradas++;

      if (resendConfigurado && customer.email) {
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">🔴 Boleto em Atraso</h2>
            </div>
            <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p>Olá, <strong>${customer.name || "Aluno"}</strong>!</p>
              <p>Sua cobrança está <strong>atrasada há ${daysLate} dia(s)</strong>.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr style="background: #fef2f2;"><td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><strong>Valor</strong></td><td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${formatMoney(charge.value)}</td></tr>
                <tr><td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><strong>Vencimento</strong></td><td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${formatDate(charge.dueDate)}</td></tr>
                <tr style="background: #fef2f2;"><td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><strong>Dias em atraso</strong></td><td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #dc2626;"><strong>${daysLate} dia(s)</strong></td></tr>
              </table>
              ${charge.invoiceUrl ? `<p><a href="${charge.invoiceUrl}" style="background: #dc2626; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Regularizar Pagamento</a></p>` : ""}
              <p style="color: #6b7280; font-size: 12px;">CAT Cursos e Treinamentos</p>
            </div>
          </div>`;
        try {
          await sendEmail({ to: customer.email, subject: `🔴 Boleto em atraso — ${daysLate} dia(s) — ${formatMoney(charge.value)}`, html });
          emailsEnviados++;
        } catch (e) {
          errors.push(`Erro e-mail ${customer.email}: ${e.message}`);
        }
        for (const adminEmail of adminEmails) {
          try {
            await sendEmail({ to: adminEmail, subject: `[CAT] ATRASO: Boleto de ${customer.name} — ${daysLate} dia(s)`, html });
          } catch (e) { /* silencioso para admins */ }
        }
      }
    }

    return Response.json({
      success: true,
      resend_configurado: resendConfigurado,
      pendingAlertas: pendingCharges.length,
      overdueAlertas: overdueCharges.length,
      notificacoesGeradas,
      emailsEnviados,
      errors,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[alertarBoletosVencimento] Erro:', error);
    return Response.json({ error: error.message, timestamp: new Date().toISOString() }, { status: 500 });
  }
});