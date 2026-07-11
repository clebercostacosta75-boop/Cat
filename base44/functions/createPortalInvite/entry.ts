import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function sha256Hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const PORTAL_ENTITY = { 'Aluno': 'Student', 'Instrutor': 'Instructor', 'Empresa': 'Company' };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    // Somente gestor_master ativo (perfil vinculado)
    const callerProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email: user.email });
    const gestor = callerProfiles.find(p => p.role === 'gestor_master' && p.status === 'active');
    if (!gestor) return Response.json({ error: 'Apenas Gestor Master ativo pode gerar convites de portal.' }, { status: 403 });

    const body = await req.json();
    const { portal_type, recipient_name, recipient_email, recipient_phone, linked_entity_id, intended_role, permissions_snapshot, channel, validity_hours, app_url } = body;

    // Validações
    if (!PORTAL_ENTITY[portal_type]) return Response.json({ error: 'Tipo de portal inválido.' }, { status: 400 });
    if (!recipient_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient_email)) {
      return Response.json({ error: 'E-mail do destinatário inválido.' }, { status: 400 });
    }
    if (recipient_phone) {
      const digits = String(recipient_phone).replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 13) return Response.json({ error: 'Telefone inválido.' }, { status: 400 });
    }
    if (!linked_entity_id) return Response.json({ error: 'Registro vinculado é obrigatório.' }, { status: 400 });

    let linked = null;
    try { linked = await base44.asServiceRole.entities[PORTAL_ENTITY[portal_type]].get(linked_entity_id); } catch { linked = null; }
    if (!linked) return Response.json({ error: `Registro vinculado não encontrado (${PORTAL_ENTITY[portal_type]}).` }, { status: 400 });

    // Impedir convite duplicado ativo (mesmo portal + entidade + e-mail)
    const now = new Date();
    const existing = await base44.asServiceRole.entities.PortalInvite.filter({
      portal_type, linked_entity_id, recipient_email: recipient_email.toLowerCase(),
    });
    const dup = existing.find(i =>
      ['Pending', 'Sent'].includes(i.status) && !i.revoked_at && !i.used_at && new Date(i.expires_at) > now
    );
    if (dup) {
      return Response.json({
        error: 'Já existe um convite ativo para este destinatário neste portal. Revogue-o ou use "Reenviar".',
        duplicate: true,
        existing_invite_id: dup.id,
      }, { status: 409 });
    }

    // Token criptograficamente seguro — uso único; apenas o hash é armazenado
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const tokenHash = await sha256Hex(token);
    const hours = [24, 48, 168].includes(Number(validity_hours)) ? Number(validity_hours) : 24;
    const expiresAt = new Date(now.getTime() + hours * 3600000).toISOString();

    const invite = await base44.asServiceRole.entities.PortalInvite.create({
      portal_type,
      recipient_name: recipient_name || linked.full_name || linked.name || linked.nome_fantasia || '',
      recipient_email: recipient_email.toLowerCase(),
      recipient_phone: recipient_phone || '',
      linked_entity_id,
      linked_company_id: portal_type === 'Empresa' ? linked_entity_id : (body.linked_company_id || ''),
      intended_role: intended_role || 'cliente',
      permissions_snapshot: Array.isArray(permissions_snapshot) ? permissions_snapshot : [],
      channel: ['Email', 'WhatsApp', 'SMS', 'Manual'].includes(channel) ? channel : 'Manual',
      token_hash: tokenHash,
      expires_at: expiresAt,
      status: 'Pending',
      created_by: user.email,
      metadata: { attempts: 0, validity_hours: hours },
    });

    // AuditLog sem dados secretos (token não é registrado)
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      user_name: user.full_name || user.email,
      action: 'create',
      entity_type: 'PortalInvite',
      entity_id: invite.id,
      entity_name: `Convite Portal ${portal_type} — ${recipient_email.toLowerCase()}`,
      details: `Convite gerado (canal ${channel || 'Manual'}, validade ${hours}h, expira em ${expiresAt}).`,
    });

    const baseUrl = String(app_url || '').replace(/\/$/, '');
    // O link é retornado somente aqui, no momento da criação
    return Response.json({
      success: true,
      invite_id: invite.id,
      expires_at: expiresAt,
      activation_url: `${baseUrl}/ativar-acesso?token=${token}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});