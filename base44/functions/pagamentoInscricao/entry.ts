import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// FASE 5 — Pagamento da Matrícula Individual (Asaas / Pix / Boleto / Cartão / Manual)
// Ações: prepararCobranca | confirmarPagamentoManual | anexarComprovante | cancelarCobranca

const ASAAS_BASE = "https://api.asaas.com/v3";
const BILLING = { "PIX": "PIX", "Boleto": "BOLETO", "Cartão de Crédito": "CREDIT_CARD" };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { action, ...p } = await req.json();
    const API_KEY = Deno.env.get("ASAAS_API_KEY");
    const asaasHeaders = { "Content-Type": "application/json", "access_token": API_KEY };
    const agora = new Date().toISOString();

    const audit = (data) =>
      base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email, user_name: user.full_name || user.email, ...data,
      }).catch(() => {});

    const getLancamento = async (id) => {
      const rows = await base44.asServiceRole.entities.LancamentoFinanceiro.filter({ id });
      return rows[0] || null;
    };
    const getEnrollment = async (id) => {
      if (!id) return null;
      const rows = await base44.asServiceRole.entities.StudentCourseEnrollment.filter({ id });
      return rows[0] || null;
    };
    const contexto = (lanc, enr) =>
      `Aluno: ${enr?.student_name || lanc.cliente_nome || "?"} | Matrícula: ${lanc.origem_id || "?"} | Curso/Pacote: ${lanc.curso_nome || "?"} | Financeiro: ${lanc.id} | Contrato: ${lanc.contrato_id || "—"}`;

    const isAutorizadoFinanceiro = async () => {
      if (user.role === "admin") return true;
      const profs = await base44.asServiceRole.entities.UserProfile.filter({ user_email: user.email });
      const prof = profs[0];
      if (!prof) return false;
      if (prof.role === "gestor_master") return true;
      return (prof.permissions || []).some((x) => ["Financeiro", "Dashboard Financeiro"].includes(x));
    };

    // ── Preparar cobrança Asaas (Pix / Boleto / Cartão) ──────────────────────
    if (action === "prepararCobranca") {
      const lanc = await getLancamento(p.lancamento_id);
      if (!lanc) return Response.json({ error: "Lançamento financeiro não encontrado" }, { status: 404 });

      // Anti-duplicidade: já existe cobrança ativa vinculada
      if (lanc.asaas_payment_id && lanc.situacao_cobranca !== "Cancelado") {
        return Response.json({
          success: true, ja_existia: true,
          asaas_payment_id: lanc.asaas_payment_id, link_pagamento: lanc.link_pagamento,
          pix_payload: lanc.pix_payload, boleto_linha_digitavel: lanc.boleto_linha_digitavel,
        });
      }

      const billingType = BILLING[lanc.forma_pagamento];
      if (!billingType) return Response.json({ error: `Forma de pagamento "${lanc.forma_pagamento}" não gera cobrança Asaas. Use confirmação manual.` }, { status: 400 });
      if (lanc.status === "Recebido" || lanc.status === "Pago") return Response.json({ error: "Este financeiro já está pago." }, { status: 400 });

      const enr = await getEnrollment(lanc.origem_id);
      const cpf = (enr?.student_cpf || "").replace(/\D/g, "");
      if (!cpf) return Response.json({ error: "CPF do aluno não encontrado na matrícula" }, { status: 400 });

      // Cliente Asaas (busca por CPF; cria se não existir)
      const search = await fetch(`${ASAAS_BASE}/customers?cpfCnpj=${cpf}`, { headers: asaasHeaders });
      const searchData = await search.json();
      let customer = searchData.data?.[0];
      if (!customer) {
        const createRes = await fetch(`${ASAAS_BASE}/customers`, {
          method: "POST", headers: asaasHeaders,
          body: JSON.stringify({
            name: enr.student_name, cpfCnpj: cpf,
            email: enr.student_email || undefined,
            mobilePhone: (enr.student_phone || "").replace(/\D/g, "") || undefined,
          }),
        });
        customer = await createRes.json();
        if (customer.errors) return Response.json({ error: `Asaas (cliente): ${customer.errors[0]?.description}` }, { status: 400 });
      }

      const dueDate = lanc.data_vencimento || agora.split("T")[0];
      const chargeBody = {
        customer: customer.id, billingType,
        value: lanc.valor, dueDate,
        description: lanc.descricao,
        externalReference: `matricula:${lanc.origem_id}|financeiro:${lanc.id}`,
      };
      if (billingType === "CREDIT_CARD" && (lanc.total_parcelas || 1) > 1) {
        chargeBody.installmentCount = lanc.total_parcelas;
        chargeBody.installmentValue = parseFloat((lanc.valor / lanc.total_parcelas).toFixed(2));
      }
      const chargeRes = await fetch(`${ASAAS_BASE}/payments`, { method: "POST", headers: asaasHeaders, body: JSON.stringify(chargeBody) });
      const charge = await chargeRes.json();
      if (charge.errors) return Response.json({ error: `Asaas (cobrança): ${charge.errors[0]?.description}` }, { status: 400 });

      // Dados específicos por forma
      let pixPayload = "", boletoLinha = "";
      if (billingType === "PIX") {
        const qrRes = await fetch(`${ASAAS_BASE}/payments/${charge.id}/pixQrCode`, { headers: asaasHeaders });
        const qr = await qrRes.json();
        pixPayload = qr.payload || "";
      }
      if (billingType === "BOLETO") {
        const lineRes = await fetch(`${ASAAS_BASE}/payments/${charge.id}/identificationField`, { headers: asaasHeaders });
        const line = await lineRes.json();
        boletoLinha = line.identificationField || "";
      }

      const situacao = billingType === "CREDIT_CARD" ? "Aguardando Confirmação" : "Aguardando Pagamento";
      await base44.asServiceRole.entities.LancamentoFinanceiro.update(lanc.id, {
        asaas_payment_id: charge.id, asaas_customer_id: customer.id,
        link_pagamento: charge.invoiceUrl || charge.bankSlipUrl || "",
        pix_payload: pixPayload, boleto_linha_digitavel: boletoLinha,
        situacao_cobranca: situacao,
      });
      if (enr) {
        await base44.asServiceRole.entities.StudentCourseEnrollment.update(enr.id, {
          status_pagamento: billingType === "CREDIT_CARD" ? "Aguardando Confirmação" : "Pendente",
        });
      }

      const tipoLabel = billingType === "PIX" ? "link/QR Pix gerado" : billingType === "BOLETO" ? "boleto gerado" : "link de cartão gerado";
      await audit({
        action: "create", entity_type: "LancamentoFinanceiro", entity_id: lanc.id, entity_name: lanc.descricao,
        details: `FASE 5 Pagamento: cobrança Asaas criada (${charge.id}) — ${tipoLabel}. Valor: R$ ${lanc.valor} | Vencimento: ${dueDate} | Status: ${situacao} | Forma: ${lanc.forma_pagamento} | Origem: operador/Asaas. ${contexto(lanc, enr)}`,
      });

      return Response.json({
        success: true, asaas_payment_id: charge.id,
        link_pagamento: charge.invoiceUrl || charge.bankSlipUrl || "",
        pix_payload: pixPayload, boleto_linha_digitavel: boletoLinha, situacao,
      });
    }

    // ── Anexar comprovante manual ─────────────────────────────────────────────
    if (action === "anexarComprovante") {
      const lanc = await getLancamento(p.lancamento_id);
      if (!lanc) return Response.json({ error: "Lançamento não encontrado" }, { status: 404 });
      if (!p.comprovante_url) return Response.json({ error: "Arquivo do comprovante é obrigatório" }, { status: 400 });

      const enr = await getEnrollment(lanc.origem_id);
      await base44.asServiceRole.entities.LancamentoFinanceiro.update(lanc.id, {
        anexo_url: p.comprovante_url,
        comprovante_observacao: p.observacao || "",
        situacao_cobranca: "Aguardando Confirmação",
      });
      if (enr && enr.status_pagamento !== "Pago") {
        await base44.asServiceRole.entities.StudentCourseEnrollment.update(enr.id, { status_pagamento: "Aguardando Confirmação" });
      }
      await audit({
        action: "update", entity_type: "LancamentoFinanceiro", entity_id: lanc.id, entity_name: lanc.descricao,
        details: `FASE 5 Pagamento: comprovante manual ANEXADO — status alterado de "${lanc.situacao_cobranca || lanc.status}" para "Aguardando Confirmação". Forma: ${lanc.forma_pagamento} | Origem: manual/operador. Obs: ${p.observacao || "—"}. ${contexto(lanc, enr)}`,
      });
      return Response.json({ success: true });
    }

    // ── Confirmar pagamento manual (usuário autorizado) ───────────────────────
    if (action === "confirmarPagamentoManual") {
      const lanc = await getLancamento(p.lancamento_id);
      if (!lanc) return Response.json({ error: "Lançamento não encontrado" }, { status: 404 });
      const enr = await getEnrollment(lanc.origem_id);

      if (!(await isAutorizadoFinanceiro())) {
        await audit({
          action: "update", entity_type: "LancamentoFinanceiro", entity_id: lanc.id, entity_name: lanc.descricao,
          details: `FASE 5 Pagamento: tentativa de CONFIRMAÇÃO MANUAL DE PAGAMENTO NEGADA — usuário sem permissão financeira. ${contexto(lanc, enr)}`,
        });
        return Response.json({ error: "Sem permissão: apenas usuários autorizados do Financeiro podem confirmar pagamento manual." }, { status: 403 });
      }
      if (lanc.status === "Recebido" || lanc.status === "Pago") return Response.json({ error: "Pagamento já confirmado." }, { status: 400 });

      const valorPago = parseFloat(p.valor_pago) || lanc.valor;
      const dataPgto = p.data_pagamento || agora.split("T")[0];
      await base44.asServiceRole.entities.LancamentoFinanceiro.update(lanc.id, {
        status: "Recebido", natureza: "Realizado",
        valor_pago: valorPago, data_pagamento: dataPgto,
        situacao_cobranca: "Pago",
        confirmado_por: user.email, confirmado_em: agora,
        ...(p.comprovante_url ? { anexo_url: p.comprovante_url } : {}),
        observacoes: `${lanc.observacoes || ""}\nFASE 5: pagamento confirmado manualmente por ${user.email} em ${dataPgto}. ${p.observacao || ""}`.trim(),
      });
      if (enr) {
        await base44.asServiceRole.entities.StudentCourseEnrollment.update(enr.id, { status_pagamento: "Pago" });
        await base44.asServiceRole.entities.StudentTimeline.create({
          student_id: enr.student_id, student_name: enr.student_name,
          event_type: "pagamento_confirmado",
          title: `Pagamento Confirmado — ${lanc.forma_pagamento}`,
          description: `Pagamento de R$ ${valorPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} confirmado manualmente por ${user.email} (${lanc.curso_nome || ""}).`,
          performed_by: user.email,
        }).catch(() => {});
      }
      await audit({
        action: "update", entity_type: "LancamentoFinanceiro", entity_id: lanc.id, entity_name: lanc.descricao,
        details: `FASE 5 Pagamento: pagamento CONFIRMADO MANUALMENTE — status anterior: "${lanc.status}/${lanc.situacao_cobranca || "—"}" → novo: "Recebido/Pago". Valor pago: R$ ${valorPago} | Data: ${dataPgto} | Forma: ${lanc.forma_pagamento} | Origem: manual/operador autorizado. ${contexto(lanc, enr)}`,
      });
      return Response.json({ success: true });
    }

    // ── Cancelar cobrança (justificativa obrigatória) ─────────────────────────
    if (action === "cancelarCobranca") {
      const lanc = await getLancamento(p.lancamento_id);
      if (!lanc) return Response.json({ error: "Lançamento não encontrado" }, { status: 404 });
      if (!p.justificativa || p.justificativa.trim().length < 5) return Response.json({ error: "Justificativa obrigatória para cancelar cobrança." }, { status: 400 });
      if (lanc.status === "Recebido" || lanc.status === "Pago") return Response.json({ error: "Cobrança já paga não pode ser cancelada aqui — use fluxo de reembolso do Financeiro." }, { status: 400 });

      const enr = await getEnrollment(lanc.origem_id);
      if (lanc.asaas_payment_id) {
        await fetch(`${ASAAS_BASE}/payments/${lanc.asaas_payment_id}/cancel`, { method: "POST", headers: asaasHeaders }).catch(() => {});
      }
      await base44.asServiceRole.entities.LancamentoFinanceiro.update(lanc.id, {
        situacao_cobranca: "Cancelado",
        observacoes: `${lanc.observacoes || ""}\nFASE 5: cobrança cancelada por ${user.email} — ${p.justificativa}`.trim(),
      });
      await audit({
        action: "update", entity_type: "LancamentoFinanceiro", entity_id: lanc.id, entity_name: lanc.descricao,
        details: `FASE 5 Pagamento: cobrança CANCELADA (Asaas: ${lanc.asaas_payment_id || "sem cobrança online"}) — status anterior: "${lanc.situacao_cobranca || lanc.status}" → novo: "Cancelado". Justificativa: ${p.justificativa}. Origem: operador. ${contexto(lanc, enr)}`,
      });
      return Response.json({ success: true });
    }

    return Response.json({ error: "Ação não reconhecida" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});