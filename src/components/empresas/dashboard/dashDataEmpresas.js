/**
 * Dashboard Operacional — Gestão Acadêmica Empresas.
 * Camada de consolidação: helpers de leitura sobre dados existentes.
 * Origem da matrícula: regra central (origemMatricula.js). Aptidão: motor central.
 * Nenhuma regra paralela, nenhum dado duplicado.
 */

export const FILTROS_DASH_INICIAIS = {
  empresa: "", curso: "", instrutor: "", periodo: "", statusTurma: "",
  statusAcad: "", modalidade: "", local: "", pendencia: "",
};

export const isTurmaEmpresarial = (t) =>
  !!t.company_name && t.company_name !== "Individual (PF)";

export function getTurmaPeriodo(t) {
  const datas = (t.realization_dates || []).filter(Boolean).sort();
  return { inicio: datas[0] || null, fim: datas[datas.length - 1] || null };
}

const STATUS_ENCERRADA = ["Concluído", "Cancelado"];

/** Classificação temporal da turma (hoje/semana/mês/futuras/atrasadas). */
export function turmaTempo(t) {
  const { inicio, fim } = getTurmaPeriodo(t);
  if (!inicio) return { hoje: false, semana: false, mes: false, futura: false, atrasada: false };
  const agora = new Date();
  const hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0);
  const hoje1 = new Date(); hoje1.setHours(23, 59, 59, 999);
  const di = new Date(`${inicio}T00:00:00`);
  const df = new Date(`${fim || inicio}T23:59:59`);
  const fimSemana = new Date(hoje1); fimSemana.setDate(fimSemana.getDate() + (6 - fimSemana.getDay()));
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);
  return {
    hoje: di <= hoje1 && df >= hoje0,
    semana: di <= fimSemana && df >= hoje0,
    mes: di <= fimMes && df >= hoje0,
    futura: di > hoje1,
    atrasada: df < hoje0 && !STATUS_ENCERRADA.includes(t.status),
  };
}

/** Pendências operacionais da turma (labels prontas para exibição/filtro). */
export function turmaPendencias(t, matriculas = []) {
  const p = [];
  if (!t.instructor_name) p.push("Sem instrutor");
  if (matriculas.length === 0 && !(t.students_count > 0)) p.push("Sem alunos");
  if (!t.training_name) p.push("Sem curso");
  if (!t.company_id && !t.company_name) p.push("Sem empresa");
  const { fim } = getTurmaPeriodo(t);
  if (fim && new Date(`${fim}T23:59:59`) < new Date() && !STATUS_ENCERRADA.includes(t.status)) {
    p.push("Concluída sem encerramento");
  }
  const semResultado = matriculas.filter(m => (m.resultado_academico || "Pendente") === "Pendente").length;
  if (t.status === "Concluído" && semResultado > 0) p.push(`Sem resultado acadêmico (${semResultado})`);
  const semEnvio = matriculas.filter(m => m.resultado_academico === "Aprovado" && !m.certificate_id).length;
  if (t.status === "Concluído" && semEnvio > 0) p.push(`Sem envio p/ Certificação (${semEnvio})`);
  return p;
}

export function matchTurma(t, f, matriculas = []) {
  if (f.empresa && t.company_name !== f.empresa) return false;
  if (f.curso && t.training_name !== f.curso) return false;
  if (f.instrutor && t.instructor_name !== f.instrutor) return false;
  if (f.statusTurma && t.status !== f.statusTurma) return false;
  if (f.modalidade && t.category !== f.modalidade) return false;
  if (f.local && t.location !== f.local) return false;
  if (f.periodo) {
    const tempo = turmaTempo(t);
    if (f.periodo === "hoje" && !tempo.hoje) return false;
    if (f.periodo === "semana" && !tempo.semana) return false;
    if (f.periodo === "mes" && !tempo.mes) return false;
    if (f.periodo === "futuros" && !tempo.futura) return false;
    if (f.periodo === "atrasados" && !tempo.atrasada) return false;
  }
  if (f.pendencia) {
    const pend = turmaPendencias(t, matriculas);
    if (!pend.some(p => p.startsWith(f.pendencia))) return false;
  }
  return true;
}

export function matchMatricula(m, f) {
  if (f.empresa && m.company_name !== f.empresa) return false;
  if (f.curso && m.course_name !== f.curso) return false;
  if (f.instrutor && m.instructor_name !== f.instrutor) return false;
  if (f.statusAcad && (m.resultado_academico || "Pendente") !== f.statusAcad) return false;
  if (f.periodo && f.periodo !== "todos") {
    const ref = m.end_date || m.start_date;
    if (!ref) return false;
    const d = new Date(`${ref}T12:00:00`);
    const agora = new Date();
    const hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0);
    if (f.periodo === "hoje" && d.toDateString() !== agora.toDateString()) return false;
    if (f.periodo === "semana") {
      const fimSemana = new Date(hoje0); fimSemana.setDate(fimSemana.getDate() + (6 - fimSemana.getDay()));
      if (d < hoje0 || d > fimSemana) return false;
    }
    if (f.periodo === "mes" && (d.getMonth() !== agora.getMonth() || d.getFullYear() !== agora.getFullYear())) return false;
    if (f.periodo === "futuros" && d <= agora) return false;
    if (f.periodo === "atrasados" && d >= hoje0) return false;
  }
  return true;
}

export const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort();