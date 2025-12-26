import { base44 } from "@/api/base44Client";

/**
 * Função utilitária para registrar ações no log de auditoria
 */
export const logAction = async (action, entity, entityId, entityName, details = {}) => {
  try {
    const user = await base44.auth.me();
    
    await base44.entities.AuditLog.create({
      user_id: user.id,
      user_name: user.full_name || user.email,
      user_email: user.email,
      action: action,
      entity: entity,
      entity_id: entityId,
      entity_name: entityName,
      details: details,
      ip_address: "", // Pode ser capturado do backend se necessário
      user_agent: navigator.userAgent
    });
  } catch (error) {
    console.error("Erro ao registrar log de auditoria:", error);
  }
};

/**
 * Helper para comparar valores antigos e novos
 */
export const getChanges = (oldData, newData) => {
  const changes = {};
  
  Object.keys(newData).forEach(key => {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changes[key] = {
        antes: oldData[key],
        depois: newData[key]
      };
    }
  });
  
  return changes;
};