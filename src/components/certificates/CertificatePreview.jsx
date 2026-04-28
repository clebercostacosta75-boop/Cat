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

const toInline = (styleObj) =>
  Object.entries(styleObj)
    .map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${v}`)
    .join("; ");

function fmtDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
}

function addMonths(dateStr, months) {
  if (!dateStr || !months) return null;
  try {
    const d = new Date(dateStr + "T12:00:00");
    d.setMonth(d.getMonth() + parseInt(months, 10));
    return d.toISOString().split("T")[0];
  } catch {
    return null;
  }
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

  const fontFamily = tf.fontFamily || "Georgia, serif";
  const highlightColor = tf.highlightColor || "#059669";
  const textColor = tf.color || "#374151";
  const darkColor = "#111827";

  // Datas
  const today = new Date();
  const todayStr = today.toLocaleDateString("pt-BR");
  const emissaoDateStr = cert.issue_date
    ? new Date(cert.issue_date).toLocaleDateString("pt-BR")
    : todayStr;

  // Válido até: usar cert.valid_until ou calcular pela validade do modelo
  const validityMonths = m.validity_period_months || null;
  const issueDateForCalc = cert.issue_date
    ? cert.issue_date.split("T")[0]
    : today.toISOString().split("T")[0];

  let validUntilStr = "";
  if (cert.valid_until) {
    validUntilStr = fmtDate(cert.valid_until);
  } else if (validityMonths) {
    const calc = addMonths(issueDateForCalc, validityMonths);
    validUntilStr = calc ? fmtDate(calc) : "";
  }

  // Periodicidade em meses
  const periodicidadeMeses = validityMonths || (cert.valid_until && cert.start_date
    ? Math.round((new Date(cert.valid_until) - new Date(cert.start_date)) / (1000 * 60 * 60 * 24 * 30))
    : null);

  // Localidade e data
  const locDate = (m.front_location_date || "Barcarena/PA, [DATA_EMISSAO]")
    .replace("[DATA_EMISSAO]", emissaoDateStr);

  // Duração
  const duration = cert.course_duration || cert.workload_hours || "";

  // Assinatura do aluno
  const signedAtStr = cert.signed_at
    ? new Date(cert.signed_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  // Conteúdo programático e responsáveis
  const responsibles = cert.technical_responsibles || m.technical_responsibles || [];
  const programmaticContent = cert.programmatic_content || m.programmatic_content || [];
  const showHours = (cert.show_programmatic_hours !== undefined ? cert.show_programmatic_hours : m.show_programmatic_hours) !== false;

  // Código do certificado
  const certCode = cert.certificate_code || "";

  // Textos padrão
  const backHeader = m.back_header_text || "Este certificado possui registro interno para verificação de autenticidade.";
  const backModality = m.back_modality_text || (cert.course_modality ? `Modalidade: ${cert.course_modality}` : "");
  const backContentTitle = m.back_content_title || "CONTEÚDO PROGRAMÁTICO";
  const backResponsiblesTitle = m.back_responsibles_title || "AUTORIDADE E RESPONSABILIDADE TÉCNICA";
  const backFoot1 = m.back_footer_line1 || m.front_footer_line1 || "eadcatcursos.com.br";
  const backFoot2 = m.back_footer_line2 || m.front_footer_line2 || "www.catcursos.com.br";

  // Logo CAT
  const catLogoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png";

  // Linhas do parágrafo corpo (texto justificado)
  const bodyText1 = `concluiu com êxito o treinamento de <strong style="color:${highlightColor};">${cert.course_name || ""}</strong>, realizado no período de <strong>${fmtDate(cert.start_date)}</strong> a <strong>${fmtDate(cert.end_date)}</strong>, com carga horária total de <strong>${duration}</strong>, sendo considerado APTO para o desempenho seguro de suas atividades.`;

  const bodyText2 = `O treinamento foi desenvolvido em conformidade com as diretrizes normativas, atendendo aos requisitos de segurança e saúde no trabalho aplicáveis.`;

  // Tabela conteúdo programático
  const programmaticRows = programmaticContent
    .map(item => `
      <tr>
        <td style="padding:4px 8px; border-bottom:1px solid #e5e7eb; font-family:${fontFamily}; font-size:${pcf.fontSize || 8.5}pt; color:${textColor};">${item.module || ""}</td>
        ${showHours ? `<td style="padding:4px 8px; border-bottom:1px solid #e5e7eb; text-align:center; white-space:nowrap; font-family:${fontFamily}; font-size:${pcf.fontSize || 8.5}pt; color:${textColor};">${item.hours || ""}</td>` : ""}
      </tr>
    `).join("");

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
      margin: 0 auto 10mm;
    }
    .bg-layer { position: absolute; inset: 0; z-index: 1; }
    .cert-content {
      position: relative;
      z-index: 2;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 8mm 14mm 8mm 14mm;
      font-family: ${fontFamily};
      color: ${textColor};
    }
  </style>
</head>
<body>

<!-- ============================================================ -->
<!-- FRENTE DO CERTIFICADO -->
<!-- ============================================================ -->
<div class="cert-page page-break">
  <div class="bg-layer" style="${frontBg}"></div>
  <div class="cert-content">

    <!-- 1. CABEÇALHO -->
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4mm;">
      <!-- Selo 21 anos (esquerda) -->
      <div style="width:22mm; text-align:center; flex-shrink:0;">
        <div style="width:20mm; height:20mm; border-radius:50%; background:${highlightColor}; display:flex; flex-direction:column; align-items:center; justify-content:center; margin:0 auto;">
          <span style="font-size:14pt; font-weight:900; color:#fff; line-height:1;">21</span>
          <span style="font-size:5.5pt; font-weight:700; color:#fff; letter-spacing:0.5px; text-transform:uppercase; line-height:1.2;">Anos</span>
        </div>
      </div>

      <!-- Título central -->
      <div style="flex:1; text-align:center; padding:0 4mm;">
        <h1 style="font-family:${fontFamily}; font-size:28pt; font-weight:900; letter-spacing:5px; text-transform:uppercase; color:${snf.color || darkColor}; line-height:1;">
          ${m.front_title || "CERTIFICADO"}
        </h1>
        <p style="font-family:${fontFamily}; font-size:9.5pt; letter-spacing:3px; text-transform:uppercase; color:${highlightColor}; margin-top:2px;">
          ${m.front_subtitle || "CAPACITAÇÃO PROFISSIONAL"}
        </p>
      </div>

      <!-- Logo CAT (direita) -->
      <div style="width:22mm; text-align:right; flex-shrink:0;">
        <img src="${catLogoUrl}" alt="Logo CAT" style="height:18mm; width:auto; object-fit:contain; display:inline-block;"/>
      </div>
    </div>

    <!-- Linha divisória -->
    <div style="height:1.5px; background:${highlightColor}; margin-bottom:4mm; opacity:0.5;"></div>

    <!-- 2. CORPO -->
    <div style="text-align:center; margin-bottom:3mm;">
      <p style="font-family:${fontFamily}; font-size:9.5pt; color:${textColor}; letter-spacing:2px; text-transform:uppercase;">
        ${m.front_certification_label || "CERTIFICAMOS QUE"}
      </p>
    </div>

    <!-- Nome do aluno -->
    <div style="text-align:center; margin-bottom:1.5mm;">
      <span style="font-family:${snf.fontFamily || fontFamily}; font-size:${snf.fontSize || 20}pt; font-weight:bold; color:${snf.color || darkColor}; letter-spacing:${snf.letterSpacing || 0}px; border-bottom:2px solid ${highlightColor}; padding-bottom:2px; display:inline-block;">
        ${cert.student_name}
      </span>
    </div>

    <!-- CPF -->
    ${cert.student_cpf ? `<p style="font-family:${fontFamily}; font-size:8.5pt; color:#6b7280; text-align:center; margin-bottom:4mm;">CPF nº ${cert.student_cpf}</p>` : `<div style="margin-bottom:4mm;"></div>`}

    <!-- Parágrafo 1 -->
    <p style="font-family:${fontFamily}; font-size:${tf.fontSize || 10}pt; color:${textColor}; text-align:justify; line-height:${tf.lineHeight || 1.7}; margin-bottom:3mm; text-indent:6mm;">
      ${bodyText1}
    </p>

    <!-- Parágrafo 2 -->
    <p style="font-family:${fontFamily}; font-size:${tf.fontSize || 10}pt; color:${textColor}; text-align:justify; line-height:${tf.lineHeight || 1.7}; margin-bottom:4mm; text-indent:6mm;">
      ${bodyText2}
    </p>

    <!-- 3. BLOCO DE DATAS -->
    <div style="border:1.5px solid ${highlightColor}; border-radius:4px; background:rgba(5,150,105,0.05); padding:4mm 8mm; text-align:center; margin:0 auto 4mm; max-width:130mm;">
      <div style="display:flex; justify-content:center; gap:12mm; flex-wrap:wrap;">
        <div>
          <p style="font-family:${fontFamily}; font-size:7.5pt; color:#6b7280; text-transform:uppercase; letter-spacing:1px; margin-bottom:1px;">Data de Emissão</p>
          <p style="font-family:${fontFamily}; font-size:11pt; font-weight:bold; color:${darkColor};">${emissaoDateStr}</p>
        </div>
        ${validUntilStr ? `
        <div>
          <p style="font-family:${fontFamily}; font-size:7.5pt; color:#6b7280; text-transform:uppercase; letter-spacing:1px; margin-bottom:1px;">Válido até</p>
          <p style="font-family:${fontFamily}; font-size:11pt; font-weight:bold; color:${highlightColor};">${validUntilStr}</p>
        </div>` : ""}
        ${periodicidadeMeses ? `
        <div>
          <p style="font-family:${fontFamily}; font-size:7.5pt; color:#6b7280; text-transform:uppercase; letter-spacing:1px; margin-bottom:1px;">Periodicidade de Atualização</p>
          <p style="font-family:${fontFamily}; font-size:11pt; font-weight:bold; color:${darkColor};">${periodicidadeMeses} meses</p>
        </div>` : ""}
      </div>
    </div>

    <!-- 4. LOCALIDADE -->
    <p style="font-family:${fontFamily}; font-size:9pt; color:${textColor}; text-align:center; margin-bottom:4mm;">
      ${locDate}
    </p>

    <!-- 5. ASSINATURA DIGITAL DO ALUNO -->
    <div style="border-top:1px solid #d1d5db; padding-top:4mm; text-align:center;">
      ${cert.signature_url
        ? `<img src="${cert.signature_url}" style="height:28px; object-fit:contain; display:block; margin:0 auto 3px;" alt="Assinatura do Aluno"/>`
        : `<div style="height:28px;"></div>`}
      <p style="font-family:${fontFamily}; font-size:9pt; font-weight:bold; color:${darkColor};">${cert.student_name}</p>
      <p style="font-family:${fontFamily}; font-size:7.5pt; color:#6b7280; margin-top:1px;">${m.front_signature_label || "Assinatura do Treinando"}</p>
      ${signedAtStr ? `<p style="font-family:${fontFamily}; font-size:7pt; color:#9ca3af; margin-top:1px;">Assinado digitalmente em: ${signedAtStr}</p>` : ""}
    </div>

    <!-- 6. RODAPÉ DA FRENTE -->
    <div style="margin-top:auto; padding-top:3mm; text-align:center; border-top:1px solid #e5e7eb;">
      ${certCode ? `<p style="font-family:${fontFamily}; font-size:7.5pt; color:#9ca3af;">${certCode}</p>` : ""}
      <p style="font-family:${fontFamily}; font-size:7pt; color:#9ca3af;">${m.front_footer_line2 || "www.catcursos.com.br"}</p>
    </div>

  </div>
</div>

<!-- ============================================================ -->
<!-- VERSO DO CERTIFICADO -->
<!-- ============================================================ -->
<div class="cert-page">
  <div class="bg-layer" style="${backBg}"></div>
  <div class="cert-content" style="font-family:${fontFamily};">

    <!-- 1. CABEÇALHO DO VERSO: logo CAT (esq) + logo DETRAN (dir) -->
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4mm; padding-bottom:3mm; border-bottom:1.5px solid ${highlightColor}; opacity:0.9;">
      <img src="${catLogoUrl}" alt="Logo CAT" style="height:14mm; width:auto; object-fit:contain;"/>
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/LogoDetran.png" 
           onerror="this.style.display='none'"
           alt="DETRAN-PA" style="height:14mm; width:auto; object-fit:contain;"/>
    </div>

    <!-- 2. INFORMAÇÕES DE AUTENTICIDADE -->
    <p style="font-family:${fontFamily}; font-size:8pt; color:#6b7280; margin-bottom:2mm;">${backHeader}</p>
    ${backModality ? `<p style="font-family:${fontFamily}; font-size:8pt; color:#6b7280; margin-bottom:3mm;">${backModality}</p>` : ""}

    <!-- 3. NOME DO TREINAMENTO -->
    <p style="font-family:${fontFamily}; font-size:12pt; font-weight:bold; color:${highlightColor}; margin-bottom:4mm; text-transform:uppercase;">
      ${cert.course_name}
    </p>

    <!-- 4. CONTEÚDO PROGRAMÁTICO -->
    ${programmaticContent.length > 0 ? `
      <p style="font-family:${fontFamily}; font-size:8.5pt; font-weight:bold; color:${textColor}; text-transform:uppercase; letter-spacing:1px; margin-bottom:2mm;">${backContentTitle}</p>
      <table style="width:100%; border-collapse:collapse; font-size:8.5pt; color:${textColor}; margin-bottom:10mm;">
        <thead>
          <tr style="background:${highlightColor}; color:#fff;">
            <th style="padding:4px 8px; text-align:left; font-weight:600;">Módulo / Conteúdo</th>
            ${showHours ? `<th style="padding:4px 8px; text-align:center; width:22mm; font-weight:600;">Carga Horária</th>` : ""}
          </tr>
        </thead>
        <tbody>${programmaticRows}</tbody>
      </table>
    ` : `<div style="margin-bottom:10mm;"></div>`}

    <!-- 5. ESPAÇAMENTO + 6. AUTORIDADE E RESPONSABILIDADE TÉCNICA -->
    <div style="margin-top:10mm;">
      <p style="font-family:${fontFamily}; font-size:8.5pt; font-weight:bold; color:${textColor}; text-transform:uppercase; letter-spacing:1px; margin-bottom:3mm; padding-bottom:2mm; border-bottom:1.5px solid #d1d5db;">
        ${backResponsiblesTitle}
      </p>
      <div style="display:flex; justify-content:space-around; width:100%; gap:4mm;">
        ${responsibles.length > 0 ? responsibles.map(r => `
          <div style="text-align:center; flex:1; min-width:50mm; max-width:80mm;">
            ${r.signature_url ? `<img src="${r.signature_url}" style="height:28px; object-fit:contain; display:block; margin:0 auto 3px;" alt="Assinatura ${r.name}"/>` : `<div style="height:28px;"></div>`}
            <div style="border-top:1.5px solid #374151; padding-top:4px;">
              <p style="font-size:8.5pt; font-weight:bold; color:${darkColor};">${r.name || ""}</p>
              ${(r.titles || [r.title]).filter(Boolean).map(t => `<p style="font-size:7.5pt; color:#6b7280;">${t}</p>`).join("")}
              ${r.registration ? `<p style="font-size:7pt; color:#9ca3af;">${r.registration}</p>` : ""}
            </div>
          </div>
        `).join("") : `
          <!-- Responsáveis padrão (fallback) -->
          <div style="text-align:center; flex:1; min-width:50mm;">
            <div style="height:28px;"></div>
            <div style="border-top:1.5px solid #374151; padding-top:4px;">
              <p style="font-size:8pt; font-weight:bold; color:${darkColor};">MILTON PINHEIRO DE ALMEIDA PINTO</p>
              <p style="font-size:7.5pt; color:#6b7280;">Eng. Segurança no Trabalho</p>
              <p style="font-size:7pt; color:#9ca3af;">CREA/PA 21237 D/PA</p>
            </div>
          </div>
          <div style="text-align:center; flex:1; min-width:50mm;">
            <div style="height:28px;"></div>
            <div style="border-top:1.5px solid #374151; padding-top:4px;">
              <p style="font-size:8pt; font-weight:bold; color:${darkColor};">CLEBER CORREA DA COSTA</p>
              <p style="font-size:7.5pt; color:#6b7280;">Téc. Segurança do Trabalho/Pedagogo</p>
              <p style="font-size:7pt; color:#9ca3af;">MEC: 428/2013 · BRIGIN 266574</p>
            </div>
          </div>
          <div style="text-align:center; flex:1; min-width:50mm;">
            <div style="height:28px;"></div>
            <div style="border-top:1.5px solid #374151; padding-top:4px;">
              <p style="font-size:8pt; font-weight:bold; color:${darkColor};">VIVIANE SOUZA NUNES</p>
              <p style="font-size:7.5pt; color:#6b7280;">Bacharel Adm. Ciências Contábeis</p>
              <p style="font-size:7pt; color:#9ca3af;">Nº 134/19</p>
            </div>
          </div>
        `}
      </div>
    </div>

    <!-- 7. RODAPÉ DO VERSO -->
    <div style="margin-top:auto; padding-top:3mm; border-top:1px solid #e5e7eb;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:2mm;">
        <p style="font-family:${fontFamily}; font-size:7pt; color:#9ca3af;">${certCode ? `Registro: ${certCode}` : ""}</p>
        <p style="font-family:${fontFamily}; font-size:7pt; color:#9ca3af;">${backFoot1} · ${backFoot2}</p>
        <p style="font-family:${fontFamily}; font-size:7pt; color:#9ca3af;">Emitido em: ${emissaoDateStr}</p>
      </div>
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