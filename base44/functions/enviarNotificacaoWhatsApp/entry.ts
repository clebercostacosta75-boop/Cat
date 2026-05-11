import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const requestData = await req.json();
    const {
      recipient_id,
      recipient_type,
      recipient_name,
      recipient_phone,
      message_type,
      message_body,
      class_schedule_id
    } = requestData;

    if (!recipient_type || !message_type) {
      return Response.json({
        error: 'Parâmetros obrigatórios: recipient_type, message_type'
      }, { status: 400 });
    }

    // Credenciais da API oficial do WhatsApp Business (Meta)
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!accessToken || !phoneNumberId) {
      return Response.json({
        error: 'Credenciais do WhatsApp Business não configuradas. Configure WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID'
      }, { status: 500 });
    }

    // Buscar dados do destinatário se necessário
    let phoneNumber = recipient_phone || '';
    let recipientName = recipient_name || '';

    if (!phoneNumber && recipient_id) {
      if (recipient_type === 'instructor') {
        const instructors = await base44.asServiceRole.entities.Instructor.filter({ id: recipient_id });
        if (instructors.length > 0) {
          phoneNumber = instructors[0].phone;
          recipientName = instructors[0].name;
        }
      } else if (recipient_type === 'company') {
        const companies = await base44.asServiceRole.entities.Company.filter({ id: recipient_id });
        if (companies.length > 0 && companies[0].contacts?.[0]) {
          phoneNumber = companies[0].contacts[0].phone;
          recipientName = companies[0].contacts[0].name || companies[0].nome_fantasia;
        }
      }
    }

    if (!phoneNumber) {
      return Response.json({
        error: 'Número de telefone não cadastrado para este destinatário'
      }, { status: 400 });
    }

    // Formatar número para padrão internacional (sem + e sem espaços)
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }

    // Montar corpo da mensagem
    let finalMessageBody = '';

    if (message_type === 'custom' && message_body) {
      finalMessageBody = message_body;
    } else if (message_type === 'class_schedule') {
      const classSchedules = await base44.asServiceRole.entities.ClassSchedule.filter({ id: class_schedule_id });
      if (classSchedules.length === 0) {
        return Response.json({ error: 'Turma não encontrada' }, { status: 404 });
      }
      const cs = classSchedules[0];

      finalMessageBody = `🎓 *Cronograma de Treinamento*\n\n`;
      finalMessageBody += `Olá *${recipientName}*!\n\n`;
      finalMessageBody += `📚 *Treinamento:* ${cs.training_name}\n`;
      finalMessageBody += `🏢 *Empresa:* ${cs.company_name}\n`;
      if (cs.start_date) finalMessageBody += `📅 *Início:* ${new Date(cs.start_date).toLocaleDateString('pt-BR')}\n`;
      if (cs.end_date) finalMessageBody += `📅 *Fim:* ${new Date(cs.end_date).toLocaleDateString('pt-BR')}\n`;
      if (cs.training_schedule) finalMessageBody += `🕐 *Horário:* ${cs.training_schedule}\n`;
      if (cs.location) finalMessageBody += `📍 *Local:* ${cs.location}\n`;
      if (cs.students_count) finalMessageBody += `👥 *Alunos:* ${cs.students_count}\n`;
      if (cs.specific_days) finalMessageBody += `📆 *Dias:* ${cs.specific_days}\n`;
      if (cs.notes) finalMessageBody += `\n📝 *Obs:* ${cs.notes}\n`;
      finalMessageBody += `\n✅ *Status:* ${cs.status}`;
    } else if (message_type === 'credentials') {
      const credEmail = requestData.credential_email || recipient_id || '';
      const credPassword = requestData.credential_password || '';
      const appUrl = requestData.app_url || 'https://app.base44.com';
      finalMessageBody = `🔐 *Credenciais de Acesso - CAT Cursos*\n\n`;
      finalMessageBody += `Olá *${recipientName}*! 👋\n\n`;
      finalMessageBody += `Seu acesso ao *CAT Gestão de Cursos* foi criado.\n\n`;
      finalMessageBody += `📧 *E-mail:* ${credEmail}\n`;
      if (credPassword) {
        finalMessageBody += `🔑 *Senha inicial:* ${credPassword}\n`;
      }
      finalMessageBody += `🔗 *Link:* ${appUrl}\n\n`;
      finalMessageBody += `⚠️ No primeiro acesso, você será solicitado a trocar a senha.\n\n`;
      finalMessageBody += `Dúvidas? Entre em contato: suporte@catcursos.com.br`;
    } else {
      return Response.json({ error: 'Tipo de mensagem inválido ou mensagem não fornecida' }, { status: 400 });
    }

    // Enviar via API oficial do WhatsApp Business (Meta)
    const waUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    const waResponse = await fetch(waUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: { body: finalMessageBody }
      }),
    });

    const waData = await waResponse.json();

    if (!waResponse.ok) {
      console.error('Erro da API WhatsApp Business:', waData);
      return Response.json({
        error: 'Erro ao enviar mensagem via WhatsApp Business',
        details: waData
      }, { status: 500 });
    }

    // Enviar cópia para Administradores Master com WhatsApp cadastrado
    const adminUsers = await base44.asServiceRole.entities.User.filter({});
    const admins = adminUsers.filter(u =>
      (u.custom_role === 'Administrador Master' || u.role === 'admin') &&
      u.phone &&
      u.is_whatsapp
    );

    const adminResults = [];
    for (const admin of admins) {
      try {
        let adminPhone = admin.phone.replace(/\D/g, '');
        if (!adminPhone.startsWith('55')) adminPhone = '55' + adminPhone;

        const adminBody = `📋 *[CÓPIA - ADMINISTRADOR]*\n\nMensagem enviada para: *${recipientName}*\nTelefone: ${phoneNumber}\n\n-------------------\n\n${finalMessageBody}`;

        const adminRes = await fetch(waUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: adminPhone,
            type: 'text',
            text: { body: adminBody }
          }),
        });

        adminResults.push({ admin: admin.full_name, status: adminRes.ok ? 'enviado' : 'falha' });
      } catch (e) {
        adminResults.push({ admin: admin.full_name, status: 'erro' });
      }
    }

    return Response.json({
      success: true,
      message: 'Mensagem enviada com sucesso via WhatsApp Business',
      recipient: recipientName,
      phone: phoneNumber,
      message_id: waData.messages?.[0]?.id,
      admin_copies: adminResults
    });

  } catch (error) {
    console.error('Erro ao enviar notificação WhatsApp:', error);
    return Response.json({
      error: 'Erro ao processar solicitação',
      details: error.message
    }, { status: 500 });
  }
});