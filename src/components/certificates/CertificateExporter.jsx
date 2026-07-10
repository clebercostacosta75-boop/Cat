/**
 * CertificateExporter — SPR-2C-1: blindado.
 * Não imprime mais diretamente: toda impressão passa pela função central
 * imprimirCertificado (validação de status + AuditLog obrigatório).
 * Certificado revogado/cancelado/bloqueado não exibe botão de impressão válida.
 */
import React from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import {
  imprimirCertificado,
  getPrintBlockReason,
  TIPO_SEM_ASSINATURA,
  TIPO_COM_ASSINATURA,
} from "@/lib/imprimirCertificado";

/** Compatibilidade com chamadas antigas — agora validada e auditada. */
export async function exportCertificatePDF(cert, model) {
  return imprimirCertificado(cert, null, model);
}

export default function CertificateExporter({ certificate, cert, model, className }) {
  const certData = certificate || cert;
  const assinado = (certData?.status === "signed" || certData?.status === "active") && !!certData?.signed_at;
  const tipo = assinado ? TIPO_COM_ASSINATURA : TIPO_SEM_ASSINATURA;

  // Revogado / cancelado / bloqueado / vencido: sem botão de impressão válida
  if (getPrintBlockReason(certData, tipo)) return null;

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => imprimirCertificado(certData, tipo, model)}
      className={className}
    >
      <Printer className="w-3 h-3 mr-1" />
      {assinado ? "Imprimir c/ assinatura" : "Imprimir s/ assinatura"}
    </Button>
  );
}