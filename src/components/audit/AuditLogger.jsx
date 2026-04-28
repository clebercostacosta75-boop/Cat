import { base44 } from "@/api/base44Client";

/**
 * Registra uma ação no log de auditoria.
 * @param {string} action - Ação realizada (ex: "emissao_individual", "modelo_editado")
 * @param {string} entityType - Tipo da entidade (ex: "Certificate", "CertificateModel")
 * @param {string|null} entityId - ID do registro afetado
 * @param {string} entityName - Nome legível do registro
 * @param {object} details - Detalhes adicionais
 */
export const logAction = async (action, entityType, entityId, entityName, details = {}) => {
  try {
    const user = await base44.auth.me();
    await base44.entities.AuditLog.create({
      user_email: user.email,
      user_name: user.full_name || user.email,
      action,
      entity_type: entityType,
      entity: entityType, // compatibilidade com campo legado
      entity_id: entityId || "",
      entity_name: entityName || "",
      details: typeof details === "object" ? JSON.stringify(details) : details,
      company_name: details?.empresa || "",
    });
  } catch (error) {
    // Não interromper o fluxo principal por erro de auditoria
    console.warn("Auditoria: erro ao registrar log", error);
  }
};

/**
 * Compara dois objetos e retorna os campos que mudaram.
 */
export const getChanges = (oldData, newData) => {
  const changes = {};
  Object.keys(newData).forEach(key => {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changes[key] = { antes: oldData[key], depois: newData[key] };
    }
  });
  return changes;
};