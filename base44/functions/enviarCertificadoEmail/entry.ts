import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import nodemailer from 'npm:nodemailer@6.9.10';

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { certificate_id } = body;
    const appUrl = (body.app_url || 'https://catcursos.com').replace(/\/$/, '');
    if (!certificate_id) return Response.json({ error: 'certificate_id é obrigatório' }, { status: 400 });

    const certs = await base44.asServiceRole.entities.Certificate.filter({ id: certificate_id });
    const cert = certs[0];
    if (!cert) return Response.json({ error: 'Certificado não encontrado' }, { status: 404 });

    // E-mail: do certificado ou do cadastro do aluno
    let email = (cert.student_email || '').trim().toLowerCase();
    if (!email && cert.student_id) {
      const students = await base44.asServiceRole.entities.Student.filter({ id: cert.student_id });
      email = (students[0]?.email || '').trim().toLowerCase();
    }
    if (!email) return Response.json({ error: 'Aluno não possui e-mail cadastrado.' }, { status: 400 });

    const signUrl = `${appUrl}/CertificateSign?code=${encodeURIComponent(cert.certificate_code || '')}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color:#1f2937;">
        <div style="background: #1a3a5c; color: white; padding: 20px; text-align: center;">
          <h2 style="margin:0;">CAT Cursos de Aprimoramento do Trabalhador</h2>
          <p style="margin:4px 0; font-size: 12px;">CNPJ: 07.238.084/0001-45</p>
        </div>
        <div style="padding: 24px;">
          <p>Olá, <strong>${escapeHtml(cert.student_name)}</strong>! 🎓</p>
          <p>Seu certificado do curso <strong>${escapeHtml(cert.course_name)}</strong> está disponível para conferência e assinatura digital.</p>
          <div style="background: #e3f2fd; border: 1px solid #1565c0; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px; font-weight: bold; color: #1565c0;">📋 Detalhes do Certificado</p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Curso:</strong> ${escapeHtml(cert.course_name)}</p>
            ${cert.course_duration ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Carga Horária:</strong> ${escapeHtml(cert.course_duration)}</p>` : ''}
            ${cert.certificate_code ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Código:</strong> ${escapeHtml(cert.certificate_code)}</p>` : ''}
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${signUrl}" style="background: #1a3a5c; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: bold; display: inline-block;">
              ✍️ Revisar e Assinar Certificado
            </a>
          </div>
          <p style="font-size: 12px; color: #888;">Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:</p>
          <p style="font-size: 11px; color: #1565c0; word-break: break-all;">${signUrl}</p>
          <p style="font-size: 12px; color: #888; margin-top: 20px;">Dúvidas? Entre em contato: (91) 98413-2527</p>
        </div>
        <div style="background: #f5f5f5; padding: 12px; text-align: center; font-size: 10px; color: #888;">
          CAT Cursos — Av. Beira Rio, 1740 — Vila Nova, Barcarena/PA — CNPJ: 07.238.084/0001-45
        </div>
      </div>`;

    const subject = `Certificado — ${cert.course_name} — Assinatura Digital — CAT Cursos`;

    let emailSent = false;
    let emailError = '';
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'CAT Cursos <noreply@catcursos.com>', to: [email], subject, html }),
      });
      if (resendResponse.ok) emailSent = true;
      else emailError = 'Resend: ' + await resendResponse.text();
    }
    const smtpEmail = Deno.env.get('UOL_SMTP_EMAIL');
    const smtpPassword = Deno.env.get('UOL_SMTP_PASSWORD');
    if (!emailSent && smtpEmail && smtpPassword) {
      try {
        const transporter = nodemailer.createTransport({ host: 'smtp.uol.com.br', port: 587, secure: false, auth: { user: smtpEmail, pass: smtpPassword } });
        await transporter.sendMail({ from: 'CAT Cursos <' + smtpEmail + '>', to: email, subject, html });
        emailSent = true;
      } catch (err) {
        emailError += ' | SMTP: ' + err.message;
      }
    }

    if (!emailSent) {
      return Response.json({ error: 'Falha no envio do e-mail', details: emailError }, { status: 500 });
    }

    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      user_name: user.full_name || user.email,
      action: 'send_credentials',
      entity_type: 'Certificate',
      entity_id: cert.id,
      entity_name: cert.student_name,
      details: `Certificado ${cert.certificate_code || cert.id} (${cert.course_name}) enviado para assinatura via e-mail para ${email} em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Belem' })}`,
    });

    return Response.json({ success: true, email_sent_to: email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});