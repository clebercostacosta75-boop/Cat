import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const pick = (item, fields) => Object.fromEntries(fields.filter((f) => item?.[f] !== undefined).map((f) => [f, item[f]]));
const maskCpf = (cpf) => {
  const d = String(cpf || '').replace(/\D/g, '');
  if (d.length !== 11) return cpf ? '***' : '';
  return `***.***.${d.slice(6, 9)}-${d.slice(9)}`;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Acesso restrito. Entre pelo convite da empresa.' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'dados';
    const svc = base44.asServiceRole;
    const isAdmin = ['admin', 'gestor_master'].includes(user.role || '');

    // Isolamento obrigatório: empresas autorizadas via AccessAccount (empresa ativo) + company_permissions
    const accounts = await svc.entities.AccessAccount.filter({ user_id: user.id });
    const allowed = new Set(
      accounts.filter((a) => a.access_type === 'empresa' && a.status === 'ativo' && a.company_id).map((a) => a.company_id)
    );
    for (const cp of (user.company_permissions || [])) if (cp.company_id) allowed.add(cp.company_id);

    const companyId = body.company_id || [...allowed][0] || null;
    if (!companyId) return Response.json({ error: 'Nenhuma empresa autorizada para este usuário.' }, { status: 403 });
    if (!isAdmin && !allowed.has(companyId)) {
      await svc.entities.AuditLog.create({
        user_email: user.email, user_name: user.full_name, action: 'view',
        entity_type: 'PortalEmpresaConformidade', entity_id: companyId,
        details: 'ACESSO NEGADO: tentativa de consultar empresa não autorizada no Portal da Empresa',
      }).catch(() => {});
      return Response.json({ error: 'Empresa não autorizada.' }, { status: 403 });
    }
    const company = await svc.entities.Company.get(companyId).catch(() => null);
    if (!company) return Response.json({ error: 'Empresa não encontrada.' }, { status: 404 });

    const audit = (act, details, extra = {}) =>
      svc.entities.AuditLog.create({
        user_email: user.email, user_name: user.full_name, action: act,
        entity_type: 'PortalEmpresaConformidade',
        company_id: company.id, company_name: company.razao_social,
        details, ...extra,
      }).catch(() => {});

    if (action === 'dados') {
      const certificates = await svc.entities.Certificate.filter({ client_id: company.id });
      const students = await svc.entities.Student.filter({ company_id: company.id });
      const solicitacoes = await svc.entities.SolicitacaoTreinamento.filter({ empresa_mestre_id: company.id }, '-created_date', 200);
      const cfgs = await svc.entities.ConfiguracaoAlertas.list().catch(() => []);
      const alertDias = cfgs.filter((c) => c.ativo !== false && c.dias_antecedencia).map((c) => c.dias_antecedencia).sort((a, b) => b - a);
      const modelIds = [...new Set(certificates.map((c) => c.certificate_model_id).filter(Boolean))];
      const models = [];
      for (const id of modelIds) {
        const m = await svc.entities.CertificateModel.get(id).catch(() => null);
        if (m) models.push(m);
      }
      await audit('view', 'Portal da Empresa — Central de Conformidade: visualização de dados da empresa');
      const certFields = ['id','student_id','student_name','student_cpf','student_email','student_phone','course_name','course_duration','certification_type','start_date','end_date','valid_until','status','certificate_code','instructor_name','issue_date','signed_at','revocation_reason','programmatic_content','certificate_model_id','certificate_model_name','front_background_url','back_background_url','show_programmatic_hours','version','is_blocked','download_deadline','technical_responsibles','location_and_date','client_name','course_modality','internal_control_code'];
      return Response.json({
        company: pick(company, ['id','razao_social','nome_fantasia','cnpj','status','logo_url']),
        certificates: certificates.map((c) => ({ ...pick(c, certFields), cpf_exibicao: isAdmin ? c.student_cpf : maskCpf(c.student_cpf) })),
        students: students.map((s) => ({ ...pick(s, ['id','full_name','funcao_nome','status','email','phone','unidade','setor']), cpf_exibicao: isAdmin ? s.cpf : maskCpf(s.cpf) })),
        solicitacoes: solicitacoes.map((s) => pick(s, ['id','titulo_treinamento','descricao','nr_relacionada','numero_participantes','colaboradores_nomes','data_preferencial','local_preferencial','status','observacoes_cat','data_confirmada','created_date','created_by_id','company_id','course_id','course_name','student_ids','student_names','certificate_ids','motivo_renovacao','prazo_alerta_origem'])),
        alert_dias: alertDias.length ? alertDias : [45, 30, 15, 5],
        certificate_models: models,
        cpf_completo: isAdmin,
      });
    }

    if (action === 'solicitar_renovacao') {
      const titulo = String(body.titulo || '').trim();
      if (!titulo) return Response.json({ error: 'Informe o curso/treinamento da solicitação.' }, { status: 400 });
      const existentes = await svc.entities.SolicitacaoTreinamento.filter({ empresa_mestre_id: company.id });
      const dup = existentes.find(
        (s) => ['Aguardando Análise', 'Em Análise'].includes(s.status) &&
          (s.titulo_treinamento || '') === titulo &&
          (s.colaboradores_nomes || '') === String(body.colaboradores_nomes || '')
      );
      if (dup) return Response.json({ success: false, duplicada: true, solicitacao_id: dup.id, message: 'Já existe uma solicitação idêntica em aberto para esta empresa.' });
      const sol = await svc.entities.SolicitacaoTreinamento.create({
        empresa_mestre_id: company.id,
        empresa_mestre_nome: company.razao_social,
        tipo_solicitacao: 'Empresa Solicita',
        origem: 'Portal Empresa',
        titulo_treinamento: titulo,
        descricao: String(body.descricao || ''),
        nr_relacionada: String(body.nr_relacionada || ''),
        numero_participantes: body.numero_participantes || undefined,
        colaboradores_nomes: String(body.colaboradores_nomes || ''),
        data_preferencial: body.data_preferencial || undefined,
        status: 'Aguardando Análise',
        company_id: company.id,
        course_id: body.course_id || undefined,
        course_name: body.course_name || titulo,
        student_ids: Array.isArray(body.student_ids) ? body.student_ids : undefined,
        student_names: Array.isArray(body.student_names) ? body.student_names : undefined,
        certificate_ids: Array.isArray(body.certificate_ids) ? body.certificate_ids : undefined,
        motivo_renovacao: String(body.motivo_renovacao || ''),
        prazo_alerta_origem: String(body.prazo_alerta_origem || ''),
      });
      await audit('create', `Portal da Empresa: solicitação de renovação/reciclagem criada — "${titulo}" (${body.numero_participantes || '?'} participante(s)). Apenas para análise interna da CAT; nenhuma matrícula, turma ou cobrança gerada.`, { entity_type: 'SolicitacaoTreinamento', entity_id: sol.id, entity_name: titulo });
      return Response.json({ success: true, solicitacao: sol });
    }

    if (action === 'preparar_comunicacao') {
      const ids = Array.isArray(body.certificado_ids) ? body.certificado_ids : [];
      const canal = body.canal === 'WhatsApp' ? 'WhatsApp' : 'E-mail';
      if (!ids.length) return Response.json({ error: 'Nenhum certificado selecionado.' }, { status: 400 });
      const certsEmpresa = await svc.entities.Certificate.filter({ client_id: company.id });
      const byId = new Map(certsEmpresa.map((c) => [c.id, c]));
      if (ids.some((id) => !byId.has(id))) {
        await audit('view', 'ACESSO NEGADO: tentativa de comunicação com certificados fora da empresa autorizada');
        return Response.json({ error: 'Certificados fora da empresa autorizada.' }, { status: 403 });
      }
      const cfgs = await svc.entities.ConfiguracaoAlertas.list().catch(() => []);
      const hoje = new Date();
      const itens = [];
      for (const id of ids) {
        const c = byId.get(id);
        const destinatario = canal === 'WhatsApp' ? (c.student_phone || '') : (c.student_email || '');
        const evento = `portal_empresa_renovacao_${c.id}_${canal === 'WhatsApp' ? 'wa' : 'em'}`;
        const jaFila = await svc.entities.FilaMensagem.filter({ evento });
        const duplicado = jaFila.some((m) => ['Pendente', 'Processando', 'Enviada'].includes(m.status));
        const dias = c.valid_until ? Math.ceil((new Date(c.valid_until).getTime() - hoje.getTime()) / 86400000) : null;
        const cfg = cfgs
          .filter((x) => x.ativo !== false && x.dias_antecedencia != null && dias != null && x.dias_antecedencia >= Math.max(dias, 0))
          .sort((a, b) => a.dias_antecedencia - b.dias_antecedencia)[0] || null;
        const aplicar = (t) => (t || '')
          .replace(/{nome_aluno}/g, c.student_name || '')
          .replace(/{nome_treinamento}/g, c.course_name || '')
          .replace(/{data_vencimento}/g, c.valid_until || 'a confirmar')
          .replace(/{empresa}/g, company.razao_social || '')
          .replace(/{dias_restantes}/g, dias == null ? '' : String(dias));
        const assunto = cfg?.assunto_aluno ? aplicar(cfg.assunto_aluno) : `Renovação de treinamento — ${c.course_name}`;
        const mensagem = cfg?.mensagem_aluno
          ? aplicar(cfg.mensagem_aluno)
          : `Olá ${c.student_name}, o certificado do treinamento "${c.course_name}"${c.valid_until ? ` vence em ${c.valid_until}` : ' está com validade pendente de confirmação'}. A empresa ${company.razao_social} solicita a programação da renovação. — CAT Cursos`;
        itens.push({ certificado_id: c.id, student_name: c.student_name, destinatario, duplicado, sem_contato: !destinatario, evento, assunto, mensagem });
      }
      const enfileiraveis = itens.filter((i) => !i.duplicado && !i.sem_contato);
      if (!body.confirmar) {
        return Response.json({
          success: true, preview: true, canal, total: itens.length,
          enfileiraveis: enfileiraveis.length,
          duplicados: itens.filter((i) => i.duplicado).length,
          sem_contato: itens.filter((i) => i.sem_contato).length,
          itens: itens.map((i) => pick(i, ['certificado_id','student_name','destinatario','duplicado','sem_contato'])),
        });
      }
      let criadas = 0;
      for (const i of enfileiraveis) {
        await svc.entities.FilaMensagem.create({
          canal, destinatario: i.destinatario,
          assunto: canal === 'E-mail' ? i.assunto : '',
          mensagem: i.mensagem, evento: i.evento,
          student_name: i.student_name, origem: 'operador',
          status: 'Pendente', tentativas: 0, max_tentativas: 3,
        });
        criadas++;
      }
      await audit(canal === 'WhatsApp' ? 'send_whatsapp' : 'create', `Portal da Empresa: ${criadas} mensagem(ns) de renovação enfileirada(s) na fila oficial via ${canal} após confirmação humana (${itens.length - criadas} ignorada(s) por duplicidade/sem contato)`, { entity_type: 'FilaMensagem' });
      return Response.json({ success: true, preview: false, criadas, duplicados: itens.filter((i) => i.duplicado).length, sem_contato: itens.filter((i) => i.sem_contato).length });
    }

    if (action === 'auditar') {
      const tipo = ['view', 'export'].includes(body.tipo) ? body.tipo : 'view';
      await audit(tipo, `Portal da Empresa: ${String(body.detalhes || '').slice(0, 500)}`);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});