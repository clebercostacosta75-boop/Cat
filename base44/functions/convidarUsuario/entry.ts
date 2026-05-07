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

    const { email, role, user_name } = await req.json();
    if (!email || !user_name) return Response.json({ error: 'E-mail e nome obrigatórios' }, { status: 400 });

    // Verificar se usuário já existe
    const existingUsers = await base44.asServiceRole.entities.User.filter({});
    const already = existingUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (already) {
      return Response.json({
        success: false,
        already_exists: true,
        message: `O e-mail ${email} já está cadastrado no sistema.`
      }, { status: 200 });
    }

    // Mapear perfil personalizado para perfil base aceito pelo SDK
    const baseRole = (role === 'gestor_master') ? 'admin' : 'user';

    // Enviar convite nativo do Base44 — o próprio usuário define sua senha pelo link recebido
    await base44.users.inviteUser(email, baseRole);

    // Atualizar perfil com registro de envio do convite
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email: email });
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
      message: `Convite enviado para ${email}. O usuário receberá um e-mail para definir sua senha e acessar o sistema.`,
    });

  } catch (error) {
    return Response.json({
      error: 'Erro ao convidar usuário',
      details: error.message
    }, { status: 500 });
  }
});