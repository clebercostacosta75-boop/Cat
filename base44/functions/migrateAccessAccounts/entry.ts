import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const normalize = (value) => String(value || '').trim().toLowerCase();
const portalFor = (role) => role === 'aluno' ? 'aluno' : role === 'empresa' ? 'empresa' : role === 'instrutor' ? 'instrutor' : 'interno';
const typeFor = (role) => role === 'aluno' ? 'aluno' : role === 'empresa' ? 'empresa' : role === 'instrutor' ? 'instrutor' : 'usuario_cat';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const operator = await base44.auth.me();
    if (!operator) return Response.json({ error: 'Não autenticado' }, { status: 401 });
    if (operator.role !== 'admin') return Response.json({ error: 'Apenas administradores podem migrar acessos' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const [profiles, users, accounts] = await Promise.all([
      base44.asServiceRole.entities.UserProfile.list('-created_date', 500),
      base44.asServiceRole.entities.User.list('-created_date', 500),
      base44.asServiceRole.entities.AccessAccount.list('-created_date', 500),
    ]);
    const usersByEmail = new Map(users.map((user) => [normalize(user.email), user]));
    const existingProfileIds = new Set(accounts.map((account) => account.user_profile_id).filter(Boolean));
    const existingEmails = new Set(accounts.map((account) => normalize(account.email)));
    const duplicateEmails = new Set(profiles.map((profile) => normalize(profile.user_email)).filter((email, index, list) => list.indexOf(email) !== index));
    const pending = [];
    const skipped = [];
    for (const profile of profiles) {
      const email = normalize(profile.user_email);
      if (!email || duplicateEmails.has(email)) { skipped.push({ profile_id: profile.id, email, reason: 'duplicidade' }); continue; }
      if (existingProfileIds.has(profile.id) || existingEmails.has(email)) { skipped.push({ profile_id: profile.id, email, reason: 'já migrado' }); continue; }
      const user = usersByEmail.get(email);
      const type = typeFor(profile.role);
      pending.push({
        access_type: type,
        person_name: String(profile.user_name || user?.full_name || email).trim(),
        email,
        phone: profile.phone || '',
        cpf: profile.cpf || '',
        user_id: profile.user_id || user?.id || '',
        user_profile_id: profile.id,
        student_id: profile.student_id || '',
        company_id: profile.company_permissions?.[0]?.company_id || '',
        instructor_id: profile.instructor_id || '',
        profile: profile.role || 'cliente',
        allowed_modules: type === 'usuario_cat' ? (profile.permissions || []) : [],
        allowed_portal: portalFor(profile.role),
        status: profile.status === 'blocked' ? 'bloqueado' : ((profile.user_id || user?.id) && profile.status === 'active' ? 'ativo' : 'aguardando_ativacao'),
        activated_at: (profile.user_id || user?.id) && profile.status === 'active' ? (profile.updated_date || new Date().toISOString()) : undefined,
        created_by_email: operator.email,
      });
    }
    if (body.dry_run !== true && pending.length) await base44.asServiceRole.entities.AccessAccount.bulkCreate(pending);
    const result = { analyzed: profiles.length, created: body.dry_run === true ? 0 : pending.length, would_create: pending.length, skipped, dry_run: body.dry_run === true };
    if (body.dry_run !== true) await base44.asServiceRole.entities.AuditLog.create({
      user_email: operator.email,
      user_name: operator.full_name || operator.email,
      action: 'create',
      entity_type: 'AccessAccount',
      entity_name: 'Migração para Contas de Acesso',
      details: JSON.stringify({ event: 'access_accounts_migrated', result, at: new Date().toISOString() }),
    });
    return Response.json({ success: true, result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});