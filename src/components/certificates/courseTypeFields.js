// Tipos de curso e campos obrigatórios por tipo (SPR-003D)
const normalize = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const COURSE_TYPES = [
  "Norma Regulamentadora",
  "DETRAN",
  "Máquinas e Equipamentos",
  "Administrativo",
  "Industrial",
  "Outro",
];

export const REQUIRED_FIELDS_BY_TYPE = {
  "Norma Regulamentadora": ["Nome", "CPF", "Curso", "Carga horária", "Período", "Instrutor", "Empresa"],
  "DETRAN": ["Nome", "CPF", "Curso", "Carga horária", "Registro DETRAN", "RENACH", "Categoria CNH"],
  "Máquinas e Equipamentos": ["Nome", "CPF", "Curso", "Carga horária", "Período", "Instrutor", "Empresa"],
  "Administrativo": ["Nome", "CPF", "Curso", "Carga horária"],
  "Industrial": ["Nome", "CPF", "Curso", "Carga horária", "Período", "Empresa"],
  "Outro": ["Nome", "CPF", "Curso", "Carga horária"],
};

export function detectCourseType(courseName) {
  const n = normalize(courseName);
  if (/mopp|detran|renach|cnh|transporte coletivo|transporte escolar|produtos perigosos/.test(n)) return "DETRAN";
  if (/\bnr[\s-]?\d/.test(n)) return "Norma Regulamentadora";
  if (/empilhadeira|guindaste|munck|ponte rolante|retroescavadeira|escavadeira|plataforma elevat|maquina|equipamento/.test(n)) return "Máquinas e Equipamentos";
  return "Outro";
}

// Extrai número de meses de textos como "12 meses", "24"
export function parseValidityMonths(text) {
  const m = (text || "").match(/(\d{1,3})/);
  return m ? +m[1] : null;
}