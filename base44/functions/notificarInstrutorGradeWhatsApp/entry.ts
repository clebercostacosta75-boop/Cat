/**
 * Notifica o instrutor via WhatsApp quando um novo curso/turma é atribuído a ele
 * na grade de treinamentos (ClassSchedule).
 * Acionado por automação de entidade (create/update).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const { event, old_data, payload_too_large } = payload;
    let data = payload.data;

    // Se o payload foi omitido por tamanho, busca a turma diretamente
    if (payload_too_large && event?.entity_id) {
      const rows = await base44.asServiceRole.entities.ClassSchedule.filter({ id: event.entity_id });
      data = rows[0] || null;
    }

    if (!data) {
      return Response.json({ skipped: true, reason: 'Sem dados da turma' });
    }

    // Só notifica quando há instrutor E o vínculo é novo:
    // - create com instrutor definido
    // - update em que o instructor_id mudou (nova atribuição)
    const isCreate = event?.type === 'create';
    const instructorAssigned = !!data.instructor_id;
    const instructorChanged = isCreate
      ? instructorAssigned
      : instructorAssigned && data.instructor_id !== (old_data?.instructor_id || null);

    if (!instructorChanged) {
      return Response.json({ skipped: true, reason: 'Instrutor não foi atribuído/alterado neste evento' });
    }

    // Buscar telefone do instrutor
    const instructors = await base44.asServiceRole.entities.Instructor.filter({ id: data.instructor_id });
    const instructor = instructors[0];
    if (!instructor) {
      return Response.json({ skipped: true, reason: 'Instrutor não encontrado' });
    }
    if (!instructor.phone) {
      return Response.json({ skipped: true, reason: `Instrutor ${instructor.name} sem telefone cadastrado` });
    }

    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    if (!accessToken || !phoneNumberId) {
      return Response.json({ error: 'Credenciais do WhatsApp Business não configuradas' }, { status: 500 });
    }

    let formattedPhone = instructor.phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55')) formattedPhone = '55' + formattedPhone;

    const datas = (data.realization_dates || [])
      .map((d) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR'))
      .join(', ');

    const mensagem = `🆕 *NOVO TREINAMENTO ATRIBUÍDO*

Olá, *${instructor.name}*! 👋

Você foi designado para um novo treinamento na grade:

📚 *Curso:* ${data.training_name || '—'}
🏢 *Empresa:* ${data.company_name || '—'}
${data.location ? `📍 *Local:* ${data.location}` : ''}
${datas ? `📅 *Data(s):* ${datas}` : ''}
${data.training_schedule ? `🕐 *Horário:* ${data.training_schedule}` : ''}
${data.duration_hours ? `⏱️ *Carga Horária:* ${data.duration_hours}h` : ''}
${data.students_count ? `👥 *Alunos:* ${data.students_count}` : ''}

Em caso de dúvidas, entre em contato com a coordenação.

*CAT Cursos* — Sistema de Gestão de Treinamentos`.replace(/\n{3,}/g, '\n\n');

    const waResponse = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: { body: mensagem },
      }),
    });

    const waData = await waResponse.json();
    if (!waResponse.ok) {
      console.error('Erro da API WhatsApp:', JSON.stringify(waData));
      return Response.json({
        error: 'Erro ao enviar WhatsApp ao instrutor',
        details: waData?.error?.message || JSON.stringify(waData),
      }, { status: 500 });
    }

    await base44.asServiceRole.entities.AuditLog.create({
      user_email: 'sistema@catcursos.com',
      user_name: 'Automação — Grade de Treinamentos',
      action: 'send_whatsapp',
      entity_type: 'ClassSchedule',
      entity_id: data.id || event?.entity_id || '',
      entity_name: data.training_name || '',
      details: `Notificação automática enviada via WhatsApp para o instrutor ${instructor.name} (${formattedPhone}) — turma "${data.training_name}" / ${data.company_name} em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Belem' })}`,
    });

    return Response.json({
      success: true,
      instructor: instructor.name,
      phone: formattedPhone,
      message_id: waData.messages?.[0]?.id,
    });
  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});