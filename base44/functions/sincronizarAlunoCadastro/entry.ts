import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const enrollment = payload.data;
    if (!enrollment) return Response.json({ ok: true, msg: "sem dados" });

    // Só processa matrículas individuais (PF)
    if (enrollment.company_name !== "Individual (PF)") {
      return Response.json({ ok: true, msg: "não é Individual PF, ignorado" });
    }

    const { student_id, student_name, student_cpf, student_email, student_phone } = enrollment;

    if (!student_cpf || !student_name) {
      return Response.json({ ok: true, msg: "CPF ou nome ausente, ignorado" });
    }

    // Verifica se já existe um Student com esse CPF
    const existing = await base44.asServiceRole.entities.Student.filter({ cpf: student_cpf });

    if (existing && existing.length > 0) {
      const student = existing[0];
      // Se o student_id da matrícula está errado, corrige
      if (student_id !== student.id) {
        await base44.asServiceRole.entities.StudentCourseEnrollment.update(payload.event.entity_id, {
          student_id: student.id
        });
      }
      return Response.json({ ok: true, msg: "aluno já cadastrado", student_id: student.id });
    }

    // Cria o Student
    const newStudent = await base44.asServiceRole.entities.Student.create({
      full_name: student_name.trim(),
      cpf: student_cpf,
      email: student_email || "",
      whatsapp: student_phone || "",
      status: "Ativo"
    });

    // Atualiza o student_id na matrícula
    await base44.asServiceRole.entities.StudentCourseEnrollment.update(payload.event.entity_id, {
      student_id: newStudent.id
    });

    return Response.json({ ok: true, msg: "aluno criado e vinculado", student_id: newStudent.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});