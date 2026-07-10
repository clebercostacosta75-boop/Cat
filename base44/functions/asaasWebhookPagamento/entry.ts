import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// FASE 5 — Webhook Asaas: atualiza automaticamente o financeiro e a matrícula.
// Autenticidade: o payload só informa o ID; o status real é SEMPRE re-consultado na API do Asaas
// com a chave privada — um chamador malicioso não consegue forjar um pagamento.

const MAPA_STATUS = {
  RECEIVED: "Pago", CONFIRMED: "Pago", RECEIVED_IN_CASH: "Pago",
  OVERDUE: "Vencido", REFUNDED: "Reembolsado",
  DELETED: "Cancelado", CANCELED: "Cancelado",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const paymentId = body?.payment?.id;
    if (!paymentId) return Response.json({ received: true, ignored: "sem payment.id" });

    // Verificação de autenticidade: buscar a cobrança direto no Asaas
    const API_KEY = Deno.env.get("ASAAS_API_KEY");
    const res = await fetch(`https://api.asaas.com/v3/payments/${paymentId}`, {
      headers: { "access_token": API_KEY },
    });
    if (!res.ok) return Response.json({ error: "Cobrança não verificada no Asaas" }, { status: 401 });
    const pay = await res.json();

    const lancs = await base44.asServiceRole.entities.LancamentoFinanceiro.filter({ asaas_payment_id: paymentId });
    const lanc = lancs[0];
    if (!lanc) return Response.json({ received: true, ignored: "cobrança sem financeiro vinculado" });

    const novaSituacao = MAPA_STATUS[pay.status];
    if (!novaSituacao || lanc.situacao_cobranca === novaSituacao) return Response.json({ received: true, unchanged: true });

    const updates = { situacao_cobranca: novaSituacao };
    if (novaSituacao === "Pago") {
      updates.status = "Recebido";
      updates.natureza = "Realizado";
      updates.valor_pago = pay.value || lanc.valor;
      updates.data_pagamento = (pay.paymentDate || pay.clientPaymentDate || new Date().toISOString().split("T")[0]);
      if (pay.transactionReceiptUrl) updates.anexo_url = pay.transactionReceiptUrl;
    }
    if (novaSituacao === "Vencido") updates.status = "Vencido";
    await base44.asServiceRole.entities.LancamentoFinanceiro.update(lanc.id, updates);

    // Atualiza a matrícula vinculada (Gate Financeiro lê status_pagamento)
    let enr = null;
    if (lanc.origem_id) {
      const enrs = await base44.asServiceRole.entities.StudentCourseEnrollment.filter({ id: lanc.origem_id });
      enr = enrs[0];
      if (enr) {
        const statusMatricula = novaSituacao === "Pago" ? "Pago" : novaSituacao === "Vencido" ? "Inadimplente" : enr.status_pagamento;
        if (statusMatricula !== enr.status_pagamento) {
          await base44.asServiceRole.entities.StudentCourseEnrollment.update(enr.id, { status_pagamento: statusMatricula });
        }
        if (novaSituacao === "Pago") {
          await base44.asServiceRole.entities.StudentTimeline.create({
            student_id: enr.student_id, student_name: enr.student_name,
            event_type: "pagamento_confirmado",
            title: "Pagamento Confirmado — Asaas (automático)",
            description: `Pagamento de R$ ${(pay.value || lanc.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} confirmado automaticamente via webhook Asaas (${lanc.curso_nome || ""}).`,
            performed_by: "webhook/Asaas",
          }).catch(() => {});
        }
      }
    }

    await base44.asServiceRole.entities.AuditLog.create({
      user_email: "webhook@asaas",
      user_name: "Webhook Asaas",
      action: "update",
      entity_type: "LancamentoFinanceiro",
      entity_id: lanc.id,
      entity_name: lanc.descricao,
      details: `FASE 5 Pagamento: atualização automática via WEBHOOK Asaas (evento ${body.event || "?"}) — status anterior: "${lanc.situacao_cobranca || lanc.status}" → novo: "${novaSituacao}". Valor: R$ ${pay.value || lanc.valor} | Forma: ${lanc.forma_pagamento} | Origem: webhook/Asaas. Aluno: ${enr?.student_name || lanc.cliente_nome || "?"} | Matrícula: ${lanc.origem_id || "?"} | Curso/Pacote: ${lanc.curso_nome || "?"} | Financeiro: ${lanc.id} | Contrato: ${lanc.contrato_id || "—"}`,
    }).catch(() => {});

    return Response.json({ received: true, situacao: novaSituacao });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});