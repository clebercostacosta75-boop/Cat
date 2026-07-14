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
    const linked = profiles.filter(p => p.user_id === user.id);
    if (linked.length > 1 || (linked.length === 0 && profiles.length > 1)) {
      return Response.json({ success: false, code: 'duplicate_profile', error: 'Existem perfis duplicados para esta conta.' }, { status: 409 });
    }
    let profile = linked[0] || profiles.find(p => !p.user_id) || null;
    if (!profile && user.role === 'admin' && action === 'reconcile') {
      profile = await base44.asServiceRole.entities.UserProfile.create({ user_id: user.id, user_email: user.email.toLowerCase(), user_name: user.full_name || user.email, role: 'admin', permissions: [], company_permissions: [], status: 'active', password_changed: true });
    }
    if (!profile) return Response.json({ success: false, code: 'profile_not_found', error: 'Perfil não encontrado — contate o administrador.' }, { status: 404 });
    if (profile.user_id && profile.user_id !== user.id) return Response.json({ success: false, code: 'profile_mismatch', error: 'Perfil vinculado a outra conta.' }, { status: 403 });

    const updateData = {};
    if (!profile.user_id) updateData.user_id = user.id;
    const userScope = {
      permissions: profile.permissions || [],
      company_permissions: profile.company_permissions || [],
      student_id: profile.student_id || null,
      cpf: profile.cpf || null,
      instructor_id: profile.instructor_id || null,
      colaborador_sst_ids: profile.colaborador_sst_ids || [],
      pgr_leitura_ids: profile.pgr_leitura_ids || [],
      ltcat_detalhe_ids: profile.ltcat_detalhe_ids || [],
    };
    await base44.asServiceRole.entities.User.update(user.id, userScope);

    if (action === 'reconcile') {
      // Somente vínculo e espelhamento dos escopos canônicos; nenhuma elevação é aceita do cliente.
    } else if (action === 'consent') {
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

    if (Object.keys(updateData).length) await base44.asServiceRole.entities.UserProfile.update(profile.id, updateData);
    return Response.json({ success: true, profile_id: profile.id, linked: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});