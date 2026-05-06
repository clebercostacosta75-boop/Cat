import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const allowedRoles = ['admin', 'Administrador Master', 'gestor_master'];
    const userRole = user.role || user.custom_role || '';
    if (!allowedRoles.includes(userRole)) {
      return Response.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { user_email, permissions, profile_id } = await req.json();
    if (!user_email) {
      return Response.json({ error: 'user_email é obrigatório' }, { status: 400 });
    }

    // 1. Buscar o UserProfile pelo email para garantir o id correto do registro
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email });
    if (profiles.length === 0) {
      return Response.json({ error: 'Perfil não encontrado para este e-mail' }, { status: 404 });
    }
    const profileToUpdate = profiles[0];
    await base44.asServiceRole.entities.UserProfile.update(profileToUpdate.id, { permissions });

    // 2. Salva no User da plataforma (usado pelo Layout para montar o menu)
    const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
    if (users.length > 0) {
      await base44.asServiceRole.entities.User.update(users[0].id, { permissions });
    }

    return Response.json({ success: true, message: 'Permissões atualizadas com sucesso.' });
  } catch (error) {
    return Response.json({ error: 'Erro ao atualizar permissões', details: error.message }, { status: 500 });
  }
});