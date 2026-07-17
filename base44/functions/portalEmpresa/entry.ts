import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const pick = (item, fields) => Object.fromEntries(fields.filter((field) => item?.[field] !== undefined).map((field) => [field, item[field]]));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const digits = String(body.cnpj || '').replace(/\D/g, '');
    const accountList = user ? await base44.asServiceRole.entities.AccessAccount.filter({ user_id: user.id }) : [];
    const account = accountList.find((item) => item.access_type === 'empresa' && item.status === 'ativo');
    const allowedIds = account?.company_id ? [account.company_id] : [];
    for (const cp of (user?.company_permissions || [])) if (cp.company_id && !allowedIds.includes(cp.company_id)) allowedIds.push(cp.company_id);
    let company = null;
    if (body.company_id && allowedIds.includes(body.company_id)) company = await base44.asServiceRole.entities.Company.get(body.company_id);
    // Auto-resolução: usuário empresa logado sem CNPJ informado — carrega a própria empresa vinculada
    if (!company && !digits && allowedIds[0]) company = await base44.asServiceRole.entities.Company.get(allowedIds[0]).catch(() => null);
    if (!company && digits.length === 14) {
      const formatted = digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
      const candidates = [...await base44.asServiceRole.entities.Company.filter({ cnpj: digits }), ...await base44.asServiceRole.entities.Company.filter({ cnpj: formatted })];
      company = candidates[0] || null;
    }
    if (!company) return Response.json({ error: 'Empresa não encontrada' }, { status: 404 });
    const authenticated = user?.role === 'admin' || allowedIds.includes(company.id);
    const companySafe = pick(company, ['id', 'razao_social', 'nome_fantasia', 'cnpj', 'status', 'logo_url', 'modulos_contratados']);
    const certificates = await base44.asServiceRole.entities.Certificate.filter({ client_id: company.id });
    if (!authenticated) {
      const stats = { total: certificates.length, signed: certificates.filter((c) => ['signed', 'active'].includes(c.status)).length, pending: certificates.filter((c) => c.status === 'pending_signature').length, revoked: certificates.filter((c) => c.status === 'revoked').length };
      return Response.json({ company: companySafe, certificates: [], students: [], certificate_models: [], stats, legacy_limited: true });
    }
    const students = await base44.asServiceRole.entities.Student.filter({ company_id: company.id });
    const modelIds = [...new Set(certificates.map((c) => c.certificate_model_id).filter(Boolean))];
    const models = [];
    for (const id of modelIds) { const model = await base44.asServiceRole.entities.CertificateModel.get(id).catch(() => null); if (model) models.push(model); }
    return Response.json({
      company: companySafe,
      certificates: certificates.map((c) => pick(c, ['id','student_name','student_cpf','course_name','course_duration','end_date','valid_until','status','certificate_code','instructor_name','issue_date','signed_at','revocation_reason','programmatic_content','certificate_model_id','front_background_url','back_background_url'])),
      students: students.map((s) => pick(s, ['id','full_name','cpf','funcao_nome','status'])),
      certificate_models: models,
      legacy_limited: false,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});