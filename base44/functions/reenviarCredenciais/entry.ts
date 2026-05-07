import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const allowedRoles = ['admin', 'Administrador Master', 'gestor_master'];
    if (!allowedRoles.includes(user.role || '')) {
      return Response.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { user_email, user_name, profile_id } = await req.json();
    if (!user_email || !profile_id) {
      return Response.json({ error: 'user_email e profile_id obrigatórios' }, { status: 400 });
    }

    // Verificar se o usuário existe na plataforma
    const existingUsers = await base44.asServiceRole.entities.User.filter({});
    const existingUser = existingUsers.find(u => u.email?.toLowerCase() === user_email.toLowerCase());

    if (!existingUser) {
      // Usuário não existe ainda — envia convite de criação
      await base44.users.inviteUser(user_email, 'user');
    } else {
      // Usuário já existe — reenvia o convite para redefinir o acesso
      await base44.users.inviteUser(user_email, existingUser.role === 'admin' ? 'admin' : 'user');
    }

    // Atualiza perfil com registro do reenvio — busca pelo email para garantir o ID correto
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email: user_email });
    if (profiles.length > 0) {
      await base44.asServiceRole.entities.UserProfile.update(profiles[0].id, {
        status: 'pending_password_change',
        credentials_sent_at: new Date().toISOString(),
        credentials_sent_via: 'email',
        credentials_sent_by: user.email,
      });
    }

    return Response.json({
      success: true,
      email: user_email,
      message: `Convite reenviado para ${user_email}. O usuário receberá um e-mail para acessar o sistema.`,
    });

  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({
      error: 'Erro ao reenviar convite',
      details: error.message,
    }, { status: 500 });
  }
});