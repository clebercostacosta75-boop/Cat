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
    if (!user_email || !profile_id) {
      return Response.json({ error: 'user_email e profile_id são obrigatórios' }, { status: 400 });
    }

    // 1. Atualiza a entidade UserProfile
    await base44.asServiceRole.entities.UserProfile.update(profile_id, { permissions });

    // 2. Busca o usuário na entidade User pelo email e atualiza o campo permissions
    const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
    if (users.length > 0) {
      await base44.asServiceRole.entities.User.update(users[0].id, { permissions });
    }

    return Response.json({ success: true, message: 'Permissões atualizadas com sucesso.' });
  } catch (error) {
    return Response.json({ error: 'Erro ao atualizar permissões', details: error.message }, { status: 500 });
  }
});