/**
 * SPR-2B-1 — Blindagem dos caminhos paralelos de emissão.
 * Toda emissão de certificado fora da fila DEVE passar por validarEmissaoBlindada,
 * que usa o motor central (verificarAptidao + gateFinanceiro) e audita tentativas bloqueadas.
 */
import { base44 } from "@/api/base44Client";
import { verificarAptidao } from "@/lib/aptidaoCertificacao";

export async function carregarContextoAptidao() {
  const [certModels, certificates, companies, solicitacoes] = await Promise.all([
    base44.entities.CertificateModel.list("-created_date", 200),
    base44.entities.Certificate.list("-created_date", 300),
    base44.entities.Company.list("-created_date", 300),
    base44.entities.SolicitacaoLiberacaoFinanceira.list("-created_date", 300),
  ]);
  return { certModels, certificates, companies, solicitacoes };
}

export async function validarEmissaoBlindada(enrollment, ctx, origemTela) {
  const aval = verificarAptidao(enrollment, ctx);
  if (aval.grupo === "aguardando") return { apto: true, aval, motivo: null };
  const motivo = (aval.bloqueios || []).join("; ") || "Matrícula não apta para certificação";
  await registrarTentativaBloqueada(enrollment, motivo, origemTela);
  return { apto: false, aval, motivo };
}

export async function registrarTentativaBloqueada(enrollment, motivo, origemTela) {
  try {
    const user = await base44.auth.me().catch(() => null);
    const individual =
      !enrollment.company_id ||
      enrollment.company_id === "individual" ||
      enrollment.company_name === "Individual (PF)";
    const origem = individual ? "Individual" : "Empresa";
    await base44.entities.AuditLog.create({
      user_email: user?.email || "desconhecido",
      user_name: user?.full_name || user?.email || "desconhecido",
      action: "update",
      entity_type: "StudentCourseEnrollment",
      entity_id: enrollment.id || "",
      entity_name: `${enrollment.student_name || "—"} — ${enrollment.course_name || "—"}`,
      company_id: origem === "Empresa" ? (enrollment.company_id || "") : "",
      company_name: origem === "Empresa" ? (enrollment.company_name || "") : "",
      details: `TENTATIVA DE EMISSÃO DE CERTIFICADO BLOQUEADA (${origemTela}) em ${new Date().toLocaleString("pt-BR")}. Origem da matrícula: ${origem}. Status anterior: ${enrollment.status || "—"} / Resultado acadêmico: ${enrollment.resultado_academico || "—"} / Pagamento: ${enrollment.status_pagamento || "—"}. Motivo do motor: ${motivo}`,
    });
  } catch {
    /* log não bloqueia */
  }
}