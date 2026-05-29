import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const allowedRoles = ['admin', 'Administrador Master', 'gestor_master'];
    const userRole = user.role || user.custom_role || '';

    // Verifica também no UserProfile (gestor_master tem role "user" na plataforma)
    let callerProfileRole = userRole;
    if (!allowedRoles.includes(callerProfileRole)) {
      try {
        const callerProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email: user.email });
        if (callerProfiles.length > 0) {
          callerProfileRole = callerProfiles[0].role || userRole;
        }
      } catch {}
    }

    if (!allowedRoles.includes(callerProfileRole)) {
      return Response.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { user_email, permissions, profile_id } = await req.json();
    if (!user_email) {
      return Response.json({ error: 'user_email é obrigatório' }, { status: 400 });
    }

    // 1. Buscar o UserProfile pelo email para garantir o id correto do registro
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email });
    if (profiles.length === 0) {
      return Response.json({ error: 'Perfil não encontrado para este e-mail' }, { status: 404 });
    }
    const profileToUpdate = profiles[0];
    await base44.asServiceRole.entities.UserProfile.update(profileToUpdate.id, { permissions });

    // Notificar admins/gestores master sobre a alteração de permissões
    try {
      const allProfiles = await base44.asServiceRole.entities.UserProfile.list();
      const masters = allProfiles.filter(p =>
        ["admin", "Administrador Master", "gestor_master"].includes(p.role) && p.user_email
      );
      const alteradoPor = user.full_name || user.email;
      const dataHora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const listaPerms = permissions.length > 0 ? permissions.join(", ") : "Nenhuma (acesso bloqueado)";
      for (const master of masters) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: master.user_email,
          subject: `[CAT Cursos] Permissões alteradas — ${profileToUpdate.user_name}`,
          body: `
            <p>Olá, ${master.user_name || "Gestor"}.</p>
            <p>Uma alteração de permissões foi realizada no sistema:</p>
            <ul>
              <li><strong>Usuário afetado:</strong> ${profileToUpdate.user_name} (${user_email})</li>
              <li><strong>Alterado por:</strong> ${alteradoPor}</li>
              <li><strong>Data/Hora:</strong> ${dataHora}</li>
              <li><strong>Novas permissões:</strong> ${listaPerms}</li>
            </ul>
            <p>Acesse o sistema para revisar se necessário.</p>
          `,
        });
      }
    } catch (notifErr) {
      console.warn("Aviso: não foi possível notificar masters por e-mail:", notifErr.message);
    }

    return Response.json({ success: true, message: 'Permissões atualizadas com sucesso.' });
  } catch (error) {
    return Response.json({ error: 'Erro ao atualizar permissões', details: error.message }, { status: 500 });
  }
});