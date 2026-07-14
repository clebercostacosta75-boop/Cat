import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const digits = String(body.cpf || '').replace(/\D/g, '');
    if (digits.length !== 11) return Response.json({ error: 'CPF inválido' }, { status: 400 });

    const formatted = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    const svc = base44.asServiceRole.entities;
    const byDigits = await svc.Instructor.filter({ cpf: digits });
    const byFormatted = byDigits.length ? [] : await svc.Instructor.filter({ cpf: formatted });
    const instructor = byDigits[0] || byFormatted[0];
    if (!instructor) return Response.json({ error: 'not_found' }, { status: 404 });

    if (body.action === 'save_report') {
      if (!body.class_id) return Response.json({ error: 'Turma não informada' }, { status: 400 });
      const classItem = await svc.ClassSchedule.get(body.class_id).catch(() => null);
      if (!classItem || classItem.instructor_id !== instructor.id) {
        return Response.json({ error: 'Turma não autorizada' }, { status: 403 });
      }
      await svc.ClassSchedule.update(classItem.id, { notes: String(body.notes || '').slice(0, 10000) });
      return Response.json({ success: true });
    }

    const classes = await svc.ClassSchedule.filter({ instructor_id: instructor.id });
    return Response.json({
      instructor: {
        id: instructor.id,
        name: instructor.name,
        specialty: instructor.specialty,
        email: instructor.email,
      },
      classes: classes.map(c => ({
        id: c.id,
        training_name: c.training_name,
        company_name: c.company_name,
        location: c.location,
        students_count: c.students_count,
        status: c.status,
        realization_dates: c.realization_dates || [],
        start_date: c.start_date,
        specific_days: c.specific_days,
        training_schedule: c.training_schedule,
        modality: c.modality,
        category: c.category,
        duration_hours: c.duration_hours,
        notes: c.notes,
        instructor_id: c.instructor_id,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});