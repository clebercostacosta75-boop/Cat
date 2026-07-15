import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import nodemailer from 'npm:nodemailer@6.9.10';

const normalize = (value) => String(value || '').trim().toLowerCase();
const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const operator = await base44.auth.me();
    if (!operator) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    const operatorProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: operator.id });
    const isAdmin = operator.role === 'admin' || operatorProfiles.some((p) => ['admin', 'gestor_master'].includes(p.role) && p.status === 'active');
    if (!isAdmin) return Response.json({ error: 'Sem permissão' }, { status: 403 });

    const { email, role, user_name, profile_id, app_url } = await req.json();
    const normalizedEmail = normalize(email);
    if (!normalizedEmail || !user_name || !profile_id || !/^https?:\/\//.test(String(app_url || ''))) {
      return Response.json({ error: 'E-mail, nome, perfil e URL do aplicativo são obrigatórios' }, { status: 400 });
    }
    const profile = await base44.asServiceRole.entities.UserProfile.get(profile_id);
    if (!profile || normalize(profile.user_email) !== normalizedEmail) return Response.json({ error: 'Perfil e e-mail não correspondem' }, { status: 409 });
    const duplicates = await base44.asServiceRole.entities.UserProfile.filter({ user_email: normalizedEmail });
    if (duplicates.length !== 1) return Response.json({ error: 'Há perfis duplicados para este e-mail' }, { status: 409 });

    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const accountExists = users.some((item) => normalize(item.email) === normalizedEmail);
    await base44.users.inviteUser(normalizedEmail, ['admin', 'gestor_master'].includes(role) ? 'admin' : 'user');

    const previous = await base44.asServiceRole.entities.UserActivationInvite.filter({ profile_id: profile.id });
    for (const oldInvite of previous.filter((item) => ['Pending', 'Sent'].includes(item.status) && !item.used_at && !item.revoked_at)) {
      await base44.asServiceRole.entities.UserActivationInvite.update(oldInvite.id, { status: 'Revoked', revoked_at: new Date().toISOString() });
    }

    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const activationUrl = `${String(app_url).replace(/\/$/, '')}/ativar-conta?token=${token}`;
    const activationInvite = await base44.asServiceRole.entities.UserActivationInvite.create({
      profile_id: profile.id,
      recipient_email: normalizedEmail,
      recipient_name: profile.user_name || user_name,
      role_snapshot: profile.role,
      permissions_snapshot: profile.permissions || [],
      token_hash: tokenHash,
      expires_at: expiresAt,
      status: 'Pending',
      account_existed_at_send: accountExists,
      created_by: operator.email,
    });

    const smtpEmail = Deno.env.get('UOL_SMTP_EMAIL');
    const smtpPassword = Deno.env.get('UOL_SMTP_PASSWORD');
    if (!smtpEmail || !smtpPassword) return Response.json({ error: 'Serviço de e-mail não configurado' }, { status: 500 });
    const transporter = nodemailer.createTransport({ host: 'smtp.uol.com.br', port: 587, secure: false, auth: { user: smtpEmail, pass: smtpPassword } });
    const safeName = escapeHtml(profile.user_name || user_name);
    const safeRole = escapeHtml(profile.role === 'coordenacao' ? 'Coordenação' : profile.role);
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937"><h2>Olá, ${safeName}.</h2><p>Você foi cadastrado no Portal CAT Cursos com o perfil <strong>${safeRole}</strong>.</p><p>Para ativar sua conta, clique no botão abaixo e crie sua senha de acesso:</p><p style="margin:28px 0"><a href="${activationUrl}" style="background:#111827;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Ativar minha conta</a></p><p>Após criar sua senha, você poderá acessar os módulos liberados para o seu perfil.</p><p style="font-size:12px;color:#6b7280">Este link é individual, válido por 72 horas e pode ser usado uma única vez.</p><p>CAT Cursos</p></div>`;
    await transporter.sendMail({ from: `CAT Cursos <${smtpEmail}>`, to: normalizedEmail, subject: 'Ative seu acesso ao Portal CAT Cursos', html });

    const now = new Date().toISOString();
    await base44.asServiceRole.entities.UserActivationInvite.update(activationInvite.id, { status: 'Sent', sent_at: now });
    await base44.asServiceRole.entities.UserProfile.update(profile.id, { status: 'pending_password_change', credentials_sent_at: now, credentials_sent_via: 'email', credentials_sent_by: operator.email });
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: operator.email,
      user_name: operator.full_name || operator.email,
      action: 'send_credentials',
      entity_type: 'UserActivationInvite',
      entity_id: activationInvite.id,
      entity_name: profile.user_name || normalizedEmail,
      details: JSON.stringify({ event: 'activation_invite_sent', profile_id: profile.id, route: '/ativar-conta', expires_at: expiresAt, permissions_preserved: (profile.permissions || []).length, account_existed_at_send: accountExists }),
    });
    return Response.json({ success: true, activation_url: activationUrl, expires_at: expiresAt, message: 'Convite reenviado com link de ativação da conta.' });
  } catch (error) {
    return Response.json({ error: 'Erro ao enviar convite', details: error.message }, { status: 500 });
  }
});