import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Ponto 1 — Monitor Financeiro de Matrículas (Central de Certificação).
// Cruza StudentCourseEnrollment (status_pagamento pendente) com LancamentoFinanceiro
// e atualiza automaticamente o status de pagamento da matrícula, liberando (ou não)
// o Gate Financeiro da certificação. Roda por automação agendada ou sob demanda.

const PAGO = (l) =>
  l.situacao_cobranca === "Pago" ||
  ["Pago", "Recebido"].includes(l.status) ||
  (l.valor_pago || 0) >= (l.valor || 0) && (l.valor || 0) > 0;

const CANCELADO = (l) =>
  ["Cancelado", "Cortesia", "Reembolsado"].includes(l.situacao_cobranca || "") ||
  l.status === "Cancelado" || l.natureza === "Cancelado";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const PENDENTES = ["Pendente", "Parcialmente Pago", "Aguardando Confirmação", "Inadimplente"];
    const enrollments = await base44.asServiceRole.entities.StudentCourseEnrollment.filter(
      { status_pagamento: { $in: PENDENTES } }, "-created_date", 500
    );
    if (!enrollments.length) return Response.json({ verificadas: 0, atualizadas: 0, detalhes: [] });

    // Lançamentos de receita vinculados a matrículas, indexados por origem_id
    const lancamentos = await base44.asServiceRole.entities.LancamentoFinanceiro.filter(
      { tipo: "Receita", origem_id: { $in: enrollments.map((e) => e.id) } }, "-created_date", 500
    );
    const porMatricula = {};
    for (const l of lancamentos) {
      if (!l.origem_id) continue;
      (porMatricula[l.origem_id] = porMatricula[l.origem_id] || []).push(l);
    }

    const hoje = new Date().toISOString().split("T")[0];
    const detalhes = [];
    let atualizadas = 0;

    for (const enr of enrollments) {
      const lancs = (porMatricula[enr.id] || []).filter((l) => !CANCELADO(l));
      if (!lancs.length) continue; // sem cobrança registrada → não mexe (regra legada do motor)

      const pagos = lancs.filter(PAGO);
      const vencidos = lancs.filter((l) => !PAGO(l) && l.data_vencimento && l.data_vencimento < hoje);

      let novoStatus;
      if (pagos.length === lancs.length) novoStatus = "Pago";
      else if (vencidos.length > 0) novoStatus = "Inadimplente";
      else if (pagos.length > 0) novoStatus = "Parcialmente Pago";
      else continue; // segue pendente, nada a atualizar

      if (novoStatus === enr.status_pagamento) continue;

      await base44.asServiceRole.entities.StudentCourseEnrollment.update(enr.id, { status_pagamento: novoStatus });
      atualizadas++;
      detalhes.push(`${enr.student_name} — ${enr.course_name}: "${enr.status_pagamento}" → "${novoStatus}"`);

      await base44.asServiceRole.entities.AuditLog.create({
        user_email: "monitor@financeiro",
        user_name: "Monitor Financeiro (automático)",
        action: "update",
        entity_type: "StudentCourseEnrollment",
        entity_id: enr.id,
        entity_name: `${enr.student_name} — ${enr.course_name}`,
        details: `MONITOR FINANCEIRO: status de pagamento da matrícula atualizado automaticamente de "${enr.status_pagamento}" para "${novoStatus}" em ${new Date().toLocaleString("pt-BR")}, com base em ${lancs.length} lançamento(s) financeiro(s) (${pagos.length} pago(s)). Impacto: Gate Financeiro da certificação recalculado.`,
      }).catch(() => {});

      if (novoStatus === "Pago") {
        await base44.asServiceRole.entities.StudentTimeline.create({
          student_id: enr.student_id,
          student_name: enr.student_name,
          event_type: "pagamento_confirmado",
          title: "Pagamento quitado — Monitor Financeiro",
          description: `Todas as cobranças do curso "${enr.course_name}" foram quitadas. Matrícula liberada no Gate Financeiro da certificação.`,
          performed_by: "monitor/financeiro",
        }).catch(() => {});
      }
    }

    return Response.json({ verificadas: enrollments.length, atualizadas, detalhes });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});