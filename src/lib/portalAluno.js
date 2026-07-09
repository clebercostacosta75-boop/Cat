// SPR-004B — Regras de origem de matrícula e perfil do Portal do Aluno.
// Nomenclatura oficial: Aluno Corporativo | Aluno Comunidade | Aluno com Matrículas Mistas ("Perfil Misto").
// O perfil é sempre DERIVADO das matrículas — nunca gravado no banco.

export const ORIGEM_EMPRESA = "Empresa";
export const ORIGEM_COMUNIDADE = "Comunidade";

// Origem calculada POR MATRÍCULA:
// company_id existente e diferente de "individual" → Empresa; caso contrário → Comunidade.
export function origemMatricula(e) {
  if (!e?.company_id || e.company_id === "individual" || e.company_name === "Individual (PF)") {
    return ORIGEM_COMUNIDADE;
  }
  return ORIGEM_EMPRESA;
}

export function perfilAluno(enrollments = []) {
  if (!enrollments.length) {
    return { key: "sem_matricula", label: "Sem matrículas", short: "Sem matrículas", color: "bg-gray-100 text-gray-600 border-gray-300" };
  }
  const origens = new Set(enrollments.map(origemMatricula));
  const temEmpresa = origens.has(ORIGEM_EMPRESA);
  const temComunidade = origens.has(ORIGEM_COMUNIDADE);
  if (temEmpresa && temComunidade) {
    return { key: "misto", label: "Aluno com Matrículas Mistas", short: "Perfil Misto", color: "bg-purple-100 text-purple-800 border-purple-300" };
  }
  if (temEmpresa) {
    return { key: "corporativo", label: "Aluno Corporativo", short: "Corporativo", color: "bg-blue-100 text-blue-800 border-blue-300" };
  }
  return { key: "comunidade", label: "Aluno Comunidade", short: "Comunidade", color: "bg-emerald-100 text-emerald-800 border-emerald-300" };
}

// Financeiro só aparece se existir ao menos UMA matrícula de origem Comunidade.
export function mostraFinanceiro(enrollments = []) {
  return enrollments.some((e) => origemMatricula(e) === ORIGEM_COMUNIDADE);
}

export function matriculasComunidade(enrollments = []) {
  return enrollments.filter((e) => origemMatricula(e) === ORIGEM_COMUNIDADE);
}

export function getDaysLeft(dateStr) {
  if (!dateStr) return null;
  return Math.round((new Date(dateStr) - new Date()) / 86400000);
}

export function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}