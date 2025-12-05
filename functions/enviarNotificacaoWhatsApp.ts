import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Autenticar usuário
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { recipient_id, recipient_type, message_type, class_schedule_id } = await req.json();

    // Validar parâmetros
    if (!recipient_id || !recipient_type || !message_type) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios: recipient_id, recipient_type, message_type' 
      }, { status: 400 });
    }

    // Buscar dados do destinatário
    let phoneNumber = '';
    let recipientName = '';
    let isWhatsApp = false;

    if (recipient_type === 'user' || recipient_type === 'instructor') {
      // Buscar usuário ou instrutor
      const users = await base44.entities.User.filter({ id: recipient_id });
      if (users.length === 0) {
        return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
      }
      const recipient = users[0];
      phoneNumber = recipient.phone;
      recipientName = recipient.full_name;
      isWhatsApp = recipient.is_whatsapp;
    } else if (recipient_type === 'company_contact') {
      // Buscar contato da empresa
      const { company_id, contact_index } = await req.json();
      const companies = await base44.entities.Company.filter({ id: company_id });
      if (companies.length === 0 || !companies[0].contacts || !companies[0].contacts[contact_index]) {
        return Response.json({ error: 'Contato da empresa não encontrado' }, { status: 404 });
      }
      const contact = companies[0].contacts[contact_index];
      phoneNumber = contact.phone;
      recipientName = contact.name;
      isWhatsApp = contact.is_whatsapp;
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
    let messageBody = '';

    if (message_type === 'class_schedule') {
      // Buscar dados da turma
      const classSchedules = await base44.entities.ClassSchedule.filter({ id: class_schedule_id });
      if (classSchedules.length === 0) {
        return Response.json({ error: 'Turma não encontrada' }, { status: 404 });
      }
      const classSchedule = classSchedules[0];

      messageBody = `🎓 *Cronograma de Treinamento*\n\n`;
      messageBody += `Olá *${recipientName}*!\n\n`;
      messageBody += `Segue o cronograma do treinamento:\n\n`;
      messageBody += `📚 *Treinamento:* ${classSchedule.training_name}\n`;
      messageBody += `🏢 *Empresa:* ${classSchedule.company_name}\n`;
      messageBody += `📅 *Data de Início:* ${new Date(classSchedule.start_date).toLocaleDateString('pt-BR')}\n`;
      if (classSchedule.end_date) {
        messageBody += `📅 *Data de Fim:* ${new Date(classSchedule.end_date).toLocaleDateString('pt-BR')}\n`;
      }
      if (classSchedule.training_schedule) {
        messageBody += `🕐 *Horário:* ${classSchedule.training_schedule}\n`;
      }
      if (classSchedule.location) {
        messageBody += `📍 *Local:* ${classSchedule.location}\n`;
      }
      if (classSchedule.students_count) {
        messageBody += `👥 *Alunos:* ${classSchedule.students_count}\n`;
      }
      if (classSchedule.specific_days) {
        messageBody += `📆 *Dias Específicos:* ${classSchedule.specific_days}\n`;
      }
      if (classSchedule.notes) {
        messageBody += `\n📝 *Observações:*\n${classSchedule.notes}\n`;
      }
      messageBody += `\n✅ *Status:* ${classSchedule.status}`;
    } else if (message_type === 'credentials') {
      // Mensagem de credenciais
      messageBody = `🔐 *Credenciais de Acesso*\n\n`;
      messageBody += `Olá *${recipientName}*!\n\n`;
      messageBody += `Suas credenciais de acesso ao Sistema de Treinamento:\n\n`;
      messageBody += `📧 *E-mail:* ${recipient_id}\n`;
      messageBody += `🔗 *Link de Acesso:* [URL do sistema]\n\n`;
      messageBody += `Por favor, faça login e altere sua senha no primeiro acesso.`;
    } else {
      return Response.json({ error: 'Tipo de mensagem inválido' }, { status: 400 });
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
        Body: messageBody,
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

    return Response.json({ 
      success: true,
      message: 'Mensagem enviada com sucesso via WhatsApp',
      recipient: recipientName,
      phone: phoneNumber,
      twilio_sid: twilioData.sid
    });

  } catch (error) {
    console.error('Erro ao enviar notificação WhatsApp:', error);
    return Response.json({ 
      error: 'Erro ao processar solicitação', 
      details: error.message 
    }, { status: 500 });
  }
});