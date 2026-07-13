import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import nodemailer from 'npm:nodemailer@6.9.10';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'gestor_master', 'Administrador Master'].includes(user.role || '')) {
      return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const { action, phone } = await req.json();

    if (action === 'status') {
      // Apenas indicadores booleanos — nunca expor valores dos secrets
      return Response.json({
        smtp_uol_configurado: !!(Deno.env.get('UOL_SMTP_EMAIL') && Deno.env.get('UOL_SMTP_PASSWORD')),
        whatsapp_configurado: !!(Deno.env.get('WHATSAPP_ACCESS_TOKEN') && Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')),
        webhook_token_configurado: !!Deno.env.get('WHATSAPP_WEBHOOK_TOKEN'),
        verify_token_configurado: !!Deno.env.get('WHATSAPP_VERIFY_TOKEN'),
        resend_configurada: !!Deno.env.get('RESEND_API_KEY'),
        numero_comercial_configurado: !!Deno.env.get('WHATSAPP_PHONE_NUMBER'),
      });
    }

    if (action === 'test_smtp') {
      const smtpEmail = Deno.env.get('UOL_SMTP_EMAIL');
      const smtpPassword = Deno.env.get('UOL_SMTP_PASSWORD');
      if (!smtpEmail || !smtpPassword) {
        return Response.json({ error: 'Credenciais SMTP UOL não configuradas' }, { status: 400 });
      }
      const transporter = nodemailer.createTransport({
        host: 'smtp.uol.com.br', port: 587, secure: false,
        auth: { user: smtpEmail, pass: smtpPassword },
      });
      await transporter.verify();
      return Response.json({ success: true, message: 'Conexão SMTP UOL verificada com sucesso' });
    }

    if (action === 'test_email') {
      const smtpEmail = Deno.env.get('UOL_SMTP_EMAIL');
      const smtpPassword = Deno.env.get('UOL_SMTP_PASSWORD');
      const corpo = `<p>Este é um e-mail de teste do painel <strong>Administração → Comunicação</strong> do CAT Gestão de Cursos.</p><p>Enviado em ${new Date().toLocaleString('pt-BR')} por ${user.email}.</p>`;
      if (smtpEmail && smtpPassword) {
        const transporter = nodemailer.createTransport({
          host: 'smtp.uol.com.br', port: 587, secure: false,
          auth: { user: smtpEmail, pass: smtpPassword },
        });
        await transporter.sendMail({ from: smtpEmail, to: user.email, subject: 'Teste de envio — CAT Comunicação', html: corpo });
        return Response.json({ success: true, message: `E-mail de teste enviado via SMTP UOL para ${user.email}` });
      }
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email, subject: 'Teste de envio — CAT Comunicação', body: corpo, from_name: 'CAT Cursos',
      });
      return Response.json({ success: true, message: `E-mail de teste enviado (integração nativa) para ${user.email}` });
    }

    if (action === 'test_whatsapp') {
      const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
      const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
      if (!accessToken || !phoneNumberId) {
        return Response.json({ error: 'Credenciais do WhatsApp Business não configuradas' }, { status: 400 });
      }
      let tel = (phone || '').replace(/\D/g, '');
      if (!tel) return Response.json({ error: 'Informe um número de telefone para o teste' }, { status: 400 });
      if (!tel.startsWith('55')) tel = '55' + tel;
      const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp', to: tel, type: 'text',
          text: { body: `✅ Teste de envio — CAT Gestão de Cursos\n\nMensagem de teste do painel de Comunicação, enviada em ${new Date().toLocaleString('pt-BR')}.` },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return Response.json({ error: data?.error?.message || 'Erro na API do WhatsApp Business' }, { status: 500 });
      }
      return Response.json({ success: true, message: `Mensagem de teste enviada para +${tel}` });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});