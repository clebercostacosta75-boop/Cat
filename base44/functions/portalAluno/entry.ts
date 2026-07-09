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

    return Response.json({ student: studentSafe, enrollments, certificates, documents });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});