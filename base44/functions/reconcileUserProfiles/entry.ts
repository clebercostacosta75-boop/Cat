import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  let base44;
  let operator;
  const now = new Date().toISOString();
  const norm = (v) => String(v || '').trim().toLowerCase();
  const ids = ['dashboard','cronograma','agenda_treinamentos','chamada_presencial','entrada_propostas','gestao_bmm','instrutores','empresas','contratadas','cursos','gestao_academica_individual','gestao_academica_empresas','gestao_contratos','dashboard_operacional','dashboard_financeiro','financeiro','prontuario_digital','documentos_alunos','certificacoes','alertas_vencimento','designer_certificados','assinaturas_digitais','auditoria_certificados','dashboard_comercial','central_comunicacao','relatorios','dashboard_admin','dashboard_master','dashboard_certificacao','dashboard_instrutor','homologacoes','dossie_homologacao','matriz_treinamentos','usuarios','assistente_cadastros','log_auditoria','auditoria_completa','log_acesso','backup_download','alertas_config'];
  const aliases = {'Dashboard':'dashboard','DashboardCentral':'dashboard','Cronograma':'cronograma','Schedule':'cronograma','Agenda de Treinamentos':'agenda_treinamentos','AgendaTreinamentos':'agenda_treinamentos','Chamada Presencial':'chamada_presencial','AttendanceCall':'chamada_presencial','Entrada de Propostas':'entrada_propostas','ProposalEntry':'entrada_propostas','Gestão de BMM':'gestao_bmm','GestaoBMM':'gestao_bmm','Instrutores':'instrutores','Instructors':'instrutores','Empresas':'empresas','Companies':'empresas','Contratadas':'contratadas','Contractors':'contratadas','Cursos':'cursos','Courses':'cursos','Alunos Individuais (PF)':'gestao_academica_individual','Gestão Acadêmica Individual':'gestao_academica_individual','GestaoAlunosIndividuais':'gestao_academica_individual','Gestão Acadêmica Empresas':'gestao_academica_empresas','GestaoAcademicaEmpresas':'gestao_academica_empresas','Gestão de Contratos':'gestao_contratos','GestaoContratos':'gestao_contratos','Dashboard Operacional':'dashboard_operacional','DashboardOperacional':'dashboard_operacional','DashboardOperacionalV2':'dashboard_operacional','Dashboard Financeiro':'dashboard_financeiro','DashboardFinanceiro':'dashboard_financeiro','Financeiro':'financeiro','FinanceiroHub':'financeiro','ProntuarioDigital':'prontuario_digital','Prontuário Digital':'prontuario_digital','GestaoDocumentosAluno':'documentos_alunos','Documentos de Alunos':'documentos_alunos','Certificações':'certificacoes','Certificacoes':'certificacoes','CertificateEmissao':'certificacoes','Alertas de Vencimento':'alertas_vencimento','CertificateAlerts':'alertas_vencimento','Designer de Certificados':'designer_certificados','CertDesigner':'designer_certificados','Assinaturas Digitais':'assinaturas_digitais','DigitalSignatures':'assinaturas_digitais','Auditoria de Certificados':'auditoria_certificados','CertificateAuditPanel':'auditoria_certificados','Dashboard Comercial':'dashboard_comercial','DashboardComercial':'dashboard_comercial','Central de Comunicação':'central_comunicacao','CommunicationCenter':'central_comunicacao','Dashboard de Relatórios':'relatorios','Analytics':'relatorios','Dashboard Admin':'dashboard_admin','AdminDashboard':'dashboard_admin','DashboardMaster':'dashboard_master','Dashboard Master':'dashboard_master','DashboardCertificacao':'dashboard_certificacao','Dashboard Certificação':'dashboard_certificacao','DashboardInstrutor':'dashboard_instrutor','Dashboard Instrutor':'dashboard_instrutor','Homologações':'homologacoes','Homologacoes':'homologacoes','DossieHomologacao':'dossie_homologacao','Dossiê de Homologação':'dossie_homologacao','Matriz de Treinamentos':'matriz_treinamentos','MatrizTreinamentos':'matriz_treinamentos','Usuários':'usuarios','Users':'usuarios','Usuarios':'usuarios','Assistente de Cadastros':'assistente_cadastros','AssistenteCadastros':'assistente_cadastros','Log de Auditoria':'log_auditoria','AuditLog':'log_auditoria','Auditoria Completa':'auditoria_completa','AuditoriaCompleta':'auditoria_completa','Log de Acesso':'log_acesso','AccessLog':'log_acesso','BackupDownload':'backup_download','Download de Backups':'backup_download','AlertasConfig':'alertas_config','Configuração de Alertas':'alertas_config'};
  const normalizePermissions = (values) => [...new Set((values || []).map(v => ids.includes(v) ? v : (aliases[v] || v)).filter(Boolean))];
  try {
    base44 = createClientFromRequest(req);
    operator = await base44.auth.me();
    if (!operator) return Response.json({ success: false, code: 'unauthorized', error: 'Não autenticado' }, { status: 401 });
    const callerProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email: operator.email });
    const linkedCallers = callerProfiles.filter(p => p.user_id === operator.id);
    const canRun = operator.role === 'admin' || (linkedCallers.length === 1 && linkedCallers[0].role === 'gestor_master' && linkedCallers[0].status === 'active');
    if (!canRun) return Response.json({ success: false, code: 'forbidden', error: 'Apenas administrador nativo ou Gestor Master ativo e vinculado' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;
    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const profiles = await base44.asServiceRole.entities.UserProfile.list('-created_date', 500);
    const usersByEmail = new Map();
    const profilesByEmail = new Map();
    const profilesByUserId = new Map();
    for (const user of users) { const e = norm(user.email); if (!usersByEmail.has(e)) usersByEmail.set(e, []); usersByEmail.get(e).push(user); }
    for (const profile of profiles) { const e = norm(profile.user_email); if (!profilesByEmail.has(e)) profilesByEmail.set(e, []); profilesByEmail.get(e).push(profile); if (profile.user_id) { if (!profilesByUserId.has(profile.user_id)) profilesByUserId.set(profile.user_id, []); profilesByUserId.get(profile.user_id).push(profile); } }
    const duplicateEmails = [...profilesByEmail].filter(([,v]) => v.length > 1).map(([email,v]) => ({ email, profile_ids: v.map(p => p.id) }));
    const duplicateUserIds = [...profilesByUserId].filter(([,v]) => v.length > 1).map(([user_id,v]) => ({ user_id, profile_ids: v.map(p => p.id) }));
    const duplicateEmailSet = new Set(duplicateEmails.map(d => d.email));
    const duplicateUserSet = new Set(duplicateUserIds.map(d => d.user_id));
    const report = { dry_run: dryRun, analyzed: { users: users.length, profiles: profiles.length }, linked: [], created: [], waiting_link: [], duplicates: { emails: duplicateEmails, user_ids: duplicateUserIds }, normalized_permissions: [], mirrored_permissions: [], errors: [] };

    for (const user of users) {
      const email = norm(user.email);
      if (!email || duplicateEmailSet.has(email) || duplicateUserSet.has(user.id) || (usersByEmail.get(email) || []).length !== 1) continue;
      const byId = profilesByUserId.get(user.id) || [];
      const byEmail = profilesByEmail.get(email) || [];
      let profile = byId.length === 1 ? byId[0] : (byEmail.length === 1 ? byEmail[0] : null);
      if (!profile) {
        if (!dryRun) profile = await base44.asServiceRole.entities.UserProfile.create({ user_id: user.id, user_email: email, user_name: user.full_name || email, role: 'cliente', permissions: [], company_permissions: [], status: 'active' });
        report.created.push({ user_id: user.id, profile_id: profile?.id || null, email, permissions: [] });
        continue;
      }
      if (profile.user_id && profile.user_id !== user.id) { report.errors.push({ code: 'profile_mismatch', profile_id: profile.id, email }); continue; }
      const normalized = normalizePermissions(profile.permissions);
      const changes = {};
      if (!profile.user_id) changes.user_id = user.id;
      if (profile.user_email !== email) changes.user_email = email;
      if (JSON.stringify(normalized) !== JSON.stringify(profile.permissions || [])) changes.permissions = normalized;
      if (Object.keys(changes).length && !dryRun) await base44.asServiceRole.entities.UserProfile.update(profile.id, changes);
      if (changes.user_id) report.linked.push({ user_id: user.id, profile_id: profile.id, email });
      if (changes.permissions) report.normalized_permissions.push({ profile_id: profile.id, before: profile.permissions || [], after: normalized });
      const currentCompanyPermissions = user.company_permissions || [];
      const nextCompanyPermissions = profile.company_permissions || [];
      const permissionsChanged = JSON.stringify(normalizePermissions(user.permissions)) !== JSON.stringify(normalized);
      const companyScopeChanged = JSON.stringify(currentCompanyPermissions) !== JSON.stringify(nextCompanyPermissions);
      if (permissionsChanged || companyScopeChanged) {
        if (!dryRun) await base44.asServiceRole.entities.User.update(user.id, {
          permissions: normalized,
          company_permissions: nextCompanyPermissions,
        });
        report.mirrored_permissions.push({ user_id: user.id, profile_id: profile.id, permissions: normalized, company_permissions: nextCompanyPermissions });
      }
    }
    for (const profile of profiles) {
      const email = norm(profile.user_email);
      const hasUser = profile.user_id ? users.some(u => u.id === profile.user_id) : (usersByEmail.get(email) || []).length === 1;
      if (!hasUser) report.waiting_link.push({ profile_id: profile.id, email, permissions_preserved: profile.permissions || [] });
    }
    if (!dryRun) await base44.asServiceRole.entities.AuditLog.create({ user_email: operator.email, user_name: operator.full_name || operator.email, action: 'update', entity_type: 'UserProfile', entity_name: 'Reconciliação de perfis', details: JSON.stringify({ operator_id: operator.id, at: now, result: 'success', report }) });
    return Response.json({ success: true, report });
  } catch (error) {
    if (base44 && operator) await base44.asServiceRole.entities.AuditLog.create({ user_email: operator.email, user_name: operator.full_name || operator.email, action: 'update', entity_type: 'UserProfile', entity_name: 'Reconciliação de perfis', details: JSON.stringify({ operator_id: operator.id, at: now, result: 'error', error: error.message }) }).catch(() => null);
    return Response.json({ success: false, code: 'reconcile_error', error: error.message }, { status: 500 });
  }
});