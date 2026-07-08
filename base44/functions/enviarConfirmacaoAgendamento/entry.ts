import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const turmaId = body.agenda_id || body.class_schedule_id;
    if (!turmaId) {
      return Response.json({ error: 'agenda_id é obrigatório' }, { status: 400 });
    }

    // Fonte oficial: ClassSchedule (turma)
    const turma = await base44.asServiceRole.entities.ClassSchedule.get(turmaId);
    if (!turma) {
      return Response.json({ error: 'Turma não encontrada' }, { status: 404 });
    }

    const alunos = turma.alunos_inscritos || [];
    if (alunos.length === 0) {
      return Response.json({ success: false, message: 'Nenhum aluno inscrito nesta turma.' });
    }

    // Formatar datas a partir de realization_dates
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    };

    const datas = (turma.realization_dates || []).filter(Boolean).sort();
    const dataInicio = formatDate(datas[0]);
    const dataFim = datas.length > 1 ? formatDate(datas[datas.length - 1]) : dataInicio;
    const periodo = !dataInicio ? 'A confirmar' : (dataInicio === dataFim ? dataInicio : `${dataInicio} a ${dataFim}`);
    const horario = turma.training_schedule || 'A confirmar';

    let enviados = 0;
    let erros = 0;
    const alunosAtualizados = [...alunos];

    for (let i = 0; i < alunosAtualizados.length; i++) {
      const aluno = alunosAtualizados[i];
      if (!aluno.email) continue;

      const linkOnline = turma.link_online
        ? `<p><strong>🔗 Link de Acesso:</strong> <a href="${turma.link_online}">${turma.link_online}</a></p>`
        : '';

      const corpo = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #1a3a5c; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 22px;">✅ Confirmação de Treinamento</h1>
            <p style="margin: 8px 0 0; opacity: 0.85; font-size: 14px;">CAT Cursos e Treinamentos</p>
          </div>
          <div style="background: #f9f9f9; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #374151;">Olá, <strong>${aluno.nome || 'Aluno(a)'}</strong>!</p>
            <p style="color: #6b7280;">Sua inscrição no treinamento abaixo foi <strong style="color: #16a34a;">confirmada</strong>.</p>

            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h2 style="margin: 0 0 16px; color: #1a3a5c; font-size: 18px;">📋 ${turma.training_name}</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 40%;"><strong>Curso:</strong></td>
                  <td style="padding: 8px 0; color: #111827;">${turma.training_name}</td>
                </tr>
                <tr style="background: #f9fafb;">
                  <td style="padding: 8px; color: #6b7280;"><strong>📅 Data:</strong></td>
                  <td style="padding: 8px; color: #111827;">${periodo}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;"><strong>⏰ Horário:</strong></td>
                  <td style="padding: 8px 0; color: #111827;">${horario}</td>
                </tr>
                <tr style="background: #f9fafb;">
                  <td style="padding: 8px; color: #6b7280;"><strong>📍 Local:</strong></td>
                  <td style="padding: 8px; color: #111827;">${turma.location || 'A confirmar'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;"><strong>🎓 Modalidade:</strong></td>
                  <td style="padding: 8px 0; color: #111827;">${turma.category || 'Presencial'}</td>
                </tr>
                ${turma.instructor_name ? `
                <tr style="background: #f9fafb;">
                  <td style="padding: 8px; color: #6b7280;"><strong>👨‍🏫 Instrutor:</strong></td>
                  <td style="padding: 8px; color: #111827;">${turma.instructor_name}</td>
                </tr>` : ''}
                ${turma.company_name ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;"><strong>🏢 Empresa:</strong></td>
                  <td style="padding: 8px 0; color: #111827;">${turma.company_name}</td>
                </tr>` : ''}
              </table>
              ${linkOnline}
            </div>

            ${turma.notes ? `<div style="background: #fef9c3; border-left: 4px solid #ca8a04; padding: 12px 16px; border-radius: 4px; font-size: 14px; color: #78350f;"><strong>ℹ️ Observações:</strong> ${turma.notes}</div>` : ''}

            <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">Em caso de dúvidas, entre em contato conosco.<br>Atenciosamente, <strong>Equipe CAT Cursos</strong></p>
          </div>
        </div>
      `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: aluno.email,
        subject: `✅ Confirmação: ${turma.training_name} – ${periodo}`,
        body: corpo
      });

      alunosAtualizados[i] = {
        ...aluno,
        confirmacao_enviada: true,
        confirmacao_enviada_em: new Date().toISOString()
      };
      enviados++;
    }

    // Atualizar a turma na base
    await base44.asServiceRole.entities.ClassSchedule.update(turmaId, {
      confirmacao_enviada: true,
      confirmacao_enviada_em: new Date().toISOString(),
      alunos_inscritos: alunosAtualizados
    });

    return Response.json({
      success: true,
      enviados,
      erros,
      total: alunos.length,
      message: `E-mails de confirmação enviados para ${enviados} aluno(s).`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});