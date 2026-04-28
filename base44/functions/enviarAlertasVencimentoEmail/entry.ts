import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// TWILIO_ATIVO = false por padrão. Quando secrets forem preenchidos, mudar para true na ConfigNotificacoes.
const TWILIO_ATIVO_DEFAULT = false;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Aceita chamada de automação agendada (sem user) ou chamada autenticada
    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      isAdmin = user?.role === 'admin';
    } catch (_) { /* automação agendada, sem usuário */ }

    const body = await req.json().catch(() => ({}));
    const days = body?.days ?? body?.args?.days ?? 30;

    // Buscar config de notificações
    const configs = await base44.asServiceRole.entities.ConfigNotificacoes.filter({ chave: 'global' });
    const config = configs[0] || {};
    const emailAtivo = config.email_ativo !== false; // default true
    const twilioAtivo = config.twilio_ativo === true;

    if (!emailAtivo && !twilioAtivo) {
      return Response.json({ success: false, message: 'Notificações desativadas na configuração.' });
    }

    // Calcular data alvo
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const alvoDate = new Date(hoje);
    alvoDate.setDate(alvoDate.getDate() + Number(days));
    const alvoStr = alvoDate.toISOString().split('T')[0];

    // Buscar certificados que vencem nessa data
    const certs = await base44.asServiceRole.entities.Certificate.filter({ valid_until: alvoStr });

    let enviados = 0, erros = 0;
    const evento = `${days}dias`;

    // Template de e-mail padrão ou customizado
    const emailTemplates = {
      30: config.email_30dias || 'Olá {nome_aluno}, seu certificado de <b>{curso}</b> na empresa <b>{empresa}</b> vence em <b>30 dias</b> ({data_vencimento}). Renove com antecedência!',
      15: config.email_15dias || 'Atenção {nome_aluno}! Seu certificado de <b>{curso}</b> vence em <b>15 dias</b> ({data_vencimento}). Agende sua reciclagem.',
      5:  config.email_5dias  || '⚠️ URGENTE, {nome_aluno}! Seu certificado de <b>{curso}</b> vence em <b>5 dias</b> ({data_vencimento}). Contate-nos imediatamente.',
    };
    const assunto = config.email_assunto_padrao || `⚠️ Certificado vence em ${days} dias`;

    for (const cert of certs) {
      const vars = {
        '{nome_aluno}': cert.student_name || '',
        '{empresa}': cert.client_name || '',
        '{curso}': cert.course_name || '',
        '{data_vencimento}': cert.valid_until ? cert.valid_until.split('-').reverse().join('/') : '',
        '{dias_restantes}': String(days),
        '{link_assinatura}': '',
      };

      const replaceVars = (text) => Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(k, v), text || '');

      // EMAIL
      if (emailAtivo && cert.student_email) {
        const corpo = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:#1a3a5c;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
              <h2 style="margin:0;">⚠️ Aviso de Vencimento de Certificado</h2>
            </div>
            <div style="background:#f9f9f9;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
              <p style="font-size:15px;color:#374151;">${replaceVars(emailTemplates[days] || emailTemplates[30])}</p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
              <p style="font-size:12px;color:#9ca3af;">CAT Cursos e Treinamentos</p>
            </div>
          </div>`;

        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: cert.student_email,
            subject: replaceVars(assunto),
            body: corpo,
          });
          await base44.asServiceRole.entities.LogNotificacoes.create({
            aluno_nome: cert.student_name,
            aluno_email: cert.student_email,
            empresa_nome: cert.client_name,
            curso_nome: cert.course_name,
            certificado_id: cert.id,
            tipo: 'email',
            evento,
            status: 'enviado',
            data_envio: new Date().toISOString(),
          });
          enviados++;
        } catch (err) {
          await base44.asServiceRole.entities.LogNotificacoes.create({
            aluno_nome: cert.student_name,
            aluno_email: cert.student_email,
            empresa_nome: cert.client_name,
            curso_nome: cert.course_name,
            certificado_id: cert.id,
            tipo: 'email',
            evento,
            status: 'erro',
            data_envio: new Date().toISOString(),
            mensagem_erro: err.message,
          });
          erros++;
        }
      }

      // WHATSAPP/SMS via Twilio (só executa se TWILIO_ATIVO = true)
      if (twilioAtivo) {
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

        if (accountSid && authToken && fromNumber && cert.student_phone) {
          const waMsgTemplates = {
            30: config.whatsapp_30dias || 'Olá {nome_aluno}, seu certificado de {curso} vence em 30 dias ({data_vencimento}). Renove com antecedência!',
            15: config.whatsapp_15dias || 'Atenção {nome_aluno}! Certificado de {curso} vence em 15 dias ({data_vencimento}).',
            5:  config.whatsapp_5dias  || '⚠️ URGENTE {nome_aluno}! Certificado de {curso} vence em 5 dias ({data_vencimento})!',
          };
          const msgBody = replaceVars(waMsgTemplates[days] || waMsgTemplates[30]);
          const toWA = `whatsapp:${cert.student_phone}`;
          const fromWA = `whatsapp:${fromNumber}`;

          try {
            const twilioRes = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
              {
                method: 'POST',
                headers: {
                  'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({ From: fromWA, To: toWA, Body: msgBody }),
              }
            );
            const twilioData = await twilioRes.json();
            await base44.asServiceRole.entities.LogNotificacoes.create({
              aluno_nome: cert.student_name,
              aluno_email: cert.student_email,
              empresa_nome: cert.client_name,
              curso_nome: cert.course_name,
              certificado_id: cert.id,
              tipo: 'whatsapp',
              evento,
              status: twilioData.sid ? 'enviado' : 'erro',
              data_envio: new Date().toISOString(),
              mensagem_erro: twilioData.sid ? null : JSON.stringify(twilioData),
            });
          } catch (err) {
            await base44.asServiceRole.entities.LogNotificacoes.create({
              aluno_nome: cert.student_name,
              tipo: 'whatsapp', evento, status: 'erro',
              data_envio: new Date().toISOString(), mensagem_erro: err.message,
            });
          }
        }
      }
    }

    return Response.json({ success: true, days, total: certs.length, enviados, erros });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});