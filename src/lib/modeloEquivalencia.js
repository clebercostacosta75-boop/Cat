/**
 * Equivalência de tipo de treinamento para busca de modelo no Designer de Certificados.
 * Regra de negócio: "ATUALIZAÇÃO" (planilha) ≡ "PERIÓDICO" (modelo) — somente o TIPO é equivalente.
 * A correspondência exige simultaneamente: mesma NR, mesma função/público/equipamento,
 * mesma carga horária, modalidade compatível e modelo oficial completo.
 * Retorna vínculo apenas quando existe EXATAMENTE UM modelo compatível.
 */

const ABREV = { esp: "espacos", conf: "confinados", plat: "plataforma" };
const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "em", "na", "no", "nas", "nos", "para", "com",
  "tipo", "curso", "treinamento", "seguranca", "saude", "trabalho", "trabalhos",
  "operacao", "operador", "operadores", "entrada",
]);
const ROLE_SUPERVISOR = new Set(["supervisor", "supervisores"]);
const ROLE_TRABALHADOR = new Set(["vigia", "trabalhador", "trabalhadores", "autorizado"]);

export function normalizarNomeCurso(v) {
  return (v || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—-]/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function analisar(nome) {
  const texto = normalizarNomeCurso(nome).replace(/^(treinamento|curso)\s+(de|do|da)\s+/, "");
  const nrMatch = texto.match(/nr\s*(\d+)/);
  const nr = nrMatch ? parseInt(nrMatch[1], 10) : null;
  let tipo = null;
  let temSupervisor = false;
  const assunto = new Set();
  for (let tok of texto.replace(/nr\s*\d+/g, "").split(" ")) {
    if (!tok || /^\d+h?$/.test(tok)) continue;
    tok = ABREV[tok] || tok;
    if (/^(atualiza|period)/.test(tok)) { tipo = "atualizacao"; continue; }
    if (/^(forma|inicial)/.test(tok)) { tipo = "formacao"; continue; }
    if (/^recicl/.test(tok)) { tipo = "reciclagem"; continue; }
    if (ROLE_SUPERVISOR.has(tok)) { temSupervisor = true; continue; }
    if (ROLE_TRABALHADOR.has(tok)) continue; // não bloqueia — supervisor é o token restritivo
    if (STOPWORDS.has(tok)) continue;
    assunto.add(tok);
  }
  return { nr, tipo, temSupervisor, assunto };
}

function parseCarga(v) {
  const m = String(v || "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function modeloCompleto(m) {
  return !!(m && m.name && m.validity_period_months &&
    (m.programmatic_content || []).length > 0 &&
    (m.technical_responsibles || []).length > 0 &&
    m.front_background_url);
}

/**
 * Busca o modelo equivalente. Retorna { modelo, candidatos, motivo }.
 * modelo != null somente quando há exatamente 1 compatível.
 */
export function buscarModeloEquivalente(nomeCurso, cargaHoraria, certModels = [], modalidade = null) {
  const q = analisar(nomeCurso);
  const carga = parseCarga(cargaHoraria);
  if (!q.tipo || q.assunto.size === 0) {
    return { modelo: null, candidatos: [], motivo: "Nome sem tipo de treinamento ou assunto identificável" };
  }
  const candidatos = certModels.filter((m) => {
    if (!modeloCompleto(m)) return false;
    const t = analisar(m.name);
    if (q.nr !== null && t.nr !== q.nr) return false;           // mesma NR obrigatória
    if (q.nr === null && t.nr !== null) return false;
    if (t.tipo !== q.tipo) return false;                        // atualização ≡ periódico (mesmo tipo normalizado)
    if (t.temSupervisor !== q.temSupervisor) return false;      // nunca trocar Supervisor ↔ Trabalhador/Vigia
    if (carga !== null && parseCarga(m.duration) !== carga) return false; // mesma carga horária
    if (modalidade && m.modality && normalizarNomeCurso(m.modality) !== normalizarNomeCurso(modalidade)) return false;
    for (const tok of q.assunto) if (!t.assunto.has(tok)) return false;  // mesmo público/equipamento
    return true;
  });
  if (candidatos.length === 1) return { modelo: candidatos[0], candidatos, motivo: null };
  return {
    modelo: null,
    candidatos,
    motivo: candidatos.length === 0
      ? "Nenhum modelo oficial compatível (NR + função/público + carga + tipo) no Designer"
      : `Ambiguidade: ${candidatos.length} modelos compatíveis — confirmação manual necessária`,
  };
}