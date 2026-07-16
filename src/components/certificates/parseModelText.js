// Parser do "Preencher modelo com texto" (SPR-003D)
const normalize = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// Remove marcadores de lista/numeração do início da linha
const stripBullet = (s) => s.replace(/^[-•*–—]\s*/, "").replace(/^\d{1,2}[.)]\s*/, "").trim();

// Extrai horas do final do item: "- 2h", "– 2 horas", "(4h)", "4h"
const extractHours = (item) => {
  const h = item.match(/(?:[–—-]\s*|\(\s*)?(\d{1,3})\s*h(?:s|oras)?\s*\)?\s*[.;]?\s*$/i);
  if (!h) return { module: item.trim(), hours: "" };
  return { module: item.slice(0, item.length - h[0].length).trim(), hours: `${h[1]}h` };
};

export default function parseModelText(text) {
  const out = { programmatic_content: [], technical_responsibles: [] };
  let section = null;

  for (const raw of (text || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const norm = normalize(line).replace(/:\s*$/, "");

    // Cabeçalhos de seção — com ou sem dois-pontos, com variações
    // (CONTEÚDO PROGRAMÁTICO, CONTEÚDO TEÓRICO – 4H, CONTEÚDO PRÁTICO, PROGRAMA, MÓDULOS...)
    if (/^(conteudo|programa|modulos?)\b/.test(norm) && !line.includes(":")) {
      section = "conteudo";
      // Cabeçalho com complemento (ex: "CONTEÚDO TEÓRICO – 4H") também entra como módulo
      if (!/^(conteudo(\s+programatico)?(\s+do\s+curso)?|programa(\s+do\s+curso)?|modulos?)$/.test(norm)) {
        out.programmatic_content.push(extractHours(line));
      }
      continue;
    }
    if (/^responsav\w*(\s+tecnic\w*)?$/.test(norm)) {
      section = "resp";
      continue;
    }

    // Campos chave: valor
    const m = line.match(/^([^:]{2,40}):\s*(.*)$/);
    if (m) {
      const key = normalize(m[1]);
      const val = m[2].trim();
      const isKnownKey =
        key === "curso" || key === "treinamento" || key.startsWith("carga hor") ||
        key === "modalidade" || key === "validade" || key === "periodicidade" ||
        key.startsWith("conteudo") || key.startsWith("programa") || key.startsWith("responsav");
      if (isKnownKey) {
        section = null;
        if (key === "curso" || key === "treinamento") out.name = val;
        else if (key.startsWith("carga hor")) {
          const h = val.match(/(\d{1,3})/);
          out.duration = h ? `${h[1]}h` : val;
        } else if (key === "modalidade") out.modality = val;
        else if (key === "validade" || key === "periodicidade") {
          const v = val.match(/(\d{1,3})/);
          if (v && (key === "validade" || out.validity_period_months == null)) {
            out.validity_period_months = +v[1];
          }
        } else if (key.startsWith("conteudo") || key.startsWith("programa")) {
          section = "conteudo";
          // Itens na mesma linha do título, separados por ";"
          for (const part of val.split(";").map(p => p.trim()).filter(Boolean)) {
            out.programmatic_content.push(extractHours(stripBullet(part)));
          }
        } else if (key.startsWith("responsav")) {
          section = "resp";
          if (val) out.technical_responsibles.push({ name: val, title: "", registration: "" });
        }
        continue;
      }
    }

    // Linhas dentro das seções
    if (section === "conteudo") {
      const item = stripBullet(line);
      if (item) out.programmatic_content.push(extractHours(item));
    } else if (section === "resp") {
      out.technical_responsibles.push({ name: stripBullet(line), title: "", registration: "" });
    }
  }
  return out;
}