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
    if (!user_email || !user_name || !profile_id) {
      return Response.json({ error: 'user_email, user_name e profile_id obrigatórios' }, { status: 400 });
    }

    // Gera senha simples: 4 letras + 4 números
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');
    const numeros = '23456789'.split('');
    let senha = '';
    for (let i = 0; i < 4; i++) senha += letras[Math.floor(Math.random() * letras.length)];
    for (let i = 0; i < 4; i++) senha += numeros[Math.floor(Math.random() * numeros.length)];
    senha = senha.split('').sort(() => Math.random() - 0.5).join('');

    // Atualiza perfil com nova senha
    await base44.asServiceRole.entities.UserProfile.update(profile_id, {
      initial_password: senha,
      status: 'pending_password_change',
      credentials_sent_at: new Date().toISOString(),
      credentials_sent_via: 'email',
      credentials_sent_by: user.email,
    });

    // Tenta enviar e-mail (fallback se falhar)
    try {
      await base44.integrations.Core.SendEmail({
        to: user_email,
        subject: 'Suas credenciais de acesso - CAT GESTÃO DE CURSOS',
        body: `Olá ${user_name},\n\nSuas credenciais para acessar o sistema CAT Gestão de Cursos:\n\nE-mail: ${user_email}\nSenha: ${senha}\n\nPor favor, altere sua senha no primeiro acesso.\n\nSuporte: suporte@catcursos.com.br`,
        from_name: 'CAT Gestão de Cursos',
      });
    } catch (emailError) {
      console.error('Falha ao enviar e-mail:', emailError.message);
      // Continua mesmo se o e-mail falhar - credenciais estão salvas no banco
    }

    return Response.json({
      success: true,
      password: senha,
      email: user_email,
      name: user_name,
      message: `Credenciais preparadas para ${user_email}`,
    });

  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({
      error: 'Erro ao reenviar credenciais',
      details: error.message,
    }, { status: 500 });
  }
});