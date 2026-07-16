// Serviços internos da Central de Matrícula (Etapa 1 — Gestão Acadêmica Individual)
import { base44 } from "@/api/base44Client";

export const WORKFLOW_STAGES = {
  Draft: "Rascunho",
  DocumentsPending: "Documentos Pendentes",
  PaymentPending: "Pagamento Pendente",
  ContractPending: "Contrato Pendente",
  Confirmed: "Confirmada",
  InProgress: "Em Andamento",
  Completed: "Concluída",
  Cancelled: "Cancelada",
  Transferred: "Transferida",
  Suspended: "Suspensa",
  Refunded: "Reembolsada",
};

export const WORKFLOW_STAGE_COLORS = {
  Draft: "bg-gray-100 text-gray-600",
  DocumentsPending: "bg-orange-100 text-orange-700",
  PaymentPending: "bg-yellow-100 text-yellow-800",
  ContractPending: "bg-blue-100 text-blue-700",
  Confirmed: "bg-emerald-100 text-emerald-700",
  InProgress: "bg-indigo-100 text-indigo-700",
  Completed: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-700",
  Transferred: "bg-purple-100 text-purple-700",
  Suspended: "bg-amber-100 text-amber-800",
  Refunded: "bg-pink-100 text-pink-700",
};

// Deriva a etapa exibida quando workflow_stage ainda não foi preenchido (registros legados)
export function derivarEtapa(enrollment) {
  if (enrollment.workflow_stage) return enrollment.workflow_stage;
  if (enrollment.status_matricula === "Cancelado") return "Cancelled";
  if (enrollment.status_matricula === "Concluído") return "Completed";
  if (enrollment.status_pagamento && !["Pago", "Cortesia"].includes(enrollment.status_pagamento)) return "PaymentPending";
  if (enrollment.status_matricula === "Em Andamento") return "InProgress";
  return "Confirmed";
}

export const normalizarCpf = (cpf) => (cpf || "").toString().replace(/\D/g, "");

/**
 * Pesquisa aluno por CPF antes de criar (normalização somente para consulta).
 * Retorna: { status: 'invalido' | 'novo' | 'existente' | 'duplicidade', alunos }
 * Em duplicidade a criação deve ser bloqueada — nunca consolidar automaticamente.
 */
export async function buscarAlunosPorCpf(cpf) {
  const digits = normalizarCpf(cpf);
  if (digits.length !== 11) return { status: "invalido", alunos: [] };
  const todos = await base44.entities.Student.list("-created_date", 2000);
  const alunos = (todos || []).filter((s) => normalizarCpf(s.cpf) === digits);
  if (alunos.length === 0) return { status: "novo", alunos: [] };
  if (alunos.length === 1) return { status: "existente", alunos };
  return { status: "duplicidade", alunos };
}

/** Agrupa alunos com CPF duplicado (para a fila "Duplicidades de CPF"). */
export function agruparDuplicidadesCpf(students) {
  const map = {};
  (students || []).forEach((s) => {
    const d = normalizarCpf(s.cpf);
    if (d.length !== 11) return;
    (map[d] = map[d] || []).push(s);
  });
  return Object.entries(map)
    .filter(([, list]) => list.length > 1)
    .map(([cpf, list]) => ({ cpf, alunos: list }));
}

/**
 * Calcula vagas de uma oferta sem depender apenas de vagas_preenchidas.
 * Reservadas: reservas ativas (Reserved e não expiradas). Confirmadas: matrículas ativas vinculadas.
 */
export function calcularVagasOferta(offer, reservations = [], enrollments = []) {
  const now = new Date();
  const total = Number(offer?.vagas_total || 0);
  const reservadas = (reservations || []).filter(
    (r) => r.course_offer_id === offer.id && r.status === "Reserved" && (!r.expires_at || new Date(r.expires_at) > now)
  ).length;
  const confirmadas = (enrollments || []).filter((e) => {
    const linked = e.course_offer_id === offer.id || e.oferta_id === offer.id;
    const cancelada = ["Cancelled", "Transferred", "Refunded"].includes(e.workflow_stage) || e.status_matricula === "Cancelado";
    return linked && !cancelada;
  }).length;
  const disponiveis = Math.max(0, total - reservadas - confirmadas);
  return { total, reservadas, confirmadas, disponiveis };
}

/** Calcula snapshot de desconto sem alterar o preço cadastrado da oferta. */
export function calcularSnapshotDesconto(valorOriginal, percentage) {
  const original = Number(valorOriginal || 0);
  const pct = Number(percentage || 0);
  const discountAmount = Math.round(original * pct) / 100;
  const finalAmount = Math.max(0, Math.round((original - discountAmount) * 100) / 100);
  return { valor_original: original, discount_percentage_snapshot: pct, discount_amount: discountAmount, final_amount: finalAmount };
}

/**
 * Registra ação crítica da matrícula em StudentTimeline + AuditLog.
 * Toda ação crítica da Central de Matrícula deve passar por aqui.
 */
export async function registrarEventoMatricula({ enrollment, eventType = "observacao", title, description = "", metadata = {} }) {
  let user = null;
  try { user = await base44.auth.me(); } catch { /* não autenticado */ }
  const performedBy = user?.full_name || user?.email || "sistema";
  const agora = new Date().toLocaleString("pt-BR");

  if (enrollment?.student_id) {
    await base44.entities.StudentTimeline.create({
      student_id: enrollment.student_id,
      student_name: enrollment.student_name || "",
      event_type: eventType,
      title,
      description,
      performed_by: performedBy,
      metadata: { enrollment_id: enrollment.id, course_name: enrollment.course_name, ...metadata },
    });
  }

  await base44.entities.AuditLog.create({
    user_email: user?.email || "desconhecido",
    user_name: performedBy,
    action: "update",
    entity_type: "StudentCourseEnrollment",
    entity_id: enrollment?.id || "",
    entity_name: `${enrollment?.student_name || ""} — ${enrollment?.course_name || ""}`,
    details: `${title}${description ? `. ${description}` : ""} — ${agora}`,
  });
}