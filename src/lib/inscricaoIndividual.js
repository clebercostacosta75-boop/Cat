/**
 * FASE 4 — Nova Inscrição Individual: orquestrador da automação pós-confirmação.
 * Fluxo: Inscrição confirmada → aluno → matrícula(s) → vaga → financeiro →
 * contrato automático → link seguro de assinatura → WhatsApp preparado → prontuário → AuditLog.
 * Reutiliza executarVenda (FASE 1/2) e o motor de contratos existente (gerarContrato/ContractSign).
 */
import { base44 } from "@/api/base44Client";
import { formatarCPF } from "@/lib/cpf";
import { logVenda } from "@/lib/auditVendas";
import { executarVenda } from "@/lib/executarVenda";
import { prepararMensagem, montarVariaveis, preencherTemplate, templateEvento } from "@/lib/comunicacao";

const AUDIT = "FASE 4 Inscrição";
const FORMA_LANC = { "Pix": "PIX", "Boleto": "Boleto", "Cartão de Crédito": "Cartão de Crédito", "Cartão de Débito": "Cartão de Débito", "Dinheiro": "Dinheiro", "Transferência Bancária": "Transferência", "Cortesia": "Outro" };

export function montarMensagemWhatsApp({ nome, itemNome, link }) {
  return `Olá, ${nome}.\n\nSua inscrição no curso/pacote ${itemNome} foi registrada.\n\nAcesse o link abaixo para conferir e assinar eletronicamente seu contrato:\n\n${link}\n\nCAT Cursos`;
}

// Inscrição em curso avulso (sem oferta/pacote — sem controle de vagas)
async function executarVendaCursoAvulso({ user, atendenteNome, alunoExistente, novoAluno, cpf, curso, pgto, origemInscricao, valorAvulso }) {
  let alunoFinal = alunoExistente;
  if (!alunoFinal) {
    alunoFinal = await base44.entities.Student.create({
      full_name: (novoAluno.full_name || "").trim(),
      cpf: formatarCPF(cpf),
      whatsapp: novoAluno.whatsapp || "", email: novoAluno.email || "",
      logradouro: novoAluno.logradouro || "", cidade: novoAluno.cidade || "",
      estado: novoAluno.estado || "", cep: novoAluno.cep || "",
      notes: novoAluno.notes || "", status: "Ativo", origem: "CAT App",
    });
    await logVenda("create", { entity_type: "Student", entity_id: alunoFinal.id, entity_name: alunoFinal.full_name, details: `${AUDIT}: aluno criado (dados básicos)` });
  }

  const valorOriginal = parseFloat(valorAvulso) || 0;
  const valorFinal = Math.max(0, valorOriginal - (parseFloat(pgto.desconto) || 0));
  const agora = new Date().toISOString();

  const m = await base44.entities.StudentCourseEnrollment.create({
    student_id: alunoFinal.id, student_name: alunoFinal.full_name,
    student_cpf: alunoFinal.cpf, student_email: alunoFinal.email || "", student_phone: alunoFinal.whatsapp || "",
    company_id: "individual", company_name: "Individual (PF)",
    course_id: curso.course_id, course_name: curso.course_name,
    course_duration: curso.carga_horaria || "",
    start_date: curso.data_inicio, end_date: curso.data_termino,
    status: "Aguardando Autorização", status_matricula: "Matriculado", resultado_academico: "Pendente",
    forma_pagamento: pgto.forma_pagamento, status_pagamento: pgto.status_pagamento,
    data_vencimento_pagamento: pgto.vencimento || "", parcelas_quantidade: parseInt(pgto.parcelas) || 1,
    desconto: parseFloat(pgto.desconto) || 0,
    atendente_id: user?.id || "", atendente_nome: atendenteNome,
    data_inscricao: agora, origem_inscricao: origemInscricao,
    observacao_financeira: pgto.observacao_financeira || "",
    valor_original: valorOriginal, unit_value: valorFinal,
  });
  await logVenda("create", {
    entity_type: "StudentCourseEnrollment", entity_id: m.id,
    entity_name: `${alunoFinal.full_name} — ${curso.course_name}`,
    details: `${AUDIT}: matrícula criada (curso avulso, origem ${origemInscricao}). Período: ${curso.data_inicio} → ${curso.data_termino}. Atendente: ${atendenteNome}. Pagamento: ${pgto.forma_pagamento} (${pgto.status_pagamento})`,
  });

  const isCortesia = pgto.forma_pagamento === "Cortesia" || pgto.status_pagamento === "Cortesia";
  const lancamento = await base44.entities.LancamentoFinanceiro.create({
    tipo: "Receita",
    natureza: pgto.status_pagamento === "Pago" ? "Realizado" : "Previsto",
    status: isCortesia ? "Cancelado" : pgto.status_pagamento === "Pago" ? "Recebido" : "Pendente",
    descricao: `Matrícula Curso: ${curso.course_name} — ${alunoFinal.full_name}${isCortesia ? " (CORTESIA)" : ""}`,
    valor: isCortesia ? 0 : valorFinal,
    valor_desconto: parseFloat(pgto.desconto) || 0,
    data_competencia: agora.split("T")[0],
    data_vencimento: pgto.vencimento || agora.split("T")[0],
    ...(pgto.status_pagamento === "Pago" ? { data_pagamento: agora.split("T")[0], valor_pago: valorFinal } : {}),
    forma_pagamento: FORMA_LANC[pgto.forma_pagamento] || "Outro",
    origem_modulo: "Matrícula",
    origem_receita: "Comunidade",
    origem_id: m.id,
    cliente_id: alunoFinal.id, cliente_nome: alunoFinal.full_name,
    curso_id: curso.course_id, curso_nome: curso.course_name,
    total_parcelas: parseInt(pgto.parcelas) || 1,
    observacoes: `${AUDIT} — Atendente: ${atendenteNome}. ${pgto.observacao_financeira || ""}`.trim(),
  });
  await logVenda("create", { entity_type: "LancamentoFinanceiro", entity_id: lancamento.id, entity_name: lancamento.descricao, details: `${AUDIT}: financeiro criado — R$ ${valorFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${pgto.forma_pagamento}, ${pgto.parcelas}x, ${pgto.status_pagamento})` });

  return { aluno: alunoFinal, matriculas: [m], lancamento, valorFinal };
}

export async function executarInscricaoIndividual({
  user, atendenteNome, alunoExistente, novoAluno, cpf,
  tipo, item, cursosMatricula, pgto, origemInscricao, valorAvulso,
}) {
  await logVenda("create", {
    entity_type: "StudentCourseEnrollment",
    entity_name: alunoExistente?.full_name || novoAluno?.full_name || formatarCPF(cpf),
    details: `${AUDIT}: inscrição confirmada pelo operador (tipo: ${tipo}) — automação iniciada (aluno → matrícula → financeiro → contrato → link → WhatsApp → prontuário)`,
  });

  // 1-8. Aluno, matrículas, vaga e financeiro
  const venda = tipo === "curso"
    ? await executarVendaCursoAvulso({ user, atendenteNome, alunoExistente, novoAluno, cpf, curso: cursosMatricula[0], pgto, origemInscricao, valorAvulso })
    : await executarVenda({
        user, atendenteId: user?.id, atendenteNome,
        alunoExistente, novoAluno, cpf, tipo, item, cursosMatricula,
        pgto, origemInscricao, auditPrefix: AUDIT,
      });

  const { aluno, matriculas } = venda;

  // FASE 6: comunicação automática — inscrição confirmada (mensagem preparada no histórico)
  const enrollComm = { ...matriculas[0], student_phone: aluno.whatsapp || matriculas[0].student_phone || "", student_email: aluno.email || matriculas[0].student_email || "" };
  await prepararMensagem({
    enrollment: enrollComm, evento: "inscricao_confirmada", canal: "WhatsApp",
    mensagem: preencherTemplate(templateEvento("inscricao_confirmada"), montarVariaveis({ enrollment: enrollComm, lancamento: venda.lancamento })),
    origem: "automática", user,
  }).catch(() => {});

  // 9. Contrato automático (financeiro já criado — não duplica)
  let contrato = null, contratoPendencia = null;
  const faltando = [];
  if (!aluno.cpf) faltando.push("CPF do aluno");
  if (!matriculas[0]?.start_date || !matriculas[0]?.end_date) faltando.push("período de realização do curso");
  if (!pgto.forma_pagamento) faltando.push("forma de pagamento");

  if (faltando.length > 0) {
    contratoPendencia = `Dados obrigatórios pendentes: ${faltando.join(", ")}`;
  } else {
    try {
      const res = await base44.functions.invoke("gerarContrato", {
        student_id: aluno.id, enrollment_id: matriculas[0].id, skip_financeiro: true,
      });
      if (res.data?.contract_number) contrato = res.data;
      else contratoPendencia = res.data?.error || "Falha ao gerar contrato";
    } catch (e) {
      contratoPendencia = e.response?.data?.error || e.message;
    }
  }

  // 10. Link de assinatura + WhatsApp preparado
  let signUrl = null, whatsapp = null;
  if (contrato) {
    await logVenda("create", { entity_type: "Contract", entity_id: contrato.contract_id, entity_name: `${contrato.contract_number} — ${aluno.full_name}`, details: `${AUDIT}: contrato gerado automaticamente após confirmação da inscrição (dados reaproveitados da matrícula; financeiro único, sem duplicidade)` });

    // FASE 5: vincula o financeiro ao contrato gerado
    if (venda.lancamento?.id) {
      await base44.entities.LancamentoFinanceiro.update(venda.lancamento.id, { contrato_id: contrato.contract_id }).catch(() => {});
    }

    signUrl = `${window.location.origin}/ContractSign?code=${contrato.auth_code}`;
    await logVenda("create", { entity_type: "Contract", entity_id: contrato.contract_id, entity_name: contrato.contract_number, details: `${AUDIT}: link seguro de assinatura criado — token único (${contrato.auth_code}) vinculado ao contrato, aluno e matrícula` });

    const itemNome = tipo === "curso" ? cursosMatricula[0].course_name : tipo === "oferta" ? item.nome_comercial : item.nome;
    const message = montarMensagemWhatsApp({ nome: aluno.full_name, itemNome, link: signUrl });
    const digits = (aluno.whatsapp || "").replace(/\D/g, "");
    const phone = digits.length >= 12 ? digits : digits ? "55" + digits : "";
    whatsapp = { message, waLink: phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null };
    await logVenda("send_whatsapp", { entity_type: "Contract", entity_id: contrato.contract_id, entity_name: contrato.contract_number, details: `${AUDIT}: mensagem de WhatsApp com link de assinatura PREPARADA (envio controlado pelo operador — sem disparo automático)` });

    // FASE 6: registra a mensagem do link de contrato no histórico de comunicações da matrícula
    await prepararMensagem({
      enrollment: enrollComm, evento: "contrato_link", canal: "WhatsApp",
      mensagem: message, origem: "automática", user,
    }).catch(() => {});

    // 16. Prontuário do aluno
    await base44.entities.StudentTimeline.create({
      student_id: aluno.id, student_name: aluno.full_name,
      event_type: "contrato_gerado",
      title: "Inscrição Confirmada — Contrato e Link de Assinatura Gerados",
      description: `Contrato ${contrato.contract_number} gerado e link de assinatura eletrônica preparado automaticamente na Nova Inscrição Individual (${itemNome}).`,
      performed_by: user?.email || atendenteNome,
      metadata: { contract_id: contrato.contract_id, enrollment_id: matriculas[0].id },
    }).catch(() => {});
  } else if (contratoPendencia) {
    await logVenda("update", { entity_type: "Contract", entity_name: aluno.full_name, details: `${AUDIT}: matrícula criada, mas contrato NÃO foi gerado — ${contratoPendencia}. Pendência registrada para regularização.` });
  }

  return { ...venda, contrato, contratoPendencia, signUrl, whatsapp };
}