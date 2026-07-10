/**
 * SPR-2C-1 / SPR-2C-2 — Função central de impressão de certificados.
 * NENHUMA impressão pode acontecer sem passar por aqui:
 * valida status (revogado/cancelado/bloqueado/vencido), tipo de impressão
 * e registra AuditLog obrigatório (permitido ou bloqueado).
 * SPR-2C-2: linha de assinatura física (sem assinatura), rodapé "Assinado
 * digitalmente em..." (com assinatura) e página A4 de comprovante.
 */
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { buildCertificateHTMLFromModel } from "@/components/certificates/CertificatePreview";
import { logAction } from "@/components/audit/AuditLogger";
import { buildComprovanteHTML } from "@/components/certificates/ComprovanteImpressao";

export const TIPO_SEM_ASSINATURA = "sem_assinatura_digital";
export const TIPO_COM_ASSINATURA = "com_assinatura_digital";
export const TIPO_CERT_COM_COMPROVANTE = "certificado_com_comprovante";

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
  if ((tipo === TIPO_COM_ASSINATURA || tipo === TIPO_CERT_COM_COMPROVANTE) && !isAssinado(cert))
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

const overlayFooter = (texto) =>
  `<div style="position:fixed; bottom:1mm; left:0; right:0; text-align:center; font-family:Arial,sans-serif; font-size:7pt; color:#9ca3af; z-index:99;">${texto}</div>`;

/**
 * Imprime um certificado com validação de status + AuditLog obrigatório.
 * @param {object} cert - Certificado (Certificate)
 * @param {string|null} tipo - TIPO_SEM_ASSINATURA | TIPO_COM_ASSINATURA | TIPO_CERT_COM_COMPROVANTE (null = automático)
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

  // SPR-2C-2 — Sem assinatura digital: linha para assinatura física + aviso (nunca simular assinatura)
  if (tipoFinal === TIPO_SEM_ASSINATURA && !isAssinado(cert)) {
    html = html.replace(
      "</body>",
      `<div style="position:fixed; bottom:7mm; left:50%; transform:translateX(-50%); font-family:Arial,sans-serif; font-size:9pt; color:#374151; z-index:99; white-space:nowrap;">Assinatura do aluno: _________________________________________</div>` +
        overlayFooter("Impresso sem assinatura digital do aluno — validade verificável pelo QR Code") +
        "</body>"
    );
  }

  // SPR-2C-2 — Com assinatura digital: rodapé com data/hora + referência ao comprovante
  // (funciona também para legado com signed_at e sem signature_url — bloco textual, sem imagem simulada)
  if (tipoFinal !== TIPO_SEM_ASSINATURA && cert.signed_at) {
    const dt = new Date(cert.signed_at).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
    const ref = cert.internal_control_code ? ` — Cód. interno ${cert.internal_control_code}` : "";
    html = html.replace(
      "</body>",
      overlayFooter(`Assinado digitalmente em ${dt}${ref} — comprovante de assinatura digital disponível`) + "</body>"
    );
  }

  // SPR-2C-2 — Certificado + comprovante: página A4 adicional
  if (tipoFinal === TIPO_CERT_COM_COMPROVANTE) {
    let dados = null;
    try {
      const res = await base44.functions.invoke("certificadoPublico", {
        action: "comprovante",
        code: cert.certificate_code,
      });
      dados = res.data;
    } catch {
      dados = null;
    }
    html = html.replace("</body>", buildComprovanteHTML(cert, dados) + "</body>");
  }

  // SPR-2C-2 (reforço operacional) — Pré-visualização obrigatória antes de imprimir.
  // A impressão só ocorre após "Confirmar impressão"; "Cancelar" fecha sem imprimir.
  // Nenhum dado do certificado é alterado em nenhum dos casos.
  const toolbar = `
<div id="print-confirm-bar" style="position:fixed; top:0; left:0; right:0; z-index:9999; background:#111827; color:#fff; padding:10px 16px; display:flex; align-items:center; gap:12px; font-family:Arial,sans-serif; font-size:13px; box-shadow:0 2px 8px rgba(0,0,0,.3);">
  <span style="flex:1;">Pré-visualização da impressão — confira o certificado antes de imprimir. A impressão não altera nenhum dado do certificado.</span>
  <button onclick="window.print()" style="background:#10b981; color:#fff; border:none; border-radius:6px; padding:8px 16px; font-weight:bold; cursor:pointer;">🖨️ Confirmar impressão</button>
  <button onclick="window.close()" style="background:#ef4444; color:#fff; border:none; border-radius:6px; padding:8px 16px; font-weight:bold; cursor:pointer;">Cancelar</button>
</div>
<style>@media print { #print-confirm-bar { display:none !important; } }</style>`;
  html = html.replace("</body>", toolbar + "</body>");

  const win = window.open("", "_blank");
  if (!win) {
    toast.error("Popup bloqueado. Por favor, permita popups para este site.");
    return false;
  }
  win.document.write(html);
  win.document.close();
  return true;
}