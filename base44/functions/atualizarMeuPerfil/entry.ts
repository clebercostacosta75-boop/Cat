import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Autoatualização SEGURA do próprio perfil — whitelist de campos.
// Impede autoelevação: usuário comum NUNCA altera role, permissions ou company_permissions.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email: user.email });
    // Aceita perfil vinculado ao user_id ou ainda não vinculado (mesmo e-mail)
    const profile = profiles.find(p => p.user_id === user.id) || profiles.find(p => !p.user_id) || null;
    if (!profile) {
      return Response.json({ success: false, error: 'Perfil não encontrado — contate o administrador.' }, { status: 200 });
    }

    const updateData = {};
    // Reconciliação de vínculo: liga user_id e espelha as permissões administrativas no primeiro acesso.
    if (!profile.user_id) {
      updateData.user_id = user.id;
      await base44.asServiceRole.entities.User.update(user.id, {
        permissions: profile.permissions || [],
        company_permissions: profile.company_permissions || [],
      });
    }

    if (action === 'consent') {
      updateData.consent_accepted_at = new Date().toISOString();
      updateData.consent_ip_address = String(body.consent_ip_address || '').slice(0, 60);
      updateData.consent_term_version = String(body.consent_term_version || '').slice(0, 20);
    } else if (action === 'password_changed') {
      updateData.password_changed = true;
      updateData.initial_password = null;
      if (profile.status === 'pending_password_change') updateData.status = 'active';
    } else {
      return Response.json({ success: false, error: 'Ação inválida.' }, { status: 200 });
    }

    await base44.asServiceRole.entities.UserProfile.update(profile.id, updateData);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});