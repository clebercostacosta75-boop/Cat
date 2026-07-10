/**
 * SPR-2B-2 — Categorização VISUAL da fila de certificação.
 * Usa exclusivamente a saída do motor central (classificarFila/verificarAptidao).
 * Não contém regra de negócio nova — apenas organiza para exibição.
 */

export const isIndividual = (e) =>
  !e.company_id || e.company_id === "individual" || e.company_name === "Individual (PF)";

export function maskCPF(cpf) {
  const d = (cpf || "").replace(/\D/g, "");
  if (d.length !== 11) return cpf || "—";
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

/**
 * Separa a saída do motor em 4 grupos visuais:
 * aptos | academicas | financeiras | bloqueados (não aptos).
 * Prioridade de exibição: acadêmico > financeiro > demais bloqueios.
 */
export function categorizarFilaVisual(fila = {}) {
  const academicas = [];
  const financeiras = [];
  const bloqueados = [];
  for (const item of fila.bloqueados || []) {
    const b = item.aptidao?.bloqueios || [];
    const temAcad = b.some((x) => x.startsWith("Resultado acadêmico"));
    const temFin = b.some((x) => x.startsWith("Bloqueado por financeiro"));
    if (temAcad) academicas.push(item);
    else if (temFin) financeiras.push(item);
    else bloqueados.push(item);
  }
  // Pendências do motor (curso sem modelo, dados incompletos, duplicidade) → Bloqueados / Não Aptos
  bloqueados.push(...(fila.pendencias || []));
  return { aptos: fila.aguardando || [], academicas, financeiras, bloqueados };
}

/** Filtros simples e seguros (apenas campos existentes). */
export function aplicarFiltrosFila(lista = [], f = {}) {
  return lista.filter((e) => {
    if (f.origem === "empresa" && isIndividual(e)) return false;
    if (f.origem === "individual" && !isIndividual(e)) return false;
    if (f.curso && !(e.course_name || "").toLowerCase().includes(f.curso.toLowerCase())) return false;
    if (f.empresa && !(e.company_name || "").toLowerCase().includes(f.empresa.toLowerCase())) return false;
    if (f.busca && ![e.student_name, e.student_cpf].some((v) => v && v.toLowerCase().includes(f.busca.toLowerCase()))) return false;
    if (f.de && e.end_date && e.end_date < f.de) return false;
    if (f.ate && e.end_date && e.end_date > f.ate) return false;
    return true;
  });
}