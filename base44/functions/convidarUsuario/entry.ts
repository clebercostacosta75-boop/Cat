import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import nodemailer from 'npm:nodemailer@6.9.10';

const normalize = (value) => String(value || '').trim().toLowerCase();
const labels = { usuario_cat: 'Usuário interno CAT', aluno: 'Aluno', empresa: 'Empresa', instrutor: 'Instrutor', contratada: 'Contratada' };
async function hashToken(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const operator = await base44.auth.me();
    if (!operator) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (operator.role !== 'admin') return Response.json({ error: 'Sem permissão' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const appUrl = String(body.app_url || req.headers.get('origin') || (host ? 'https://' + host : ''));
    if (body.action === 'resolve_url') return Response.json({ app_url: appUrl, app_id: Deno.env.get('BASE44_APP_ID') || '' });
    if (!appUrl.startsWith('http')) return Response.json({ error: 'URL do aplicativo inválida' }, { status: 400 });

    let account = body.account_id ? await base44.asServiceRole.entities.AccessAccount.get(body.account_id) : null;
    if (!account && body.profile_id) {
      const profile = await base44.asServiceRole.entities.UserProfile.get(body.profile_id);
      if (!profile || normalize(profile.user_email) !== normalize(body.email)) return Response.json({ error: 'Perfil e e-mail não correspondem' }, { status: 409 });
      const found = await base44.asServiceRole.entities.AccessAccount.filter({ user_profile_id: profile.id });
      account = found[0] || await base44.asServiceRole.entities.AccessAccount.create({
        access_type: 'usuario_cat', person_name: String(profile.user_name || body.user_name).trim(), email: normalize(profile.user_email),
        phone: profile.phone || '', user_profile_id: profile.id, profile: profile.role, allowed_modules: profile.permissions || [],
        allowed_portal: 'interno', status: 'aguardando_ativacao', created_by_email: operator.email,
      });
    }
    if (!account) return Response.json({ error: 'Conta de acesso não encontrada' }, { status: 404 });
    const duplicates = await base44.asServiceRole.entities.AccessAccount.filter({ email: normalize(account.email) });
    if (duplicates.length !== 1) return Response.json({ error: 'Há contas duplicadas para este e-mail' }, { status: 409 });

    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const accountExists = users.some((user) => normalize(user.email) === normalize(account.email));
    await base44.users.inviteUser(normalize(account.email), ['admin', 'gestor_master'].includes(account.profile) ? 'admin' : 'user');
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const baseUrl = appUrl.replace(/\/$/, '');
    const activationUrl = baseUrl + '/ativar-conta?token=' + token;
    const event = account.last_invite_sent_at ? 'activation_link_resent' : 'activation_link_sent';
    await base44.asServiceRole.entities.AccessAccount.update(account.id, {
      token_hash: await hashToken(token), token_expires_at: expiresAt, token_used_at: null,
      status: 'aguardando_ativacao', last_invite_sent_at: now,
    });

    const smtpEmail = Deno.env.get('UOL_SMTP_EMAIL');
    const smtpPassword = Deno.env.get('UOL_SMTP_PASSWORD');
    if (!smtpEmail || !smtpPassword) return Response.json({ error: 'Serviço de e-mail não configurado' }, { status: 500 });
    const transporter = nodemailer.createTransport({ host: 'smtp.uol.com.br', port: 587, secure: false, auth: { user: smtpEmail, pass: smtpPassword } });
    const html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937"><h2>Olá, ' + escapeHtml(account.person_name) + '.</h2><p>Seu acesso ao Portal CAT Cursos foi criado.</p><p><strong>Tipo de acesso:</strong> ' + escapeHtml(labels[account.access_type] || account.access_type) + '</p><p>Para ativar sua conta, clique abaixo e crie sua senha:</p><p style="margin:28px 0"><a href="' + activationUrl + '" style="background:#111827;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Ativar meu acesso</a></p><p style="font-size:12px;color:#6b7280">Link pessoal, válido por 72 horas e de uso único.</p><p>CAT Cursos</p></div>';
    await transporter.sendMail({ from: 'CAT Cursos <' + smtpEmail + '>', to: normalize(account.email), subject: 'Ative seu acesso ao Portal CAT Cursos', html });
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: operator.email, user_name: operator.full_name || operator.email, action: 'send_credentials',
      entity_type: 'AccessAccount', entity_id: account.id, entity_name: account.person_name,
      details: JSON.stringify({ event, access_type: account.access_type, expires_at: expiresAt, modules: account.allowed_modules?.length || 0, account_existed_at_send: accountExists, at: now }),
    });
    return Response.json({ success: true, activation_url: activationUrl, expires_at: expiresAt, message: 'Link de ativação enviado.' });
  } catch (error) {
    return Response.json({ error: 'Erro ao enviar link de ativação', details: error.message }, { status: 500 });
  }
});