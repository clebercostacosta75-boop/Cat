import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const LIMITE_TURMA_FECHADA = 15;

function formatCurrency(value) {
  return `R$ ${value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    // Suporta chamada direta (schedule_id) e automação de entidade (event.entity_id)
    const schedule_id = body.schedule_id || body.event?.entity_id;

    if (!schedule_id) {
      return Response.json({ error: 'schedule_id é obrigatório' }, { status: 400 });
    }

    // Se a automação já enviou os dados da entidade, usar diretamente
    let schedule = body.data || null;
    if (!schedule || schedule.id !== schedule_id) {
      schedule = await base44.asServiceRole.entities.ClassSchedule.get(schedule_id);
    }
    if (!schedule) {
      return Response.json({ error: 'Turma não encontrada' }, { status: 404 });
    }

    const students = schedule.students_count || 0;
    const companyId = schedule.company_id;
    const trainingId = schedule.training_id;

    // Se não for turma fechada ou não tiver excedente, limpa observações de excedente
    if (students <= LIMITE_TURMA_FECHADA) {
      // Remove seção de excedente das observações, se existir
      const notesAtual = schedule.notes || '';
      const notesLimpas = notesAtual.replace(/\n?--- EXCEDENTE ---[\s\S]*?--- FIM EXCEDENTE ---/g, '').trim();
      if (notesLimpas !== notesAtual) {
        await base44.asServiceRole.entities.ClassSchedule.update(schedule_id, { notes: notesLimpas || null });
      }
      return Response.json({ message: 'Sem excedente. Observações limpas.', students_count: students });
    }

    const excedente = students - LIMITE_TURMA_FECHADA;

    // Buscar empresa para pegar configurações
    let company = null;
    if (companyId) {
      company = await base44.asServiceRole.entities.Company.get(companyId);
    }

    // Buscar curso configurado na empresa para pegar valor unitário excedente
    let valorUnitarioExcedente = null;
    let included_limit = LIMITE_TURMA_FECHADA;

    if (company && trainingId && company.company_courses) {
      const cursoConfig = company.company_courses.find(c => c.course_id === trainingId);
      if (cursoConfig && cursoConfig.billing_type === 'per_closed_class') {
        valorUnitarioExcedente = cursoConfig.specific_price || null;
        included_limit = cursoConfig.included_students_limit || LIMITE_TURMA_FECHADA;
      }
    }

    // Recalcular excedente com base no limite real configurado
    const excedenteReal = students - included_limit;
    if (excedenteReal <= 0) {
      const notesAtual = schedule.notes || '';
      const notesLimpas = notesAtual.replace(/\n?--- EXCEDENTE ---[\s\S]*?--- FIM EXCEDENTE ---/g, '').trim();
      if (notesLimpas !== notesAtual) {
        await base44.asServiceRole.entities.ClassSchedule.update(schedule_id, { notes: notesLimpas || null });
      }
      return Response.json({ message: 'Sem excedente real.', students_count: students });
    }

    // Montar texto de excedente
    const linhas = [];
    linhas.push(`EXCEDENTE DE ALUNOS: ${excedenteReal} aluno(s) acima do limite de ${included_limit}`);

    if (valorUnitarioExcedente) {
      const totalExcedenteAlunos = excedenteReal * valorUnitarioExcedente;
      linhas.push(`• Valor unitário por aluno excedente: ${formatCurrency(valorUnitarioExcedente)}`);
      linhas.push(`• Total alunos excedentes (${excedenteReal} x ${formatCurrency(valorUnitarioExcedente)}): ${formatCurrency(totalExcedenteAlunos)}`);
    }

    // Alimentação excedente
    if (company && company.additional_services) {
      const svc = company.additional_services;

      if (svc.coffee_break_morning_enabled && svc.coffee_break_morning_unit_value > 0) {
        const total = excedenteReal * svc.coffee_break_morning_unit_value;
        linhas.push(`• Coffee break manhã excedente (${excedenteReal} x ${formatCurrency(svc.coffee_break_morning_unit_value)}): ${formatCurrency(total)}`);
      }

      if (svc.coffee_break_afternoon_enabled && svc.coffee_break_afternoon_unit_value > 0) {
        const total = excedenteReal * svc.coffee_break_afternoon_unit_value;
        linhas.push(`• Coffee break tarde excedente (${excedenteReal} x ${formatCurrency(svc.coffee_break_afternoon_unit_value)}): ${formatCurrency(total)}`);
      }

      if (svc.lunch_enabled && svc.lunch_unit_value > 0) {
        const total = excedenteReal * svc.lunch_unit_value;
        linhas.push(`• Almoço excedente (${excedenteReal} x ${formatCurrency(svc.lunch_unit_value)}): ${formatCurrency(total)}`);
      }
    }

    const blocoExcedente = `--- EXCEDENTE ---\n${linhas.join('\n')}\n--- FIM EXCEDENTE ---`;

    // Mescla com observações existentes (sem duplicar o bloco)
    let notesBase = (schedule.notes || '').replace(/\n?--- EXCEDENTE ---[\s\S]*?--- FIM EXCEDENTE ---/g, '').trim();
    const notesFinal = notesBase ? `${notesBase}\n\n${blocoExcedente}` : blocoExcedente;

    await base44.asServiceRole.entities.ClassSchedule.update(schedule_id, { notes: notesFinal });

    return Response.json({
      message: 'Excedente calculado e observações atualizadas.',
      excedente: excedenteReal,
      notes: notesFinal
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});