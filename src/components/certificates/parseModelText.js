// Parser do "Preencher modelo com texto" (SPR-003D)
const normalize = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export default function parseModelText(text) {
  const out = { programmatic_content: [], technical_responsibles: [] };
  let section = null;

  for (const raw of (text || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const m = line.match(/^([^:]{2,40}):\s*(.*)$/);
    if (m) {
      const key = normalize(m[1]);
      const val = m[2].trim();
      // Só é tratado como campo se a chave for reconhecida — linhas com ":" dentro do
      // conteúdo programático (ex: "Módulo 1: Introdução - 2h") continuam na seção atual.
      const isKnownKey =
        key === "curso" || key.startsWith("carga hor") || key === "modalidade" ||
        key === "validade" || key === "periodicidade" ||
        key.startsWith("conteudo program") || key.startsWith("responsav");
      if (isKnownKey) {
        section = null;
        if (key === "curso") out.name = val;
        else if (key.startsWith("carga hor")) {
          const h = val.match(/(\d{1,3})/);
          out.duration = h ? `${h[1]}h` : val;
        } else if (key === "modalidade") out.modality = val;
        else if (key === "validade" || key === "periodicidade") {
          const v = val.match(/(\d{1,3})/);
          if (v && (key === "validade" || out.validity_period_months == null)) {
            out.validity_period_months = +v[1];
          }
        } else if (key.startsWith("conteudo program")) section = "conteudo";
        else if (key.startsWith("responsav")) {
          section = "resp";
          if (val) out.technical_responsibles.push({ name: val, title: "", registration: "" });
        }
        continue;
      }
    }

    if (section === "conteudo") {
      const item = line.replace(/^[-•*]\s*/, "");
      const h = item.match(/[–—-]\s*(\d{1,3})\s*h(?:oras)?\s*$/i);
      out.programmatic_content.push({
        module: h ? item.slice(0, item.length - h[0].length).trim() : item,
        hours: h ? `${h[1]}h` : "",
      });
    } else if (section === "resp") {
      out.technical_responsibles.push({ name: line.replace(/^[-•*]\s*/, ""), title: "", registration: "" });
    }
  }
  return out;
}