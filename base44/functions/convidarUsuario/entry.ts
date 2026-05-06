import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Gera senha temporária segura (8 caracteres)
function gerarSenhaTemporaria() {
  const maiusculas = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const minusculas = 'abcdefghjkmnpqrstuvwxyz';
  const numeros = '23456789';
  const todos = maiusculas + minusculas + numeros;
  let senha = '';
  senha += maiusculas[Math.floor(Math.random() * maiusculas.length)];
  senha += minusculas[Math.floor(Math.random() * minusculas.length)];
  senha += numeros[Math.floor(Math.random() * numeros.length)];
  for (let i = 3; i < 8; i++) {
    senha += todos[Math.floor(Math.random() * todos.length)];
  }
  return senha.split('').sort(() => Math.random() - 0.5).join('');
}

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

    // Mapear perfil personalizado para perfil base aceito pelo SDK (admin ou user)
    const baseRole = (role === 'gestor_master') ? 'admin' : 'user';

    // Gera senha temporária ANTES de convidar
    const senha = gerarSenhaTemporaria();

    // Convidar via SDK (cria o usuário na plataforma)
    await base44.users.inviteUser(email, baseRole);

    // Chamar enviarBoasVindas para enviar o e-mail com a senha
    await base44.asServiceRole.functions.invoke('enviarBoasVindas', {
      user_email: email,
      user_name: user_name,
      senha_temporaria: senha
    });

    return Response.json({
      success: true,
      message: `Usuário criado e convite enviado para ${email}`,
      senha_temporaria: senha
    });

  } catch (error) {
    return Response.json({
      error: 'Erro ao convidar usuário',
      details: error.message
    }, { status: 500 });
  }
});