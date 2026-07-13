import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import nodemailer from 'npm:nodemailer@6.9.10';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let payload = {};
    try { payload = await req.json(); } catch (_) { payload = {}; }

    let user = null;
    try { user = await base44.auth.me(); } catch (_) { user = null; }
    const isAdmin = user && ['admin', 'gestor_master', 'Administrador Master'].includes(user.role || '');
    if (user && !isAdmin) {
      return Response.json({ error: 'Sem permissão' }, { status: 403 });
    }
    // Reenvio manual exige administrador autenticado
    if (payload.message_id && !isAdmin) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const svc = base44.asServiceRole;
    const agora = new Date();

    let fila = [];
    if (payload.message_id) {
      const msgs = await svc.entities.FilaMensagem.filter({ id: payload.message_id });
      if (!msgs.length) return Response.json({ error: 'Mensagem não encontrada' }, { status: 404 });
      // Reenvio manual: reinicia contadores
      await svc.entities.FilaMensagem.update(msgs[0].id, { status: 'Pendente', tentativas: 0, erro: '' });
      fila = [{ ...msgs[0], tentativas: 0 }];
    } else {
      const pendentes = await svc.entities.FilaMensagem.filter({ status: 'Pendente' }, 'created_date', 25);
      fila = pendentes.filter((m) => !m.proximo_envio_em || new Date(m.proximo_envio_em) <= agora);
    }

    const resultados = [];
    for (const msg of fila) {
      await svc.entities.FilaMensagem.update(msg.id, { status: 'Processando' });
      let sucesso = false;
      let erro = '';
      let providerId = '';

      try {
        if (msg.canal === 'WhatsApp') {
          const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
          const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
          if (!accessToken || !phoneNumberId) throw new Error('Credenciais do WhatsApp Business não configuradas');
          let tel = (msg.destinatario || '').replace(/\D/g, '');
          if (!tel) throw new Error('Telefone do destinatário inválido');
          if (!tel.startsWith('55')) tel = '55' + tel;
          const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messaging_product: 'whatsapp', to: tel, type: 'text', text: { body: msg.mensagem } }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error?.message || 'Erro na API do WhatsApp Business');
          providerId = data.messages?.[0]?.id || '';
          sucesso = true;
        } else {
          // E-mail — canal principal: SMTP UOL; fallback: integração nativa
          const smtpEmail = Deno.env.get('UOL_SMTP_EMAIL');
          const smtpPassword = Deno.env.get('UOL_SMTP_PASSWORD');
          const htmlBody = (msg.mensagem || '').replace(/\n/g, '<br>');
          if (smtpEmail && smtpPassword) {
            const transporter = nodemailer.createTransport({
              host: 'smtp.uol.com.br', port: 587, secure: false,
              auth: { user: smtpEmail, pass: smtpPassword },
            });
            const info = await transporter.sendMail({
              from: smtpEmail, to: msg.destinatario,
              subject: msg.assunto || 'CAT Cursos', html: htmlBody,
            });
            providerId = info.messageId || '';
          } else {
            await svc.integrations.Core.SendEmail({
              to: msg.destinatario, subject: msg.assunto || 'CAT Cursos',
              body: htmlBody, from_name: 'CAT Cursos',
            });
          }
          sucesso = true;
        }
      } catch (e) {
        erro = e.message || String(e);
      }

      if (sucesso) {
        await svc.entities.FilaMensagem.update(msg.id, {
          status: 'Enviada', enviada_em: new Date().toISOString(), erro: '', provider_message_id: providerId,
        });
        resultados.push({ id: msg.id, status: 'Enviada' });
      } else {
        const tentativas = (msg.tentativas || 0) + 1;
        const maxT = msg.max_tentativas || 3;
        const falhou = tentativas >= maxT;
        const backoffMin = 5 * Math.pow(2, tentativas - 1); // 5, 10, 20 minutos
        const updateData = {
          status: falhou ? 'Falha no envio' : 'Pendente',
          tentativas,
          erro,
        };
        if (!falhou) {
          updateData.proximo_envio_em = new Date(Date.now() + backoffMin * 60000).toISOString();
        }
        await svc.entities.FilaMensagem.update(msg.id, updateData);
        if (falhou) {
          await svc.entities.AuditLog.create({
            user_email: user?.email || 'sistema',
            user_name: user?.full_name || 'Sistema (Fila de Comunicação)',
            action: 'update',
            entity_type: 'FilaMensagem',
            entity_id: msg.id,
            entity_name: `${msg.canal} → ${msg.destinatario}`,
            details: `Fila de Comunicação: FALHA DEFINITIVA após ${tentativas} tentativas | erro: ${erro}`,
          }).catch(() => {});
        }
        resultados.push({ id: msg.id, status: falhou ? 'Falha no envio' : 'Pendente (retry agendado)', erro });
      }
    }

    return Response.json({ success: true, processadas: resultados.length, resultados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});