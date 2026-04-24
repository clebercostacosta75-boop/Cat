import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Autenticar usuário
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

    // Validar parâmetros
    if (!recipient_type || !message_type) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios: recipient_type, message_type' 
      }, { status: 400 });
    }

    // Buscar dados do destinatário
    let phoneNumber = recipient_phone || '';
    let recipientName = recipient_name || '';
    let isWhatsApp = true;

    // Se não foi fornecido diretamente, buscar do banco
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
          isWhatsApp = companies[0].contacts[0].is_whatsapp;
        }
      }
    }

    // Validar número de telefone
    if (!phoneNumber) {
      return Response.json({ 
        error: 'Número de telefone não cadastrado para este destinatário' 
      }, { status: 400 });
    }

    if (!isWhatsApp) {
      return Response.json({ 
        error: 'O número cadastrado não está marcado como WhatsApp' 
      }, { status: 400 });
    }

    // Buscar credenciais do Twilio
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
      return Response.json({ 
        error: 'Credenciais do Twilio não configuradas. Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_WHATSAPP_NUMBER' 
      }, { status: 500 });
    }

    // Formatar número de telefone para formato internacional
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }
    formattedPhone = `whatsapp:+${formattedPhone}`;

    // Montar mensagem baseado no tipo
    let finalMessageBody = '';

    if (message_type === 'custom' && message_body) {
      // Mensagem customizada enviada diretamente
      finalMessageBody = message_body;
    } else if (message_type === 'class_schedule') {
      // Buscar dados da turma
      const classSchedules = await base44.asServiceRole.entities.ClassSchedule.filter({ id: class_schedule_id });
      if (classSchedules.length === 0) {
        return Response.json({ error: 'Turma não encontrada' }, { status: 404 });
      }
      const classSchedule = classSchedules[0];

      finalMessageBody = `🎓 *Cronograma de Treinamento*\n\n`;
      finalMessageBody += `Olá *${recipientName}*!\n\n`;
      finalMessageBody += `Segue o cronograma do treinamento:\n\n`;
      finalMessageBody += `📚 *Treinamento:* ${classSchedule.training_name}\n`;
      finalMessageBody += `🏢 *Empresa:* ${classSchedule.company_name}\n`;
      finalMessageBody += `📅 *Data de Início:* ${new Date(classSchedule.start_date).toLocaleDateString('pt-BR')}\n`;
      if (classSchedule.end_date) {
        finalMessageBody += `📅 *Data de Fim:* ${new Date(classSchedule.end_date).toLocaleDateString('pt-BR')}\n`;
      }
      if (classSchedule.training_schedule) {
        finalMessageBody += `🕐 *Horário:* ${classSchedule.training_schedule}\n`;
      }
      if (classSchedule.location) {
        finalMessageBody += `📍 *Local:* ${classSchedule.location}\n`;
      }
      if (classSchedule.students_count) {
        finalMessageBody += `👥 *Alunos:* ${classSchedule.students_count}\n`;
      }
      if (classSchedule.specific_days) {
        finalMessageBody += `📆 *Dias Específicos:* ${classSchedule.specific_days}\n`;
      }
      if (classSchedule.notes) {
        finalMessageBody += `\n📝 *Observações:*\n${classSchedule.notes}\n`;
      }
      finalMessageBody += `\n✅ *Status:* ${classSchedule.status}`;
    } else if (message_type === 'credentials') {
      // Mensagem de credenciais
      finalMessageBody = `🔐 *Credenciais de Acesso*\n\n`;
      finalMessageBody += `Olá *${recipientName}*!\n\n`;
      finalMessageBody += `Suas credenciais de acesso ao Sistema de Treinamento:\n\n`;
      finalMessageBody += `📧 *E-mail:* ${recipient_id}\n`;
      finalMessageBody += `🔗 *Link de Acesso:* [URL do sistema]\n\n`;
      finalMessageBody += `Por favor, faça login e altere sua senha no primeiro acesso.`;
    } else {
      return Response.json({ error: 'Tipo de mensagem inválido ou mensagem não fornecida' }, { status: 400 });
    }

    // Enviar mensagem via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: twilioWhatsAppNumber,
        To: formattedPhone,
        Body: finalMessageBody,
      }),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('Erro do Twilio:', twilioData);
      return Response.json({ 
        error: 'Erro ao enviar mensagem via WhatsApp', 
        details: twilioData 
      }, { status: 500 });
    }

    // Enviar cópia para Administradores Master
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
        if (!adminPhone.startsWith('55')) {
          adminPhone = '55' + adminPhone;
        }
        adminPhone = `whatsapp:+${adminPhone}`;

        const adminMessageBody = `📋 *[CÓPIA - ADMINISTRADOR]*\n\n` +
          `Mensagem enviada para: *${recipientName}*\n` +
          `Telefone: ${phoneNumber}\n\n` +
          `-------------------\n\n` +
          finalMessageBody;

        const adminTwilioResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${twilioAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: twilioWhatsAppNumber,
            To: adminPhone,
            Body: adminMessageBody,
          }),
        });

        if (adminTwilioResponse.ok) {
          adminResults.push({ admin: admin.full_name, status: 'enviado' });
        } else {
          adminResults.push({ admin: admin.full_name, status: 'falha' });
        }
      } catch (adminError) {
        console.error(`Erro ao enviar para admin ${admin.full_name}:`, adminError);
        adminResults.push({ admin: admin.full_name, status: 'erro' });
      }
    }

    return Response.json({ 
      success: true,
      message: 'Mensagem enviada com sucesso via WhatsApp',
      recipient: recipientName,
      phone: phoneNumber,
      twilio_sid: twilioData.sid,
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