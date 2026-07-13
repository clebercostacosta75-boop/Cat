import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
const APP_SECRET = Deno.env.get("WHATSAPP_WEBHOOK_TOKEN"); // App Secret do Meta para validação X-Hub-Signature-256
const WHATSAPP_BUSINESS_NUMBER = ""; // número comercial removido do código (sem hardcode)

async function assinaturaValida(rawBody, signatureHeader) {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const esperado = signatureHeader.slice(7);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(APP_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === esperado;
}

Deno.serve(async (req) => {
  // ── GET: verificação do webhook pelo Meta ──────────────────────────────────
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN && VERIFY_TOKEN) {
      console.log("Webhook verificado com sucesso pelo Meta.");
      return new Response(challenge, { status: 200 });
    }
    return new Response("Token inválido", { status: 403 });
  }

  // ── POST: receber eventos/mensagens ───────────────────────────────────────
  if (req.method === "POST") {
    try {
      const base44 = createClientFromRequest(req);
      const rawBody = await req.text();

      // Validação de autenticidade: assinatura X-Hub-Signature-256 (HMAC com App Secret do Meta)
      if (APP_SECRET) {
        const signature = req.headers.get("x-hub-signature-256");
        const valida = await assinaturaValida(rawBody, signature);
        if (!valida) {
          await base44.asServiceRole.entities.AuditLog.create({
            user_email: "sistema",
            user_name: "Webhook WhatsApp",
            action: "view",
            entity_type: "WhatsAppWebhook",
            entity_name: "Tentativa de webhook rejeitada",
            details: `Webhook WhatsApp REJEITADO: assinatura X-Hub-Signature-256 ${signature ? "inválida" : "ausente"} em ${new Date().toISOString()}`,
          }).catch(() => {});
          return Response.json({ error: "Assinatura inválida" }, { status: 403 });
        }
      } else {
        console.warn("WHATSAPP_WEBHOOK_TOKEN não configurado — validação de assinatura desativada.");
      }

      const body = JSON.parse(rawBody);

      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      // Ignorar eventos que não sejam mensagens (ex: status de entrega)
      if (!value?.messages?.length) {
        return Response.json({ status: "ignored" }, { status: 200 });
      }

      // Busca a conta social do WhatsApp para vincular à conversa
      let socialAccountId = null;
      let socialAccountName = WHATSAPP_BUSINESS_NUMBER ? `CAT Cursos WhatsApp (+${WHATSAPP_BUSINESS_NUMBER})` : "CAT Cursos WhatsApp";
      try {
        const waAccounts = await base44.asServiceRole.entities.SocialAccount.filter({ platform: "WhatsApp Business" });
        if (waAccounts?.length > 0) {
          socialAccountId = waAccounts[0].id;
          socialAccountName = waAccounts[0].name || socialAccountName;
        }
      } catch (_) {}

      for (const msg of value.messages) {
        const fromPhone = msg.from; // número do remetente (ex: "5591999999999")
        const msgId = msg.id;
        const timestamp = new Date(parseInt(msg.timestamp) * 1000).toISOString();

        // Extrai conteúdo conforme o tipo
        let content = "";
        let mediaUrl = null;
        let mediaType = null;

        if (msg.type === "text") {
          content = msg.text?.body || "";
        } else if (msg.type === "image") {
          content = msg.image?.caption || "[Imagem recebida]";
          mediaType = "image";
        } else if (msg.type === "video") {
          content = msg.video?.caption || "[Vídeo recebido]";
          mediaType = "video";
        } else if (msg.type === "audio") {
          content = "[Áudio recebido]";
          mediaType = "audio";
        } else if (msg.type === "document") {
          content = msg.document?.filename || "[Documento recebido]";
          mediaType = "document";
        } else if (msg.type === "location") {
          content = `[Localização: lat ${msg.location?.latitude}, lng ${msg.location?.longitude}]`;
        } else {
          content = `[Mensagem do tipo: ${msg.type}]`;
        }

        // Nome do contato, se disponível
        const contactName = value.contacts?.find(c => c.wa_id === fromPhone)?.profile?.name || fromPhone;

        // Busca ou cria o Lead com base no telefone
        let leads = [];
        try {
          leads = await base44.asServiceRole.entities.Lead.filter({ phone: fromPhone });
        } catch (_) {}

        let leadId = leads?.[0]?.id;
        let leadName = leads?.[0]?.name || contactName;

        if (!leadId) {
          // Cria novo lead automaticamente
          const newLead = await base44.asServiceRole.entities.Lead.create({
            name: contactName,
            phone: fromPhone,
            origin_channel: "WhatsApp",
            status: "Novo",
            last_contact_at: timestamp,
          });
          leadId = newLead.id;
          leadName = newLead.name;
          console.log(`Novo lead criado: ${leadName} (${fromPhone})`);
        } else {
          // Atualiza último contato
          await base44.asServiceRole.entities.Lead.update(leadId, {
            last_contact_at: timestamp,
          });
        }

        // Busca conversa aberta no WhatsApp para esse lead
        let conversations = [];
        try {
          conversations = await base44.asServiceRole.entities.Conversation.filter({
            lead_id: leadId,
            channel: "WhatsApp",
          });
        } catch (_) {}

        const openConv = conversations.find(c =>
          !["Resolvida", "Encerrada"].includes(c.status)
        );

        const newMessage = {
          role: "user",
          content,
          timestamp,
          ...(mediaUrl ? { media_url: mediaUrl } : {}),
          ...(mediaType ? { media_type: mediaType } : {}),
        };

        if (openConv) {
          // Adiciona mensagem na conversa existente
          const updatedMessages = [...(openConv.messages || []), newMessage];
          await base44.asServiceRole.entities.Conversation.update(openConv.id, {
            messages: updatedMessages,
            last_message_at: timestamp,
            last_message_preview: content.substring(0, 100),
            unread_count: (openConv.unread_count || 0) + 1,
            status: openConv.status === "Resolvida" ? "Aberta" : openConv.status,
            social_account_id: openConv.social_account_id || socialAccountId,
            social_account_name: openConv.social_account_name || socialAccountName,
          });
          console.log(`Mensagem adicionada na conversa ${openConv.id}`);
        } else {
          // Cria nova conversa
          await base44.asServiceRole.entities.Conversation.create({
            lead_id: leadId,
            lead_name: leadName,
            channel: "WhatsApp",
            status: "Aberta",
            messages: [newMessage],
            last_message_at: timestamp,
            last_message_preview: content.substring(0, 100),
            unread_count: 1,
            social_account_id: socialAccountId,
            social_account_name: socialAccountName,
          });
          console.log(`Nova conversa criada para ${leadName} (${fromPhone})`);
        }
      }

      return Response.json({ status: "ok" }, { status: 200 });
    } catch (error) {
      console.error("Erro ao processar webhook:", error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  return new Response("Método não permitido", { status: 405 });
});