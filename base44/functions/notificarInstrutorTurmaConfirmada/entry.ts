import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const turmaId = payload?.event?.entity_id || payload?.data?.id;
    const turmaData = payload?.data;

    if (!turmaData && !turmaId) {
      return Response.json({ error: "Payload inválido" }, { status: 400 });
    }

    // Fonte oficial: ClassSchedule (turma)
    let turma = turmaData;
    if (!turma || !turma.status) {
      turma = await base44.asServiceRole.entities.ClassSchedule.get(turmaId);
    }

    if (!turma) {
      return Response.json({ error: "Turma não encontrada" }, { status: 404 });
    }

    // Verificar se é status "Confirmado"
    if (turma.status !== "Confirmado") {
      return Response.json({ skipped: true, reason: "Status não é Confirmado", status: turma.status });
    }

    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!accessToken || !phoneNumberId) {
      return Response.json({ error: "Credenciais do WhatsApp não configuradas" }, { status: 500 });
    }

    // Buscar instrutor (por id ou por nome)
    let instrutorPhone = "";
    let instrutorNome = turma.instructor_name || "Instrutor";

    if (turma.instructor_id) {
      const instrutores = await base44.asServiceRole.entities.Instructor.filter({ id: turma.instructor_id });
      if (instrutores.length > 0) {
        instrutorPhone = instrutores[0].phone || instrutores[0].whatsapp || "";
        instrutorNome = instrutores[0].name || instrutorNome;
      }
    } else if (turma.instructor_name) {
      const instrutores = await base44.asServiceRole.entities.Instructor.filter({ name: turma.instructor_name });
      if (instrutores.length > 0) {
        instrutorPhone = instrutores[0].phone || instrutores[0].whatsapp || "";
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

    // Datas a partir de realization_dates
    const datas = (turma.realization_dates || []).filter(Boolean).sort();
    const toBR = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";
    const dataInicio = toBR(datas[0]);
    const dataFim = datas.length > 1 ? toBR(datas[datas.length - 1]) : dataInicio;

    const mensagem =
      `✅ *Turma Confirmada — CAT CURSOS*\n\n` +
      `Olá, *${instrutorNome}*!\n\n` +
      `Informamos que a sua turma foi *confirmada* pelo setor administrativo.\n\n` +
      `📋 *Detalhes do Treinamento:*\n` +
      `📚 Curso: ${turma.training_name || "—"}\n` +
      `🏢 Empresa: ${turma.company_name || "—"}\n` +
      `📅 Início: ${dataInicio}\n` +
      `📅 Término: ${dataFim}\n` +
      (turma.training_schedule ? `🕐 Horário: ${turma.training_schedule}\n` : "") +
      (turma.location ? `📍 Local: ${turma.location}\n` : "") +
      (turma.category ? `🖥️ Modalidade: ${turma.category}\n` : "") +
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
      turma: turma.training_name,
      message_id: waData.messages?.[0]?.id,
    });

  } catch (error) {
    console.error("[notificarInstrutorTurmaConfirmada] Erro:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});