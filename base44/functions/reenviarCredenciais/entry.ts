import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    const { user_email, user_name, profile_id, app_url } = await req.json();
    if (!user_email || !profile_id || !app_url) return Response.json({ error: 'E-mail, perfil e URL são obrigatórios' }, { status: 400 });
    const profile = await base44.asServiceRole.entities.UserProfile.get(profile_id);
    if (!profile || String(profile.user_email).trim().toLowerCase() !== String(user_email).trim().toLowerCase()) {
      return Response.json({ error: 'Perfil e e-mail não correspondem' }, { status: 409 });
    }
    const response = await base44.functions.invoke('convidarUsuario', {
      email: user_email,
      user_name: user_name || profile.user_name,
      role: profile.role,
      profile_id: profile.id,
      app_url,
    });
    return Response.json(response?.data || response);
  } catch (error) {
    return Response.json({ error: 'Erro ao reenviar convite', details: error.message }, { status: 500 });
  }
});