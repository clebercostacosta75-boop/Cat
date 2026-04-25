import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import nodemailer from 'npm:nodemailer@6.9.10';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, body, attachmentPath } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    const smtpEmail = Deno.env.get('UOL_SMTP_EMAIL');
    const smtpPassword = Deno.env.get('UOL_SMTP_PASSWORD');

    if (!smtpEmail || !smtpPassword) {
      return Response.json({ error: 'SMTP credentials not configured' }, { status: 500 });
    }

    // Configurar transporter SMTP da UOL
    const transporter = nodemailer.createTransport({
      host: 'smtp.uol.com.br',
      port: 587,
      secure: false,
      auth: {
        user: smtpEmail,
        pass: smtpPassword
      }
    });

    // Opções de envio
    const mailOptions = {
      from: smtpEmail,
      to: to,
      subject: subject,
      html: body
    };

    // Adicionar anexo se fornecido
    if (attachmentPath) {
      mailOptions.attachments = [
        {
          filename: attachmentPath.split('/').pop(),
          path: attachmentPath
        }
      ];
    }

    // Enviar e-mail
    const info = await transporter.sendMail(mailOptions);

    return Response.json({
      success: true,
      messageId: info.messageId,
      message: 'E-mail enviado com sucesso via UOL'
    });

  } catch (error) {
    console.error('Erro ao enviar e-mail UOL:', error);
    return Response.json({ 
      error: 'Erro ao enviar e-mail: ' + error.message 
    }, { status: 500 });
  }
});