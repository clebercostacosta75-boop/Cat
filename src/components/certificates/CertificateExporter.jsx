import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatDatePtBR(dateStr) {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

function buildCertificateHTML(cert) {
  const completionDate = formatDatePtBR(cert.completion_date || cert.end_date);
  const expirationDate = formatDatePtBR(cert.expiration_date || cert.valid_until);
  const certNumber = cert.certificate_number || cert.certificate_code || cert.registration_number || "";
  const workloadHours = cert.workload_hours || cert.course_duration || "";
  const location = cert.location || cert.location_and_date || "";
  const companyName = cert.company_name || cert.client_name || "";
  const instructorName = cert.instructor_name || "";

  // Frente do certificado
  const frontBg = cert.front_background_url
    ? `background-image: url('${cert.front_background_url}'); background-size: cover; background-position: center;`
    : "background: white;";

  // Verso do certificado
  const backBg = cert.back_background_url
    ? `background-image: url('${cert.back_background_url}'); background-size: cover; background-position: center;`
    : "background: white;";

  // Conteúdo programático
  const programmaticRows = (cert.programmatic_content || [])
    .map(item => `
      <tr>
        <td style="padding:4px 8px; border-bottom:1px solid #e5e7eb;">${item.module || ""}</td>
        ${cert.show_programmatic_hours !== false ? `<td style="padding:4px 8px; border-bottom:1px solid #e5e7eb; text-align:center; white-space:nowrap;">${item.hours || ""}</td>` : ""}
      </tr>
    `).join("");

  // Responsáveis técnicos
  const responsibles = (cert.technical_responsibles || []);

  const frontTitle = cert.front_title || "CERTIFICADO";
  const frontSubtitle = cert.front_subtitle || "DE CONCLUSÃO";
  const certLabel = cert.front_certification_label || "Certificamos que";
  const signatureLabel = cert.front_signature_label || "";
  const footerLine1 = cert.front_footer_line1 || "Sistema de Treinamento CAT";
  const footerLine2 = cert.front_footer_line2 || "";
  const backHeader = cert.back_header_text || "";
  const backModality = cert.back_modality_text || (cert.course_modality ? `Modalidade: ${cert.course_modality}` : "");
  const backContentTitle = cert.back_content_title || "CONTEÚDO PROGRAMÁTICO";
  const backResponsiblesTitle = cert.back_responsibles_title || "RESPONSÁVEIS TÉCNICOS";
  const backFooterLine1 = cert.back_footer_line1 || footerLine1;
  const backFooterLine2 = cert.back_footer_line2 || footerLine2;

  const pageW = cert.page_width || 297;
  const pageH = cert.page_height || 210;
  const isLandscape = pageW > pageH;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Certificado - ${cert.student_name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { background: #f3f4f6; }
    @media print {
      @page { size: ${pageW}mm ${pageH}mm; margin: 0; }
      body { background: white; }
      .page-break { page-break-after: always; }
      .no-print { display: none !important; }
    }
    .cert-page {
      width: ${pageW}mm;
      height: ${pageH}mm;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      margin: 0 auto 10mm;
    }
    .cert-content {
      position: relative;
      z-index: 2;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 12mm 15mm;
    }
    .bg-layer {
      position: absolute;
      inset: 0;
      z-index: 1;
    }
  </style>
</head>
<body>

<!-- PÁGINA 1: FRENTE -->
<div class="cert-page page-break">
  <div class="bg-layer" style="${frontBg} border: 10px solid #059669;"></div>
  <div class="cert-content" style="text-align:center; font-family: Georgia, serif;">

    <!-- Logo -->
    <div style="margin-bottom:8mm;">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png"
        alt="Logo" style="height:40px; object-fit:contain;"/>
      <div style="width:70mm; height:2px; background:#059669; margin:4px auto 0;"></div>
    </div>

    <!-- Título -->
    <h1 style="font-size:26pt; font-weight:bold; color:#064e3b; letter-spacing:4px; text-transform:uppercase; line-height:1.1;">
      ${frontTitle}
    </h1>
    <p style="font-size:10pt; color:#6b7280; letter-spacing:3px; margin-top:3px;">${frontSubtitle}</p>

    <!-- Corpo -->
    <div style="margin-top:8mm; line-height:1.9;">
      <p style="font-size:11pt; color:#374151;">${certLabel}</p>
      <p style="font-size:20pt; font-weight:bold; color:#111827; border-bottom:2px solid #059669; padding-bottom:3px; display:inline-block; min-width:100mm; margin:4mm 0;">
        ${cert.student_name}
      </p>
      ${cert.student_cpf ? `<p style="font-size:9pt; color:#6b7280; margin-bottom:4mm;">CPF: ${cert.student_cpf}</p>` : ""}
      <p style="font-size:11pt; color:#374151;">concluiu com êxito o curso de</p>
      <p style="font-size:14pt; font-weight:bold; color:#064e3b; margin:4mm 0;">${cert.course_name}</p>
      <p style="font-size:10pt; color:#4b5563; max-width:140mm; margin:0 auto;">
        com carga horária de <strong>${workloadHours}${workloadHours ? "h" : ""}</strong>
        ${companyName ? `, realizado na empresa <strong>${companyName}</strong>` : ""}
        ${location ? `, em <strong>${location}</strong>` : ""}
        ${completionDate !== "-" ? `, em <strong>${completionDate}</strong>` : ""}.
      </p>
    </div>

    <!-- Nº Certificado -->
    ${certNumber ? `<p style="font-size:8pt; color:#9ca3af; margin-top:5mm;">
      ${certNumber}${expirationDate !== "-" ? ` • Válido até ${expirationDate}` : ""}
    </p>` : ""}

    <!-- Assinaturas -->
    <div style="display:flex; justify-content:space-around; width:100%; margin-top:auto; padding-top:6mm;">
      ${responsibles.length > 0 ? responsibles.map(r => `
        <div style="text-align:center; min-width:55mm;">
          <div style="border-top:1.5px solid #374151; padding-top:5px;">
            <p style="font-size:9pt; font-weight:bold; color:#111827;">${r.name || "___________________________"}</p>
            <p style="font-size:8pt; color:#6b7280;">${r.title || ""}</p>
            ${r.registration ? `<p style="font-size:7.5pt; color:#9ca3af;">${r.registration}</p>` : ""}
          </div>
        </div>
      `).join("") : `
        <div style="text-align:center; min-width:55mm;">
          <div style="border-top:1.5px solid #374151; padding-top:5px;">
            <p style="font-size:9pt; font-weight:bold; color:#111827;">${instructorName || "___________________________"}</p>
            <p style="font-size:8pt; color:#6b7280;">Instrutor(a)</p>
          </div>
        </div>
        <div style="text-align:center; min-width:55mm;">
          <div style="border-top:1.5px solid #374151; padding-top:5px;">
            <p style="font-size:9pt; font-weight:bold; color:#111827;">___________________________</p>
            <p style="font-size:8pt; color:#6b7280;">Responsável pela Empresa</p>
          </div>
        </div>
      `}
    </div>

    ${signatureLabel ? `<p style="font-size:8.5pt; color:#6b7280; margin-top:3mm;">${signatureLabel}</p>` : ""}

    <!-- Rodapé Frente -->
    <div style="position:absolute; bottom:8mm; width:100%; text-align:center;">
      <p style="font-size:7.5pt; color:#9ca3af;">${footerLine1}</p>
      ${footerLine2 ? `<p style="font-size:7pt; color:#9ca3af;">${footerLine2}</p>` : ""}
    </div>
  </div>
</div>

<!-- PÁGINA 2: VERSO -->
<div class="cert-page">
  <div class="bg-layer" style="${backBg} border: 10px solid #059669;"></div>
  <div class="cert-content" style="font-family: Arial, sans-serif; align-items: flex-start; justify-content: flex-start;">

    ${backHeader ? `<p style="font-size:10pt; color:#374151; margin-bottom:4mm;">${backHeader}</p>` : ""}
    ${backModality ? `<p style="font-size:9pt; color:#6b7280; margin-bottom:3mm;">${backModality}</p>` : ""}

    <!-- Nome do curso -->
    <p style="font-size:13pt; font-weight:bold; color:#064e3b; margin-bottom:5mm;">${cert.course_name}</p>

    <!-- Conteúdo Programático -->
    ${(cert.programmatic_content || []).length > 0 ? `
      <p style="font-size:9pt; font-weight:bold; color:#374151; text-transform:uppercase; letter-spacing:1px; margin-bottom:3mm;">${backContentTitle}</p>
      <table style="width:100%; border-collapse:collapse; font-size:9pt; color:#374151; margin-bottom:6mm;">
        <thead>
          <tr style="background:#059669; color:white;">
            <th style="padding:5px 8px; text-align:left;">Módulo / Conteúdo</th>
            ${cert.show_programmatic_hours !== false ? `<th style="padding:5px 8px; text-align:center; width:25mm;">Carga Horária</th>` : ""}
          </tr>
        </thead>
        <tbody>${programmaticRows}</tbody>
      </table>
    ` : ""}

    <!-- Responsáveis -->
    ${responsibles.length > 0 ? `
      <p style="font-size:9pt; font-weight:bold; color:#374151; text-transform:uppercase; letter-spacing:1px; margin-bottom:3mm;">${backResponsiblesTitle}</p>
      <div style="display:flex; flex-wrap:wrap; gap:8mm;">
        ${responsibles.map(r => `
          <div style="min-width:55mm;">
            <div style="border-top:1.5px solid #374151; padding-top:4px;">
              <p style="font-size:9pt; font-weight:bold;">${r.name}</p>
              ${(r.titles || [r.title]).filter(Boolean).map(t => `<p style="font-size:8pt; color:#6b7280;">${t}</p>`).join("")}
              ${r.registration ? `<p style="font-size:7.5pt; color:#9ca3af;">${r.registration}</p>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    ` : ""}

    <!-- ID de registro -->
    ${certNumber ? `
      <div style="margin-top:auto; padding-top:6mm; width:100%;">
        <p style="font-size:8pt; color:#9ca3af;">Registro: ${certNumber}</p>
      </div>
    ` : ""}

    <!-- Rodapé Verso -->
    <div style="position:absolute; bottom:8mm; width:100%; text-align:center;">
      <p style="font-size:7.5pt; color:#9ca3af;">${backFooterLine1}</p>
      ${backFooterLine2 ? `<p style="font-size:7pt; color:#9ca3af;">${backFooterLine2}</p>` : ""}
      <p style="font-size:7pt; color:#d1d5db; margin-top:2px;">Emitido em ${new Date().toLocaleDateString("pt-BR")}</p>
    </div>
  </div>
</div>

</body>
</html>`;
}

export function exportCertificatePDF(cert) {
  const html = buildCertificateHTML(cert);
  const win = window.open("", "_blank");
  if (!win) {
    alert("Popup bloqueado. Por favor, permita popups para este site.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    setTimeout(() => {
      win.print();
    }, 500);
  };
}

export default function CertificateExportButton({ cert, className }) {
  return (
    <Button
      onClick={() => exportCertificatePDF(cert)}
      className={className || "bg-emerald-600 hover:bg-emerald-700"}
    >
      <Download className="w-4 h-4 mr-2" />
      Exportar PDF
    </Button>
  );
}