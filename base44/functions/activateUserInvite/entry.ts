import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const normalize = (value) => String(value || '').trim().toLowerCase();
async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    if (!body.token || String(body.token).length < 32) return Response.json({ error: 'Convite inválido ou expirado.' }, { status: 400 });
    const tokenHash = await sha256Hex(String(body.token));
    const invites = await base44.asServiceRole.entities.UserActivationInvite.filter({ token_hash: tokenHash });
    const invite = invites[0];
    const now = new Date();
    if (!invite || invite.used_at || invite.revoked_at || !['Pending', 'Sent'].includes(invite.status)) return Response.json({ error: 'Convite inválido ou expirado.' }, { status: 400 });
    if (new Date(invite.expires_at) < now) {
      await base44.asServiceRole.entities.UserActivationInvite.update(invite.id, { status: 'Expired' });
      return Response.json({ error: 'Convite inválido ou expirado.' }, { status: 400 });
    }
    const profile = await base44.asServiceRole.entities.UserProfile.get(invite.profile_id);
    if (!profile || normalize(profile.user_email) !== normalize(invite.recipient_email)) return Response.json({ error: 'Convite sem perfil válido.' }, { status: 409 });

    if (body.action === 'inspect') return Response.json({ valid: true, recipient_name: profile.user_name, recipient_email: normalize(profile.user_email), role: profile.role, expires_at: invite.expires_at, account_exists: !!invite.account_existed_at_send });
    if (body.action !== 'complete') return Response.json({ error: 'Ação inválida.' }, { status: 400 });

    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Conclua a criação ou o login da conta.', requires_login: true }, { status: 401 });
    if (normalize(user.email) !== normalize(invite.recipient_email)) return Response.json({ error: 'O e-mail autenticado não corresponde ao convite.' }, { status: 403 });
    const sameProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email: normalize(user.email) });
    if (sameProfiles.length !== 1 || sameProfiles[0].id !== profile.id) return Response.json({ error: 'Há perfis duplicados ou divergentes para este e-mail.' }, { status: 409 });

    const permissions = profile.permissions || [];
    const requiresPasswordChange = !!invite.account_existed_at_send && !profile.password_changed;
    const status = requiresPasswordChange ? 'pending_password_change' : 'active';
    await base44.asServiceRole.entities.UserProfile.update(profile.id, {
      user_id: user.id,
      user_email: normalize(user.email),
      status,
      password_changed: !requiresPasswordChange,
      consent_accepted_at: body.terms_accepted ? now.toISOString() : profile.consent_accepted_at,
      consent_term_version: body.terms_accepted ? 'v1.0' : profile.consent_term_version,
    });
    await base44.asServiceRole.entities.User.update(user.id, {
      role: ['admin', 'gestor_master'].includes(profile.role) ? 'admin' : 'user',
      permissions,
      company_permissions: profile.company_permissions || [],
      student_id: profile.student_id || null,
      cpf: profile.cpf || null,
      instructor_id: profile.instructor_id || null,
    });
    await base44.asServiceRole.entities.UserActivationInvite.update(invite.id, { status: 'Used', used_at: now.toISOString() });
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      user_name: user.full_name || profile.user_name || user.email,
      action: 'update',
      entity_type: 'UserProfile',
      entity_id: profile.id,
      entity_name: profile.user_name || user.email,
      details: JSON.stringify({ event: 'account_activated_and_linked', invite_id: invite.id, user_id: user.id, status, role: profile.role, permissions_preserved: permissions.length, at: now.toISOString() }),
    });
    return Response.json({ success: true, user_id: user.id, status, permissions_count: permissions.length, requires_password_change: requiresPasswordChange, redirect_to: '/' });
  } catch (error) {
    return Response.json({ error: error.message || 'Não foi possível ativar a conta.' }, { status: 500 });
  }
});