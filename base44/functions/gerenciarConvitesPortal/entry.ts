import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function sha256Hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const sanitize = (i) => ({
  id: i.id, portal_type: i.portal_type, recipient_name: i.recipient_name,
  recipient_email: i.recipient_email, recipient_phone: i.recipient_phone,
  linked_entity_id: i.linked_entity_id, linked_company_id: i.linked_company_id,
  intended_role: i.intended_role, permissions_snapshot: i.permissions_snapshot,
  channel: i.channel, expires_at: i.expires_at, used_at: i.used_at, revoked_at: i.revoked_at,
  status: i.status, created_by: i.created_by, sent_by: i.sent_by, sent_at: i.sent_at,
  last_error: i.last_error, created_date: i.created_date,
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const callerProfiles = await svc.UserProfile.filter({ user_email: user.email });
    const gestor = callerProfiles.find(p => p.role === 'gestor_master' && p.status === 'active');
    if (!gestor) return Response.json({ error: 'Apenas Gestor Master ativo pode gerenciar convites de portal.' }, { status: 403 });

    const body = await req.json();
    const { action, invite_id, linked_entity_id, portal_type } = body;
    const now = new Date();

    if (action === 'list') {
      const query = {};
      if (linked_entity_id) query.linked_entity_id = linked_entity_id;
      if (portal_type) query.portal_type = portal_type;
      const invites = await svc.PortalInvite.filter(query, '-created_date', 100);
      // Marca expirados de forma idempotente
      const result = invites.map(i => {
        const expired = ['Pending', 'Sent'].includes(i.status) && new Date(i.expires_at) < now;
        return sanitize(expired ? { ...i, status: 'Expired' } : i);
      });
      return Response.json({ success: true, invites: result });
    }

    if (!invite_id) return Response.json({ error: 'invite_id é obrigatório.' }, { status: 400 });
    let invite;
    try { invite = await svc.PortalInvite.get(invite_id); } catch { invite = null; }
    if (!invite) return Response.json({ error: 'Convite não encontrado.' }, { status: 404 });

    if (action === 'revoke') {
      if (invite.status === 'Used') return Response.json({ error: 'Convite já utilizado não pode ser revogado.' }, { status: 400 });
      await svc.PortalInvite.update(invite.id, { status: 'Revoked', revoked_at: now.toISOString() });
      await svc.AuditLog.create({
        user_email: user.email, user_name: user.full_name || user.email,
        action: 'update', entity_type: 'PortalInvite', entity_id: invite.id,
        entity_name: `Convite Portal ${invite.portal_type} — ${invite.recipient_email}`,
        details: `Convite revogado por ${user.email} em ${now.toLocaleString('pt-BR')}.`,
      });
      return Response.json({ success: true, message: 'Convite revogado.' });
    }

    if (action === 'mark_sent') {
      // Confirmação manual do operador (WhatsApp/Manual) — nunca marcamos entrega automática
      await svc.PortalInvite.update(invite.id, { status: 'Sent', sent_by: user.email, sent_at: now.toISOString() });
      await svc.AuditLog.create({
        user_email: user.email, user_name: user.full_name || user.email,
        action: 'update', entity_type: 'PortalInvite', entity_id: invite.id,
        entity_name: `Convite Portal ${invite.portal_type} — ${invite.recipient_email}`,
        details: `Envio confirmado manualmente pelo operador via canal ${invite.channel}.`,
      });
      return Response.json({ success: true });
    }

    if (action === 'send_email') {
      const activationUrl = String(body.activation_url || '');
      if (!activationUrl.includes('/ativar-acesso?token=')) {
        return Response.json({ error: 'Link de ativação inválido para envio.' }, { status: 400 });
      }
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'CAT Cursos e Treinamentos',
          to: invite.recipient_email,
          subject: `Seu acesso ao Portal ${invite.portal_type} — CAT Cursos`,
          body: `Olá, ${invite.recipient_name || ''}!\n\nVocê recebeu um convite de acesso ao Portal ${invite.portal_type} da CAT Cursos e Treinamentos.\n\nPara ativar seu acesso com segurança, clique no link abaixo:\n${activationUrl}\n\nEste link é de uso único e expira em ${new Date(invite.expires_at).toLocaleString('pt-BR')}.\n\nSe você não esperava este convite, ignore esta mensagem.\n\nCAT Cursos e Treinamentos`,
        });
        await svc.PortalInvite.update(invite.id, { status: 'Sent', sent_by: user.email, sent_at: now.toISOString(), channel: 'Email' });
        await svc.AuditLog.create({
          user_email: user.email, user_name: user.full_name || user.email,
          action: 'send_credentials', entity_type: 'PortalInvite', entity_id: invite.id,
          entity_name: `Convite Portal ${invite.portal_type} — ${invite.recipient_email}`,
          details: `Convite enviado por e-mail (link não registrado em log).`,
        });
        return Response.json({ success: true, message: 'E-mail enviado.' });
      } catch (mailErr) {
        await svc.PortalInvite.update(invite.id, { status: 'Failed', last_error: mailErr.message });
        return Response.json({ error: 'Falha no envio do e-mail: ' + mailErr.message }, { status: 500 });
      }
    }

    if (action === 'resend') {
      // Gera novo token e invalida o anterior
      if (invite.status === 'Used') return Response.json({ error: 'Convite já utilizado — gere um novo convite.' }, { status: 400 });
      if (!invite.revoked_at) {
        await svc.PortalInvite.update(invite.id, { status: 'Revoked', revoked_at: now.toISOString(), last_error: 'Substituído por reenvio' });
      }
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      const token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const tokenHash = await sha256Hex(token);
      const hours = (invite.metadata && invite.metadata.validity_hours) || 24;
      const expiresAt = new Date(now.getTime() + hours * 3600000).toISOString();

      const newInvite = await svc.PortalInvite.create({
        portal_type: invite.portal_type,
        recipient_name: invite.recipient_name,
        recipient_email: invite.recipient_email,
        recipient_phone: invite.recipient_phone,
        linked_entity_id: invite.linked_entity_id,
        linked_company_id: invite.linked_company_id,
        intended_role: invite.intended_role,
        permissions_snapshot: invite.permissions_snapshot,
        channel: invite.channel,
        token_hash: tokenHash,
        expires_at: expiresAt,
        status: 'Pending',
        created_by: user.email,
        metadata: { attempts: 0, validity_hours: hours, resent_from: invite.id },
      });
      await svc.AuditLog.create({
        user_email: user.email, user_name: user.full_name || user.email,
        action: 'create', entity_type: 'PortalInvite', entity_id: newInvite.id,
        entity_name: `Convite Portal ${invite.portal_type} — ${invite.recipient_email}`,
        details: `Reenvio: novo convite gerado (anterior ${invite.id} invalidado).`,
      });
      const baseUrl = String(body.app_url || '').replace(/\/$/, '');
      return Response.json({
        success: true,
        invite_id: newInvite.id,
        expires_at: expiresAt,
        activation_url: `${baseUrl}/ativar-acesso?token=${token}`,
      });
    }

    return Response.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});