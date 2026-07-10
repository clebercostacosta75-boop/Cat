// FASE 7A — utilitários de consolidação (somente leitura, nenhum dado é criado/alterado)

export const dataBase = (e) => (e.data_inscricao || e.created_date || "").slice(0, 10);

export const fmtBRL = (v) =>
  `R$ ${(parseFloat(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export const fmtData = (d) => {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return y && m && day ? `${day}/${m}/${y}` : d;
};

const PAG_PENDENTES = ["Pendente", "Aguardando Confirmação", "Parcialmente Pago", "Inadimplente"];
const CONTRATO_ASSINADO = ["Assinado_Todas_Partes", "PDF_Gerado", "Enviado_WhatsApp"];
const CONTRATO_INATIVO = ["Cancelado", "Substituido_Aditivo", "Expirado", "Recusado", "Rascunho"];

export const contratoAguardando = (c) =>
  c && !CONTRATO_ASSINADO.includes(c.status) && !CONTRATO_INATIVO.includes(c.status);
export const contratoAssinado = (c) => c && CONTRATO_ASSINADO.includes(c.status);

export function filtrarMatriculas(enrollments, contractByEnrollment, f) {
  return enrollments.filter((e) => {
    const d = dataBase(e);
    if (f.de && d && d < f.de) return false;
    if (f.ate && d && d > f.ate) return false;
    if (f.curso !== "all" && e.course_name !== f.curso) return false;
    if (f.pacote !== "all" && e.pacote_nome !== f.pacote) return false;
    if (f.atendente !== "all" && (e.atendente_nome || "Sem atendente") !== f.atendente) return false;
    if (f.statusFinanceiro !== "all" && e.status_pagamento !== f.statusFinanceiro) return false;
    if (f.statusAcademico !== "all" && (e.resultado_academico || "Pendente") !== f.statusAcademico) return false;
    if (f.origem !== "all" && (e.origem_inscricao || "Não informada") !== f.origem) return false;
    if (f.formaPagamento !== "all" && e.forma_pagamento !== f.formaPagamento) return false;
    if (f.statusContrato !== "all") {
      const c = contractByEnrollment[e.id];
      if (f.statusContrato === "sem_contrato" && c) return false;
      if (f.statusContrato === "aguardando" && !contratoAguardando(c)) return false;
      if (f.statusContrato === "assinado" && !contratoAssinado(c)) return false;
    }
    if (f.pendencia !== "all") {
      const c = contractByEnrollment[e.id];
      if (f.pendencia === "pagamento" && !PAG_PENDENTES.includes(e.status_pagamento)) return false;
      if (f.pendencia === "contrato" && contratoAssinado(c)) return false;
      if (f.pendencia === "sem_datas" && e.start_date && e.end_date) return false;
      if (f.pendencia === "sem_resultado" && e.resultado_academico && e.resultado_academico !== "Pendente") return false;
      if (f.pendencia === "apto" && !e.apto_certificacao) return false;
      if (f.pendencia === "bloqueado" && !e.bloqueio_certificacao) return false;
    }
    return true;
  });
}

export function calcularIndicadores({ filtered, contractByEnrollment, lancByEnrollment, offers, packages, preCadastros, filters }) {
  const ativos = filtered.filter((e) => e.status_matricula !== "Cancelado");
  const receita = filtered.reduce(
    (acc, e) => {
      const l = lancByEnrollment[e.id];
      const prevista = l ? parseFloat(l.valor) || 0 : parseFloat(e.unit_value) || 0;
      const recebida = l ? parseFloat(l.valor_pago) || 0 : e.status_pagamento === "Pago" ? parseFloat(e.unit_value) || 0 : 0;
      acc.prevista += prevista;
      acc.recebida += recebida;
      return acc;
    },
    { prevista: 0, recebida: 0 }
  );
  const ofertasFiltradas = filters.statusOferta === "all" ? offers : offers.filter((o) => o.status === filters.statusOferta);
  const pacotesFiltrados = filters.statusOferta === "all" ? packages : packages.filter((p) => p.status === filters.statusOferta);
  const vagasTotal = [...ofertasFiltradas, ...pacotesFiltrados].reduce((s, o) => s + (o.vagas_total || 0), 0);
  const vagasOcupadas = [...ofertasFiltradas, ...pacotesFiltrados].reduce((s, o) => s + (o.vagas_preenchidas || 0), 0);
  const docsPendentes = preCadastros.reduce(
    (s, p) => s + (p.documentos || []).filter((d) => ["Pendente de validação", "Nova foto solicitada", "Rejeitado"].includes(d.status_documento)).length,
    0
  );
  return {
    totalInscricoes: filtered.length,
    matriculasConfirmadas: ativos.length,
    alunosAtivos: new Set(ativos.map((e) => e.student_id)).size,
    cursosVendidos: filtered.filter((e) => !e.pacote_id).length,
    pacotesVendidos: new Set(filtered.filter((e) => e.pacote_id).map((e) => `${e.student_id}|${e.pacote_id}`)).size,
    vagasOcupadas,
    vagasDisponiveis: Math.max(vagasTotal - vagasOcupadas, 0),
    receitaPrevista: receita.prevista,
    receitaRecebida: receita.recebida,
    receitaPendente: Math.max(receita.prevista - receita.recebida, 0),
    contratosAguardando: filtered.filter((e) => contratoAguardando(contractByEnrollment[e.id])).length,
    pagamentosPendentes: filtered.filter((e) => PAG_PENDENTES.includes(e.status_pagamento)).length,
    documentosPendentes: docsPendentes,
    aptosCertificacao: filtered.filter((e) => e.apto_certificacao).length,
    bloqueadosCertificacao: filtered.filter((e) => e.bloqueio_certificacao).length,
  };
}

export function exportarCSV(nomeArquivo, cabecalho, linhas) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cabecalho.map(esc).join(";"), ...linhas.map((l) => l.map(esc).join(";"))].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const PAGAMENTOS_PENDENTES = PAG_PENDENTES;