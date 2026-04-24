import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import twilio from 'npm:twilio';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { 
      instructor_id, 
      instructor_name,
      instructor_phone,
      course_name,
      course_modality,
      course_duration,
      course_validity,
      company_name,
      negotiated_value,
      action_type // 'new' ou 'update'
    } = await req.json();

    if (!instructor_phone) {
      return Response.json({ 
        success: false, 
        error: 'Instrutor não possui telefone cadastrado' 
      });
    }

    // Verificar credenciais Twilio
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

    if (!accountSid || !authToken || !twilioWhatsAppNumber) {
      return Response.json({ 
        success: false, 
        error: 'Credenciais Twilio não configuradas',
        missing: {
          accountSid: !accountSid,
          authToken: !authToken,
          twilioWhatsAppNumber: !twilioWhatsAppNumber
        }
      });
    }

    // Formatar número do instrutor
    let phoneFormatted = instructor_phone.replace(/\D/g, '');
    if (!phoneFormatted.startsWith('55')) {
      phoneFormatted = '55' + phoneFormatted;
    }

    // Montar mensagem
    const actionText = action_type === 'new' 
      ? '🆕 *NOVO CURSO VINCULADO*' 
      : '🔄 *ATUALIZAÇÃO DE VÍNCULO*';

    const message = `
${actionText}

Olá, *${instructor_name}*! 👋

${action_type === 'new' ? 'Você foi vinculado a um novo curso' : 'Houve uma atualização no seu vínculo com o curso'}:

📚 *Curso:* ${course_name}
${course_modality ? `📋 *Modalidade:* ${course_modality}` : ''}
${course_duration ? `⏱️ *Carga Horária:* ${course_duration}h` : ''}
${course_validity ? `📅 *Validade:* ${course_validity}` : ''}
${company_name ? `🏢 *Empresa:* ${company_name}` : ''}
${negotiated_value ? `💰 *Valor:* R$ ${Number(negotiated_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}

Em caso de dúvidas, entre em contato com a coordenação.

_CAT - Centro de Aperfeiçoamento em Treinamentos_
    `.trim();

    // Enviar via Twilio
    const client = twilio(accountSid, authToken);
    
    const result = await client.messages.create({
      body: message,
      from: `whatsapp:${twilioWhatsAppNumber}`,
      to: `whatsapp:+${phoneFormatted}`
    });

    return Response.json({ 
      success: true, 
      message: 'Notificação enviada com sucesso',
      sid: result.sid,
      to: phoneFormatted
    });

  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});