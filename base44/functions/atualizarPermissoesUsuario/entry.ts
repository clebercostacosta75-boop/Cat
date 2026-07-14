import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  let base44;
  let operator;
  let target;
  const at = new Date().toISOString();
  const validIds = ['dashboard','cronograma','agenda_treinamentos','chamada_presencial','entrada_propostas','gestao_bmm','instrutores','empresas','contratadas','cursos','gestao_academica_individual','gestao_academica_empresas','gestao_contratos','dashboard_operacional','dashboard_financeiro','financeiro','prontuario_digital','documentos_alunos','certificacoes','alertas_vencimento','designer_certificados','assinaturas_digitais','auditoria_certificados','dashboard_comercial','central_comunicacao','relatorios','dashboard_admin','dashboard_master','dashboard_certificacao','dashboard_instrutor','homologacoes','dossie_homologacao','matriz_treinamentos','usuarios','assistente_cadastros','log_auditoria','auditoria_completa','log_acesso','backup_download','alertas_config'];
  try {
    base44 = createClientFromRequest(req);
    operator = await base44.auth.me();
    if (!operator) return Response.json({ success: false, code: 'unauthorized', error: 'Não autenticado' }, { status: 401 });
    const callerProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email: operator.email });
    const linkedCallers = callerProfiles.filter(p => p.user_id === operator.id);
    const authorized = operator.role === 'admin' || (linkedCallers.length === 1 && linkedCallers[0].role === 'gestor_master' && linkedCallers[0].status === 'active');
    if (!authorized) return Response.json({ success: false, code: 'forbidden', error: 'Sem autorização para administrar permissões' }, { status: 403 });

    const auditRejected = async (code, error, details = {}) => {
      await base44.asServiceRole.entities.AuditLog.create({ user_email: operator.email, user_name: operator.full_name || operator.email, action: 'update', entity_type: 'UserProfile', entity_id: details.profile_id, entity_name: 'Permissões rejeitadas', details: JSON.stringify({ operator_id: operator.id, at, result: 'rejected', code, error, ...details }) });
      return Response.json({ success: false, code, error }, { status: code === 'forbidden' ? 403 : 400 });
    };
    const { profile_id, permissions } = await req.json();
    if (!profile_id) return await auditRejected('profile_required', 'Perfil não informado');
    if (!Array.isArray(permissions)) return await auditRejected('invalid_permissions', 'Lista de permissões inválida', { profile_id });
    const invalid = permissions.filter(p => !validIds.includes(p));
    if (invalid.length) return await auditRejected('invalid_module', `Módulo inválido: ${invalid.join(', ')}`, { profile_id, invalid_modules: invalid });

    target = await base44.asServiceRole.entities.UserProfile.get(profile_id);
    if (!target) return await auditRejected('profile_not_found', 'Perfil não encontrado', { profile_id });
    const sameEmail = await base44.asServiceRole.entities.UserProfile.filter({ user_email: target.user_email });
    const sameUser = target.user_id ? await base44.asServiceRole.entities.UserProfile.filter({ user_id: target.user_id }) : [];
    if (sameEmail.length !== 1 || sameUser.length !== 1) return await auditRejected('duplicate_profile', 'Perfil duplicado; execute a reconciliação antes de salvar', { profile_id, email_matches: sameEmail.length, user_id_matches: sameUser.length });
    if (!target.user_id) return await auditRejected('profile_unlinked', 'Perfil não vinculado — execute a reconciliação', { profile_id });
    const targetUser = await base44.asServiceRole.entities.User.get(target.user_id).catch(() => null);
    if (!targetUser) return await auditRejected('user_not_found', 'Conta User correspondente não encontrada', { profile_id, target_user_id: target.user_id });

    const previous = Array.isArray(target.permissions) ? target.permissions : [];
    const legacyPermissions = previous.filter(permission => !validIds.includes(permission));
    const next = [...new Set([...permissions, ...legacyPermissions])];
    await base44.asServiceRole.entities.UserProfile.update(target.id, { permissions: next });
    await base44.asServiceRole.entities.User.update(targetUser.id, { permissions: next });
    const confirmed = await base44.asServiceRole.entities.UserProfile.get(target.id);
    const persisted = Array.isArray(confirmed.permissions) ? confirmed.permissions : [];
    const success = JSON.stringify([...persisted].sort()) === JSON.stringify([...next].sort());
    await base44.asServiceRole.entities.AuditLog.create({ user_email: operator.email, user_name: operator.full_name || operator.email, action: 'update', entity_type: 'UserProfile', entity_id: target.id, entity_name: target.user_email, details: JSON.stringify({ operator_id: operator.id, target_user_id: targetUser.id, profile_id: target.id, at, result: success ? 'confirmed' : 'confirmation_failed', previous_permissions: previous, next_permissions: next, confirmed_permissions: persisted }) });
    if (!success) return Response.json({ success: false, code: 'confirmation_failed', error: 'O banco não confirmou todas as permissões; nenhuma confirmação visual foi emitida', confirmed_permissions: persisted }, { status: 409 });
    return Response.json({ success: true, message: 'Permissões salvas e confirmadas', confirmed_permissions: persisted, profile_id: target.id, user_id: targetUser.id });
  } catch (error) {
    if (base44 && operator) await base44.asServiceRole.entities.AuditLog.create({ user_email: operator.email, user_name: operator.full_name || operator.email, action: 'update', entity_type: 'UserProfile', entity_id: target?.id, entity_name: target?.user_email || 'Permissões', details: JSON.stringify({ operator_id: operator.id, at, result: 'error', error: error.message }) }).catch(() => null);
    return Response.json({ success: false, code: 'save_error', error: 'Erro ao salvar permissões', details: error.message }, { status: 500 });
  }
});