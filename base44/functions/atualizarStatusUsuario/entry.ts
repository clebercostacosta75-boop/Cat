import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const operator = await base44.auth.me();
    if (!operator) return Response.json({ error: 'Não autenticado' }, { status: 401 });
    const callers = await base44.asServiceRole.entities.UserProfile.filter({ user_email: operator.email });
    const master = callers.find((p) => p.user_id === operator.id && p.role === 'gestor_master' && p.status === 'active');
    if (operator.role !== 'admin' && !master) return Response.json({ error: 'Sem autorização' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    if (!body.profile_id || !['active', 'blocked'].includes(body.status)) return Response.json({ error: 'Status inválido' }, { status: 400 });
    const profile = await base44.asServiceRole.entities.UserProfile.get(body.profile_id);
    if (!profile) return Response.json({ error: 'Perfil não encontrado' }, { status: 404 });
    if (profile.user_id === operator.id && body.status === 'blocked') return Response.json({ error: 'Não é permitido bloquear a própria conta' }, { status: 400 });
    await base44.asServiceRole.entities.UserProfile.update(profile.id, { status: body.status });
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: operator.email,
      user_name: operator.full_name || operator.email,
      action: body.status === 'blocked' ? 'block_user' : 'unblock_user',
      entity_type: 'UserProfile',
      entity_id: profile.id,
      entity_name: profile.user_email,
      details: JSON.stringify({ previous_status: profile.status, next_status: body.status, reason: String(body.reason || '').slice(0, 500) }),
    });
    return Response.json({ success: true, status: body.status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});