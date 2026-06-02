/**
 * CertificateExporter — usa o mesmo buildCertificateHTMLFromModel do CertificatePreview.
 * Garante que o PDF gerado seja IDÊNTICO à pré-visualização.
 */
import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { buildCertificateHTMLFromModel } from "./CertificatePreview";

export function exportCertificatePDF(cert, model) {
  const mergedModel = {
    ...(model || {}),
    front_background_url: cert.front_background_url || model?.front_background_url,
    back_background_url: cert.back_background_url || model?.back_background_url,
  };

  // Se os responsáveis do certificado não têm signature_url mas o modelo tem,
  // usa os responsáveis do modelo (mais atualizados com assinaturas)
  const certResps = cert.technical_responsibles || [];
  const modelResps = model?.technical_responsibles || [];
  const certHasSigs = certResps.some(r => r.signature_url);
  const modelHasSigs = modelResps.some(r => r.signature_url);

  const certWithResps = {
    ...cert,
    technical_responsibles: (!certHasSigs && modelHasSigs) ? modelResps : certResps,
  };

  const html = buildCertificateHTMLFromModel(mergedModel, certWithResps);
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