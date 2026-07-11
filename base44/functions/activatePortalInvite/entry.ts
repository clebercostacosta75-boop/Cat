import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function sha256Hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const GENERIC = 'Convite inválido ou expirado.';
const MAX_ATTEMPTS = 10;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const { action, token } = body;

    // Resposta genérica para qualquer token inválido (sem vazar detalhes)
    if (!token || typeof token !== 'string' || token.length < 32) {
      return Response.json({ error: GENERIC }, { status: 400 });
    }
    const hash = await sha256Hex(token);
    const invites = await svc.PortalInvite.filter({ token_hash: hash });
    const invite = invites[0];
    if (!invite) return Response.json({ error: GENERIC }, { status: 400 });

    const now = new Date();
    if (invite.revoked_at || invite.status === 'Revoked') return Response.json({ error: GENERIC }, { status: 400 });
    if (invite.used_at || invite.status === 'Used') return Response.json({ error: GENERIC }, { status: 400 });
    if (new Date(invite.expires_at) < now) {
      if (invite.status !== 'Expired') await svc.PortalInvite.update(invite.id, { status: 'Expired' });
      return Response.json({ error: GENERIC }, { status: 400 });
    }
    const attempts = (invite.metadata && invite.metadata.attempts) || 0;
    if (attempts >= MAX_ATTEMPTS) {
      await svc.PortalInvite.update(invite.id, { status: 'Revoked', revoked_at: now.toISOString(), last_error: 'Excesso de tentativas de ativação' });
      return Response.json({ error: GENERIC }, { status: 400 });
    }

    const maskEmail = (e) => { const [u, d] = String(e).split('@'); return `${(u || '').slice(0, 2)}***@${d || ''}`; };

    if (action === 'inspect') {
      return Response.json({
        valid: true,
        portal_type: invite.portal_type,
        recipient_name: invite.recipient_name,
        recipient_email_masked: maskEmail(invite.recipient_email),
        expires_at: invite.expires_at,
      });
    }

    if (action !== 'activate') return Response.json({ error: GENERIC }, { status: 400 });

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
    const bumpAttempt = () => svc.PortalInvite.update(invite.id, { metadata: { ...(invite.metadata || {}), attempts: attempts + 1 } });
    const denyLog = (userEmail, reason) => svc.AccessLog.create({
      user_email: userEmail || '',
      event_type: 'access_denied',
      reason: reason,
      module: `Portal ${invite.portal_type}`,
      ip_address: ip,
      user_agent: (req.headers.get('user-agent') || '').slice(0, 300),
    }).catch(() => {});

    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Faça login para ativar seu acesso.', requires_login: true }, { status: 401 });
    }

    // E-mail autenticado deve corresponder ao do convite
    if (user.email.toLowerCase() !== invite.recipient_email.toLowerCase()) {
      await bumpAttempt();
      await denyLog(user.email, `Ativação de convite negada: e-mail autenticado não corresponde ao destinatário (${maskEmail(invite.recipient_email)})`);
      return Response.json({ error: GENERIC }, { status: 403 });
    }

    // Aceite LGPD obrigatório
    const lgpd = body.lgpd || {};
    if (!lgpd.accepted) {
      return Response.json({ error: 'É obrigatório aceitar o termo LGPD para ativar o acesso.', requires_lgpd: true }, { status: 400 });
    }

    // Perfil bloqueado nunca ganha acesso por convite
    const profiles = await svc.UserProfile.filter({ user_email: user.email });
    let profile = profiles[0] || null;
    if (profile && profile.status === 'blocked') {
      await bumpAttempt();
      await denyLog(user.email, 'Ativação de convite negada: perfil bloqueado');
      return Response.json({ error: GENERIC }, { status: 403 });
    }

    const consent = {
      consent_accepted_at: now.toISOString(),
      consent_ip_address: ip,
      consent_term_version: lgpd.version || 'v1.0',
    };

    // Aplica exatamente o snapshot — nunca amplia permissões
    const profileData = {
      user_id: user.id,
      user_name: invite.recipient_name || user.full_name || user.email,
      role: invite.intended_role || 'cliente',
      permissions: invite.permissions_snapshot || [],
      status: 'active',
      password_changed: true,
      ...consent,
    };
    if (invite.portal_type === 'Empresa') {
      profileData.company_permissions = [{
        company_id: invite.linked_company_id || invite.linked_entity_id,
        company_name: invite.recipient_name || '',
        permissions: ['view'],
      }];
    }

    if (profile) {
      await svc.UserProfile.update(profile.id, profileData);
    } else {
      profile = await svc.UserProfile.create({ user_email: user.email, ...profileData });
    }

    // Vínculo mínimo no usuário autenticado (escopo por portal — RLS usa esses campos)
    if (invite.portal_type === 'Aluno') {
      await base44.auth.updateMe({ student_id: invite.linked_entity_id });
    } else if (invite.portal_type === 'Instrutor') {
      await base44.auth.updateMe({ instructor_id: invite.linked_entity_id });
    } else if (invite.portal_type === 'Empresa') {
      await base44.auth.updateMe({ company_permissions: [{ company_id: invite.linked_company_id || invite.linked_entity_id }] });
    }

    // Uso único
    await svc.PortalInvite.update(invite.id, {
      status: 'Used',
      used_at: now.toISOString(),
      metadata: { ...(invite.metadata || {}), attempts, used_by: user.email },
    });

    await svc.AuditLog.create({
      user_email: user.email,
      user_name: user.full_name || user.email,
      action: 'update',
      entity_type: 'PortalInvite',
      entity_id: invite.id,
      entity_name: `Ativação Portal ${invite.portal_type}`,
      details: `Convite ativado com aceite LGPD ${consent.consent_term_version} em ${now.toLocaleString('pt-BR')} — IP ${ip}`,
      ip_address: ip,
    });
    await svc.AccessLog.create({
      user_email: user.email,
      event_type: 'login_success',
      reason: `Acesso ao Portal ${invite.portal_type} ativado por convite`,
      module: `Portal ${invite.portal_type}`,
      ip_address: ip,
      user_agent: (req.headers.get('user-agent') || '').slice(0, 300),
    });

    return Response.json({ success: true, portal_type: invite.portal_type });
  } catch (_error) {
    return Response.json({ error: GENERIC }, { status: 400 });
  }
});