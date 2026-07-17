import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

/**
 * Alertas de Vencimento — Certificações > Empresas (PJ).
 * ADITIVO: reutiliza ConfiguracaoAlertas (marcos 45/30/15/5), LogNotificacoes (dedup + histórico),
 * FilaMensagem (fila oficial de E-mail/WhatsApp processada por processarFilaMensagens) e AuditLog.
 * Nunca sobrescreve Certificate.valid_until já preenchido; nunca inventa validade.
 *
 * Ações: list (somente leitura) | enviar (enfileira, com trava de duplicidade por certificado+prazo+canal;
 * reenvio somente com resend=true, auditado) | confirmar_validade (preenche valid_until vazio, auditado).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });

    // Papel canônico (mesma fonte das demais telas: UserProfile)
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email: String(user.email || '').toLowerCase() });
    const role = profiles[0]?.role || (user.role === 'admin' ? 'admin' : '');
    const ALLOWED = ['admin', 'gestor_master', 'coordenacao', 'certificacao', 'atendimento'];
    if (!ALLOWED.includes(role) && user.role !== 'admin') {
      return Response.json({ error: 'Sem permissão para Alertas de Vencimento' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'list';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysTo = (d) => Math.round((new Date(String(d).slice(0, 10) + 'T00:00:00').getTime() - today.getTime()) / 86400000);
    const fmtBR = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');

    // Marcos: reutiliza as configurações ativas existentes (45/30/15/5)
    const configs = (await base44.asServiceRole.entities.ConfiguracaoAlertas.list('-dias_antecedencia', 50)).filter((c) => c.ativo !== false);
    const marcos = [...new Set(configs.map((c) => Number(c.dias_antecedencia)))].filter((n) => n > 0).sort((a, b) => a - b);

    // ── Ação: confirmar validade pendente (humano) ──────────────────────────
    if (action === 'confirmar_validade') {
      const cert = (await base44.asServiceRole.entities.Certificate.filter({ id: body.certificate_id }).catch(() => []))[0];
      if (!cert) return Response.json({ error: 'Certificado não encontrado' }, { status: 404 });
      if (cert.valid_until) return Response.json({ error: 'Certificado já possui validade — não é permitido sobrescrever.' }, { status: 400 });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.valid_until || ''))) {
        return Response.json({ error: 'Data de validade inválida (use AAAA-MM-DD)' }, { status: 400 });
      }
      await base44.asServiceRole.entities.Certificate.update(cert.id, { valid_until: body.valid_until });
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email, user_name: user.full_name || user.email, action: 'update',
        entity_type: 'Certificate', entity_id: cert.id,
        entity_name: `${cert.student_name} — ${cert.course_name}`,
        details: `Alertas de Vencimento (PJ): validade confirmada manualmente como ${fmtBR(body.valid_until)}. Base: ${body.base_calculo || 'confirmação humana'}. Término do treinamento: ${fmtBR(cert.end_date) || '-'}.`,
        company_id: cert.client_id || '', company_name: cert.client_name || '',
      });
      return Response.json({ success: true });
    }

    // ── Ação: enviar/enfileirar alertas (e-mail/WhatsApp) ───────────────────
    if (action === 'enviar') {
      const canal = body.canal; // 'email' | 'whatsapp'
      const marco = Number(body.marco);
      const resend = body.resend === true;
      const ids = Array.isArray(body.certificate_ids) ? body.certificate_ids : [];
      if (!['email', 'whatsapp'].includes(canal) || !marco || ids.length === 0) {
        return Response.json({ error: 'Parâmetros: canal (email|whatsapp), marco, certificate_ids' }, { status: 400 });
      }
      const cfg = configs.find((c) => Number(c.dias_antecedencia) === marco) || {};
      const evento = `${marco}dias`;
      let enfileirados = 0, duplicados = 0, sem_contato = 0, ignorados = 0;
      const companyCache = {};

      for (const id of ids) {
        const cert = (await base44.asServiceRole.entities.Certificate.filter({ id }).catch(() => []))[0];
        if (!cert || ['revoked', 'substituido'].includes(cert.status) || !cert.valid_until) { ignorados++; continue; }

        // Trava de duplicidade: certificado + prazo + canal
        const prev = await base44.asServiceRole.entities.LogNotificacoes.filter(
          { certificado_id: id, evento, tipo: canal, status: 'enviado' }, '-created_date', 1
        );
        if (prev.length > 0 && !resend) { duplicados++; continue; }

        const dias = daysTo(cert.valid_until);
        const vars = {
          '{nome_aluno}': cert.student_name || '', '{nome_treinamento}': cert.course_name || '',
          '{data_vencimento}': fmtBR(cert.valid_until), '{empresa}': cert.client_name || '',
          '{dias_restantes}': String(dias),
        };
        const rep = (t) => Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(k, v), t || '');

        // Contato da empresa (RH)
        let company = null;
        const ck = cert.client_id || cert.client_name || '';
        if (ck) {
          if (!(ck in companyCache)) {
            let found = [];
            if (cert.client_id) found = await base44.asServiceRole.entities.Company.filter({ id: cert.client_id });
            if (found.length === 0 && cert.client_name) {
              const all = await base44.asServiceRole.entities.Company.list('-created_date', 500);
              found = all.filter((c) => c.nome_fantasia === cert.client_name || c.razao_social === cert.client_name);
            }
            companyCache[ck] = found[0] || null;
          }
          company = companyCache[ck];
        }
        const hrContact = company?.contacts?.find((c) => c.is_whatsapp && c.phone) || company?.contacts?.find((c) => c.phone || c.email) || null;

        const msgAluno = rep(cfg.mensagem_aluno || `Olá {nome_aluno}, seu certificado de {nome_treinamento} vence em {dias_restantes} dia(s), no dia {data_vencimento}. Entre em contato com a CAT Cursos para renovação.`);
        const msgEmpresa = rep(cfg.mensagem_empresa || `Prezado(a) {empresa}, o certificado do colaborador {nome_aluno} ({nome_treinamento}) vence em {dias_restantes} dia(s), no dia {data_vencimento}.`);

        let queued = false;
        const filaBase = { evento: `alerta_vencimento_${evento}`, enrollment_id: cert.enrollment_id || '', student_name: cert.student_name || '', origem: 'operador', status: 'Pendente', tentativas: 0, max_tentativas: 3 };

        if (canal === 'email') {
          if (cert.student_email) {
            await base44.asServiceRole.entities.FilaMensagem.create({ ...filaBase, canal: 'E-mail', destinatario: cert.student_email, assunto: rep(cfg.assunto_aluno || `⚠️ Certificado vence em ${marco} dias`), mensagem: msgAluno });
            queued = true;
          }
          if (hrContact?.email) {
            await base44.asServiceRole.entities.FilaMensagem.create({ ...filaBase, canal: 'E-mail', destinatario: hrContact.email, assunto: rep(cfg.assunto_empresa || `⚠️ Certificado de colaborador vence em ${marco} dias`), mensagem: msgEmpresa });
            queued = true;
          }
        } else {
          if (cert.student_phone) {
            await base44.asServiceRole.entities.FilaMensagem.create({ ...filaBase, canal: 'WhatsApp', destinatario: cert.student_phone, mensagem: msgAluno });
            queued = true;
          }
          if (hrContact?.phone) {
            await base44.asServiceRole.entities.FilaMensagem.create({ ...filaBase, canal: 'WhatsApp', destinatario: hrContact.phone, mensagem: msgEmpresa });
            queued = true;
          }
        }

        if (!queued) { sem_contato++; continue; }

        await base44.asServiceRole.entities.LogNotificacoes.create({
          aluno_nome: cert.student_name || '', aluno_email: cert.student_email || '',
          empresa_nome: cert.client_name || '', curso_nome: cert.course_name || '',
          certificado_id: id, tipo: canal, evento, status: 'enviado', data_envio: new Date().toISOString(),
        });
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: user.email, user_name: user.full_name || user.email,
          action: canal === 'whatsapp' ? 'send_whatsapp' : 'create',
          entity_type: 'Certificate', entity_id: id,
          entity_name: `${cert.student_name} — ${cert.course_name}`,
          details: `Alertas de Vencimento (PJ): ${resend ? 'REENVIO manual' : 'envio'} enfileirado — canal ${canal}, marco ${marco} dias, vencimento ${fmtBR(cert.valid_until)}.`,
          company_id: cert.client_id || '', company_name: cert.client_name || '',
        });
        enfileirados++;
      }
      return Response.json({ success: true, enfileirados, duplicados, sem_contato, ignorados, resend });
    }

    // ── Ação padrão: list (somente leitura, nada é gravado) ─────────────────
    const all = await base44.asServiceRole.entities.Certificate.list('-valid_until', 1000);
    const pj = all.filter((c) => c.client_id || c.client_name);

    // Renovação: para cada aluno+curso, só o certificado vigente com maior validade gera alerta
    const best = {};
    for (const c of pj) {
      if (['revoked', 'substituido'].includes(c.status)) continue;
      const k = `${String(c.student_cpf || '').replace(/\D/g, '')}|${String(c.course_name || '').toUpperCase().trim()}`;
      if (!best[k] || String(c.valid_until || '') > String(best[k].valid_until || '')) best[k] = c;
    }

    // Envios já registrados (dedup/status por certificado+prazo+canal)
    const eventos = marcos.map((m) => `${m}dias`);
    const logs = eventos.length > 0
      ? await base44.asServiceRole.entities.LogNotificacoes.filter({ evento: { $in: eventos }, status: 'enviado' }, '-created_date', 1000)
      : [];
    const sent = {};
    for (const l of logs) if (l.certificado_id) sent[`${l.certificado_id}|${l.evento}|${l.tipo}`] = l.data_envio || l.created_date;

    const maxMarco = marcos[marcos.length - 1] || 0;
    const alerts = [], pendencias = [], vencidos = [];
    const modelCache = {};

    for (const c of pj) {
      if (['revoked', 'substituido'].includes(c.status)) continue;
      const k = `${String(c.student_cpf || '').replace(/\D/g, '')}|${String(c.course_name || '').toUpperCase().trim()}`;
      if (best[k] && best[k].id !== c.id) continue; // há renovação válida — não manter alerta do anterior

      const item = {
        certificate_id: c.id, certificate_code: c.certificate_code || '',
        student_name: c.student_name || '', student_cpf: c.student_cpf || '',
        client_name: c.client_name || '', course_name: c.course_name || '',
        start_date: c.start_date || '', end_date: c.end_date || '',
        valid_until: c.valid_until || '', student_email: c.student_email || '',
        student_phone: c.student_phone || '', cert_status: c.status || '',
      };

      if (!c.valid_until) {
        // Pendência: nunca inventar validade — sugerir só quando o modelo oficial define o período
        let sugestao = null, origem = null;
        if (c.certificate_model_id && c.end_date) {
          if (!(c.certificate_model_id in modelCache)) {
            modelCache[c.certificate_model_id] = (await base44.asServiceRole.entities.CertificateModel.filter({ id: c.certificate_model_id }))[0] || null;
          }
          const m = modelCache[c.certificate_model_id];
          if (m?.validity_period_months) {
            const d = new Date(c.end_date + 'T00:00:00');
            d.setMonth(d.getMonth() + Number(m.validity_period_months));
            sugestao = d.toISOString().slice(0, 10);
            origem = `Modelo "${m.name}" — ${m.validity_period_months} meses após o término (${fmtBR(c.end_date)})`;
          }
        }
        const motivo = !c.end_date ? 'Sem data de término do treinamento'
          : !c.certificate_model_id ? 'Sem modelo de certificado vinculado'
          : sugestao ? 'Validade não preenchida — confirmar sugestão do modelo'
          : 'Modelo sem período de validade definido';
        pendencias.push({ ...item, sugestao_valid_until: sugestao, sugestao_origem: origem, motivo });
        continue;
      }

      const dias = daysTo(c.valid_until);
      if (dias < 0) { vencidos.push({ ...item, days_remaining: dias }); continue; }
      if (dias > maxMarco) continue;
      const marco = marcos.find((m) => dias <= m);
      alerts.push({
        ...item, days_remaining: dias, marco,
        sent_email: sent[`${c.id}|${marco}dias|email`] || null,
        sent_whatsapp: sent[`${c.id}|${marco}dias|whatsapp`] || null,
      });
    }

    alerts.sort((a, b) => a.days_remaining - b.days_remaining);
    vencidos.sort((a, b) => a.days_remaining - b.days_remaining);
    return Response.json({ marcos, alerts, pendencias, vencidos });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});