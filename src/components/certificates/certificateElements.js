/**
 * certificateElements — MOTOR ÚNICO de renderização de certificados baseado em elementos.
 * Fonte única de verdade: editor_canvas_data (CertificateModel).
 * Usado por: CanvasEditor (edição), CertificatePreview (preview),
 * CertificateExporter / CertificateDownloader / BulkCertificateExporter (emissão/PDF).
 */

export const MM_TO_PX = 3.7795;
export const CANVAS_W = Math.round(297 * MM_TO_PX); // 1123
export const CANVAS_H = Math.round(210 * MM_TO_PX); // 794

export const SAMPLE_CERT = {
  student_name: "JOÃO DA SILVA SANTOS",
  student_cpf: "123.456.789-00",
  course_name: "NR-35 – Trabalho em Altura",
  course_duration: "8h",
  course_modality: "Presencial",
  start_date: "2025-03-10",
  end_date: "2025-03-10",
  valid_until: "2026-03-10",
  client_name: "EMPRESA EXEMPLO S/A",
  instructor_name: "Carlos Eduardo Lima",
  certificate_code: "CAT-2025-XXXXXXXX",
  internal_control_code: "CTRL-XXXX-XXXXXX",
};

function fmtDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
}

function addMonthsStr(dateStr, months) {
  if (!dateStr || !months) return null;
  try {
    const d = new Date(dateStr + "T12:00:00");
    d.setMonth(d.getMonth() + parseInt(months, 10));
    return d.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

/**
 * Monta o contexto de dados dinâmicos do certificado (variáveis + listas).
 */
export function buildCertContext(model, certData) {
  const cert = certData || {};
  const m = model || {};
  const today = new Date();
  const emissaoDateStr = cert.issue_date
    ? new Date(cert.issue_date).toLocaleDateString("pt-BR")
    : today.toLocaleDateString("pt-BR");

  const validityMonths = m.validity_period_months || null;
  let validUntilStr = "";
  if (cert.valid_until) {
    validUntilStr = fmtDate(cert.valid_until);
  } else if (validityMonths) {
    const issueDateForCalc = cert.issue_date
      ? cert.issue_date.split("T")[0]
      : today.toISOString().split("T")[0];
    const calc = addMonthsStr(issueDateForCalc, validityMonths);
    validUntilStr = calc ? fmtDate(calc) : "";
  }

  const certCode = cert.certificate_code || "";
  const validationUrl = certCode
    ? `${typeof window !== "undefined" ? window.location.origin : "https://catcursos.com.br"}/CertificateValidate?code=${encodeURIComponent(certCode)}`
    : "https://catcursos.com.br/validar";

  const locDate = (m.front_location_date || "Barcarena/PA, [DATA_EMISSAO]").replace("[DATA_EMISSAO]", emissaoDateStr);

  return {
    vars: {
      ALUNO: cert.student_name || "",
      CPF: cert.student_cpf || "",
      CURSO: cert.course_name || m.name || "",
      CARGA: cert.course_duration || cert.workload_hours || m.duration || "",
      EMPRESA: cert.client_name || cert.company_name || "",
      INSTRUTOR: cert.instructor_name || "",
      DATA_INICIO: fmtDate(cert.start_date),
      DATA_FIM: fmtDate(cert.end_date),
      DATA_EMISSAO: emissaoDateStr,
      VALIDADE: validUntilStr,
      CODIGO: certCode,
      CODIGO_INTERNO: cert.internal_control_code || "",
      LOCAL: locDate,
      MODALIDADE: cert.course_modality || m.modality || "",
    },
    qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(validationUrl)}&format=svg&margin=2`,
    programmaticContent: cert.programmatic_content?.length ? cert.programmatic_content : (m.programmatic_content || []),
    responsibles: cert.technical_responsibles?.length ? cert.technical_responsibles : (m.technical_responsibles || []),
    showHours: (cert.show_programmatic_hours !== undefined ? cert.show_programmatic_hours : m.show_programmatic_hours) !== false,
    highlightColor: (m.text_formatting || {}).highlightColor || "#059669",
    studentSignatureUrl: cert.signature_url || "",
    signedAtStr: cert.signed_at
      ? new Date(cert.signed_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : "",
  };
}

/** Substitui variáveis [CHAVE] no texto do elemento. */
export function substituteVars(text, ctx) {
  if (!text || !ctx) return text || "";
  return text.replace(/\[([A-Z_]+)\]/g, (match, key) =>
    ctx.vars[key] !== undefined ? ctx.vars[key] : match
  );
}

/** Texto efetivo de um elemento — ids conhecidos são sempre dinâmicos. */
export function resolveElementText(el, ctx) {
  if (!ctx) return el.text || "";
  if (el.id === "student_name") return ctx.vars.ALUNO || el.text || "";
  if (el.id === "back_course_name") return ctx.vars.CURSO || el.text || "";
  return substituteVars(el.text, ctx);
}

// ─── Layout padrão FRENTE (compatibilidade com modelos sem editor_canvas_data) ───
export const DEFAULT_FRONT = (model) => {
  const hl = model?.text_formatting?.highlightColor || "#059669";
  const dark = "#222222";
  const font = "Arial, sans-serif";
  return [
    { id: "title", type: "text", label: "Título", x: 200, y: 30, w: 720, h: 60, text: model?.front_title || "CERTIFICADO", fontSize: 36, bold: true, italic: false, underline: false, color: dark, align: "center", fontFamily: font, locked: false, visible: true, zIndex: 10 },
    { id: "subtitle", type: "text", label: "Subtítulo", x: 200, y: 90, w: 720, h: 36, text: model?.front_subtitle || "CAPACITAÇÃO PROFISSIONAL", fontSize: 14, bold: false, italic: false, underline: false, color: hl, align: "center", fontFamily: font, locked: false, visible: true, zIndex: 11 },
    { id: "cert_label", type: "text", label: "Certificamos que", x: 200, y: 160, w: 720, h: 28, text: model?.front_certification_label || "CERTIFICAMOS QUE", fontSize: 11, bold: false, italic: false, underline: false, color: dark, align: "center", fontFamily: font, locked: false, visible: true, zIndex: 12 },
    { id: "student_name", type: "text", label: "Nome do Aluno", x: 100, y: 200, w: 920, h: 50, text: "[ALUNO]", fontSize: 26, bold: true, italic: false, underline: true, color: dark, align: "center", fontFamily: font, locked: false, visible: true, zIndex: 13 },
    { id: "student_cpf", type: "text", label: "CPF", x: 200, y: 252, w: 720, h: 24, text: "CPF nº [CPF]", fontSize: 11, bold: false, italic: false, underline: false, color: dark, align: "center", fontFamily: font, locked: false, visible: true, zIndex: 13 },
    { id: "body_text", type: "text", label: "Texto do Corpo", x: 100, y: 290, w: 920, h: 130, text: model?.front_body_text || "concluiu com êxito o treinamento de [CURSO], realizado no período de [DATA_INICIO] a [DATA_FIM], com carga horária total de [CARGA], sendo considerado APTO para o desempenho seguro de suas atividades.\n\nO treinamento foi desenvolvido em conformidade com as diretrizes normativas, atendendo aos requisitos de segurança e saúde no trabalho aplicáveis.", fontSize: 11, bold: false, italic: false, underline: false, color: dark, align: "justify", fontFamily: font, locked: false, visible: true, zIndex: 14 },
    { id: "dates_block", type: "text", label: "Datas", x: 300, y: 440, w: 520, h: 50, text: "Data de Emissão: [DATA_EMISSAO]    ·    Válido até: [VALIDADE]", fontSize: 11, bold: true, italic: false, underline: false, color: dark, align: "center", fontFamily: font, locked: false, visible: true, zIndex: 15 },
    { id: "location_date", type: "text", label: "Local e Data", x: 200, y: 500, w: 720, h: 28, text: "[LOCAL]", fontSize: 11, bold: false, italic: false, underline: false, color: dark, align: "center", fontFamily: font, locked: false, visible: true, zIndex: 15 },
    { id: "student_signature", type: "signature", label: "Assinatura do Aluno", x: 380, y: 560, w: 360, h: 90, text: (model?.front_signature_label || "Assinatura do Treinando"), src: "", locked: false, visible: true, zIndex: 16 },
    { id: "cert_code", type: "text", label: "Código do Certificado", x: 20, y: 716, w: 400, h: 20, text: "[CODIGO]  ·  [CODIGO_INTERNO]", fontSize: 8, bold: true, italic: false, underline: false, color: "#9ca3af", align: "left", fontFamily: font, locked: false, visible: true, zIndex: 16 },
    { id: "footer_url", type: "text", label: "Rodapé", x: 20, y: 740, w: 400, h: 24, text: model?.front_footer_line2 || "www.catcursos.com.br", fontSize: 8, bold: false, italic: false, underline: false, color: "#9ca3af", align: "left", fontFamily: font, locked: false, visible: true, zIndex: 16 },
    { id: "qrcode", type: "qrcode", label: "QR Code", x: 1010, y: 710, w: 80, h: 80, locked: false, visible: true, zIndex: 9 },
  ];
};

// ─── Layout padrão VERSO ───
export const DEFAULT_BACK = (model) => {
  const hl = model?.text_formatting?.highlightColor || "#059669";
  const dark = "#222222";
  const font = "Arial, sans-serif";
  return [
    { id: "back_header", type: "text", label: "Cabeçalho do Verso", x: 50, y: 30, w: 1020, h: 36, text: model?.back_header_text || "Este certificado possui registro interno para verificação de autenticidade.", fontSize: 9, bold: false, italic: false, underline: false, color: "#6b7280", align: "justify", fontFamily: font, locked: false, visible: true, zIndex: 10 },
    { id: "back_course_name", type: "text", label: "Nome do Curso", x: 50, y: 80, w: 1020, h: 32, text: "[CURSO]", fontSize: 12, bold: true, italic: false, underline: false, color: hl, align: "center", fontFamily: font, locked: false, visible: true, zIndex: 11 },
    { id: "back_content_title", type: "text", label: "Título Conteúdo", x: 50, y: 120, w: 500, h: 28, text: model?.back_content_title || "CONTEÚDO PROGRAMÁTICO", fontSize: 10, bold: true, italic: false, underline: false, color: dark, align: "left", fontFamily: font, locked: false, visible: true, zIndex: 12 },
    { id: "back_programmatic", type: "programmatic", label: "Conteúdo Programático", x: 50, y: 152, w: 1020, h: 280, locked: false, visible: true, zIndex: 12 },
    { id: "back_responsibles_title", type: "text", label: "Título Responsáveis", x: 50, y: 460, w: 1020, h: 28, text: model?.back_responsibles_title || "AUTORIDADE E RESPONSABILIDADE TÉCNICA", fontSize: 10, bold: true, italic: false, underline: false, color: dark, align: "left", fontFamily: font, locked: false, visible: true, zIndex: 13 },
    { id: "back_responsibles", type: "responsibles", label: "Responsáveis Técnicos", x: 50, y: 495, w: 1020, h: 150, locked: false, visible: true, zIndex: 13 },
    { id: "back_footer", type: "text", label: "Rodapé Verso", x: 50, y: 730, w: 700, h: 40, text: "Registro: [CODIGO]  ·  Controle: [CODIGO_INTERNO]\n" + (model?.back_footer_line1 || "eadcatcursos.com.br") + " · " + (model?.back_footer_line2 || "www.catcursos.com.br") + "  ·  Emitido em: [DATA_EMISSAO]", fontSize: 8, bold: false, italic: false, underline: false, color: "#9ca3af", align: "left", fontFamily: font, locked: false, visible: true, zIndex: 14 },
    { id: "back_qrcode", type: "qrcode", label: "QR Code Verso", x: 1010, y: 710, w: 80, h: 80, locked: false, visible: true, zIndex: 9 },
  ];
};

/** Elementos de uma página: usa layout salvo ou padrão. */
export function getPageElements(model, page) {
  const saved = model?.editor_canvas_data?.[page];
  if (saved?.length > 0) return saved;
  return page === "front" ? DEFAULT_FRONT(model) : DEFAULT_BACK(model);
}

/** O modelo possui layout do Editor Visual salvo? */
export function hasCanvasLayout(model) {
  return !!(model?.editor_canvas_data?.front?.length || model?.editor_canvas_data?.back?.length);
}

// ─── Fragmentos HTML compartilhados (usados no HTML de emissão e no editor) ───

export function programmaticInnerHTML(ctx) {
  const font = "Arial, sans-serif";
  const rows = (ctx.programmaticContent || [])
    .map(item => `
      <tr>
        <td style="padding:4px 8px; border-bottom:1px solid #e5e7eb; font-family:${font}; font-size:12px; color:#222; line-height:1.5;">${item.module || ""}</td>
        ${ctx.showHours ? `<td style="padding:4px 8px; border-bottom:1px solid #e5e7eb; text-align:center; white-space:nowrap; font-family:${font}; font-size:12px; color:#222; line-height:1.5;">${item.hours || ""}</td>` : ""}
      </tr>`).join("");
  if (!rows) return `<div style="font-family:${font}; font-size:11px; color:#9ca3af; padding:8px;">— Sem conteúdo programático cadastrado —</div>`;
  return `<table style="width:100%; border-collapse:collapse;">
    <thead>
      <tr style="background:${ctx.highlightColor}; color:#fff;">
        <th style="padding:4px 8px; text-align:left; font-family:${font}; font-size:12px; font-weight:bold; line-height:1.5;">Módulo / Conteúdo</th>
        ${ctx.showHours ? `<th style="padding:4px 8px; text-align:center; width:90px; font-family:${font}; font-size:12px; font-weight:bold; line-height:1.5;">Carga Horária</th>` : ""}
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export function responsiblesInnerHTML(ctx) {
  const font = "Arial, sans-serif";
  const list = ctx.responsibles || [];
  if (list.length === 0) return `<div style="font-family:${font}; font-size:11px; color:#9ca3af; padding:8px;">— Sem responsáveis técnicos cadastrados —</div>`;
  return `<div style="display:flex; justify-content:space-around; width:100%; gap:16px;">
    ${list.map(r => `
      <div style="text-align:center; flex:1; min-width:150px; max-width:320px;">
        ${r.signature_url ? `<img src="${r.signature_url}" style="height:28px; object-fit:contain; display:block; margin:0 auto 3px;" alt="Assinatura ${r.name || ""}"/>` : `<div style="height:28px;"></div>`}
        <div style="border-top:1.5px solid #374151; padding-top:4px;">
          <p style="font-family:${font}; font-size:12px; font-weight:bold; color:#222; line-height:1.5; margin:0;">${r.name || ""}</p>
          ${(r.titles || [r.title]).filter(Boolean).map(t => `<p style="font-family:${font}; font-size:11px; font-weight:bold; color:#6b7280; line-height:1.5; margin:0;">${t}</p>`).join("")}
          ${r.registration ? `<p style="font-family:${font}; font-size:11px; font-weight:bold; color:#9ca3af; line-height:1.5; margin:0;">${r.registration}</p>` : ""}
        </div>
      </div>`).join("")}
  </div>`;
}

// ─── Renderização de um elemento → HTML ───
function elementToHTML(el, ctx) {
  if (el.visible === false) return "";
  const base = `position:absolute; left:${el.x}px; top:${el.y}px; width:${el.w}px; height:${el.h}px; z-index:${el.zIndex || 10}; box-sizing:border-box; overflow:hidden;`;

  if (el.type === "text") {
    const text = resolveElementText(el, ctx);
    const style = `${base} font-family:${el.fontFamily || "Arial, sans-serif"}; font-size:${el.fontSize || 12}px; font-weight:${el.bold ? "bold" : "normal"}; font-style:${el.italic ? "italic" : "normal"}; text-decoration:${el.underline ? "underline" : "none"}; color:${el.color || "#222"}; text-align:${el.align || "left"}; line-height:1.4; white-space:pre-wrap; padding:2px;`;
    return `<div style="${style}">${text}</div>`;
  }
  if (el.type === "image") {
    if (!el.src) return "";
    return `<div style="${base}"><img src="${el.src}" alt="${el.label || ""}" style="width:100%; height:100%; object-fit:contain;"/></div>`;
  }
  if (el.type === "qrcode") {
    return `<div style="${base} text-align:center;"><img src="${ctx.qrUrl}" alt="QR Code" style="width:100%; height:calc(100% - 10px); object-fit:contain;"/><p style="font-family:Arial,sans-serif; font-size:7px; color:#9ca3af; margin:0;">Validar autenticidade</p></div>`;
  }
  if (el.type === "signature") {
    const src = el.id === "student_signature" ? (ctx.studentSignatureUrl || el.src) : el.src;
    const label = substituteVars(el.text, ctx) || "Assinatura";
    const nameLine = el.id === "student_signature" ? ctx.vars.ALUNO : "";
    const signedLine = el.id === "student_signature" && ctx.signedAtStr ? `<p style="font-family:Arial,sans-serif; font-size:9px; color:#9ca3af; margin:1px 0 0;">Assinado digitalmente em: ${ctx.signedAtStr}</p>` : "";
    return `<div style="${base} display:flex; flex-direction:column; align-items:center; justify-content:flex-end;">
      ${src ? `<img src="${src}" alt="Assinatura" style="max-height:50%; object-fit:contain;"/>` : ""}
      <div style="border-top:1.5px solid #374151; width:100%; padding-top:2px; text-align:center;">
        ${nameLine ? `<p style="font-family:Arial,sans-serif; font-size:11px; font-weight:bold; color:#222; margin:0;">${nameLine}</p>` : ""}
        <span style="font-family:Arial,sans-serif; font-size:10px; color:#374151;">${label}</span>
        ${signedLine}
      </div>
    </div>`;
  }
  if (el.type === "programmatic") {
    return `<div style="${base}">${programmaticInnerHTML(ctx)}</div>`;
  }
  if (el.type === "responsibles") {
    return `<div style="${base} display:flex; align-items:flex-start;">${responsiblesInnerHTML(ctx)}</div>`;
  }
  return "";
}

function pageHTML(elements, bgUrl, ctx, extraClass) {
  const sorted = [...(elements || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  const bg = bgUrl
    ? `background-image:url('${bgUrl}'); background-size:cover; background-position:center;`
    : "background:#ffffff;";
  return `<div class="cert-page${extraClass ? " " + extraClass : ""}" style="${bg}">
    ${sorted.map(el => elementToHTML(el, ctx)).join("\n")}
  </div>`;
}

/**
 * HTML completo (frente + verso) a partir dos elementos do Editor Visual.
 * Mantém as classes .cert-page / .page-break usadas pelo download em PDF.
 */
export function buildCertificateHTMLFromElements(model, certData) {
  const m = model || {};
  const cert = { ...SAMPLE_CERT, ...certData };
  const ctx = buildCertContext(m, cert);
  const front = getPageElements(m, "front");
  const back = getPageElements(m, "back");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Certificado - ${cert.student_name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { background: #f3f4f6; font-family: Arial, sans-serif; }
    @media print {
      @page { size: ${(m.page_width || 297) === 297 && (m.page_height || 210) === 210 ? "A4 landscape" : `${m.page_width || 297}mm ${m.page_height || 210}mm`}; margin: 0; }
      body { background: white; }
      .page-break { page-break-after: always; }
    }
    .cert-page {
      width: ${CANVAS_W}px;
      height: ${CANVAS_H}px;
      position: relative;
      overflow: hidden;
      margin: 0 auto 24px;
    }
  </style>
</head>
<body>
${pageHTML(front, m.front_background_url, ctx, "page-break")}
${pageHTML(back, m.back_background_url, ctx, "")}
</body>
</html>`;
}