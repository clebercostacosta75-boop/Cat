import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Edição de permissões: SOMENTE gestor_master ativo e corretamente vinculado.
// Nunca retorna 404 para o frontend — respostas 200 com success:false e mensagem clara.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    // Autorização do chamador: perfil gestor_master, ativo, vinculado ao user_id
    const callerProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email: user.email });
    const callerProfile = callerProfiles.find(p => p.user_id === user.id) || null;
    const isGestorMasterAtivo = !!callerProfile
      && callerProfile.role === 'gestor_master'
      && callerProfile.status === 'active';

    if (!isGestorMasterAtivo) {
      return Response.json({ error: 'Sem permissão. Apenas Gestor Master ativo pode alterar permissões.' }, { status: 403 });
    }

    const { profile_id, user_email, permissions, role } = await req.json();

    // Resolver o UserProfile real pelo ID (preferencial) ou e-mail
    let target = null;
    if (profile_id) {
      try { target = await base44.asServiceRole.entities.UserProfile.get(profile_id); } catch { target = null; }
    }
    if (!target && user_email) {
      const found = await base44.asServiceRole.entities.UserProfile.filter({ user_email });
      target = found.find(p => p.user_id) || found[0] || null;
    }

    if (!target) {
      return Response.json({ success: false, error: 'Perfil não encontrado — nenhuma alteração realizada.' }, { status: 200 });
    }

    if (!target.user_id) {
      return Response.json({ success: false, unlinked: true, error: 'Perfil não vinculado — execute a reconciliação' }, { status: 200 });
    }

    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = permissions;

    if (Object.keys(updateData).length === 0) {
      return Response.json({ success: false, error: 'Nada para atualizar.' }, { status: 200 });
    }

    await base44.asServiceRole.entities.UserProfile.update(target.id, updateData);

    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      user_name: user.full_name || user.email,
      action: 'update',
      entity_type: 'UserProfile',
      entity_id: target.id,
      entity_name: target.user_email,
      details: `Permissões/perfil atualizados por gestor_master. Campos: ${Object.keys(updateData).join(', ')} em ${new Date().toISOString()}`,
    });

    return Response.json({ success: true, message: 'Perfil atualizado com sucesso.' });
  } catch (error) {
    return Response.json({ error: 'Erro ao atualizar perfil', details: error.message }, { status: 500 });
  }
});