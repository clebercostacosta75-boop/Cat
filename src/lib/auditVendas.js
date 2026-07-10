/** Auditoria centralizada da FASE 1 — Cursos à Venda / Matrícula Rápida. */
import { base44 } from "@/api/base44Client";

export async function logVenda(action, { entity_type, entity_id = "", entity_name = "", details = "" }) {
  try {
    const user = await base44.auth.me().catch(() => null);
    await base44.entities.AuditLog.create({
      user_email: user?.email || "desconhecido",
      user_name: user?.full_name || user?.email || "desconhecido",
      action,
      entity_type,
      entity_id,
      entity_name,
      details: `${details} — ${new Date().toLocaleString("pt-BR")}`,
    });
  } catch {
    /* auditoria não bloqueia o fluxo */
  }
}