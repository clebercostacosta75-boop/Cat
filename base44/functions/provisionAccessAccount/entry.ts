import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const normalize = (value) => String(value || '').trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const entityName = payload.event?.entity_name;
    const data = payload.data || (payload.event?.entity_id ? await base44.asServiceRole.entities.get(entityName, payload.event.entity_id) : null);
    if (!data) return Response.json({ success: true, skipped: 'sem dados' });
    let account = null;
    if (entityName === 'Student' && data.email) account = { access_type: 'aluno', person_name: data.full_name, email: normalize(data.email), phone: data.whatsapp || '', cpf: data.cpf || '', student_id: data.id || payload.event.entity_id, profile: 'aluno', allowed_modules: [], allowed_portal: 'aluno' };
    if (entityName === 'Instructor' && data.email) account = { access_type: 'instrutor', person_name: data.name, email: normalize(data.email), phone: data.phone || '', cpf: data.cpf || '', instructor_id: data.id || payload.event.entity_id, profile: 'instrutor', allowed_modules: [], allowed_portal: 'instrutor' };
    if (entityName === 'Company') {
      const contact = (data.contacts || []).find((item) => item.email) || {};
      const email = contact.email || data.email_faturamento;
      if (email) account = { access_type: 'empresa', person_name: contact.name || data.nome_fantasia || data.razao_social, email: normalize(email), phone: contact.phone || '', cnpj: data.cnpj || '', company_id: data.id || payload.event.entity_id, profile: 'empresa', allowed_modules: [], allowed_portal: 'empresa' };
    }
    if (!account?.email) return Response.json({ success: true, skipped: 'cadastro sem e-mail de acesso' });
    const existing = await base44.asServiceRole.entities.AccessAccount.filter({ email: account.email });
    if (existing.length) return Response.json({ success: true, account_id: existing[0].id, skipped: 'conta existente' });
    const created = await base44.asServiceRole.entities.AccessAccount.create({ ...account, status: 'aguardando_ativacao', created_by_email: data.created_by || 'automação' });
    await base44.asServiceRole.entities.AuditLog.create({ user_email: data.created_by || account.email, user_name: data.created_by || 'Automação', action: 'create', entity_type: 'AccessAccount', entity_id: created.id, entity_name: account.person_name, details: JSON.stringify({ event: 'access_account_auto_provisioned', source_entity: entityName, source_id: payload.event?.entity_id, access_type: account.access_type, at: new Date().toISOString() }) });
    return Response.json({ success: true, account_id: created.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});