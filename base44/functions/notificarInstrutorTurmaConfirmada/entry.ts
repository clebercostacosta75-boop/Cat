import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const agendaId = payload?.event?.entity_id || payload?.data?.id;
    const agendaData = payload?.data;

    if (!agendaData && !agendaId) {
      return Response.json({ error: "Payload inválido" }, { status: 400 });
    }

    // Buscar dados completos da agenda se necessário
    let agenda = agendaData;
    if (!agenda || !agenda.status) {
      const items = await base44.asServiceRole.entities.AgendaTreinamento.filter({ id: agendaId });
      agenda = items[0];
    }

    if (!agenda) {
      return Response.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }

    // Verificar se é status "Confirmado"
    if (agenda.status !== "Confirmado") {
      return Response.json({ skipped: true, reason: "Status não é Confirmado", status: agenda.status });
    }

    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!accessToken || !phoneNumberId) {
      return Response.json({ error: "Credenciais do WhatsApp não configuradas" }, { status: 500 });
    }

    // Buscar instrutor
    let instrutorPhone = "";
    let instrutorNome = agenda.instrutor_nome || "Instrutor";

    if (agenda.instrutor_id) {
      const instrutores = await base44.asServiceRole.entities.Instructor.filter({ id: agenda.instrutor_id });
      if (instrutores.length > 0) {
        instrutorPhone = instrutores[0].phone || instrutores[0].whatsapp || "";
        instrutorNome = instrutores[0].name || instrutorNome;
      }
    }

    if (!instrutorPhone) {
      return Response.json({
        success: false,
        reason: "Instrutor sem WhatsApp cadastrado",
        instrutor: instrutorNome
      });
    }

    // Formatar telefone
    let tel = instrutorPhone.replace(/\D/g, "");
    if (!tel.startsWith("55")) tel = "55" + tel;

    // Montar mensagem
    const dataInicio = agenda.data_inicio
      ? new Date(agenda.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")
      : "—";
    const dataFim = agenda.data_fim
      ? new Date(agenda.data_fim + "T00:00:00").toLocaleDateString("pt-BR")
      : "—";

    const mensagem =
      `✅ *Turma Confirmada — CAT CURSOS*\n\n` +
      `Olá, *${instrutorNome}*!\n\n` +
      `Informamos que a sua turma foi *confirmada* pelo setor administrativo.\n\n` +
      `📋 *Detalhes do Treinamento:*\n` +
      `📚 Curso: ${agenda.curso_nome || agenda.titulo || "—"}\n` +
      `🏢 Empresa: ${agenda.empresa_nome || "—"}\n` +
      `📅 Início: ${dataInicio}\n` +
      `📅 Término: ${dataFim}\n` +
      (agenda.horario_inicio ? `🕐 Horário: ${agenda.horario_inicio}${agenda.horario_fim ? " às " + agenda.horario_fim : ""}\n` : "") +
      (agenda.local ? `📍 Local: ${agenda.local}\n` : "") +
      (agenda.modalidade ? `🖥️ Modalidade: ${agenda.modalidade}\n` : "") +
      `\nEm caso de dúvidas, entre em contato com a coordenação.\n\n` +
      `CAT CURSOS — Coordenação Pedagógica`;

    const waUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    const waRes = await fetch(waUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: tel,
        type: "text",
        text: { body: mensagem },
      }),
    });

    const waData = await waRes.json();

    if (!waRes.ok) {
      return Response.json({ error: "Erro ao enviar WhatsApp", details: waData }, { status: 500 });
    }

    return Response.json({
      success: true,
      instrutor: instrutorNome,
      phone: instrutorPhone,
      turma: agenda.titulo,
      message_id: waData.messages?.[0]?.id,
    });

  } catch (error) {
    console.error("[notificarInstrutorTurmaConfirmada] Erro:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});