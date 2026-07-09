import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import * as XLSX from 'npm:xlsx@0.18.5';

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
  const m = norm(name).match(/NR[\s-]?0?(\d+)/);
  return m ? "NR" + m[1] : null;
}

// ─── Análise de uma aba ──────────────────────────────────────────────────────
function analyzeSheet(sheetName, aoa) {
  const result = { sheet: sheetName, course_title: "", carga: "", warnings: [], rows: [] };

  // Localizar linha de cabeçalho (contém T_NOME)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(aoa.length, 30); i++) {
    if ((aoa[i] || []).some((c) => norm(c).includes("T_NOME"))) { headerIdx = i; break; }
  }
  if (headerIdx === -1) {
    result.warnings.push("Nenhuma coluna T_NOME encontrada — aba ignorada.");
    return result;
  }

  // Curso e carga horária no topo da aba
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
  // Carga horária embutida no título (ex: "NR-35 (8 HORAS)")
  if (!result.carga) {
    const m = norm(result.course_title).match(/(\d+)\s*H(ORAS)?\b/);
    if (m) result.carga = `${m[1]}h`;
  }

  // Índices das colunas
  const header = (aoa[headerIdx] || []).map((c) => norm(c));
  const findCol = (...keys) => header.findIndex((h) => keys.some((k) => h.includes(k)));
  const nomeIdx = findCol("T_NOME");
  const cpfIdx = findCol("T_CPF", "CPF");
  const emailIdx = findCol("T_EMAIL", "EMAIL", "E-MAIL");
  let periodIdx = header.findIndex((h) => h.includes("PERIODO"));
  const maeIdx = findCol("T_MAE");
  const detranIdx = findCol("REGISTRO DETRAN", "DETRAN");
  const renachIdx = findCol("RENACH");
  const cnhIdx = findCol("CATEGORIA CNH", "CATEGORIA", "CNH");

  // Inconsistência: T_MAE usada como período
  if (periodIdx === -1 && maeIdx !== -1) {
    const sample = aoa.slice(headerIdx + 1, headerIdx + 15).map((r) => (r || [])[maeIdx]).filter(Boolean);
    if (sample.some((v) => looksLikePeriod(v))) {
      periodIdx = maeIdx;
      result.warnings.push("Inconsistência: a coluna T_MAE está sendo usada para o PERÍODO DO CURSO. O sistema tratou os valores como período — recomenda-se corrigir a planilha.");
    }
  }
  if (periodIdx === -1) result.warnings.push("Coluna de período não encontrada nesta aba.");

  // Extrair alunos (com herança de período por bloco)
  let lastPeriodRaw = "";
  for (let i = headerIdx + 1; i < aoa.length; i++) {
    const row = aoa[i] || [];
    const nome = (row[nomeIdx] || "").toString().trim();
    if (!nome) continue;
    const nNome = norm(nome);
    if (nNome.includes("T_NOME") || nNome.includes("CARGA HORARIA")) continue; // cabeçalho repetido em blocos

    let periodRaw = periodIdx !== -1 ? (row[periodIdx] || "").toString().trim() : "";
    let periodInherited = false;
    if (!periodRaw && lastPeriodRaw) { periodRaw = lastPeriodRaw; periodInherited = true; }
    if (periodRaw && looksLikePeriod(periodRaw)) lastPeriodRaw = periodRaw;

    const period = parsePeriod(periodRaw);
    const cpfRaw = cpfIdx !== -1 ? (row[cpfIdx] || "").toString().trim() : "";
    const cpfDigits = digits(cpfRaw);
    const email = emailIdx !== -1 ? (row[emailIdx] || "").toString().trim() : "";

    result.rows.push({
      sheet: sheetName,
      name: nome.replace(/\s+/g, " ").toUpperCase(),
      cpf: fmtCpf(cpfRaw),
      cpf_digits: cpfDigits,
      cpf_status: !cpfDigits ? "ausente" : (validCpf(cpfDigits) ? "valido" : "invalido"),
      email,
      email_status: email ? (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "valido" : "invalido") : "ausente",
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

// ─── Handler ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await req.json();
    const action = payload.action || "preview";

    // ════════════ PREVIEW ════════════
    if (action === "preview") {
      let sheets = [];
      if (payload.sheets_json) {
        // Modo de teste/homologação: dados brutos em JSON (AOA por aba)
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

      // Cruzamento com o banco
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
        // Identificar curso
        const nTitle = norm(sheet.course_title);
        const nrTitle = extractNR(sheet.course_title);
        const course = courses.find((c) => {
          const nc = norm(c.name);
          if (nc === nTitle || nc.includes(nTitle) || nTitle.includes(nc)) return true;
          const nrC = extractNR(c.name);
          return !!(nrTitle && nrC && nrTitle === nrC);
        });
        sheet.course_id = course?.id || null;
        sheet.course_name = course?.name || null;
        sheet.course_found = !!course;

        // Identificar turma existente (curso + empresa)
        const klass = course ? classes.find((k) => {
          const matchCourse = k.training_id === course.id || norm(k.training_name) === norm(course.name);
          const matchCompany = payload.origem === "Comunidade"
            ? (!k.company_id || k.company_id === "individual")
            : k.company_id === payload.company_id;
          return matchCourse && matchCompany && !["Concluído", "Cancelado"].includes(k.status);
        }) : null;
        sheet.class_id = klass?.id || null;
        sheet.class_found = !!klass;

        // Situação por aluno
        const seenInSheet = new Set();
        for (const row of sheet.rows) {
          const existing = studentByCpf[row.cpf_digits];
          row.student_exists = !!existing;
          row.student_id = existing?.id || null;
          row.needs_update = !!(existing && !existing.email && row.email);
          row.enrollment_exists = !!(course && existingEnrollments.some(
            (e) => digits(e.student_cpf) === row.cpf_digits && (e.course_id === course.id || norm(e.course_name) === norm(course.name))
          ));
          const dupInSheet = seenInSheet.has(row.cpf_digits);
          if (row.cpf_digits) seenInSheet.add(row.cpf_digits);

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
      const importable = rows.filter((r) => ["criar_aluno_e_matricula", "criar_matricula", "atualizar_e_matricular"].includes(r.action) && r.cpf_status === "valido" && r.course_id);
      if (importable.length === 0) return Response.json({ error: "Nenhum registro válido para importar." }, { status: 400 });

      const isComunidade = origem === "Comunidade";
      const cId = isComunidade ? "individual" : company_id;
      const cName = isComunidade ? "Individual (PF)" : company_name;
      const nowStr = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

      // Criar turmas por curso/aba quando autorizado
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
            notes: `Turma criada via Importação de Alunos por Planilha (${file_name} / aba ${g.sheet}) em ${nowStr}.`,
          });
          classByKey[key] = klass.id;
        }
      }

      let criados = 0, atualizados = 0, matriculas = 0, erros = 0;
      const errosDetalhe = [];
      for (const r of importable) {
        try {
          let studentId = r.student_id;
          if (!studentId) {
            const st = await base44.entities.Student.create({
              full_name: r.name,
              cpf: r.cpf,
              email: r.email || undefined,
              status: "Ativo",
              origem: "CAT App",
              ...(isComunidade ? {} : { company_id: cId, company_name: cName }),
              notes: `Origem: Importação por planilha (${file_name} / aba ${r.sheet}) em ${nowStr}.`,
            });
            studentId = st.id;
            criados++;
          } else if (r.needs_update && r.email) {
            await base44.entities.Student.update(studentId, { email: r.email });
            atualizados++;
          }

          const detranInfo = [
            r.detran_registro ? `Registro DETRAN: ${r.detran_registro}` : "",
            r.renach ? `RENACH: ${r.renach}` : "",
            r.categoria_cnh ? `Categoria CNH: ${r.categoria_cnh}` : "",
          ].filter(Boolean).join(" | ");

          await base44.entities.StudentCourseEnrollment.create({
            student_id: studentId,
            student_name: r.name,
            student_cpf: r.cpf,
            student_email: r.email || undefined,
            course_id: r.course_id,
            course_name: r.course_name,
            course_duration: r.carga || undefined,
            company_id: cId,
            company_name: cName,
            start_date: r.start_date || new Date().toISOString().split("T")[0],
            end_date: r.end_date || r.start_date || new Date().toISOString().split("T")[0],
            class_schedule_id: classByKey[`${r.course_id}|${r.sheet}`] || r.class_id || undefined,
            status: "Aguardando Autorização",
            notes: [`Fonte: importação por planilha (${file_name} / aba ${r.sheet}). Origem: ${origem}. Período: ${r.period_raw || "—"}.`, detranInfo].filter(Boolean).join(" | "),
          });
          matriculas++;
        } catch (e) {
          erros++;
          errosDetalhe.push(`${r.name}: ${e.message}`);
        }
      }

      await base44.entities.AuditLog.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        action: "create",
        entity_type: "StudentImport",
        entity_name: file_name,
        company_id: isComunidade ? undefined : cId,
        company_name: cName,
        details: `Importação de Alunos por Planilha — arquivo: ${file_name} | ${nowStr} | Lidos: ${rows.length} | Importados (matrículas): ${matriculas} | Alunos criados: ${criados} | Alunos atualizados: ${atualizados} | Com erro: ${rows.filter((x) => x.action === "corrigir_erro").length + erros} | Duplicados ignorados: ${rows.filter((x) => ["ja_matriculado", "ignorar_duplicado"].includes(x.action)).length} | Cursos/turmas: ${[...new Set(importable.map((x) => x.course_name))].join(", ")} | Turmas criadas: ${create_classes ? Object.keys(classByKey).length : 0}`,
      });

      return Response.json({ criados, atualizados, matriculas, erros, erros_detalhe: errosDetalhe, turmas_criadas: Object.values(classByKey) });
    }

    return Response.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});