import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { certificate_id, phone, studentName, courseName, signUrl, certificateCode } = body;

    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!accessToken || !phoneNumberId) {
      return Response.json({
        error: 'Credenciais do WhatsApp Business não configuradas. Configure WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID nas variáveis de ambiente.'
      }, { status: 500 });
    }

    let recipientPhone = phone || '';
    let recipientName = studentName || '';
    let recipientCourse = courseName || '';
    let signatureLink = signUrl || '';
    let certCode = certificateCode || '';

    // Modo 1: chamada por certificate_id (busca dados no banco)
    if (certificate_id && !phone) {
      const certs = await base44.asServiceRole.entities.Certificate.filter({ id: certificate_id });
      if (!certs || certs.length === 0) {
        return Response.json({ error: 'Certificado não encontrado' }, { status: 404 });
      }
      const cert = certs[0];
      if (!cert.student_phone) {
        return Response.json({ error: 'Telefone do aluno não cadastrado no certificado' }, { status: 400 });
      }
      recipientPhone = cert.student_phone;
      recipientName = cert.student_name;
      recipientCourse = cert.course_name;
      certCode = cert.certificate_code;
      const appUrl = req.headers.get('origin') || 'https://app.base44.com';
      signatureLink = `${appUrl}/CertificateSign?code=${cert.certificate_code}`;

      // Registrar envio no certificado
      await base44.asServiceRole.entities.Certificate.update(cert.id, {
        whatsapp_sent: true,
        whatsapp_sent_at: new Date().toISOString(),
      });
    }

    if (!recipientPhone) {
      return Response.json({ error: 'Telefone do destinatário não informado' }, { status: 400 });
    }

    // Formatar número (remover não-dígitos, adicionar 55 se necessário)
    let formattedPhone = recipientPhone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55')) formattedPhone = '55' + formattedPhone;

    const mensagem = `Olá, *${recipientName}*! 🎓

Seu certificado do curso *${recipientCourse}* está disponível para conferência e assinatura digital.

Acesse o link abaixo para revisar os dados e assinar:
${signatureLink}

${certCode ? `📋 *Código do certificado:* ${certCode}` : ''}

*CAT Cursos* — Sistema de Certificação Digital`;

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
        text: { body: mensagem }
      }),
    });

    const waData = await waResponse.json();

    if (!waResponse.ok) {
      console.error('Erro da API WhatsApp:', JSON.stringify(waData));
      return Response.json({
        error: 'Erro ao enviar mensagem via WhatsApp Business',
        details: waData?.error?.message || JSON.stringify(waData)
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: 'Mensagem enviada com sucesso via WhatsApp',
      recipient: recipientName,
      phone: formattedPhone,
      message_id: waData.messages?.[0]?.id,
    });

  } catch (error) {
    console.error('Erro ao enviar certificado WhatsApp:', error.message);
    return Response.json({
      error: 'Erro ao processar solicitação',
      details: error.message
    }, { status: 500 });
  }
});