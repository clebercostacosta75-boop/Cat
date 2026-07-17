import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const operator = await base44.auth.me();
    if (!operator) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const operatorProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: operator.id });
    const isAdmin = operator.role === 'admin' || operatorProfiles.some((p) => ['admin', 'gestor_master'].includes(p.role) && p.status === 'active');
    if (!isAdmin) return Response.json({ error: 'Apenas administradores podem concluir vínculos' }, { status: 403 });

    const { profile_id, app_url } = await req.json();
    if (!profile_id) return Response.json({ error: 'Perfil obrigatório' }, { status: 400 });
    const profile = await base44.asServiceRole.entities.UserProfile.get(profile_id);
    if (!profile) return Response.json({ error: 'Perfil não encontrado' }, { status: 404 });

    const email = String(profile.user_email || '').trim().toLowerCase();
    const sameProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email: email });
    if (sameProfiles.length !== 1) return Response.json({ success: false, code: 'duplicate_profile', error: 'Há perfis duplicados para este e-mail; nenhum dado foi alterado.' }, { status: 409 });

    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const matches = users.filter((u) => String(u.email || '').trim().toLowerCase() === email);
    if (matches.length === 0) {
      if (!app_url) return Response.json({ success: false, code: 'account_missing', error: 'Conta real ainda não criada e URL de ativação ausente.' }, { status: 400 });
      const inviteResponse = await base44.functions.invoke('convidarUsuario', { email, user_name: profile.user_name, role: profile.role, profile_id: profile.id, app_url });
      const invite = inviteResponse?.data || inviteResponse;
      if (!invite?.success) return Response.json(invite, { status: 400 });
      return Response.json({ success: true, code: 'activation_invite_resent', invitation_sent: true, activation_url: invite.activation_url, message: 'Conta real ainda não criada. Convite de ativação reenviado. Após o usuário criar a senha, o perfil será vinculado automaticamente.' });
    }
    if (matches.length > 1) return Response.json({ success: false, code: 'duplicate_user', error: 'Há contas duplicadas para este e-mail; nenhum dado foi alterado.' }, { status: 409 });

    const user = matches[0];
    const permissions = profile.permissions || [];
    const status = profile.password_changed ? 'active' : profile.status;
    await base44.asServiceRole.entities.UserProfile.update(profile.id, { user_id: user.id, user_email: email, status });
    await base44.asServiceRole.entities.User.update(user.id, {
      role: ['admin', 'gestor_master'].includes(profile.role) ? 'admin' : (profile.role || 'user'),
      permissions,
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
      entity_name: profile.user_name || email,
      details: JSON.stringify({ event: 'account_link_completed', user_id: user.id, status, permissions_preserved: permissions.length, at: new Date().toISOString() }),
    });
    return Response.json({ success: true, user_id: user.id, status, permissions, message: status === 'active' ? 'Conta vinculada e acesso sincronizado.' : 'Conta vinculada. O usuário ainda precisa concluir o primeiro acesso.' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});