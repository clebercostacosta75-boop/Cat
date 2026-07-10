/**
 * SPR-2C-1 — Função central de impressão de certificados.
 * NENHUMA impressão pode acontecer sem passar por aqui:
 * valida status (revogado/cancelado/bloqueado/vencido), tipo de impressão
 * e registra AuditLog obrigatório (permitido ou bloqueado).
 */
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { buildCertificateHTMLFromModel } from "@/components/certificates/CertificatePreview";
import { logAction } from "@/components/audit/AuditLogger";

export const TIPO_SEM_ASSINATURA = "sem_assinatura_digital";
export const TIPO_COM_ASSINATURA = "com_assinatura_digital";

const isAssinado = (cert) =>
  (cert?.status === "signed" || cert?.status === "active") && !!cert?.signed_at;

/** Retorna o motivo do bloqueio de impressão, ou null se permitida. */
export function getPrintBlockReason(cert, tipo) {
  if (!cert) return "Impressão bloqueada: certificado não encontrado.";
  if (cert.status === "revoked") return "Impressão bloqueada: certificado revogado.";
  if (cert.status === "expired") return "Impressão bloqueada: certificado cancelado/expirado.";
  if (cert.is_blocked) return "Impressão bloqueada: certificado bloqueado.";
  if (cert.valid_until && new Date(cert.valid_until) < new Date())
    return "Impressão bloqueada: certificado vencido.";
  if (tipo === TIPO_COM_ASSINATURA && !isAssinado(cert))
    return "Este certificado ainda não possui assinatura digital do aluno.";
  return null;
}

/** AuditLog obrigatório de impressão (permitida ou bloqueada). */
async function auditarImpressao(cert, tipo, resultado, motivo) {
  const origem = cert.client_id || (cert.client_name && cert.client_name !== "Individual (PF)")
    ? "Empresa" : "Individual";
  await logAction(
    "export",
    "Certificate",
    cert.id,
    `${cert.certificate_code || ""} — ${cert.student_name || ""} — ${cert.course_name || ""}`,
    {
      acao: "IMPRESSAO_CERTIFICADO",
      resultado,
      tipo_impressao: tipo,
      motivo: motivo || null,
      status_no_momento: cert.status,
      aluno: cert.student_name,
      cpf: cert.student_cpf,
      curso: cert.course_name,
      empresa: cert.client_name || null,
      origem,
      dispositivo: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 150) : null,
      data_hora: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    }
  );
}

async function loadModel(cert) {
  try {
    const models = await base44.entities.CertificateModel.list("-created_date", 100);
    return (
      models.find((m) => m.id === cert.certificate_model_id) ||
      models.find((m) => m.id === cert.model_id) ||
      models.find((m) => m.name === cert.course_name) ||
      models[0] ||
      null
    );
  } catch {
    return null;
  }
}

/**
 * Imprime um certificado com validação de status + AuditLog obrigatório.
 * @param {object} cert - Certificado (Certificate)
 * @param {string|null} tipo - TIPO_SEM_ASSINATURA | TIPO_COM_ASSINATURA (null = automático pelo status)
 * @param {object} [model] - Modelo (CertificateModel); carregado automaticamente se omitido
 * @returns {Promise<boolean>} true se a impressão foi aberta
 */
export async function imprimirCertificado(cert, tipo = null, model) {
  const tipoFinal = tipo || (isAssinado(cert) ? TIPO_COM_ASSINATURA : TIPO_SEM_ASSINATURA);

  const motivo = getPrintBlockReason(cert, tipoFinal);
  if (motivo) {
    toast.error(motivo);
    if (cert) auditarImpressao(cert, tipoFinal, "bloqueado", motivo);
    return false;
  }

  await auditarImpressao(cert, tipoFinal, "permitido", null);

  const m = model !== undefined ? model : await loadModel(cert);
  const mergedModel = {
    ...(m || {}),
    front_background_url: cert.front_background_url || m?.front_background_url,
    back_background_url: cert.back_background_url || m?.back_background_url,
  };

  let html = buildCertificateHTMLFromModel(mergedModel, cert);

  // Impressão sem assinatura digital: marcação obrigatória (nunca simular assinatura)
  if (tipoFinal === TIPO_SEM_ASSINATURA && !isAssinado(cert)) {
    html = html.replace(
      "</body>",
      `<div style="position:fixed; bottom:1mm; left:0; right:0; text-align:center; font-family:Arial,sans-serif; font-size:7pt; color:#9ca3af; z-index:99;">Impresso sem assinatura digital do aluno — autenticidade verificável pelo QR Code</div></body>`
    );
  }

  const win = window.open("", "_blank");
  if (!win) {
    toast.error("Popup bloqueado. Por favor, permita popups para este site.");
    return false;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 500);
  return true;
}