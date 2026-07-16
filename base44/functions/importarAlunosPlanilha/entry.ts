import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import * as XLSX from 'npm:xlsx@0.18.5';

// ─── Helpers básicos (preservados da versão homologada) ─────────────────────
const norm = (s) => (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
const digits = (s) => (s || "").toString().replace(/\D/g, "");

function validCpf(cpf) {
  const c = digits(cpf);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +c[i] * (10 - i);
  let r = (s * 10) % 11; if (r === 10) r = 0;
  if (r !== +c[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +c[i] * (11 - i);
  r = (s * 10) % 11; if (r === 10) r = 0;
  return r === +c[10];
}

function fmtCpf(c) {
  const d = digits(c);
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : (c || "");
}

const DATE_RE = /(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/g;
function parsePeriod(str) {
  const s = (str || "").toString();
  const matches = s.match(DATE_RE) || [];
  const toIso = (m) => {
    const p = m.split(/[\/.\-]/);
    const y = p[2].length === 2 ? "20" + p[2] : p[2];
    return `${y}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}`;
  };
  if (matches.length >= 2) return { start: toIso(matches[0]), end: toIso(matches[matches.length - 1]) };
  if (matches.length === 1) return { start: toIso(matches[0]), end: toIso(matches[0]) };
  return null;
}

const looksLikePeriod = (v) => DATE_RE.test((v || "").toString()) ? ((DATE_RE.lastIndex = 0), true) : false;

function extractNR(name) {
  const m = norm(name).match(/NR[\s.-]?0?(\d+)/);
  return m ? "NR" + m[1] : null;
}

// ─── Normalização inteligente e equivalências (novo — aditivo) ──────────────
const SYN = [
  [/PLATAFORMA(S)?\s+(AEREA|ELEVATORIA)(S)?(\s+DE\s+TRABALHO)?/g, " PLATAFORMA "],
  [/\bPTA\b/g, " PLATAFORMA "],
  [/\bPEMT\b/g, " PLATAFORMA "],
  [/TALHA(S)?\s+ELETRICA(S)?/g, " TALHAELETRICA "],
  [/\bTALHA(S)?\b/g, " TALHAELETRICA "],
  [/PONTE(S)?\s+ROLANTE(S)?/g, " PONTEROLANTE "],
  [/SUPERVISOR(ES)?\s+DE\s+ENTRADA/g, " SUPERVISOR "],
  [/ESPACO(S)?\s+CONFINADO(S)?/g, " ESPACOCONFINADO "],
  [/TRABALHADOR(ES)?(\s+AUTORIZADO(S)?)?/g, " TRABALHADOR "],
];
function expand(s) {
  let t = " " + norm(s) + " ";
  for (const [re, rep] of SYN) t = t.replace(re, rep);
  return t.replace(/\s+/g, " ").trim();
}
const STOP = new Set(["DE", "DA", "DO", "DOS", "DAS", "EM", "PARA", "COM", "SEM", "CURSO", "TREINAMENTO", "CAPACITACAO", "SEGURANCA", "TRABALHO", "TRABALHOS", "HORAS", "HORA", "CARGA", "HORARIA", "TURMA", "MODULO", "CERTIFICACAO", "ALTURA"]);
const TIPO_WORDS = new Set(["FORMACAO", "ATUALIZACAO", "RECICLAGEM", "PERIODICO", "PERIODICA", "INICIAL"]);

function extractTipo(text) {
  const n = norm(text);
  if (n.includes("ATUALIZACAO")) return { tipo: "Atualização", original: "Atualização" };
  if (n.includes("RECICLAGEM")) return { tipo: "Reciclagem", original: "Reciclagem" };
  if (n.includes("PERIODIC")) return { tipo: "Reciclagem", original: "Periódico" };
  if (n.includes("FORMACAO")) return { tipo: "Formação", original: "Formação" };
  return { tipo: "Formação", original: "" };
}

function keywords(text) {
  return [...new Set(expand(text).split(/[^A-Z0-9]+/).filter((t) =>
    t.length >= 3 && !STOP.has(t) && !TIPO_WORDS.has(t) && !/^\d+H?$/.test(t) && !/^NR\d*$/.test(t)
  ))];
}

function cargaNumOf(text) {
  const m = norm(text).match(/(\d{1,3})\s*H(ORAS)?\b/);
  return m ? +m[1] : null;
}

function scoreCourse(courseName, ctx) {
  const nrC = extractNR(courseName);
  if (ctx.nr && nrC && ctx.nr !== nrC) return 0;
  const cN = expand(courseName);
  let score = 0;
  if (ctx.nr && nrC && ctx.nr === nrC) score += 40;
  if (ctx.kws.length) {
    const matched = ctx.kws.filter((k) => cN.includes(k)).length;
    score += Math.round(((ctx.nr && nrC) ? 40 : 70) * matched / ctx.kws.length);
  } else if (score > 0) {
    score += 10;
  }
  const tipoC = extractTipo(courseName).original;
  if (ctx.tipoOriginal && tipoC && norm(ctx.tipoOriginal) === norm(tipoC)) score += 10;
  else if (ctx.tipoOriginal && !tipoC) score += 4;
  else if (ctx.tipoOriginal && tipoC && norm(ctx.tipoOriginal) !== norm(tipoC)) score -= 10;
  const cargaC = cargaNumOf(courseName);
  if (ctx.cargaNum && cargaC && cargaC === ctx.cargaNum) score += 10;
  return Math.max(0, score);
}

function matchCourse(courses, text, cargaNum, tipoOriginal) {
  const nr = extractNR(text);
  const kws = keywords(text);
  const scored = courses
    .map((c) => ({ c, score: scoreCourse(c.name, { nr, kws, cargaNum, tipoOriginal }) }))
    .filter((x) => x.score >= 30)
    .sort((a, b) => b.score - a.score);
  const best = scored[0], second = scored[1];
  const confident = !!best && best.score >= 55 && (!second || best.score - second.score >= 15);
  return {
    status: confident ? "ok" : (scored.length ? "ambiguo" : "nao_encontrado"),
    selected: confident ? best.c : null,
    candidates: scored.slice(0, 5).map((x) => ({
      id: x.c.id, name: x.c.name, score: x.score,
      certificate_model_id: x.c.certificate_model_id || null,
      certificate_model_name: x.c.certificate_model_name || null,
    })),
  };
}

// ─── Análise de uma aba ──────────────────────────────────────────────────────
function analyzeSheet(sheetName, aoa) {
  const result = { sheet: sheetName, course_title: "", carga: "", warnings: [], rows: [] };

  let headerIdx = -1;
  for (let i = 0; i < Math.min(aoa.length, 30); i++) {
    if ((aoa[i] || []).some((c) => norm(c).includes("T_NOME"))) { headerIdx = i; break; }
  }
  if (headerIdx === -1) {
    result.warnings.push("Nenhuma coluna T_NOME encontrada — aba ignorada.");
    return result;
  }

  // Curso e carga horária no topo da aba (inclui células mescladas — valor fica na 1ª célula)
  for (let i = 0; i < headerIdx; i++) {
    for (const cell of (aoa[i] || [])) {
      const t = (cell || "").toString().trim();
      if (!t) continue;
      const n = norm(t);
      const cargaMatch = n.match(/CARGA\s*HORARIA\s*[:\-]?\s*(\d+)\s*H?/) || (/^\d+\s*H(ORAS)?\.?$/.test(n) ? [null, n.match(/\d+/)[0]] : null);
      if (cargaMatch) { if (!result.carga) result.carga = `${cargaMatch[1]}h`; continue; }
      if (n.includes("PERIODO") || n.includes("CERTIFICA")) continue;
      if (t.length >= 4 && t.length > result.course_title.length) result.course_title = t;
    }
  }
  if (!result.course_title) result.course_title = sheetName.trim();
  if (!result.carga) {
    const m = norm(result.course_title).match(/(\d+)\s*H(ORAS)?\b/);
    if (m) result.carga = `${m[1]}h`;
  }

  const header = (aoa[headerIdx] || []).map((c) => norm(c));
  const findCol = (...keys) => header.findIndex((h) => keys.some((k) => h.includes(k)));
  const nomeIdx = findCol("T_NOME");
  const cpfIdx = findCol("T_CPF", "CPF");
  const emailIdx = findCol("T_EMAIL", "EMAIL", "E-MAIL");
  let periodIdx = header.findIndex((h) => h.includes("PERIODO"));
  const maeIdx = findCol("T_MAE");
  const whatsIdx = findCol("WHATSAPP", "WHATS", "CELULAR", "T_FONE", "TELEFONE", "FONE", "CONTATO");
  const detranIdx = findCol("REGISTRO DETRAN", "DETRAN");
  const renachIdx = findCol("RENACH");
  const cnhIdx = findCol("CATEGORIA CNH", "CATEGORIA", "CNH");

  if (periodIdx === -1 && maeIdx !== -1) {
    const sample = aoa.slice(headerIdx + 1, headerIdx + 15).map((r) => (r || [])[maeIdx]).filter(Boolean);
    if (sample.some((v) => looksLikePeriod(v))) {
      periodIdx = maeIdx;
      result.warnings.push("Inconsistência: a coluna T_MAE está sendo usada para o PERÍODO DO CURSO. O sistema tratou os valores como período — recomenda-se corrigir a planilha.");
    }
  }
  if (periodIdx === -1) result.warnings.push("Coluna de período não encontrada nesta aba.");

  // Extrair alunos (herança de período por bloco: propaga somente até o próximo período/cabeçalho)
  let lastPeriodRaw = "";
  for (let i = headerIdx + 1; i < aoa.length; i++) {
    const row = aoa[i] || [];
    const nome = (row[nomeIdx] || "").toString().trim();
    if (!nome) continue;
    const nNome = norm(nome);
    // Cabeçalhos repetidos em blocos: reinicia a herança de período
    if (nNome.includes("T_NOME") || nNome.includes("CARGA HORARIA") || nNome === "NOME" || nNome.includes("PERIODO DO CURSO")) {
      lastPeriodRaw = "";
      continue;
    }

    let periodRaw = periodIdx !== -1 ? (row[periodIdx] || "").toString().trim() : "";
    let periodInherited = false;
    if (!periodRaw && lastPeriodRaw) { periodRaw = lastPeriodRaw; periodInherited = true; }
    if (periodRaw && looksLikePeriod(periodRaw) && !periodInherited) lastPeriodRaw = periodRaw;

    const period = parsePeriod(periodRaw);
    const cpfRaw = cpfIdx !== -1 ? (row[cpfIdx] || "").toString().trim() : "";
    const cpfDigits = digits(cpfRaw);
    const email = emailIdx !== -1 ? (row[emailIdx] || "").toString().trim() : "";
    const whats = whatsIdx !== -1 ? (row[whatsIdx] || "").toString().trim() : "";

    result.rows.push({
      sheet: sheetName,
      name: nome.replace(/\s+/g, " ").toUpperCase(),
      cpf: fmtCpf(cpfRaw),
      cpf_digits: cpfDigits,
      cpf_status: !cpfDigits ? "ausente" : (validCpf(cpfDigits) ? "valido" : "invalido"),
      email,
      email_status: email ? (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "valido" : "invalido") : "ausente",
      whatsapp: looksLikePeriod(whats) ? "" : whats,
      period_raw: periodRaw,
      period_inherited: periodInherited,
      start_date: period?.start || "",
      end_date: period?.end || "",
      period_status: period ? "ok" : "pendente",
      detran_registro: detranIdx !== -1 ? (row[detranIdx] || "").toString().trim() : "",
      renach: renachIdx !== -1 ? (row[renachIdx] || "").toString().trim() : "",
      categoria_cnh: cnhIdx !== -1 ? (row[cnhIdx] || "").toString().trim() : "",
    });
  }
  return result;
}

const MANAGE_ROLES = ["admin", "gestor_master", "coordenacao", "certificacao"];
async function getAppRole(base44, user) {
  try {
    const p = await base44.asServiceRole.entities.UserProfile.filter({ user_email: user.email }, "-created_date", 1);
    return p[0]?.role || user.role;
  } catch (_e) {
    return user.role;
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await req.json();
    const action = payload.action || "preview";
    const nowStr = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    // ════════════ PREVIEW ════════════
    if (action === "preview") {
      let sheets = [];
      if (payload.sheets_json) {
        sheets = Object.entries(payload.sheets_json).map(([name, aoa]) => analyzeSheet(name, aoa));
      } else if (payload.file_url) {
        const resp = await fetch(payload.file_url);
        if (!resp.ok) return Response.json({ error: "Não foi possível baixar o arquivo." }, { status: 400 });
        const buf = await resp.arrayBuffer();
        const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
        sheets = wb.SheetNames.map((name) =>
          analyzeSheet(name, XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: "" }))
        );
      } else {
        return Response.json({ error: "file_url ou sheets_json obrigatório." }, { status: 400 });
      }

      const courses = await base44.entities.Course.list("-created_date", 1000);
      const classes = await base44.entities.ClassSchedule.list("-created_date", 1000);

      const allCpfs = [];
      sheets.forEach((s) => s.rows.forEach((r) => { if (r.cpf_digits) { allCpfs.push(r.cpf); allCpfs.push(r.cpf_digits); } }));
      const uniqueCpfs = [...new Set(allCpfs)];
      const existingStudents = uniqueCpfs.length
        ? await base44.entities.Student.filter({ cpf: { $in: uniqueCpfs } }, "-created_date", 1000)
        : [];
      const studentByCpf = {};
      existingStudents.forEach((s) => { studentByCpf[digits(s.cpf)] = s; });

      const existingEnrollments = uniqueCpfs.length
        ? await base44.entities.StudentCourseEnrollment.filter({ student_cpf: { $in: uniqueCpfs } }, "-created_date", 1000)
        : [];

      for (const sheet of sheets) {
        // Identificação inteligente do curso: nome da aba + títulos superiores,
        // combinando NR + palavras-chave + tipo + carga horária (nunca só texto exato)
        const matchText = `${sheet.sheet} ${sheet.course_title}`;
        const tipoInfo = extractTipo(matchText);
        sheet.certification_type = tipoInfo.tipo;
        sheet.tipo_original = tipoInfo.original;
        const cargaNum = parseInt(sheet.carga) || null;
        const match = matchCourse(courses, matchText, cargaNum, tipoInfo.original);
        sheet.course_match = { status: match.status, candidates: match.candidates };
        const course = match.selected;
        sheet.course_id = course?.id || null;
        sheet.course_name = course?.name || null;
        sheet.course_found = !!course;
        sheet.certificate_model_id = course?.certificate_model_id || null;
        sheet.certificate_model_name = course?.certificate_model_name || null;

        const klass = course ? classes.find((k) => {
          const matchC = k.training_id === course.id || norm(k.training_name) === norm(course.name);
          const matchCompany = payload.origem === "Comunidade"
            ? (!k.company_id || k.company_id === "individual")
            : k.company_id === payload.company_id;
          return matchC && matchCompany && !["Concluído", "Cancelado"].includes(k.status);
        }) : null;
        sheet.class_id = klass?.id || null;
        sheet.class_found = !!klass;

        const seenInSheet = new Set();
        for (const row of sheet.rows) {
          const existing = studentByCpf[row.cpf_digits];
          row.student_exists = !!existing;
          row.student_id = existing?.id || null;
          row.needs_update = !!(existing && ((!existing.email && row.email) || (!existing.whatsapp && row.whatsapp)));
          // Duplicidade: CPF + curso + período (mesmo CPF pode fazer cursos/períodos diferentes)
          row.enrollment_exists = !!(course && existingEnrollments.some(
            (e) => digits(e.student_cpf) === row.cpf_digits &&
              (e.course_id === course.id || norm(e.course_name) === norm(course.name)) &&
              (e.start_date || "") === (row.start_date || "") &&
              (e.end_date || "") === (row.end_date || "")
          ));
          const dupKey = `${row.cpf_digits}|${row.start_date}|${row.end_date}`;
          const dupInSheet = row.cpf_digits && seenInSheet.has(dupKey);
          if (row.cpf_digits) seenInSheet.add(dupKey);
          row.dup_in_sheet = !!dupInSheet;

          if (row.cpf_status !== "valido") row.action = "corrigir_erro";
          else if (!sheet.course_found) row.action = "curso_inexistente";
          else if (dupInSheet) row.action = "ignorar_duplicado";
          else if (row.enrollment_exists) row.action = "ja_matriculado";
          else if (row.student_exists) row.action = row.needs_update ? "atualizar_e_matricular" : "criar_matricula";
          else row.action = "criar_aluno_e_matricula";
        }
      }

      const flat = sheets.flatMap((s) => s.rows);
      return Response.json({
        sheets,
        summary: {
          total_lidos: flat.length,
          importaveis: flat.filter((r) => ["criar_aluno_e_matricula", "criar_matricula", "atualizar_e_matricular"].includes(r.action)).length,
          com_erro: flat.filter((r) => ["corrigir_erro", "curso_inexistente"].includes(r.action)).length,
          duplicados: flat.filter((r) => ["ja_matriculado", "ignorar_duplicado"].includes(r.action)).length,
        },
      });
    }

    // ════════════ COMMIT ════════════
    if (action === "commit") {
      const { rows = [], origem = "Comunidade", company_id, company_name, create_classes = false, file_name = "planilha.xlsx" } = payload;
      if (origem === "Empresa" && !company_id) return Response.json({ error: "Selecione a empresa antes de importar." }, { status: 400 });
      // Registro válido nunca entra sem course_id (bloqueio obrigatório)
      const importable = rows.filter((r) => ["criar_aluno_e_matricula", "criar_matricula", "atualizar_e_matricular"].includes(r.action) && r.cpf_status === "valido" && r.course_id);
      if (importable.length === 0) return Response.json({ error: "Nenhum registro válido para importar." }, { status: 400 });

      const isComunidade = origem === "Comunidade";
      const cId = isComunidade ? "individual" : company_id;
      const cName = isComunidade ? "Individual (PF)" : company_name;

      // Cursos usados no lote → modelo de certificado vinculado (Course = vínculo oficial)
      const courseList = await base44.entities.Course.list("-created_date", 1000);
      const courseById = {};
      courseList.forEach((c) => { courseById[c.id] = c; });

      // Lote de importação (rastreabilidade / histórico / desfazer)
      const batch = await base44.asServiceRole.entities.ImportBatch.create({
        file_name, origem,
        company_id: cId, company_name: cName,
        operador_email: user.email,
        status: "Ativo",
        total_lidos: rows.length,
        total_duplicados: rows.filter((x) => ["ja_matriculado", "ignorar_duplicado"].includes(x.action)).length,
        total_alertas: rows.filter((x) => x.period_status !== "ok" || x.email_status !== "valido").length,
        cursos: [...new Set(importable.map((x) => x.course_name).filter(Boolean))],
      });

      const classByKey = {};
      if (create_classes) {
        const groups = {};
        importable.forEach((r) => {
          const key = `${r.course_id}|${r.sheet}`;
          if (!groups[key]) groups[key] = { course_id: r.course_id, course_name: r.course_name, carga: r.carga, start: r.start_date, end: r.end_date, sheet: r.sheet, count: 0, class_id: r.class_id || null };
          groups[key].count++;
          if (r.start_date && (!groups[key].start || r.start_date < groups[key].start)) groups[key].start = r.start_date;
          if (r.end_date && (!groups[key].end || r.end_date > groups[key].end)) groups[key].end = r.end_date;
        });
        for (const [key, g] of Object.entries(groups)) {
          if (g.class_id) { classByKey[key] = g.class_id; continue; }
          const klass = await base44.entities.ClassSchedule.create({
            training_name: g.course_name,
            training_id: g.course_id,
            company_name: cName,
            company_id: cId,
            status: "Agendado",
            students_count: g.count,
            duration_hours: parseInt(g.carga) || undefined,
            realization_dates: [g.start, g.end].filter(Boolean),
            notes: `Turma criada via Importação de Alunos por Planilha (${file_name} / aba ${g.sheet}) em ${nowStr}. Lote: ${batch.id}.`,
          });
          classByKey[key] = klass.id;
        }
      }

      let criados = 0, atualizados = 0, matriculas = 0, erros = 0, duplicadosCommit = 0;
      const errosDetalhe = [];
      for (const r of importable) {
        try {
          // Trava final anti-duplicidade: CPF + curso + período (vale também para cursos selecionados manualmente)
          const dup = await base44.entities.StudentCourseEnrollment.filter({
            student_cpf: r.cpf, course_id: r.course_id,
            start_date: r.start_date || new Date().toISOString().split("T")[0],
          }, "-created_date", 5);
          if (dup.some((e) => (e.end_date || "") === (r.end_date || r.start_date || new Date().toISOString().split("T")[0]))) {
            duplicadosCommit++;
            continue;
          }
          let studentId = r.student_id;
          if (!studentId) {
            const st = await base44.entities.Student.create({
              full_name: r.name,
              cpf: r.cpf,
              email: r.email || undefined,
              whatsapp: r.whatsapp || undefined,
              status: "Ativo",
              origem: "CAT App",
              ...(isComunidade ? {} : { company_id: cId, company_name: cName }),
              notes: `Origem: Importação por planilha (${file_name} / aba ${r.sheet}) em ${nowStr}. Lote: ${batch.id}.`,
            });
            studentId = st.id;
            criados++;
          } else if (r.email || r.whatsapp) {
            // Nunca sobrescrever dados válidos do aluno por campos da planilha — só preenche o que falta
            const st = await base44.entities.Student.get(studentId).catch(() => null);
            const upd = {};
            if (st && !st.email && r.email) upd.email = r.email;
            if (st && !st.whatsapp && r.whatsapp) upd.whatsapp = r.whatsapp;
            if (Object.keys(upd).length) { await base44.entities.Student.update(studentId, upd); atualizados++; }
          }

          const detranInfo = [
            r.detran_registro ? `Registro DETRAN: ${r.detran_registro}` : "",
            r.renach ? `RENACH: ${r.renach}` : "",
            r.categoria_cnh ? `Categoria CNH: ${r.categoria_cnh}` : "",
          ].filter(Boolean).join(" | ");

          const course = courseById[r.course_id];
          await base44.entities.StudentCourseEnrollment.create({
            student_id: studentId,
            student_name: r.name,
            student_cpf: r.cpf,
            student_email: r.email || undefined,
            student_phone: r.whatsapp || undefined,
            course_id: r.course_id,
            course_name: r.course_name,
            course_duration: r.carga || undefined,
            certification_type: ["Formação", "Atualização", "Reciclagem"].includes(r.certification_type) ? r.certification_type : "Formação",
            certificate_model_id: course?.certificate_model_id || undefined,
            certificate_model_name: course?.certificate_model_name || undefined,
            company_id: cId,
            company_name: cName,
            start_date: r.start_date || new Date().toISOString().split("T")[0],
            end_date: r.end_date || r.start_date || new Date().toISOString().split("T")[0],
            class_schedule_id: classByKey[`${r.course_id}|${r.sheet}`] || r.class_id || undefined,
            status: "Aguardando Autorização",
            import_batch_id: batch.id,
            notes: [`Fonte: importação por planilha (${file_name} / aba ${r.sheet}). Origem: ${origem}. Período: ${r.period_raw || "—"}.${r.tipo_original ? ` Tipo (planilha): ${r.tipo_original}.` : ""}`, detranInfo].filter(Boolean).join(" | "),
          });
          matriculas++;
        } catch (e) {
          erros++;
          errosDetalhe.push(`${r.name}: ${e.message}`);
        }
      }

      await base44.asServiceRole.entities.ImportBatch.update(batch.id, {
        total_importados: matriculas,
        total_alunos_criados: criados,
        total_alunos_atualizados: atualizados,
        total_erros: erros,
      });

      await base44.entities.AuditLog.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        action: "create",
        entity_type: "StudentImport",
        entity_id: batch.id,
        entity_name: file_name,
        company_id: isComunidade ? undefined : cId,
        company_name: cName,
        details: `Importação de Alunos por Planilha — lote ${batch.id} | arquivo: ${file_name} | ${nowStr} | Lidos: ${rows.length} | Importados (matrículas): ${matriculas} | Alunos criados: ${criados} | Alunos atualizados: ${atualizados} | Com erro: ${rows.filter((x) => x.action === "corrigir_erro").length + erros} | Duplicados ignorados: ${rows.filter((x) => ["ja_matriculado", "ignorar_duplicado"].includes(x.action)).length} | Cursos/turmas: ${[...new Set(importable.map((x) => x.course_name))].join(", ")} | Turmas criadas: ${create_classes ? Object.keys(classByKey).length : 0}`,
      });

      return Response.json({ batch_id: batch.id, criados, atualizados, matriculas, erros, duplicados_bloqueados: duplicadosCommit, erros_detalhe: errosDetalhe, turmas_criadas: Object.values(classByKey) });
    }

    // ════════════ HISTÓRICO DE LOTES ════════════
    if (action === "listBatches") {
      const batches = await base44.asServiceRole.entities.ImportBatch.list("-created_date", 100);
      return Response.json({ batches });
    }

    if (action === "batchRecords") {
      if (!payload.batch_id) return Response.json({ error: "batch_id obrigatório." }, { status: 400 });
      const enrollments = await base44.asServiceRole.entities.StudentCourseEnrollment.filter({ import_batch_id: payload.batch_id }, "-created_date", 1000);
      return Response.json({
        records: enrollments.map((e) => ({
          id: e.id, student_name: e.student_name, student_cpf: e.student_cpf,
          course_name: e.course_name, start_date: e.start_date, end_date: e.end_date,
          status: e.status, status_matricula: e.status_matricula,
          certificate_id: e.certificate_id || null,
          import_archived: !!e.import_archived,
        })),
      });
    }

    // Ações administrativas (arquivar / desfazer / vincular modelo) — exigem papel autorizado
    if (["archiveBatch", "undoBatch", "linkModel"].includes(action)) {
      const role = await getAppRole(base44, user);
      if (!MANAGE_ROLES.includes(role)) return Response.json({ error: "Sem permissão para esta ação." }, { status: 403 });

      if (action === "linkModel") {
        const { course_id, model_id } = payload;
        if (!course_id || !model_id) return Response.json({ error: "course_id e model_id obrigatórios." }, { status: 400 });
        const model = await base44.asServiceRole.entities.CertificateModel.get(model_id);
        if (!model) return Response.json({ error: "Modelo não encontrado." }, { status: 404 });
        await base44.asServiceRole.entities.Course.update(course_id, {
          certificate_model_id: model.id,
          certificate_model_name: model.name,
        });
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: user.email, user_name: user.full_name || user.email,
          action: "update", entity_type: "Course", entity_id: course_id, entity_name: model.name,
          details: `Modelo de certificado "${model.name}" vinculado ao curso via Importação por Planilha em ${nowStr}. Nenhum modelo foi duplicado ou alterado.`,
        });
        return Response.json({ ok: true, model_name: model.name });
      }

      const batchId = payload.batch_id;
      if (!batchId) return Response.json({ error: "batch_id obrigatório." }, { status: 400 });
      const enrollments = await base44.asServiceRole.entities.StudentCourseEnrollment.filter({ import_batch_id: batchId }, "-created_date", 1000);
      const blocked = enrollments.filter((e) => e.certificate_id);
      const blockedList = blocked.map((e) => ({ id: e.id, student_name: e.student_name, course_name: e.course_name, certificate_id: e.certificate_id }));

      if (action === "archiveBatch") {
        let arquivados = 0;
        for (const e of enrollments) {
          if (e.certificate_id || e.import_archived) continue;
          await base44.asServiceRole.entities.StudentCourseEnrollment.update(e.id, {
            import_archived: true,
            status_matricula: "Cancelado",
            cancellation_reason: `Arquivado em massa via lote de importação ${batchId} por ${user.email} em ${nowStr}.`,
          });
          arquivados++;
        }
        await base44.asServiceRole.entities.ImportBatch.update(batchId, {
          status: "Arquivado", arquivado_por: user.email, arquivado_em: new Date().toISOString(),
          observacao: blocked.length ? `${blocked.length} registro(s) com certificado emitido preservado(s).` : undefined,
        });
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: user.email, user_name: user.full_name || user.email,
          action: "update", entity_type: "ImportBatch", entity_id: batchId, entity_name: "Arquivamento de lote",
          details: `Lote ${batchId} arquivado em ${nowStr}. Registros arquivados: ${arquivados}. Registros com certificado emitido preservados: ${blocked.length}. Nenhum Student ou Certificate foi excluído.`,
        });
        return Response.json({ arquivados, bloqueados: blockedList });
      }

      if (action === "undoBatch") {
        const deletable = enrollments.filter((e) => !e.certificate_id);
        if (!payload.confirm) {
          // Fase 1: apresentar o impacto antes de executar
          if (blocked.length) {
            await base44.asServiceRole.entities.AuditLog.create({
              user_email: user.email, user_name: user.full_name || user.email,
              action: "view", entity_type: "ImportBatch", entity_id: batchId, entity_name: "Tentativa de desfazer lote",
              details: `Tentativa de desfazer o lote ${batchId} em ${nowStr}: ${blocked.length} registro(s) com certificado emitido bloqueado(s) para tratamento individual.`,
            });
          }
          return Response.json({ requires_confirm: true, bloqueados: blockedList, desfazer_possiveis: deletable.length });
        }
        let desfeitos = 0;
        for (const e of deletable) {
          await base44.asServiceRole.entities.StudentCourseEnrollment.delete(e.id);
          desfeitos++;
        }
        await base44.asServiceRole.entities.ImportBatch.update(batchId, {
          status: "Desfeito", desfeito_por: user.email, desfeito_em: new Date().toISOString(),
          observacao: blocked.length ? `${blocked.length} registro(s) com certificado emitido preservado(s) — tratar individualmente.` : undefined,
        });
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: user.email, user_name: user.full_name || user.email,
          action: "delete", entity_type: "ImportBatch", entity_id: batchId, entity_name: "Desfazer lote de importação",
          details: `Lote ${batchId} desfeito em ${nowStr}. Matrículas removidas: ${desfeitos}. Registros com certificado emitido preservados: ${blocked.length}. Nenhum Student ou Certificate foi excluído.`,
        });
        return Response.json({ desfeitos, bloqueados: blockedList });
      }
    }

    return Response.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});