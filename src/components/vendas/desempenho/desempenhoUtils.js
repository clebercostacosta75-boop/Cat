// FASE 3 — Regras de contagem do Desempenho dos Atendentes (fonte única)

export const fmtBRL = (v) => `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export const dataDe = (e) => (e.data_inscricao || e.created_date || "").toString().slice(0, 10);

export function inicioSemana(base = new Date()) {
  const d = new Date(base);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

export function fimSemana(inicio) {
  const d = new Date(inicio + "T12:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

// Cancelada não conta como venda realizada (exibida separadamente)
export const isCancelada = (e) =>
  e.status_pagamento === "Cancelado" || e.status_matricula === "Cancelado" || e.status === "Revogado";

export const isPaga = (e) => !isCancelada(e) && e.status_pagamento === "Pago";

export const isPendente = (e) =>
  !isCancelada(e) && ["Pendente", "Aguardando Confirmação", "Parcialmente Pago", "Inadimplente"].includes(e.status_pagamento);

export const valorDe = (e) => parseFloat(e.unit_value) || 0;

// Resumo de um conjunto de matrículas seguindo as regras da FASE 3
export function resumir(lista) {
  const validas = lista.filter(e => !isCancelada(e));
  const canceladas = lista.filter(isCancelada);
  const pagas = validas.filter(isPaga);
  const pendentes = validas.filter(isPendente);
  return {
    inscricoes: validas.length,
    confirmadas: validas.length,
    pagas: pagas.length,
    pendentes: pendentes.length,
    canceladas: canceladas.length,
    valorVendido: validas.reduce((s, e) => s + valorDe(e), 0),
    valorRecebido: pagas.reduce((s, e) => s + valorDe(e), 0),
    valorPendente: pendentes.reduce((s, e) => s + valorDe(e), 0),
  };
}

export function statusMeta(pct) {
  if (pct >= 100) return pct > 100
    ? { label: "Superou a meta", cls: "bg-emerald-100 text-emerald-800" }
    : { label: "Meta atingida", cls: "bg-green-100 text-green-700" };
  if (pct >= 50) return { label: "Em andamento", cls: "bg-blue-100 text-blue-700" };
  return { label: "Abaixo da meta", cls: "bg-red-100 text-red-700" };
}