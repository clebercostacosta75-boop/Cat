import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const normalize = (value) => String(value || '').trim().toLowerCase();
const redirects = { usuario_cat: '/', aluno: '/PortalAluno', empresa: '/CompanyPortal', instrutor: '/PortalInstrutor', contratada: '/' };
async function hashToken(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    if (!body.token || String(body.token).length < 32) return Response.json({ error: 'Link inválido ou expirado.' }, { status: 400 });
    const found = await base44.asServiceRole.entities.AccessAccount.filter({ token_hash: await hashToken(String(body.token)) });
    const account = found[0];
    const now = new Date();
    if (!account || account.token_used_at || account.status === 'acesso_revogado') return Response.json({ error: 'Link inválido ou já utilizado.' }, { status: 400 });
    if (!account.token_expires_at || new Date(account.token_expires_at) < now) {
      await base44.asServiceRole.entities.AccessAccount.update(account.id, { status: 'link_expirado' });
      await base44.asServiceRole.entities.AuditLog.create({ user_email: account.email, user_name: account.person_name, action: 'update', entity_type: 'AccessAccount', entity_id: account.id, entity_name: account.person_name, details: JSON.stringify({ event: 'activation_token_expired', at: now.toISOString() }) });
      return Response.json({ error: 'Link expirado. Solicite um novo acesso.' }, { status: 400 });
    }
    const duplicates = await base44.asServiceRole.entities.AccessAccount.filter({ email: normalize(account.email) });
    if (duplicates.length !== 1) return Response.json({ error: 'Existem contas duplicadas para este e-mail.' }, { status: 409 });
    const accountExists = Boolean(account.user_id);

    if (body.action === 'inspect') {
      await base44.asServiceRole.entities.AuditLog.create({ user_email: account.email, user_name: account.person_name, action: 'view', entity_type: 'AccessAccount', entity_id: account.id, entity_name: account.person_name, details: JSON.stringify({ event: 'activation_link_accessed', at: now.toISOString() }) });
      return Response.json({ valid: true, recipient_name: account.person_name, recipient_email: normalize(account.email), access_type: account.access_type, role: account.profile, portal: account.allowed_portal, modules_count: account.allowed_modules?.length || 0, expires_at: account.token_expires_at, account_exists: accountExists });
    }
    if (body.action !== 'complete') return Response.json({ error: 'Ação inválida.' }, { status: 400 });
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Conclua a criação ou o login da conta.', requires_login: true }, { status: 401 });
    if (normalize(user.email) !== normalize(account.email)) return Response.json({ error: 'O e-mail autenticado não corresponde ao link.' }, { status: 403 });
    if (account.user_id && account.user_id !== user.id) return Response.json({ error: 'Esta conta já está vinculada a outro usuário.' }, { status: 409 });

    await base44.asServiceRole.entities.AccessAccount.update(account.id, {
      user_id: user.id, status: 'ativo', activated_at: account.activated_at || now.toISOString(),
      token_used_at: now.toISOString(), token_hash: '', terms_accepted_at: body.terms_accepted ? now.toISOString() : account.terms_accepted_at,
    });
    if (account.user_profile_id) {
      const profileUpdate = { user_id: user.id, user_email: normalize(user.email), status: 'active', password_changed: true };
      if (body.terms_accepted) { profileUpdate.consent_accepted_at = now.toISOString(); profileUpdate.consent_term_version = 'v1.0'; }
      await base44.asServiceRole.entities.UserProfile.update(account.user_profile_id, profileUpdate);
    }
    await base44.asServiceRole.entities.User.update(user.id, {
      role: ['admin', 'gestor_master'].includes(account.profile) ? 'admin' : (account.profile || 'user'),
      permissions: account.access_type === 'usuario_cat' ? (account.allowed_modules || []) : [],
      company_permissions: account.company_id ? [{ company_id: account.company_id, permissions: ['view'] }] : [],
      student_id: account.student_id || null, cpf: account.cpf || null, instructor_id: account.instructor_id || null,
    });
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email, user_name: user.full_name || account.person_name, action: 'update', entity_type: 'AccessAccount',
      entity_id: account.id, entity_name: account.person_name,
      details: JSON.stringify({ event: 'access_account_activated', user_id: user.id, access_type: account.access_type, portal: account.allowed_portal, modules: account.allowed_modules?.length || 0, token_used: true, password_created: !accountExists, at: now.toISOString() }),
    });
    return Response.json({ success: true, user_id: user.id, status: 'ativo', permissions_count: account.allowed_modules?.length || 0, redirect_to: redirects[account.access_type] || '/' });
  } catch (error) {
    return Response.json({ error: error.message || 'Não foi possível ativar a conta.' }, { status: 500 });
  }
});