import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { conversation_id, message } = await req.json();

    if (!conversation_id || !message?.trim()) {
      return Response.json({ error: "conversation_id e message são obrigatórios" }, { status: 400 });
    }

    // Busca a conversa para obter o lead e telefone
    const conversations = await base44.asServiceRole.entities.Conversation.filter({ id: conversation_id });
    const conv = conversations?.[0];
    if (!conv) return Response.json({ error: "Conversa não encontrada" }, { status: 404 });

    // Busca o lead para obter o telefone
    const leads = await base44.asServiceRole.entities.Lead.filter({ id: conv.lead_id });
    const lead = leads?.[0];
    const toPhone = lead?.phone;

    if (!toPhone) {
      return Response.json({ error: "Telefone do lead não encontrado" }, { status: 400 });
    }

    // Envia via WhatsApp Cloud API
    const waRes = await fetch(
      `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: toPhone,
          type: "text",
          text: { body: message.trim() },
        }),
      }
    );

    const waData = await waRes.json();

    if (!waRes.ok) {
      console.error("Erro WhatsApp API:", JSON.stringify(waData));
      return Response.json({ error: waData?.error?.message || "Erro ao enviar via WhatsApp" }, { status: 500 });
    }

    // Salva a mensagem na conversa
    const timestamp = new Date().toISOString();
    const newMsg = {
      role: "human_agent",
      content: message.trim(),
      timestamp,
    };
    const updatedMessages = [...(conv.messages || []), newMsg];

    await base44.asServiceRole.entities.Conversation.update(conversation_id, {
      messages: updatedMessages,
      last_message_at: timestamp,
      last_message_preview: message.trim().substring(0, 100),
      status: "Em Atendimento Humano",
    });

    console.log(`Mensagem enviada para ${toPhone} pelo atendente ${user.email}`);
    return Response.json({ status: "ok", whatsapp_message_id: waData.messages?.[0]?.id });
  } catch (error) {
    console.error("Erro:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});