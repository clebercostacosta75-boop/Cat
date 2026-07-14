import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const safeClass = (item, full) => {
  const fields = ['id','training_name','company_name','location','students_count','status','realization_dates','specific_days','training_schedule','modality','category','duration_hours','start_date','instructor_id'];
  if (full) fields.push('notes');
  return Object.fromEntries(fields.filter((field) => item?.[field] !== undefined).map((field) => [field, item[field]]));
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    let instructor = null;
    if (user?.instructor_id) instructor = await base44.asServiceRole.entities.Instructor.get(user.instructor_id).catch(() => null);
    if (!instructor) {
      const digits = String(body.cpf || '').replace(/\D/g, '');
      if (digits.length !== 11) return Response.json({ error: 'Identificação inválida' }, { status: 400 });
      const formatted = digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
      const candidates = [...await base44.asServiceRole.entities.Instructor.filter({ cpf: digits }), ...await base44.asServiceRole.entities.Instructor.filter({ cpf: formatted })];
      instructor = candidates[0] || null;
    }
    if (!instructor) return Response.json({ error: 'Instrutor não encontrado' }, { status: 404 });
    const authenticated = user?.role === 'admin' || user?.instructor_id === instructor.id;
    if (body.action === 'save_report') {
      if (!authenticated) return Response.json({ error: 'Faça login pelo convite do instrutor para alterar a turma' }, { status: 403 });
      const classItem = await base44.asServiceRole.entities.ClassSchedule.get(body.class_id);
      if (!classItem || classItem.instructor_id !== instructor.id) return Response.json({ error: 'Turma não autorizada' }, { status: 403 });
      await base44.asServiceRole.entities.ClassSchedule.update(classItem.id, { notes: String(body.notes || '').slice(0, 5000) });
      return Response.json({ success: true });
    }
    const classes = await base44.asServiceRole.entities.ClassSchedule.filter({ instructor_id: instructor.id });
    return Response.json({
      instructor: { id: instructor.id, name: instructor.name, specialty: instructor.specialty, email: authenticated ? instructor.email : '' },
      classes: classes.map((item) => safeClass(item, authenticated)),
      legacy_limited: !authenticated,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});