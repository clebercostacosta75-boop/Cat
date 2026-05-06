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

    const { email, role } = await req.json();
    if (!email) return Response.json({ error: 'E-mail obrigatório' }, { status: 400 });

    // Verificar se usuário já existe — se já existe, reenviar convite também é válido
    const existingUsers = await base44.asServiceRole.entities.User.filter({});
    const already = existingUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (already) {
      return Response.json({
        success: false,
        already_exists: true,
        message: `O e-mail ${email} já está cadastrado no sistema.`
      }, { status: 200 });
    }

    // Mapear perfil personalizado para perfil base aceito pelo SDK (admin ou user)
    const baseRole = (role === 'gestor_master') ? 'admin' : 'user';

    // Convidar via SDK
    await base44.users.inviteUser(email, baseRole);

    return Response.json({
      success: true,
      message: `Convite enviado para ${email} com sucesso.`
    });

  } catch (error) {
    return Response.json({
      error: 'Erro ao convidar usuário',
      details: error.message
    }, { status: 500 });
  }
});