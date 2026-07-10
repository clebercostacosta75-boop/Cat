/**
 * FASE 2 — Execução centralizada de venda/matrícula individual (Comunidade).
 * Usada na conversão de pré-cadastro em matrícula. Replica as regras da FASE 1:
 * aluno sem duplicidade, matrículas por curso, baixa de vaga, financeiro único e auditoria.
 */
import { base44 } from "@/api/base44Client";
import { formatarCPF } from "@/lib/cpf";
import { logVenda } from "@/lib/auditVendas";

const FORMA_LANC = { "Pix": "PIX", "Boleto": "Boleto", "Cartão de Crédito": "Cartão de Crédito", "Cartão de Débito": "Cartão de Débito", "Dinheiro": "Dinheiro", "Transferência Bancária": "Transferência", "Cortesia": "Outro" };

export async function executarVenda({
  user, atendenteId, atendenteNome,
  alunoExistente, novoAluno, cpf,
  tipo, item, cursosMatricula,
  pgto, origemInscricao = "Presencial",
  auditPrefix = "FASE 1 Vendas", extraEnrollment = {},
}) {
  // 1. Aluno (nunca duplica)
  let alunoFinal = alunoExistente;
  if (!alunoFinal) {
    alunoFinal = await base44.entities.Student.create({
      full_name: (novoAluno.full_name || "").trim(),
      cpf: formatarCPF(cpf),
      whatsapp: novoAluno.whatsapp || "", email: novoAluno.email || "",
      logradouro: novoAluno.logradouro || "", cidade: novoAluno.cidade || "",
      estado: novoAluno.estado || "", cep: novoAluno.cep || "",
      data_nascimento: novoAluno.data_nascimento || undefined,
      notes: novoAluno.notes || "", status: "Ativo", origem: "CAT App",
    });
    await logVenda("create", { entity_type: "Student", entity_id: alunoFinal.id, entity_name: alunoFinal.full_name, details: `${auditPrefix}: aluno criado (dados básicos)` });
  }

  const valorOriginal = tipo === "oferta" ? (item.valor || 0) : (item.valor_final ?? item.valor_total ?? 0);
  const valorFinal = Math.max(0, valorOriginal - (parseFloat(pgto.desconto) || 0));
  const agora = new Date().toISOString();
  const nCursos = cursosMatricula.length;
  const valorPorCurso = Math.round((valorFinal / nCursos) * 100) / 100;

  const base = {
    student_id: alunoFinal.id, student_name: alunoFinal.full_name,
    student_cpf: alunoFinal.cpf, student_email: alunoFinal.email || "", student_phone: alunoFinal.whatsapp || "",
    company_id: "individual", company_name: "Individual (PF)",
    status: "Aguardando Autorização", status_matricula: "Matriculado", resultado_academico: "Pendente",
    forma_pagamento: pgto.forma_pagamento, status_pagamento: pgto.status_pagamento,
    data_vencimento_pagamento: pgto.vencimento || "", parcelas_quantidade: parseInt(pgto.parcelas) || 1,
    desconto: parseFloat(pgto.desconto) || 0,
    atendente_id: atendenteId || "", atendente_nome: atendenteNome,
    data_inscricao: agora, origem_inscricao: origemInscricao,
    observacao_financeira: pgto.observacao_financeira || "",
    ...(tipo === "oferta"
      ? { oferta_id: item.id, oferta_nome: item.nome_comercial }
      : { pacote_id: item.id, pacote_nome: item.nome }),
    ...extraEnrollment,
  };

  const matriculas = [];
  for (const c of cursosMatricula) {
    const m = await base44.entities.StudentCourseEnrollment.create({
      ...base,
      course_id: c.course_id, course_name: c.course_name,
      course_duration: c.carga_horaria || "",
      start_date: c.data_inicio, end_date: c.data_termino,
      valor_original: Math.round((valorOriginal / nCursos) * 100) / 100,
      unit_value: valorPorCurso,
    });
    matriculas.push(m);
    await logVenda("create", {
      entity_type: "StudentCourseEnrollment", entity_id: m.id,
      entity_name: `${alunoFinal.full_name} — ${c.course_name}`,
      details: `${auditPrefix}: matrícula criada (origem ${origemInscricao}). Período: ${c.data_inicio} → ${c.data_termino}. Atendente: ${atendenteNome}. Pagamento: ${pgto.forma_pagamento} (${pgto.status_pagamento})`,
    });
  }

  // 3. Baixa de vaga
  const novasVagas = (item.vagas_preenchidas || 0) + 1;
  const esgotou = novasVagas >= (item.vagas_total || 0);
  const entityName = tipo === "oferta" ? "CourseOffer" : "CoursePackage";
  await base44.entities[entityName].update(item.id, {
    vagas_preenchidas: novasVagas,
    ...(esgotou ? { status: "Esgotada" } : {}),
  });
  await logVenda("update", { entity_type: entityName, entity_id: item.id, entity_name: item.nome_comercial || item.nome, details: `${auditPrefix}: vaga consumida (${novasVagas}/${item.vagas_total})${esgotou ? " — oferta ESGOTADA" : ""}` });

  // 4. Financeiro único da venda
  const isCortesia = pgto.forma_pagamento === "Cortesia" || pgto.status_pagamento === "Cortesia";
  const lancamento = await base44.entities.LancamentoFinanceiro.create({
    tipo: "Receita",
    natureza: pgto.status_pagamento === "Pago" ? "Realizado" : "Previsto",
    status: isCortesia ? "Cancelado" : pgto.status_pagamento === "Pago" ? "Recebido" : "Pendente",
    descricao: `Matrícula ${tipo === "pacote" ? `Pacote: ${item.nome}` : `Curso: ${item.course_name}`} — ${alunoFinal.full_name}${isCortesia ? " (CORTESIA)" : ""}`,
    valor: isCortesia ? 0 : valorFinal,
    valor_desconto: parseFloat(pgto.desconto) || 0,
    data_competencia: agora.split("T")[0],
    data_vencimento: pgto.vencimento || agora.split("T")[0],
    ...(pgto.status_pagamento === "Pago" ? { data_pagamento: agora.split("T")[0], valor_pago: valorFinal } : {}),
    forma_pagamento: FORMA_LANC[pgto.forma_pagamento] || "Outro",
    origem_modulo: "Matrícula",
    origem_receita: "Comunidade",
    origem_id: matriculas[0].id,
    cliente_id: alunoFinal.id, cliente_nome: alunoFinal.full_name,
    curso_id: tipo === "oferta" ? item.course_id : "", curso_nome: tipo === "pacote" ? item.nome : item.course_name,
    total_parcelas: parseInt(pgto.parcelas) || 1,
    observacoes: `${auditPrefix} — Atendente: ${atendenteNome}. ${pgto.observacao_financeira || ""}`.trim(),
  });
  await logVenda("create", { entity_type: "LancamentoFinanceiro", entity_id: lancamento.id, entity_name: lancamento.descricao, details: `${auditPrefix}: financeiro criado — R$ ${valorFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${pgto.forma_pagamento}, ${pgto.parcelas}x, ${pgto.status_pagamento})` });

  return { aluno: alunoFinal, matriculas, lancamento, valorFinal };
}