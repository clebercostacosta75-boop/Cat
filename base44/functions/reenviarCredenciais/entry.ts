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

    const { user_email, user_name, profile_id } = await req.json();
    if (!user_email || !user_name || !profile_id) {
      return Response.json({ error: 'user_email, user_name e profile_id obrigatórios' }, { status: 400 });
    }

    // Gera nova senha temporária
    const senhaTemporaria = gerarSenhaTemporaria();

    // Atualiza o perfil com a nova senha
    await base44.asServiceRole.entities.UserProfile.update(profile_id, {
      initial_password: senhaTemporaria,
      status: 'pending_password_change',
      credentials_sent_at: new Date().toISOString(),
      credentials_sent_via: 'email',
      credentials_sent_by: user.email,
    });

    // Envia e-mail com a nova senha
    const welcomeRes = await base44.asServiceRole.functions.invoke('enviarBoasVindas', {
      user_email,
      user_name,
      senha_temporaria: senhaTemporaria,
    });

    if (!welcomeRes.data?.success) {
      return Response.json({
        error: 'Falha ao enviar e-mail',
        details: welcomeRes.data?.message || 'Erro desconhecido',
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: `Credenciais reenviadas com sucesso para ${user_email}`,
      email_enviado: true,
    });

  } catch (error) {
    return Response.json({
      error: 'Erro ao reenviar credenciais',
      details: error.message,
    }, { status: 500 });
  }
});