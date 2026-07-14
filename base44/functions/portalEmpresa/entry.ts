import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { cnpj } = await req.json();
    const digits = String(cnpj || '').replace(/\D/g, '');
    if (digits.length !== 14) return Response.json({ error: 'CNPJ inválido' }, { status: 400 });

    const formatted = digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    const svc = base44.asServiceRole.entities;
    const byFormatted = await svc.Company.filter({ cnpj: formatted });
    const byDigits = byFormatted.length ? [] : await svc.Company.filter({ cnpj: digits });
    const company = byFormatted[0] || byDigits[0];
    if (!company) return Response.json({ error: 'not_found' }, { status: 404 });

    const certificates = await svc.Certificate.filter({ client_id: company.id });
    const students = await svc.Student.filter({ company_id: company.id });
    const modelIds = [...new Set(certificates.map(c => c.certificate_model_id).filter(Boolean))];
    const certificateModels = [];
    for (const id of modelIds) {
      const model = await svc.CertificateModel.get(id).catch(() => null);
      if (model) certificateModels.push(model);
    }

    return Response.json({
      company: {
        id: company.id,
        razao_social: company.razao_social,
        nome_fantasia: company.nome_fantasia,
        cnpj: company.cnpj,
        status: company.status,
        modulos_contratados: company.modulos_contratados || [],
      },
      certificates: certificates.map(c => ({
        id: c.id,
        student_name: c.student_name,
        student_cpf: c.student_cpf,
        course_name: c.course_name,
        course_duration: c.course_duration,
        start_date: c.start_date,
        end_date: c.end_date,
        valid_until: c.valid_until,
        status: c.status,
        certificate_code: c.certificate_code,
        instructor_name: c.instructor_name,
        issue_date: c.issue_date,
        signed_at: c.signed_at,
        revocation_reason: c.revocation_reason,
        programmatic_content: c.programmatic_content || [],
        certificate_model_id: c.certificate_model_id,
        front_background_url: c.front_background_url,
        back_background_url: c.back_background_url,
        show_programmatic_hours: c.show_programmatic_hours,
        client_name: c.client_name,
        location_and_date: c.location_and_date,
        technical_responsibles: c.technical_responsibles || [],
      })),
      students: students.map(s => ({
        id: s.id,
        full_name: s.full_name,
        cpf: s.cpf,
        funcao_nome: s.funcao_nome,
        status: s.status,
      })),
      certificateModels,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});