import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

export default function CertificateDownloader({ certificate, model }) {
  const [downloading, setDownloading] = useState(false);

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      // Criar PDF em tamanho A4 horizontal (297mm x 210mm)
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();

      // Criar elemento temporário com o conteúdo renderizado
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      tempDiv.style.width = "297mm";
      tempDiv.style.height = "210mm";

      // HTML com estilos inline para o certificado
      const backgroundColor = model?.front_background_url
        ? `background-image: url('${model.front_background_url}');`
        : "background: white;";

      tempDiv.innerHTML = `
        <div style="
          ${backgroundColor}
          background-size: cover;
          background-position: center;
          width: 100%;
          height: 100%;
          padding: 12mm 15mm;
          box-sizing: border-box;
          font-family: Georgia, serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #374151;
          position: relative;
        ">
          <!-- Título -->
          <h1 style="
            font-size: 28pt;
            font-weight: bold;
            letter-spacing: 4px;
            text-transform: uppercase;
            margin: 0 0 4px 0;
          ">${model?.front_title || "CERTIFICADO"}</h1>

          <p style="
            font-size: 10pt;
            letter-spacing: 3px;
            margin: 0 0 8mm 0;
          ">${model?.front_subtitle || "CAPACITAÇÃO PROFISSIONAL"}</p>

          <!-- Label certificamos -->
          <p style="
            font-size: 10pt;
            margin: 8mm 0 4mm 0;
          ">${model?.front_certification_label || "CERTIFICAMOS QUE"}</p>

          <!-- Nome do aluno -->
          <div style="
            font-size: 20pt;
            font-weight: bold;
            border-bottom: 2px solid #059669;
            padding-bottom: 3px;
            display: inline-block;
            min-width: 100mm;
            margin: 0 0 4mm 0;
          ">${certificate.student_name}</div>

          ${certificate.student_cpf ? `
            <p style="font-size: 9pt; color: #6b7280; margin: 0 0 4mm 0;">
              CPF: ${certificate.student_cpf}
            </p>
          ` : ""}

          <p style="font-size: 11pt; margin: 0 0 2mm 0;">concluiu com êxito o curso de</p>

          <p style="
            font-size: 14pt;
            font-weight: bold;
            color: #064e3b;
            margin: 4mm 0;
          ">${certificate.course_name}</p>

          <p style="
            font-size: 11pt;
            max-width: 140mm;
            margin: 0 auto 5mm;
            text-align: center;
          ">
            com carga horária de <strong>${certificate.course_duration || ""}</strong>
            ${certificate.client_name ? `, realizado na empresa <strong>${certificate.client_name}</strong>` : ""}
            ${certificate.location_and_date ? `, em <strong>${certificate.location_and_date}</strong>` : ""}.
          </p>

          <!-- Local e data -->
          <p style="font-size: 9pt; margin: 5mm 0 0 0;">
            ${certificate.location_and_date || "Barcarena/PA"}, ${new Date().toLocaleDateString("pt-BR")}
          </p>

          <!-- Assinatura -->
          <div style="
            display: flex;
            justify-content: space-around;
            width: 100%;
            margin-top: auto;
            padding-top: 6mm;
          ">
            <div style="text-align: center; min-width: 55mm;">
              ${certificate.signature_url ? `
                <img src="${certificate.signature_url}" style="height: 30px; object-fit: contain; display: block; margin: 0 auto 4px;" alt="Assinatura"/>
              ` : ""}
              <div style="border-top: 1.5px solid #374151; padding-top: 5px;">
                <p style="font-size: 9pt; font-weight: bold; margin: 0;">
                  ${certificate.instructor_name || "___________________________"}
                </p>
                <p style="font-size: 8pt; color: #6b7280; margin: 0;">Instrutor(a)</p>
              </div>
            </div>
            <div style="text-align: center; min-width: 55mm;">
              ${certificate.signature_url ? `
                <img src="${certificate.signature_url}" style="height: 30px; object-fit: contain; display: block; margin: 0 auto 4px;" alt="Assinatura Aluno"/>
              ` : ""}
              <div style="border-top: 1.5px solid #374151; padding-top: 5px;">
                <p style="font-size: 9pt; font-weight: bold; margin: 0;">
                  ${certificate.student_name}
                </p>
                <p style="font-size: 8pt; color: #6b7280; margin: 0;">Assinatura do Treinando</p>
              </div>
            </div>
          </div>

          <!-- Número do certificado -->
          ${certificate.certificate_code ? `
            <p style="font-size: 8pt; color: #9ca3af; margin: 3mm 0 0 0;">
              ${certificate.certificate_code}
              ${certificate.valid_until ? ` • Válido até ${new Date(certificate.valid_until).toLocaleDateString("pt-BR")}` : ""}
            </p>
          ` : ""}
        </div>
      `;

      document.body.appendChild(tempDiv);

      // Converter HTML para canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      document.body.removeChild(tempDiv);

      // Adicionar imagem ao PDF
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, width, height);

      // Salvar PDF
      const filename = `Certificado_${certificate.student_name.replace(/\s+/g, "_")}_${certificate.certificate_code}.pdf`;
      pdf.save(filename);

      toast.success("Certificado baixado com sucesso!");
    } catch (error) {
      console.error("Erro ao baixar certificado:", error);
      toast.error("Erro ao baixar o certificado. Tente novamente.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      onClick={downloadPDF}
      disabled={downloading}
      className="w-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2"
    >
      {downloading ? (
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Baixando...
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Baixar Certificado (PDF)
        </span>
      )}
    </Button>
  );
}