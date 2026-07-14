import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const roles = ['gestor_master','admin','comercial','financeiro','coordenacao','certificacao','atendimento','instrutor','aluno','empresa','auditor','editor','cliente','personalizado'];
const customRoleByProfile = { gestor_master: 'Administrador Master', admin: 'Administrador Master', comercial: 'Atendimento', atendimento: 'Atendimento', financeiro: 'Financeiro', coordenacao: 'Coordenador de Operações', certificacao: 'Certificação', instrutor: 'Instrutor', empresa: 'PortalEmpresa', auditor: 'Certificação' };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const operator = await base44.auth.me();
    if (!operator) return Response.json({ error: 'Não autenticado' }, { status: 401 });
    const callers = await base44.asServiceRole.entities.UserProfile.filter({ user_email: operator.email });
    const master = callers.find((p) => p.user_id === operator.id && p.role === 'gestor_master' && p.status === 'active');
    if (operator.role !== 'admin' && !master) return Response.json({ error: 'Sem autorização para alterar perfis' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    if (!body.profile_id || !roles.includes(body.role)) return Response.json({ error: 'Perfil ou papel inválido' }, { status: 400 });
    const profile = await base44.asServiceRole.entities.UserProfile.get(body.profile_id);
    if (!profile) return Response.json({ error: 'Perfil não encontrado' }, { status: 404 });
    const sameEmail = await base44.asServiceRole.entities.UserProfile.filter({ user_email: profile.user_email });
    if (sameEmail.length !== 1) return Response.json({ error: 'Perfil duplicado; reconcilie antes de alterar' }, { status: 409 });
    await base44.asServiceRole.entities.UserProfile.update(profile.id, {
      user_name: String(body.user_name || profile.user_name || '').slice(0, 150),
      phone: String(body.phone || '').slice(0, 30),
      role: body.role,
    });
    let targetUser = profile.user_id ? await base44.asServiceRole.entities.User.get(profile.user_id).catch(() => null) : null;
    if (!targetUser) {
      const users = await base44.asServiceRole.entities.User.filter({ email: profile.user_email });
      if (users.length > 1) return Response.json({ error: 'Conta duplicada para o e-mail' }, { status: 409 });
      targetUser = users[0] || null;
      if (targetUser) await base44.asServiceRole.entities.UserProfile.update(profile.id, { user_id: targetUser.id });
    }
    if (targetUser) await base44.asServiceRole.entities.User.update(targetUser.id, {
      role: ['gestor_master', 'admin'].includes(body.role) ? 'admin' : 'user',
      custom_role: customRoleByProfile[body.role] || null,
      permissions: profile.permissions || [],
      company_permissions: profile.company_permissions || [],
      student_id: profile.student_id || null,
      cpf: profile.cpf || null,
      instructor_id: profile.instructor_id || null,
    });
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: operator.email,
      user_name: operator.full_name || operator.email,
      action: 'update',
      entity_type: 'UserProfile',
      entity_id: profile.id,
      entity_name: profile.user_email,
      details: JSON.stringify({ result: 'confirmed', previous_role: profile.role, next_role: body.role, linked_user_id: targetUser?.id || null }),
    });
    return Response.json({ success: true, linked: Boolean(targetUser), role: body.role });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});