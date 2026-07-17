// Homologação ALUBAR — lote planilha "CERTIFICAÇÕES - JUNHO 2026 (1).xlsx"
// Aditivo, idempotente e auditável. Nunca envia e-mail/WhatsApp, nunca cria FilaMensagem/LogNotificacoes.
// Ações: { action: "preview" } | { action: "executar", confirmar: true }
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const COMPANY_ID = "6929ec1ba486412f00e5b9fd";
const PLANILHA = "CERTIFICAÇÕES - JUNHO 2026";

// Mapeamento oficial por aba (autorização do usuário). condicional: exige confirmação na configuração existente.
const MAPA_ABAS = {
  "NR 33 - ESP CONF - FORMAÇÃO": { modelId: "6a593af6e713d418b5f68358", tipo: "Formação", carga: "16h" },
  "NR 33 - ESP CONF SUPERVISOR": { modelId: "6a5a12ab6b360b2a031cc40b", tipo: "Atualização", carga: "8h" },
  "NR 11 - TALHA E PONTE - ATUALIZ": { modelId: "6a5a135a1fea9c944a9707f1", tipo: "Atualização", carga: "16h" },
  "NR 11 - TALHA E PONTE - FORMAÇÃ": { modelId: "6a5939a68b66450643f002df", tipo: "Formação", carga: "16h", condicional: true },
  "NR 18 - PLAT AEREA - ATUALIZAÇÃ": { modelId: "6a5a1655f4c44628bdcc8fee", tipo: "Atualização", carga: "16h" },
  // Sem modelo oficial inequívoco — sempre pendentes:
  "NR 33 - ESP CONF - ATUALIZAÇÃO": null,
  "NR 18 - PLAT AEREA - FORMAÇÃO": null,
};

function normCarga(v) { return String(v || "").toLowerCase().replace(/^0+/, "").replace(/\s/g, ""); }
function gerarCodigo() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 8; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return `CAT-${new Date().getFullYear()}-${c}`;
}
function gerarCodigoInternoControle() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CTRL-${ts}-${rand}`;
}
function addMonths(dateStr, months) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}
function dataExtensoPtBr(d) {
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  return `${d.getUTCDate()} de ${meses[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Restrito: admin builtin ou papéis autorizados no UserProfile
    let autorizado = user.role === 'admin';
    if (!autorizado) {
      const perfis = await base44.asServiceRole.entities.UserProfile.filter({ user_email: (user.email || "").toLowerCase() });
      const papel = perfis[0]?.role;
      autorizado = ["admin", "gestor_master", "coordenacao", "certificacao"].includes(papel);
    }
    if (!autorizado) return Response.json({ error: 'Acesso negado' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || "preview";
    const executar = action === "executar" && body.confirmar === true;
    if (action === "executar" && body.confirmar !== true) {
      return Response.json({ error: "Execução exige confirmação explícita (confirmar: true)." }, { status: 400 });
    }

    const svc = base44.asServiceRole;

    // 1) Matrículas do lote — somente ALUBAR + observação da planilha
    const all = await svc.entities.StudentCourseEnrollment.filter({ company_id: COMPANY_ID }, "-created_date", 500);
    const lote = all.filter(e => (e.notes || "").includes(PLANILHA));

    // 2) Carrega modelos oficiais do mapa
    const modelos = {};
    for (const cfg of Object.values(MAPA_ABAS)) {
      if (!cfg || modelos[cfg.modelId]) continue;
      const m = (await svc.entities.CertificateModel.filter({ id: cfg.modelId }))[0] || null;
      modelos[cfg.modelId] = m;
    }

    // 3) Verificação condicional NR-11 Formação: só é inequívoco se a configuração existente
    //    (catálogo de cursos vinculado ao modelo) confirmar; caso contrário, grupo pendente.
    const condicionalConfirmado = {};
    for (const [aba, cfg] of Object.entries(MAPA_ABAS)) {
      if (!cfg?.condicional) continue;
      const m = modelos[cfg.modelId];
      const cursosVinculados = await svc.entities.Course.filter({ certificate_model_id: cfg.modelId });
      const nomeIndicaAtualizacao = /ATUALIZA|PERI[ÓO]DIC|RECICLAGEM/i.test(m?.name || "");
      const modalidadeConfirmaFormacao = /FORMA|INICIAL/i.test(m?.modality || "");
      condicionalConfirmado[aba] = !!m && !nomeIndicaAtualizacao && (cursosVinculados.length > 0 || modalidadeConfirmaFormacao);
    }

    const agora = new Date();
    const localData = `Barcarena/PA, ${dataExtensoPtBr(agora)}`;
    const porAba = {};
    const erros = [];
    const totais = { lidos: lote.length, elegiveis: 0, gerados: 0, reutilizados: 0, pendentes_modelo: 0, bloqueados: 0, erros: 0, duplicidades_evitadas: 0 };

    for (const e of lote) {
      const abaMatch = (e.notes || "").match(/aba ([^)]+)\)/);
      const aba = abaMatch ? abaMatch[1].trim() : "(sem aba)";
      if (!porAba[aba]) porAba[aba] = { total: 0, elegiveis: 0, gerados: 0, reutilizados: 0, pendentes: 0, bloqueados: 0, erros: 0, modelo: null, motivo_pendencia: null };
      const g = porAba[aba];
      g.total++;

      const cfg = MAPA_ABAS[aba] ?? undefined;
      if (cfg === undefined) { g.pendentes++; totais.pendentes_modelo++; g.motivo_pendencia = "Aba não mapeada — sem modelo oficial"; continue; }
      if (cfg === null) { g.pendentes++; totais.pendentes_modelo++; g.motivo_pendencia = "Sem modelo oficial inequívoco (regra do lote)"; continue; }
      if (cfg.condicional && !condicionalConfirmado[aba]) {
        g.pendentes++; totais.pendentes_modelo++;
        g.motivo_pendencia = "Modelo não confirmado como Formação pela configuração existente (nenhum curso do catálogo vincula o modelo)";
        continue;
      }

      const model = modelos[cfg.modelId];
      if (!model) { g.pendentes++; totais.pendentes_modelo++; g.motivo_pendencia = "Modelo oficial não encontrado"; continue; }
      g.modelo = model.name;

      // Bloqueios explícitos — nunca contornar
      if (e.bloqueio_certificacao) { g.bloqueados++; totais.bloqueados++; continue; }
      if (["Revogado", "Vencido"].includes(e.status) || e.status_matricula === "Cancelado") { g.bloqueados++; totais.bloqueados++; continue; }

      // Validação da combinação aluno+CPF+empresa+matrícula+curso+tipo+carga+período+modelo
      const problemas = [];
      if (!e.student_name) problemas.push("sem nome");
      if (!e.student_cpf) problemas.push("sem CPF");
      if (e.company_id !== COMPANY_ID) problemas.push("empresa divergente");
      if (!e.start_date || !e.end_date) problemas.push("período incompleto");
      if (normCarga(e.course_duration) !== normCarga(cfg.carga)) problemas.push(`carga divergente (${e.course_duration} ≠ ${cfg.carga})`);
      if (normCarga(model.duration) !== normCarga(cfg.carga)) problemas.push("carga do modelo divergente");
      if (!model.validity_period_months) problemas.push("modelo sem validade oficial");
      if (problemas.length > 0) {
        g.erros++; totais.erros++;
        erros.push({ matricula: e.id, aluno: e.student_name, aba, problemas });
        continue;
      }

      totais.elegiveis++; g.elegiveis++;

      // Anti-duplicidade: certificate_id na matrícula OU Certificate existente com enrollment_id
      let certExistente = null;
      if (e.certificate_id) {
        certExistente = (await svc.entities.Certificate.filter({ id: e.certificate_id }))[0] || null;
      }
      if (!certExistente) {
        certExistente = (await svc.entities.Certificate.filter({ enrollment_id: e.id }))[0] || null;
      }
      if (certExistente) {
        g.reutilizados++; totais.reutilizados++; totais.duplicidades_evitadas++;
        if (executar) {
          const patch = {};
          if (!e.certificate_id) patch.certificate_id = certExistente.id;
          if (!e.certificate_model_id) { patch.certificate_model_id = cfg.modelId; patch.certificate_model_name = model.name; }
          if (Object.keys(patch).length > 0) await svc.entities.StudentCourseEnrollment.update(e.id, patch);
        }
        continue;
      }

      if (!executar) { g.gerados++; totais.gerados++; continue; } // preview: contabiliza como "a gerar"

      // Geração — espelha o fluxo oficial de emissão (dados exclusivamente do modelo do Designer)
      try {
        const validUntil = addMonths(e.end_date, model.validity_period_months);
        const created = await svc.entities.Certificate.create({
          certificate_code: gerarCodigo(),
          internal_control_code: gerarCodigoInternoControle(),
          enrollment_id: e.id,
          student_id: e.student_id || "",
          certification_type: cfg.tipo,
          student_name: e.student_name,
          student_cpf: e.student_cpf,
          student_email: e.student_email || null,
          student_phone: e.student_phone || null,
          course_id: e.course_id || null,
          course_name: model.name,
          course_duration: model.duration || "",
          course_modality: model.modality || "",
          programmatic_content: model.programmatic_content || [],
          start_date: e.start_date,
          end_date: e.end_date,
          valid_until: validUntil,
          location_and_date: localData,
          client_id: COMPANY_ID,
          client_name: e.company_name || "ALUBAR S.A",
          technical_responsibles: model.technical_responsibles || [],
          front_background_url: model.front_background_url || "",
          back_background_url: model.back_background_url || "",
          show_programmatic_hours: model.show_programmatic_hours ?? true,
          class_schedule_id: e.class_schedule_id || null,
          issue_date: agora.toISOString(),
          status: "pending_signature",
          whatsapp_sent: false,
          recipient_type: "empresa",
          certificate_model_id: cfg.modelId,
          certificate_model_name: model.name,
        });

        // Vínculo somente após criação bem-sucedida
        await svc.entities.StudentCourseEnrollment.update(e.id, {
          certificate_id: created.id,
          certificate_model_id: cfg.modelId,
          certificate_model_name: model.name,
          certification_type: cfg.tipo,
          validity_months: model.validity_period_months,
          valid_until: validUntil,
          status: "Certificado Gerado",
          status_matricula: "Concluído",
          resultado_academico: "Aprovado",
          data_resultado: agora.toISOString(),
          responsavel_resultado: `${user.email} — homologação planilha ${PLANILHA} (aba ${aba})`,
          apto_certificacao: true,
          data_apto_certificacao: agora.toISOString(),
          authorized_by: user.email,
          authorized_at: agora.toISOString(),
        });

        g.gerados++; totais.gerados++;
      } catch (err) {
        g.erros++; totais.erros++;
        erros.push({ matricula: e.id, aluno: e.student_name, aba, problemas: ["falha na geração: " + err.message] });
      }
    }

    // AuditLog do lote (somente na execução real)
    if (executar) {
      await svc.entities.AuditLog.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        action: "create",
        entity_type: "Certificate",
        entity_name: `Homologação ALUBAR — planilha ${PLANILHA}`,
        company_id: COMPANY_ID,
        company_name: "ALUBAR S.A",
        details: JSON.stringify({ evento: "homologacao_lote_alubar", executado_em: agora.toISOString(), totais, por_aba: porAba, erros }),
      });
    }

    return Response.json({ success: true, mode: executar ? "executar" : "preview", totais, por_aba: porAba, erros });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});