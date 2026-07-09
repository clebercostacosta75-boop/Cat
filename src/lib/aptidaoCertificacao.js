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

/** Localiza o modelo de certificado do curso (por ID quando existir, senão por nome). */
export function encontrarModelo(enrollment, certModels = []) {
  if (enrollment.certificate_model_id) {
    const byId = certModels.find((m) => m.id === enrollment.certificate_model_id);
    if (byId) return byId;
  }
  return certModels.find((m) => norm(m.name) === norm(enrollment.course_name)) || null;
}

/**
 * Verifica a aptidão de uma matrícula para certificação.
 * Retorna { grupo, apto, bloqueios, alertas, modelo }.
 * grupo: "aguardando" | "pendencia" | "bloqueado" | "emitido"
 */
export function verificarAptidao(enrollment, { certModels = [], certificates = [] } = {}) {
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

  // Pendências bloqueantes (aprovado, mas não pode emitir ainda)
  const pendencias = [];
  const faltando = [];
  if (!enrollment.student_id) faltando.push("aluno vinculado");
  if (!enrollment.student_name) faltando.push("nome");
  if (!enrollment.student_cpf) faltando.push("CPF");
  if (!enrollment.course_id && !enrollment.course_name) faltando.push("curso vinculado");
  if (faltando.length) pendencias.push(`Dados obrigatórios ausentes: ${faltando.join(", ")}`);

  const modelo = encontrarModelo(enrollment, certModels);
  if (!modelo) pendencias.push("Curso sem modelo de certificado vinculado");

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