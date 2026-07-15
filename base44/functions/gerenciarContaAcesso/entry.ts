import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const STATUS_BY_ACTION = { block: 'bloqueado', reactivate: 'ativo', revoke: 'acesso_revogado', inactivate: 'inativo' };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const operator = await base44.auth.me();
    if (!operator) return Response.json({ error: 'Não autenticado' }, { status: 401 });
    if (operator.role !== 'admin') return Response.json({ error: 'Sem permissão' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const account = await base44.asServiceRole.entities.AccessAccount.get(body.account_id);
    if (!account) return Response.json({ error: 'Conta não encontrada' }, { status: 404 });
    if (body.action === 'test_permissions') return Response.json({ success: true, access_type: account.access_type, status: account.status, portal: account.allowed_portal, modules: account.access_type === 'usuario_cat' ? (account.allowed_modules || []) : [], linked: !!account.user_id });
    const status = STATUS_BY_ACTION[body.action];
    if (!status) return Response.json({ error: 'Ação inválida' }, { status: 400 });
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.AccessAccount.update(account.id, { status, last_status_changed_at: now, revoked_at: status === 'acesso_revogado' ? now : account.revoked_at });
    if (account.user_profile_id) await base44.asServiceRole.entities.UserProfile.update(account.user_profile_id, { status: status === 'ativo' ? 'active' : 'blocked' });
    await base44.asServiceRole.entities.AuditLog.create({ user_email: operator.email, user_name: operator.full_name || operator.email, action: status === 'bloqueado' ? 'block_user' : 'update', entity_type: 'AccessAccount', entity_id: account.id, entity_name: account.person_name, details: JSON.stringify({ event: `access_account_${body.action}`, previous_status: account.status, status, at: now }) });
    return Response.json({ success: true, status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});