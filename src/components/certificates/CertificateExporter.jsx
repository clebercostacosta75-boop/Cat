/**
 * CertificateExporter — usa o mesmo buildCertificateHTMLFromModel do CertificatePreview.
 * Garante que o PDF gerado seja IDÊNTICO à pré-visualização.
 */
import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { buildCertificateHTMLFromModel } from "./CertificatePreview";

export function exportCertificatePDF(cert, model) {
  // Mescla: dados do modelo têm prioridade para layout, dados do cert têm prioridade para conteúdo do aluno
  const mergedModel = {
    ...(model || {}),
    // Campos de layout/background que podem estar salvos diretamente no cert (emissões antigas)
    front_background_url: cert.front_background_url || model?.front_background_url,
    back_background_url: cert.back_background_url || model?.back_background_url,
  };

  const html = buildCertificateHTMLFromModel(mergedModel, cert);
  const win = window.open("", "_blank");
  if (!win) {
    alert("Popup bloqueado. Por favor, permita popups para este site.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 500);
}

export default function CertificateExporter({ certificate, cert, model, className }) {
  const certData = certificate || cert;
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => exportCertificatePDF(certData, model)}
      className={className}
    >
      <Download className="w-3 h-3 mr-1" />
      PDF
    </Button>
  );
}