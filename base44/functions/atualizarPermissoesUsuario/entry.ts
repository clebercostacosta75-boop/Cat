import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    // Verificar se quem está chamando é admin da plataforma OU gestor_master no UserProfile
    const allowedPlatformRoles = ['admin'];
    const allowedProfileRoles = ['gestor_master'];

    let canAccess = allowedPlatformRoles.includes(user.role);

    if (!canAccess) {
      // Buscar no UserProfile para verificar gestor_master
      const callerProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email: user.email });
      if (callerProfiles.length > 0 && allowedProfileRoles.includes(callerProfiles[0].role)) {
        canAccess = true;
      }
    }

    if (!canAccess) {
      return Response.json({ error: 'Sem permissão. Apenas Gestores Master podem alterar permissões.' }, { status: 403 });
    }

    const { user_email, permissions, role } = await req.json();
    if (!user_email) {
      return Response.json({ error: 'user_email é obrigatório' }, { status: 400 });
    }

    // Buscar o perfil alvo
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email });
    if (profiles.length === 0) {
      return Response.json({ error: 'Perfil não encontrado para este e-mail' }, { status: 404 });
    }

    const profileToUpdate = profiles[0];
    const updateData = {};

    // Atualiza role se fornecido
    if (role !== undefined) {
      updateData.role = role;
    }

    // Atualiza permissions se fornecido (apenas relevante para perfil "personalizado")
    if (permissions !== undefined) {
      updateData.permissions = permissions;
    }

    await base44.asServiceRole.entities.UserProfile.update(profileToUpdate.id, updateData);

    return Response.json({ success: true, message: 'Perfil atualizado com sucesso.' });
  } catch (error) {
    return Response.json({ error: 'Erro ao atualizar perfil', details: error.message }, { status: 500 });
  }
});