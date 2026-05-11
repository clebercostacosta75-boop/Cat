import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ASAAS_BASE_URL = "https://api.asaas.com/v3";
const API_KEY = Deno.env.get("ASAAS_API_KEY");
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE = Deno.env.get("TWILIO_PHONE");

if (!API_KEY) throw new Error("ASAAS_API_KEY não configurada");

const asaasHeaders = { "Content-Type": "application/json", "access_token": API_KEY };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { action, charge, student, billingType } = await req.json();

    if (action === "sendBoletoNotification") {
      const { studentEmail, studentPhone, studentName, chargeValue, chargeId, dueDate } = charge;

      let emailSent = false, whatsappSent = false;

      // ── Buscar linha digitável do boleto no Asaas ──────────────────────────────
      let boletoLine = "";
      if (billingType === "BOLETO") {
        try {
          const boletoRes = await fetch(`${ASAAS_BASE_URL}/payments/${chargeId}/identificationField`, {
            headers: asaasHeaders,
          });
          const boletoData = await boletoRes.json();
          boletoLine = boletoData.identificationField || "";
        } catch (err) {
          console.log("Não foi possível obter linha digitável:", err.message);
        }
      }

      // ── Enviar e-mail via Resend ──────────────────────────────────────────────
      if (studentEmail) {
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (RESEND_API_KEY) {
          try {
            const emailBody = billingType === "BOLETO"
              ? `<p>Olá <strong>${studentName}</strong>,</p><p>Seu boleto bancário foi gerado com sucesso!</p><p><strong>Valor:</strong> R$ ${parseFloat(chargeValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}<br><strong>Vencimento:</strong> ${dueDate}</p>${boletoLine ? `<p><strong>Linha Digitável:</strong><br><code>${boletoLine}</code></p>` : ""}<p>Para mais informações, acesse seu portal.</p><p>Obrigado!</p>`
              : `<p>Olá <strong>${studentName}</strong>,</p><p>Seu pagamento de R$ ${parseFloat(chargeValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} foi gerado com sucesso!</p><p><strong>Vencimento:</strong> ${dueDate}</p><p>Para mais informações, acesse seu portal.</p><p>Obrigado!</p>`;

            const resendRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: "CAT Cursos <noreply@catcursos.com.br>",
                to: [studentEmail],
                subject: `Boleto Bancário Gerado — R$ ${parseFloat(chargeValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                html: emailBody,
              }),
            });
            if (resendRes.ok) emailSent = true;
            else {
              const errData = await resendRes.json();
              console.error("Erro Resend:", JSON.stringify(errData));
            }
          } catch (err) {
            console.error("Erro ao enviar e-mail:", err.message);
          }
        } else {
          console.log("RESEND_API_KEY não configurada — e-mail não enviado");
        }
      }

      // ── Enviar WhatsApp (se configurado) ──────────────────────────────────────
      if (studentPhone && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE) {
        try {
          const whatsappMsg = billingType === "BOLETO"
            ? `Olá ${studentName}! 🎉\n\nSeu boleto foi gerado com sucesso!\n\n💰 Valor: R$ ${parseFloat(chargeValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n📅 Vencimento: ${dueDate}\n\nLinha: ${boletoLine}\n\nFaça o pagamento pelo seu banco. Qualquer dúvida, nos procure! 😊`
            : `Olá ${studentName}! 🎉\n\nSeu pagamento foi registrado com sucesso!\n\n💰 Valor: R$ ${parseFloat(chargeValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n📅 Vencimento: ${dueDate}\n\nQualquer dúvida, nos procure! 😊`;

          const authHeader = "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
          const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
            method: "POST",
            headers: { "Authorization": authHeader, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              From: `whatsapp:${TWILIO_PHONE}`,
              To: `whatsapp:${studentPhone.replace(/\D/g, "")}`,
              Body: whatsappMsg,
            }).toString(),
          });

          if (twilioRes.ok) whatsappSent = true;
          else console.log("Twilio response:", await twilioRes.text());
        } catch (err) {
          console.error("Erro ao enviar WhatsApp:", err.message);
        }
      }

      return Response.json({ success: true, emailSent, whatsappSent });
    }

    return Response.json({ error: "Ação não reconhecida" }, { status: 400 });
  } catch (error) {
    console.error('[enviarBoletoAsaas] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});