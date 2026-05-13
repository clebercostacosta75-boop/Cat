import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "cat_cursos_webhook_2025";
const WHATSAPP_BUSINESS_NUMBER = "5591988648079"; // +55 91 98864-8079

Deno.serve(async (req) => {
  // ── GET: verificação do webhook pelo Meta ──────────────────────────────────
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verificado com sucesso pelo Meta.");
      return new Response(challenge, { status: 200 });
    }
    return new Response("Token inválido", { status: 403 });
  }

  // ── POST: receber eventos/mensagens ───────────────────────────────────────
  if (req.method === "POST") {
    try {
      const base44 = createClientFromRequest(req);
      const body = await req.json();

      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages?.length) {
        // Pode ser status update ou outro evento — ignorar silenciosamente
        return Response.json({ status: "ignored" }, { status: 200 });
      }

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