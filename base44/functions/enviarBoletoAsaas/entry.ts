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

      // ── Enviar e-mail ────────────────────────────────────────────────────────
      if (studentEmail) {
        try {
          const emailBody = billingType === "BOLETO"
            ? `Olá ${studentName},\n\nSeu boleto bancário foi gerado com sucesso!\n\nValor: R$ ${parseFloat(chargeValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\nVencimento: ${dueDate}\n\nLinha Digitável:\n${boletoLine}\n\nPara mais informações, acesse seu portal.\n\nObrigado!`
            : `Olá ${studentName},\n\nSeu pagamento de R$ ${parseFloat(chargeValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} foi gerado com sucesso!\n\nVencimento: ${dueDate}\n\nPara mais informações, acesse seu portal.\n\nObrigado!`;

          await base44.integrations.Core.SendEmail({
            to: studentEmail,
            subject: `Boleto Bancário Gerado — R$ ${parseFloat(chargeValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            body: emailBody,
          });
          emailSent = true;
        } catch (err) {
          console.error("Erro ao enviar e-mail:", err.message);
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