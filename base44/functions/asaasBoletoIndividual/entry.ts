import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Boleto Asaas — exclusivo da Gestão Acadêmica Individual (PF).
// Localiza cliente por externalReference/CPF (anti-duplicidade), organiza por groupName
// e vincula a cobrança à matrícula. Status de pagamento é atualizado SOMENTE via webhook (asaasWebhookPagamento).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const allowed = ['admin', 'gestor_master', 'financeiro', 'coordenacao', 'atendimento'];
    if (!allowed.includes(user.role)) return Response.json({ error: 'Sem permissão para gerar cobrança.' }, { status: 403 });

    const { enrollment_id } = await req.json();
    if (!enrollment_id) return Response.json({ error: 'enrollment_id é obrigatório.' }, { status: 400 });

    const apiKey = Deno.env.get('ASAAS_API_KEY');
    if (!apiKey) return Response.json({ error: 'ASAAS_API_KEY não configurada — pendente de configuração.' }, { status: 500 });
    // HOMOLOGAÇÃO: sem ASAAS_BASE_URL configurada, usa o sandbox — nenhuma cobrança real é executada.
    // Para produção (após aprovação), configure ASAAS_BASE_URL = https://api.asaas.com/v3
    const baseUrl = Deno.env.get('ASAAS_BASE_URL') || 'https://api-sandbox.asaas.com/v3';
    const headers = { 'access_token': apiKey, 'Content-Type': 'application/json' };

    const enrollment = await base44.asServiceRole.entities.StudentCourseEnrollment.get(enrollment_id);
    if (!enrollment) return Response.json({ error: 'Matrícula não encontrada.' }, { status: 404 });

    // Guard de separação PF x PJ: matrícula empresarial não gera cobrança individual
    const isPF = !!(enrollment.oferta_id || enrollment.course_offer_id || enrollment.pacote_id ||
      enrollment.pre_cadastro_id || enrollment.unit_value || enrollment.origem_inscricao);
    if (!isPF) {
      return Response.json({ error: 'Matrícula empresarial não pode gerar cobrança individual. Boleto Asaas é exclusivo da Gestão Acadêmica Individual.' }, { status: 400 });
    }

    const lancs = await base44.asServiceRole.entities.LancamentoFinanceiro.filter({ origem_id: enrollment_id });
    const lanc = (lancs || [])[0];
    if (!lanc) return Response.json({ error: 'Nenhum lançamento financeiro vinculado a esta matrícula.' }, { status: 400 });
    if (lanc.origem_receita === 'Empresa') {
      return Response.json({ error: 'Lançamento de origem empresarial — não permitido no financeiro individual.' }, { status: 400 });
    }

    // Anti-duplicidade de cobrança
    if (lanc.asaas_payment_id) {
      return Response.json({
        ok: true, duplicado: true,
        message: 'Cobrança já existente no Asaas para esta matrícula (anti-duplicidade).',
        asaas_payment_id: lanc.asaas_payment_id,
        link_pagamento: lanc.link_pagamento || '',
        boleto_linha_digitavel: lanc.boleto_linha_digitavel || '',
      });
    }

    const cpf = String(enrollment.student_cpf || '').replace(/\D/g, '');
    if (!cpf) return Response.json({ error: 'CPF do aluno é obrigatório para gerar boleto.' }, { status: 400 });

    // 1) Localizar cliente por externalReference (student_id) e depois por CPF
    let customerId = lanc.asaas_customer_id || null;
    if (!customerId && enrollment.student_id) {
      const r = await fetch(`${baseUrl}/customers?externalReference=${encodeURIComponent(enrollment.student_id)}`, { headers });
      const d = await r.json();
      customerId = d?.data?.[0]?.id || null;
    }
    if (!customerId) {
      const r = await fetch(`${baseUrl}/customers?cpfCnpj=${cpf}`, { headers });
      const d = await r.json();
      customerId = d?.data?.[0]?.id || null;
    }

    // 2) Criar cliente se não existir, organizado pelo groupName da oferta/turma
    const groupName = enrollment.oferta_nome || enrollment.pacote_nome || enrollment.course_name || 'Alunos Individuais';
    if (!customerId) {
      const r = await fetch(`${baseUrl}/customers`, {
        method: 'POST', headers,
        body: JSON.stringify({
          name: enrollment.student_name,
          cpfCnpj: cpf,
          email: enrollment.student_email || undefined,
          mobilePhone: String(enrollment.student_phone || '').replace(/\D/g, '') || undefined,
          externalReference: enrollment.student_id || undefined,
          groupName,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.id) return Response.json({ error: 'Falha ao criar cliente no Asaas.', detail: d?.errors || d }, { status: 502 });
      customerId = d.id;
    }

    // 3) Criar cobrança BOLETO vinculada à matrícula (externalReference = enrollment_id)
    const saldo = Math.max(0, (lanc.valor || 0) - (lanc.valor_pago || 0));
    const dueDate = lanc.data_vencimento || new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    const pr = await fetch(`${baseUrl}/payments`, {
      method: 'POST', headers,
      body: JSON.stringify({
        customer: customerId,
        billingType: 'BOLETO',
        value: saldo || lanc.valor,
        dueDate,
        description: `Matrícula — ${enrollment.course_name} — ${enrollment.student_name}`,
        externalReference: enrollment_id,
      }),
    });
    const pd = await pr.json();
    if (!pr.ok || !pd.id) return Response.json({ error: 'Falha ao criar cobrança no Asaas.', detail: pd?.errors || pd }, { status: 502 });

    // 4) Linha digitável (opcional)
    let linha = '';
    try {
      const ir = await fetch(`${baseUrl}/payments/${pd.id}/identificationField`, { headers });
      if (ir.ok) {
        const idf = await ir.json();
        linha = idf?.identificationField || '';
      }
    } catch (_e) { /* linha digitável é opcional */ }

    // 5) Vincular no lançamento — o status Pago virá SOMENTE pelo webhook
    await base44.asServiceRole.entities.LancamentoFinanceiro.update(lanc.id, {
      asaas_customer_id: customerId,
      asaas_payment_id: pd.id,
      link_pagamento: pd.invoiceUrl || pd.bankSlipUrl || '',
      boleto_linha_digitavel: linha,
      situacao_cobranca: 'Aguardando Pagamento',
      forma_pagamento: 'Boleto',
    });

    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      user_name: user.full_name || user.email,
      action: 'create',
      entity_type: 'LancamentoFinanceiro',
      entity_id: lanc.id,
      entity_name: `Boleto Asaas — ${enrollment.student_name}`,
      details: `Boleto Asaas ${pd.id} gerado para matrícula ${enrollment_id} (grupo: ${groupName}). Valor: R$ ${(saldo || lanc.valor || 0).toFixed(2)}. Vencimento: ${dueDate}. Status será atualizado via webhook.`,
    });

    return Response.json({
      ok: true,
      asaas_customer_id: customerId,
      asaas_payment_id: pd.id,
      link_pagamento: pd.invoiceUrl || pd.bankSlipUrl || '',
      boleto_linha_digitavel: linha,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});