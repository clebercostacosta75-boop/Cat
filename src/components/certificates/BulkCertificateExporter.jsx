/**
 * BulkCertificateExporter — exporta múltiplos certificados em um único PDF consolidado.
 * Abre uma janela com todos os certificados concatenados e aciona o print.
 */
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { buildCertificateHTMLFromModel } from "./CertificatePreview";

export default function BulkCertificateExporter({ certificates, models, onDone }) {
  const [loading, setLoading] = useState(false);

  const getModel = (cert) =>
    models?.find((m) => m.name === cert.course_name || m.id === cert.model_id) || null;

  const handleExport = () => {
    if (!certificates || certificates.length === 0) return;
    setLoading(true);

    // Monta um HTML consolidado com todos os certificados (frente+verso) em sequência
    const allPages = certificates.map((cert) => {
      const model = getModel(cert);
      const mergedModel = {
        ...(model || {}),
        front_background_url: cert.front_background_url || model?.front_background_url,
        back_background_url: cert.back_background_url || model?.back_background_url,
      };
      // buildCertificateHTMLFromModel retorna um HTML completo — extraímos apenas o <body>
      const full = buildCertificateHTMLFromModel(mergedModel, cert);
      // Extrai conteúdo entre <body> e </body>
      const bodyMatch = full.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      return bodyMatch ? bodyMatch[1] : full;
    });

    // Extrai o <style> do primeiro certificado para reusar
    const firstFull = buildCertificateHTMLFromModel(
      (() => {
        const model = getModel(certificates[0]);
        return {
          ...(model || {}),
          front_background_url: certificates[0].front_background_url || model?.front_background_url,
          back_background_url: certificates[0].back_background_url || model?.back_background_url,
        };
      })(),
      certificates[0]
    );
    const styleMatch = firstFull.match(/<style>([\s\S]*?)<\/style>/i);
    const sharedStyle = styleMatch ? styleMatch[1] : "";

    const consolidatedHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Certificados Consolidados (${certificates.length})</title>
  <style>
    ${sharedStyle}
    /* Garante que cada certificado (frente/verso) quebre página corretamente */
    .cert-page { page-break-after: always; }
    .cert-page:last-child { page-break-after: auto; }
  </style>
</head>
<body>
${allPages.join("\n")}
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) {
      alert("Popup bloqueado. Por favor, permita popups para este site.");
      setLoading(false);
      return;
    }
    win.document.write(consolidatedHtml);
    win.document.close();
    win.onload = () => {
      setTimeout(() => {
        win.print();
        setLoading(false);
        onDone?.();
      }, 800);
    };
    // fallback caso onload não dispare
    setTimeout(() => setLoading(false), 3000);
  };

  return (
    <Button
      onClick={handleExport}
      disabled={loading || !certificates?.length}
      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      Exportar {certificates?.length > 0 ? `${certificates.length} ` : ""}PDF{certificates?.length !== 1 ? "s" : ""}
    </Button>
  );
}