import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Portal do Aluno (SPR-004B) — consulta pública por CPF.
// Retorna: dados do aluno (Student), matrículas (StudentCourseEnrollment),
// certificados (Certificate) e documentos (StudentDocument).
// O perfil (Corporativo / Comunidade / Matrículas Mistas) é derivado no frontend — nada é gravado.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const { cpf } = await req.json();
    const digits = (cpf || "").toString().replace(/\D/g, "");
    if (digits.length !== 11) {
      return Response.json({ error: "CPF inválido" }, { status: 400 });
    }
    const formatted = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

    // Aluno
    let students = await svc.entities.Student.filter({ cpf: formatted });
    if (students.length === 0) {
      students = await svc.entities.Student.filter({ cpf: digits });
    }
    const student = students[0] || null;

    // Matrículas (por student_id e por CPF, deduplicadas)
    const enrollMap = {};
    if (student) {
      const byId = await svc.entities.StudentCourseEnrollment.filter({ student_id: student.id });
      byId.forEach((e) => { enrollMap[e.id] = e; });
    }
    for (const c of [formatted, digits]) {
      const list = await svc.entities.StudentCourseEnrollment.filter({ student_cpf: c });
      list.forEach((e) => { enrollMap[e.id] = e; });
    }
    const enrollments = Object.values(enrollMap);

    // Certificados (por CPF, deduplicados)
    const certMap = {};
    for (const c of [formatted, digits]) {
      const list = await svc.entities.Certificate.filter({ student_cpf: c });
      list.forEach((x) => { certMap[x.id] = x; });
    }
    const certificates = Object.values(certMap);

    // Documentos do aluno
    let documents = [];
    if (student) {
      const docs = await svc.entities.StudentDocument.filter({ student_id: student.id });
      documents = docs.map((d) => ({
        id: d.id,
        document_type: d.document_type,
        file_name: d.file_name,
        status: d.status,
        created_date: d.created_date,
      }));
    }

    if (!student && enrollments.length === 0 && certificates.length === 0) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    const studentSafe = student ? {
      id: student.id,
      full_name: student.full_name,
      social_name: student.social_name,
      cpf: student.cpf,
      email: student.email,
      whatsapp: student.whatsapp,
      data_nascimento: student.data_nascimento,
      cidade: student.cidade,
      estado: student.estado,
      status: student.status,
    } : null;

    const enrollmentSafe = enrollments.map((e) => ({
      id: e.id,
      course_name: e.course_name,
      course_duration: e.course_duration,
      company_id: e.company_id,
      company_name: e.company_name,
      start_date: e.start_date,
      end_date: e.end_date,
      status: e.status,
      status_matricula: e.status_matricula,
      resultado_academico: e.resultado_academico,
      forma_pagamento: e.forma_pagamento,
      status_pagamento: e.status_pagamento,
      data_vencimento_pagamento: e.data_vencimento_pagamento,
      unit_value: e.unit_value,
    }));
    const certificateSafe = certificates.map((c) => ({
      id: c.id,
      certificate_code: c.certificate_code,
      course_name: c.course_name,
      course_duration: c.course_duration,
      client_name: c.client_name,
      instructor_name: c.instructor_name,
      programmatic_content: c.programmatic_content || [],
      start_date: c.start_date,
      end_date: c.end_date,
      valid_until: c.valid_until,
      issue_date: c.issue_date,
      status: c.status,
      certificate_model_id: c.certificate_model_id,
      front_background_url: c.front_background_url,
      back_background_url: c.back_background_url,
      show_programmatic_hours: c.show_programmatic_hours,
      location_and_date: c.location_and_date,
      technical_responsibles: c.technical_responsibles || [],
    }));

    return Response.json({ student: studentSafe, enrollments: enrollmentSafe, certificates: certificateSafe, documents });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});