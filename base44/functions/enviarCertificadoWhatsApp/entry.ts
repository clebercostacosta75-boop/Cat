import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { certificate_id } = await req.json();
    if (!certificate_id) return Response.json({ error: 'certificate_id obrigatório' }, { status: 400 });

    // Buscar certificado
    const certs = await base44.entities.Certificate.filter({ id: certificate_id });
    if (!certs || certs.length === 0) return Response.json({ error: 'Certificado não encontrado' }, { status: 404 });
    const cert = certs[0];

    if (!cert.student_phone) return Response.json({ error: 'Telefone do aluno não cadastrado' }, { status: 400 });

    // Montar link de assinatura
    const appUrl = req.headers.get('origin') || 'https://app.base44.com';
    const signLink = `${appUrl}/CertificateSign?code=${cert.certificate_code}`;
    const validateLink = `${appUrl}/CertificateValidate?code=${cert.certificate_code}`;

    // Montar mensagem WhatsApp
    const mensagem = `Olá, ${cert.student_name}.

Seu certificado do curso *${cert.course_name}* está disponível para conferência e assinatura digital.

Acesse o link abaixo para revisar os dados e assinar:
${signLink}

Após a assinatura, seu certificado poderá ser validado em:
${validateLink}

*CAT Cursos*`;

    // Formatar número (remover não-dígitos, adicionar 55 se necessário)
    let phone = cert.student_phone.replace(/\D/g, '');
    if (!phone.startsWith('55')) phone = '55' + phone;

    // Link direto do WhatsApp
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(mensagem)}`;

    // Registrar envio no certificado
    await base44.asServiceRole.entities.Certificate.update(cert.id, {
      whatsapp_sent: true,
      whatsapp_sent_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      whatsapp_url: whatsappUrl,
      phone,
      message: mensagem,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});