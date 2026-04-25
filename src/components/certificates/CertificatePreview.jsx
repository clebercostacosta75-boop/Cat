/**
 * CertificatePreview — componente de renderização compartilhado.
 * Usado em CertDesigner (pré-visualização de modelo) e na emissão individual.
 * Recebe `model` (CertificateModel) e `cert` (dados do aluno/turma).
 * Quando `cert` é null/undefined, usa dados de exemplo para pré-visualização.
 */
import React from "react";

export const PREVIEW_CERT = {
  student_name: "JOÃO DA SILVA SANTOS",
  student_cpf: "123.456.789-00",
  course_name: "NR-35 – Trabalho em Altura",
  course_duration: "8h",
  course_modality: "Presencial",
  start_date: "2025-03-10",
  end_date: "2025-03-10",
  valid_until: "2026-03-10",
  location_and_date: "Barcarena/PA",
  client_name: "EMPRESA EXEMPLO S/A",
  instructor_name: "Carlos Eduardo Lima",
  certificate_code: "CAT-2025-XXXXXXXX",
};

function fmt(val, fallback = "") {
  return val ?? fallback;
}

function buildStyle(f = {}) {
  const s = {};
  if (f.fontFamily) s.fontFamily = f.fontFamily;
  if (f.fontSize) s.fontSize = f.fontSize + "pt";
  if (f.color) s.color = f.color;
  if (f.bold) s.fontWeight = "bold";
  if (f.italic) s.fontStyle = "italic";
  if (f.underline) s.textDecoration = "underline";
  if (f.letterSpacing !== undefined) s.letterSpacing = f.letterSpacing + "px";
  if (f.textAlign) s.textAlign = f.textAlign;
  if (f.lineHeight) s.lineHeight = f.lineHeight;
  if (f.marginTop !== undefined) s.marginTop = f.marginTop + "mm";
  if (f.marginBottom !== undefined) s.marginBottom = f.marginBottom + "mm";
  if (f.marginLeft !== undefined) s.marginLeft = f.marginLeft + "mm";
  if (f.marginRight !== undefined) s.marginRight = f.marginRight + "mm";
  if (f.textTransform) s.textTransform = f.textTransform;
  return s;
}

export function buildCertificateHTMLFromModel(model, certData) {
  const cert = { ...PREVIEW_CERT, ...certData };
  const m = model || {};

  const pageW = m.page_width || 297;
  const pageH = m.page_height || 210;

  const frontBg = m.front_background_url
    ? `background-image: url('${m.front_background_url}'); background-size: cover; background-position: center;`
    : "background: #ffffff;";
  const backBg = m.back_background_url
    ? `background-image: url('${m.back_background_url}'); background-size: cover; background-position: center;`
    : "background: #ffffff;";

  const tf = m.text_formatting || {};
  const snf = m.student_name_formatting || {};
  const pcf = m.programmatic_content_formatting || {};
  const frontTitleF = m.front_title_formatting || {};
  const frontSubtitleF = m.front_subtitle_formatting || {};
  const frontCertLabelF = m.front_certification_label_formatting || {};
  const frontLocDateF = m.front_location_date_formatting || {};
  const frontSigLabelF = m.front_signature_label_formatting || {};
  const frontFoot1F = m.front_footer_line1_formatting || {};
  const frontFoot2F = m.front_footer_line2_formatting || {};
  const backHeaderF = m.back_header_text_formatting || {};
  const backModalityF = m.back_modality_text_formatting || {};
  const backCourseNameF = m.back_course_name_formatting || {};
  const backContentTitleF = m.back_content_title_formatting || {};
  const backResponsiblesTitleF = m.back_responsibles_title_formatting || {};
  const backFoot1F = m.back_footer_line1_formatting || {};
  const backFoot2F = m.back_footer_line2_formatting || {};

  const frontTitle = m.front_title || "CERTIFICADO";
  const frontSubtitle = m.front_subtitle || "CAPACITAÇÃO PROFISSIONAL";
  const certLabel = m.front_certification_label || "CERTIFICAMOS QUE";
  const locDate = (m.front_location_date || "Barcarena/PA, [DATA_EMISSAO]")
    .replace("[DATA_EMISSAO]", new Date().toLocaleDateString("pt-BR"));
  const sigLabel = m.front_signature_label || "Assinatura do Treinando";
  const footerLine1 = m.front_footer_line1 || "eadcatcursos.com.br";
  const footerLine2 = m.front_footer_line2 || "www.catcursos.com.br";
  const backHeader = m.back_header_text || "Este certificado possui registro interno para verificação de autenticidade.";
  const backModality = m.back_modality_text || (cert.course_modality ? `Modalidade: ${cert.course_modality}` : "");
  const backContentTitle = m.back_content_title || "CONTEÚDO PROGRAMÁTICO";
  const backResponsiblesTitle = m.back_responsibles_title || "AUTORIDADE E RESPONSABILIDADE TÉCNICA";
  const backFoot1 = m.back_footer_line1 || footerLine1;
  const backFoot2 = m.back_footer_line2 || footerLine2;

  const responsibles = cert.technical_responsibles || m.technical_responsibles || [];
  const programmaticContent = cert.programmatic_content || m.programmatic_content || [];
  const showHours = (cert.show_programmatic_hours !== undefined ? cert.show_programmatic_hours : m.show_programmatic_hours) !== false;

  const toInline = (styleObj) =>
    Object.entries(styleObj)
      .map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${v}`)
      .join("; ");

  const programmaticRows = programmaticContent
    .map(item => `
      <tr>
        <td style="padding:4px 8px; border-bottom:1px solid #e5e7eb; ${toInline(buildStyle(pcf))}">${item.module || ""}</td>
        ${showHours ? `<td style="padding:4px 8px; border-bottom:1px solid #e5e7eb; text-align:center; white-space:nowrap; ${toInline(buildStyle(pcf))}">${item.hours || ""}</td>` : ""}
      </tr>
    `).join("");

  const mainTextStyle = `font-family: ${tf.fontFamily || "Georgia, serif"}; font-size: ${tf.fontSize || 11}pt; color: ${tf.color || "#374151"}; text-align: ${tf.textAlign || "center"}; line-height: ${tf.lineHeight || 1.8};`;

  const studentNameStyle = `font-size: ${snf.fontSize || 20}pt; font-weight: ${snf.bold !== false ? "bold" : "normal"}; font-style: ${snf.italic ? "italic" : "normal"}; text-decoration: ${snf.underline ? "underline" : "none"}; color: ${snf.color || "#111827"}; letter-spacing: ${snf.letterSpacing || 0}px; text-align: ${snf.textAlign || "center"}; margin-top: ${snf.marginTop || 4}mm; margin-bottom: ${snf.marginBottom || 4}mm; font-family: ${snf.fontFamily || tf.fontFamily || "Georgia, serif"};`;

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
    .bg-layer { position: absolute; inset: 0; z-index: 1; }
    .cert-content { position: relative; z-index: 2; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12mm 15mm; }
  </style>
</head>
<body>

<!-- FRENTE -->
<div class="cert-page page-break">
  <div class="bg-layer" style="${frontBg}"></div>
  <div class="cert-content" style="${mainTextStyle}">

    <!-- Título -->
    <h1 style="${toInline({ ...buildStyle(frontTitleF), fontFamily: frontTitleF.fontFamily || tf.fontFamily || "Georgia, serif", fontSize: (frontTitleF.fontSize || 28) + "pt", fontWeight: "bold", letterSpacing: "4px", textTransform: "uppercase", lineHeight: "1.1" })}">
      ${frontTitle}
    </h1>
    <p style="${toInline({ ...buildStyle(frontSubtitleF), fontFamily: frontSubtitleF.fontFamily || tf.fontFamily || "Georgia, serif", fontSize: (frontSubtitleF.fontSize || 10) + "pt", letterSpacing: "3px", marginTop: "3px" })}">
      ${frontSubtitle}
    </p>

    <!-- Label certificamos -->
    <p style="margin-top: 8mm; ${toInline({ ...buildStyle(frontCertLabelF), fontFamily: frontCertLabelF.fontFamily || tf.fontFamily || "Georgia, serif", fontSize: (frontCertLabelF.fontSize || 10) + "pt" })}">
      ${certLabel}
    </p>

    <!-- Nome do aluno -->
    <div style="${studentNameStyle}; border-bottom: 2px solid ${snf.color || "#059669"}; padding-bottom: 3px; display: inline-block; min-width: 100mm;">
      ${cert.student_name}
    </div>
    ${cert.student_cpf ? `<p style="font-size:9pt; color:#6b7280; margin-bottom:4mm;">CPF: ${cert.student_cpf}</p>` : ""}

    <p style="${mainTextStyle}">concluiu com êxito o curso de</p>
    <p style="font-size:${(tf.fontSize || 11) + 3}pt; font-weight:bold; color:${tf.highlightColor || "#064e3b"}; margin: 4mm 0; font-family: ${tf.fontFamily || "Georgia, serif"};">
      ${cert.course_name}
    </p>
    <p style="${mainTextStyle}; max-width:140mm; margin:0 auto;">
      com carga horária de <strong>${cert.course_duration || cert.workload_hours || ""}${cert.course_duration || cert.workload_hours ? "h" : ""}</strong>
      ${cert.client_name ? `, realizado na empresa <strong>${cert.client_name}</strong>` : ""}
      ${cert.location_and_date ? `, em <strong>${cert.location_and_date}</strong>` : ""}.
    </p>

    <!-- Local e data -->
    <p style="margin-top: 5mm; ${toInline({ ...buildStyle(frontLocDateF), fontFamily: frontLocDateF.fontFamily || tf.fontFamily || "Georgia, serif", fontSize: (frontLocDateF.fontSize || 9) + "pt" })}">
      ${locDate}
    </p>

    <!-- Assinaturas -->
    <div style="display:flex; justify-content:space-around; width:100%; margin-top:auto; padding-top:6mm;">
      ${responsibles.length > 0 ? responsibles.map(r => `
        <div style="text-align:center; min-width:55mm;">
          ${cert.signature_url ? `<img src="${cert.signature_url}" style="height:30px; object-fit:contain; display:block; margin:0 auto 4px;" alt="Assinatura"/>` : ""}
          <div style="border-top:1.5px solid #374151; padding-top:5px;">
            <p style="font-size:9pt; font-weight:bold;">${r.name || "___________________________"}</p>
            ${(r.titles || [r.title]).filter(Boolean).map(t => `<p style="font-size:8pt; color:#6b7280;">${t}</p>`).join("")}
            ${r.registration ? `<p style="font-size:7.5pt; color:#9ca3af;">${r.registration}</p>` : ""}
          </div>
        </div>
      `).join("") : `
        <div style="text-align:center; min-width:55mm;">
          <div style="border-top:1.5px solid #374151; padding-top:5px;">
            <p style="font-size:9pt; font-weight:bold;">${cert.instructor_name || "___________________________"}</p>
            <p style="font-size:8pt; color:#6b7280;">Instrutor(a)</p>
          </div>
        </div>
        <div style="text-align:center; min-width:55mm;">
          ${cert.signature_url ? `<img src="${cert.signature_url}" style="height:30px; object-fit:contain; display:block; margin:0 auto 4px;" alt="Assinatura Aluno"/>` : ""}
          <div style="border-top:1.5px solid #374151; padding-top:5px;">
            <p style="font-size:9pt; font-weight:bold;">${cert.student_name}</p>
            <p style="font-size:8pt; color:#6b7280; ${toInline(buildStyle(frontSigLabelF))}">${sigLabel}</p>
          </div>
        </div>
      `}
    </div>

    <!-- Número do certificado -->
    ${cert.certificate_code ? `<p style="font-size:8pt; color:#9ca3af; margin-top:3mm;">${cert.certificate_code}${cert.valid_until ? ` • Válido até ${cert.valid_until}` : ""}</p>` : ""}

    <!-- Rodapé -->
    <div style="position:absolute; bottom:8mm; width:100%; text-align:center;">
      <p style="${toInline({ ...buildStyle(frontFoot1F), fontSize: (frontFoot1F.fontSize || 7.5) + "pt", color: frontFoot1F.color || "#9ca3af" })}">${footerLine1}</p>
      ${footerLine2 ? `<p style="${toInline({ ...buildStyle(frontFoot2F), fontSize: (frontFoot2F.fontSize || 7) + "pt", color: frontFoot2F.color || "#9ca3af" })}">${footerLine2}</p>` : ""}
    </div>
  </div>
</div>

<!-- VERSO -->
<div class="cert-page">
  <div class="bg-layer" style="${backBg}"></div>
  <div class="cert-content" style="font-family: ${tf.fontFamily || "Arial, sans-serif"}; align-items: flex-start; justify-content: flex-start;">

    ${backHeader ? `<p style="${toInline({ ...buildStyle(backHeaderF), fontSize: (backHeaderF.fontSize || 9) + "pt", color: backHeaderF.color || "#374151", marginBottom: "4mm" })}">${backHeader}</p>` : ""}
    ${backModality ? `<p style="${toInline({ ...buildStyle(backModalityF), fontSize: (backModalityF.fontSize || 9) + "pt", color: backModalityF.color || "#6b7280", marginBottom: "3mm" })}">${backModality}</p>` : ""}

    <!-- Nome do curso -->
    <p style="${toInline({ ...buildStyle(backCourseNameF), fontSize: (backCourseNameF.fontSize || 13) + "pt", fontWeight: "bold", color: backCourseNameF.color || "#064e3b", marginBottom: "5mm" })}">
      ${cert.course_name}
    </p>

    <!-- Conteúdo programático -->
    ${programmaticContent.length > 0 ? `
      <p style="${toInline({ ...buildStyle(backContentTitleF), fontSize: (backContentTitleF.fontSize || 9) + "pt", fontWeight: "bold", color: backContentTitleF.color || "#374151", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "3mm" })}">${backContentTitle}</p>
      <table style="width:100%; border-collapse:collapse; font-size:9pt; color:#374151; margin-bottom:6mm;">
        <thead>
          <tr style="background: ${tf.highlightColor || "#059669"}; color:white;">
            <th style="padding:5px 8px; text-align:left;">Módulo / Conteúdo</th>
            ${showHours ? `<th style="padding:5px 8px; text-align:center; width:25mm;">Carga Horária</th>` : ""}
          </tr>
        </thead>
        <tbody>${programmaticRows}</tbody>
      </table>
    ` : ""}

    <!-- Responsáveis técnicos -->
    ${responsibles.length > 0 ? `
      <p style="${toInline({ ...buildStyle(backResponsiblesTitleF), fontSize: (backResponsiblesTitleF.fontSize || 9) + "pt", fontWeight: "bold", color: backResponsiblesTitleF.color || "#374151", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "3mm" })}">${backResponsiblesTitle}</p>
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

    ${cert.certificate_code ? `
      <div style="margin-top:auto; padding-top:6mm; width:100%;">
        <p style="font-size:8pt; color:#9ca3af;">Registro: ${cert.certificate_code}</p>
      </div>
    ` : ""}

    <!-- Rodapé verso -->
    <div style="position:absolute; bottom:8mm; width:100%; text-align:center;">
      <p style="${toInline({ ...buildStyle(backFoot1F), fontSize: (backFoot1F.fontSize || 7.5) + "pt", color: backFoot1F.color || "#9ca3af" })}">${backFoot1}</p>
      ${backFoot2 ? `<p style="${toInline({ ...buildStyle(backFoot2F), fontSize: (backFoot2F.fontSize || 7) + "pt", color: backFoot2F.color || "#9ca3af" })}">${backFoot2}</p>` : ""}
      <p style="font-size:7pt; color:#d1d5db; margin-top:2px;">Emitido em ${new Date().toLocaleDateString("pt-BR")}</p>
    </div>
  </div>
</div>

</body>
</html>`;
}

/**
 * Componente React de pré-visualização inline (iframe).
 * Escala o certificado A4 para caber no container.
 */
export default function CertificatePreview({ model, cert, scale = 0.45 }) {
  const html = buildCertificateHTMLFromModel(model, cert);

  return (
    <div
      style={{
        width: "100%",
        overflow: "hidden",
        borderRadius: 8,
        boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
        background: "#e5e7eb",
      }}
    >
      <iframe
        srcDoc={html}
        style={{
          width: `${100 / scale}%`,
          height: `${(210 * 3.7795 * 2 + 80) / scale}px`,
          border: "none",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
        title="Pré-visualização do Certificado"
      />
    </div>
  );
}