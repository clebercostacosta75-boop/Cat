/**
 * CertificateDownloader — Gera e faz download do certificado em PDF
 * usando o HTML real do modelo (frente + verso completos).
 * Funciona tanto na tela de assinatura quanto na validação.
 */
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { buildCertificateHTMLFromModel } from "./CertificatePreview";

async function loadModel(certificate) {
  // Tenta buscar o modelo pelo nome do curso ou model_id
  try {
    const models = await base44.entities.CertificateModel.list("-created_date", 100);
    return (
      models.find(m => m.id === certificate.model_id) ||
      models.find(m => m.name === certificate.course_name) ||
      models[0] ||
      null
    );
  } catch {
    return null;
  }
}

async function renderPageToCanvas(html, pageIndex) {
  // Injeta o HTML num iframe oculto, captura a página correta
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-9999px";
    iframe.style.top = "0";
    iframe.style.width = "297mm";
    iframe.style.height = "210mm";
    iframe.style.border = "none";
    iframe.style.zIndex = "-1";
    document.body.appendChild(iframe);

    iframe.onload = async () => {
      try {
        await new Promise(r => setTimeout(r, 600)); // aguarda imagens carregarem
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const pages = iframeDoc.querySelectorAll(".cert-page");
        const page = pages[pageIndex];

        if (!page) { reject(new Error("Página não encontrada")); return; }

        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          width: page.offsetWidth,
          height: page.offsetHeight,
          windowWidth: page.offsetWidth,
          windowHeight: page.offsetHeight,
        });

        document.body.removeChild(iframe);
        resolve(canvas);
      } catch (err) {
        document.body.removeChild(iframe);
        reject(err);
      }
    };

    iframe.srcdoc = html;
  });
}

// Regras de bloqueio de download — retorna o motivo do bloqueio ou null se permitido
export function getDownloadBlockReason(cert) {
  if (!cert) return "Certificado não encontrado";
  const now = new Date();
  if (cert.status === "revoked") return "Certificado revogado — download não permitido.";
  if (cert.is_blocked) return "O download deste certificado está bloqueado. Entre em contato com a CAT Cursos.";
  if (cert.download_deadline && new Date(cert.download_deadline) < now) return "O prazo para download deste certificado expirou.";
  if (cert.valid_until && new Date(cert.valid_until) < now) return "Certificado vencido — download não permitido.";
  return null;
}

function logDownloadEvent(cert, event, details) {
  if (!cert?.certificate_code) return;
  base44.functions.invoke("certificadoPublico", {
    action: "log",
    code: cert.certificate_code,
    event,
    details,
  }).catch(() => {});
}

export default function CertificateDownloader({ certificate, model: modelProp, size = "default", className = "" }) {
  const [downloading, setDownloading] = useState(false);

  const blockReason = getDownloadBlockReason(certificate);

  const downloadPDF = async () => {
    // Controle de download: is_blocked, download_deadline, valid_until, status
    if (blockReason) {
      toast.error(blockReason);
      logDownloadEvent(certificate, "download_bloqueado", blockReason);
      return;
    }
    logDownloadEvent(certificate, "download_permitido");
    setDownloading(true);
    const toastId = toast.loading("Gerando PDF do certificado...");
    try {
      // Carregar modelo se não foi passado
      const model = modelProp !== undefined ? modelProp : await loadModel(certificate);

      // Gerar HTML completo (frente + verso)
      const html = buildCertificateHTMLFromModel(model, certificate);

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Renderizar frente
      toast.loading("Renderizando frente...", { id: toastId });
      const canvasFront = await renderPageToCanvas(html, 0);
      pdf.addImage(canvasFront.toDataURL("image/png"), "PNG", 0, 0, pageW, pageH);

      // Renderizar verso
      toast.loading("Renderizando verso...", { id: toastId });
      const canvasBack = await renderPageToCanvas(html, 1);
      pdf.addPage();
      pdf.addImage(canvasBack.toDataURL("image/png"), "PNG", 0, 0, pageW, pageH);

      const filename = `Certificado_${(certificate.student_name || "aluno").replace(/\s+/g, "_")}_${certificate.certificate_code || "cert"}.pdf`;
      pdf.save(filename);

      toast.success("Certificado baixado com sucesso!", { id: toastId });
    } catch (error) {
      console.error("Erro ao baixar certificado:", error);
      toast.error("Erro ao gerar o PDF. Tente novamente.", { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      onClick={downloadPDF}
      disabled={downloading}
      size={size}
      className={`bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2 ${className}`}
    >
      {downloading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Gerando PDF...
        </>
      ) : blockReason ? (
        <>
          <Download className="w-4 h-4" />
          Download Bloqueado
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Baixar Certificado (PDF)
        </>
      )}
    </Button>
  );
}