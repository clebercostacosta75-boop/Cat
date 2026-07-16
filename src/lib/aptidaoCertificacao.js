/**
 * SPR-A — Motor central de aptidão para certificação.
 * Fonte única de verdade para decidir se uma matrícula (StudentCourseEnrollment)
 * pode gerar certificado, e para montar a Fila de Certificação.
 */

const norm = (v) =>
  (v || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .trim();

/**
 * Localiza o modelo de certificado do curso (Designer de Modelos).
 * Ordem de resolução: 1) modelo fixado na matrícula; 2) modelo vinculado ao curso
 * no catálogo (Course.certificate_model_id); 3) correspondência exata por nome.
 */
export function encontrarModelo(enrollment, certModels = [], courses = []) {
  if (enrollment.certificate_model_id) {
    const byId = certModels.find((m) => m.id === enrollment.certificate_model_id);
    if (byId) return byId;
  }
  const course =
    courses.find((c) => c.id === enrollment.course_id) ||
    courses.find((c) => norm(c.name) === norm(enrollment.course_name)) ||
    null;
  if (course?.certificate_model_id) {
    const byCourse = certModels.find((m) => m.id === course.certificate_model_id);
    if (byCourse) return byCourse;
  }
  return certModels.find((m) => norm(m.name) === norm(enrollment.course_name)) || null;
}

/**
 * SPR-2A — Gate Financeiro central.
 * Retorna { liberado, status, motivo, origem }.
 * status: "Liberado" | "Pendente" | "Vencido" | "Bloqueado" | "Liberado Manualmente" | "Em análise"
 */
export function gateFinanceiro(enrollment, company = null) {
  const individual =
    !enrollment.company_id ||
    enrollment.company_id === "individual" ||
    enrollment.company_name === "Individual (PF)";
  const origem = individual ? "Individual" : "Empresa";

  if (individual) {
    if (enrollment.liberacao_financeira_manual)
      return {
        liberado: true,
        status: "Liberado Manualmente",
        motivo: `Liberação financeira manual aprovada${enrollment.liberacao_financeira_por ? ` por ${enrollment.liberacao_financeira_por}` : ""}`,
        origem,
      };
    const sp = enrollment.status_pagamento;
    if (sp === "Pago") return { liberado: true, status: "Liberado", motivo: "Pagamento confirmado", origem };
    if (sp === "Inadimplente")
      return { liberado: false, status: "Bloqueado", motivo: "Aluno inadimplente — bloqueio financeiro ativo", origem };
    const hoje = new Date().toISOString().split("T")[0];
    if (enrollment.data_vencimento_pagamento && enrollment.data_vencimento_pagamento < hoje)
      return { liberado: false, status: "Vencido", motivo: "Pagamento vencido", origem };
    if (sp === "Parcialmente Pago")
      return { liberado: false, status: "Em análise", motivo: "Pagamento parcial — aguardando quitação", origem };
    // Transição: matrícula legada sem controle financeiro registrado não é bloqueada
    if (!sp) return { liberado: true, status: "Liberado", motivo: "Matrícula legada sem cobrança registrada", origem };
    return { liberado: false, status: "Pendente", motivo: "Pagamento pendente", origem };
  }

  // Empresarial
  if (company?.bloqueio_financeiro)
    return {
      liberado: false,
      status: "Bloqueado",
      motivo: company.motivo_bloqueio_financeiro || "Empresa bloqueada financeiramente",
      origem,
    };
  const contratos = company?.company_contracts || [];
  if (contratos.length > 0 && !contratos.some((c) => c.status === "Ativo"))
    return { liberado: false, status: "Bloqueado", motivo: "Contrato cancelado ou inválido — sem contrato ativo", origem };
  return {
    liberado: true,
    status: "Liberado",
    motivo: contratos.length > 0 ? "Contrato ativo e empresa liberada" : "Condição comercial válida — empresa liberada",
    origem,
  };
}

/**
 * Verifica a aptidão de uma matrícula para certificação.
 * Retorna { grupo, apto, bloqueios, alertas, modelo, financeiro }.
 * grupo: "aguardando" | "pendencia" | "bloqueado" | "emitido"
 */
export function verificarAptidao(enrollment, { certModels = [], certificates = [], companies = [], solicitacoes = [], courses = [] } = {}) {
  const alertas = [];
  const r = enrollment.resultado_academico;
  // Legado: matrículas antigas sem resultado que já estavam "Autorizado" continuam válidas (com alerta)
  const aprovado = r === "Aprovado" || (!r && enrollment.status === "Autorizado");

  // Certificado já emitido para esta matrícula → sai da fila
  const emitido =
    !!enrollment.certificate_id || ["Certificado Gerado", "Assinado"].includes(enrollment.status);
  if (emitido) {
    return {
      grupo: "emitido",
      apto: false,
      bloqueios: ["Certificado já emitido para esta matrícula"],
      alertas,
      modelo: null,
      financeiro: null,
    };
  }

  const bloqueios = [];
  if (!aprovado) {
    if (r === "Reprovado") bloqueios.push("Resultado acadêmico: Reprovado");
    else if (r === "Não Concluiu") bloqueios.push("Resultado acadêmico: Não Concluiu");
    else bloqueios.push("Resultado acadêmico pendente — defina na Gestão Acadêmica");
  }
  if (enrollment.status_matricula === "Cancelado") bloqueios.push("Matrícula cancelada");
  if (enrollment.bloqueio_certificacao)
    bloqueios.push(enrollment.motivo_bloqueio_certificacao || "Bloqueio manual de certificação ativo");

  // SPR-2A — Gate Financeiro: aprovado só é apto se financeiro liberado
  const company = companies.find((c) => c.id === enrollment.company_id) || null;
  const fin = gateFinanceiro(enrollment, company);
  if (!fin.liberado) {
    let motivoFin = `Bloqueado por financeiro: ${fin.motivo}`;
    const sol = solicitacoes
      .filter((s) => s.enrollment_id === enrollment.id)
      .sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))[0];
    if (sol?.status_solicitacao === "Pendente") motivoFin += " — Aguardando liberação financeira";
    else if (sol?.status_solicitacao === "Negada") motivoFin += " — Liberação negada pelo Financeiro";
    bloqueios.push(motivoFin);
  }

  // Pendências bloqueantes (aprovado, mas não pode emitir ainda)
  const pendencias = [];
  const faltando = [];
  if (!enrollment.student_id) faltando.push("aluno vinculado");
  if (!enrollment.student_name) faltando.push("nome");
  if (!enrollment.student_cpf) faltando.push("CPF");
  if (!enrollment.course_id && !enrollment.course_name) faltando.push("curso vinculado");
  if (faltando.length) pendencias.push(`Dados obrigatórios ausentes: ${faltando.join(", ")}`);

  // FASE 1 Vendas: certificado exige período oficial de realização do curso
  if (!enrollment.start_date || !enrollment.end_date)
    pendencias.push("Certificado bloqueado: período de realização do curso não informado na matrícula");

  const modelo = encontrarModelo(enrollment, certModels, courses);
  if (!modelo)
    pendencias.push(
      `Ainda não existe modelo de certificado para o curso "${enrollment.course_name || "—"}" no Designer de Modelos`
    );

  const certExistente = certificates.find(
    (c) => c.enrollment_id === enrollment.id && c.status !== "revoked"
  );
  if (certExistente)
    pendencias.push(
      `Duplicidade: já existe certificado ${certExistente.certificate_code || "emitido"} para esta matrícula`
    );

  // Alertas (não bloqueiam neste sprint)
  if (!enrollment.student_email) alertas.push("E-mail ausente");
  if (!enrollment.student_phone) alertas.push("WhatsApp ausente");
  const hoje = new Date().toISOString().split("T")[0];
  if (enrollment.end_date && enrollment.end_date > hoje) alertas.push("Curso/turma ainda não encerrado");
  if (norm(enrollment.course_name).includes("detran"))
    alertas.push("Curso DETRAN — informar Registro/RENACH/Categoria na emissão");
  if (!r && enrollment.status === "Autorizado")
    alertas.push("Matrícula legada sem resultado acadêmico registrado");

  let grupo;
  if (bloqueios.length > 0) grupo = "bloqueado";
  else if (pendencias.length > 0) grupo = "pendencia";
  else grupo = "aguardando";

  return {
    grupo,
    apto: grupo === "aguardando",
    bloqueios: [...bloqueios, ...pendencias],
    alertas,
    modelo,
    financeiro: fin,
  };
}

/**
 * Monta a Fila de Certificação a partir das matrículas.
 * Retorna { aguardando, pendencias, bloqueados } — cada item é a matrícula com `.aptidao` anexado.
 */
export function classificarFila(enrollments = [], ctx = {}) {
  const aguardando = [];
  const pendencias = [];
  const bloqueados = [];
  for (const e of enrollments) {
    if (["Certificado Gerado", "Assinado", "Vencido", "Revogado"].includes(e.status)) continue;
    // Legado sem resultado ainda não autorizado → permanece no fluxo de autorização, fora da fila
    if (!e.resultado_academico && e.status !== "Autorizado") continue;
    const aval = verificarAptidao(e, ctx);
    if (aval.grupo === "emitido") continue;
    const item = { ...e, aptidao: aval };
    if (aval.grupo === "bloqueado") bloqueados.push(item);
    else if (aval.grupo === "pendencia") pendencias.push(item);
    else aguardando.push(item);
  }
  return { aguardando, pendencias, bloqueados };
}