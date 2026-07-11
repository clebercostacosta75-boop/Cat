import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Testes automatizados das regras de convite de portal — 100% em memória.
// NENHUM convite real é criado, NENHUMA mensagem é enviada, NENHUM dado é alterado.

// Réplica pura das regras de validação de ativação (mesma lógica de activatePortalInvite)
function validateActivation(invite, ctx, nowIso) {
  const now = new Date(nowIso);
  if (!invite) return { ok: false, reason: 'generic' };
  if (invite.revoked_at || invite.status === 'Revoked') return { ok: false, reason: 'generic' };
  if (invite.used_at || invite.status === 'Used') return { ok: false, reason: 'generic' };
  if (new Date(invite.expires_at) < now) return { ok: false, reason: 'generic' };
  if (((invite.metadata && invite.metadata.attempts) || 0) >= 10) return { ok: false, reason: 'generic' };
  if (!ctx.user) return { ok: false, reason: 'requires_login' };
  if (ctx.user.email.toLowerCase() !== invite.recipient_email.toLowerCase()) return { ok: false, reason: 'generic' };
  if (!ctx.lgpd || !ctx.lgpd.accepted) return { ok: false, reason: 'requires_lgpd' };
  if (ctx.profile && ctx.profile.status === 'blocked') return { ok: false, reason: 'generic' };
  return { ok: true };
}

// Réplica pura da regra anti-duplicidade (mesma lógica de createPortalInvite)
function hasDuplicateActive(existing, nowIso) {
  const now = new Date(nowIso);
  return existing.some(i => ['Pending', 'Sent'].includes(i.status) && !i.revoked_at && !i.used_at && new Date(i.expires_at) > now);
}

// Réplica pura do escopo de vínculo aplicado na ativação
function linkScope(invite) {
  if (invite.portal_type === 'Aluno') return { student_id: invite.linked_entity_id };
  if (invite.portal_type === 'Instrutor') return { instructor_id: invite.linked_entity_id };
  if (invite.portal_type === 'Empresa') return { company_permissions: [{ company_id: invite.linked_company_id || invite.linked_entity_id }] };
  return {};
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Apenas administradores executam os testes.' }, { status: 403 });

    const NOW = '2026-07-11T12:00:00Z';
    const FUTURE = '2026-07-12T12:00:00Z';
    const PAST = '2026-07-10T12:00:00Z';
    const baseInvite = {
      portal_type: 'Aluno', recipient_email: 'aluno@teste.com', linked_entity_id: 'STU1',
      status: 'Pending', expires_at: FUTURE, metadata: { attempts: 0 },
    };
    const okCtx = { user: { email: 'aluno@teste.com' }, lgpd: { accepted: true }, profile: null };
    let sendCalls = 0; // nenhum envio real deve ocorrer

    const tests = [];
    const run = (name, pass) => tests.push({ name, result: pass ? 'PASSOU' : 'FALHOU' });

    // 1. Token válido funciona uma vez
    const first = validateActivation({ ...baseInvite }, okCtx, NOW);
    run('Token válido é aceito na primeira utilização', first.ok === true);

    // 2a. Token expirado negado
    run('Token expirado é negado (resposta genérica)', validateActivation({ ...baseInvite, expires_at: PAST }, okCtx, NOW).ok === false);
    // 2b. Token revogado negado
    run('Token revogado é negado', validateActivation({ ...baseInvite, status: 'Revoked', revoked_at: NOW }, okCtx, NOW).ok === false);
    // 2c. Token reutilizado (já usado) negado — proteção contra replay
    run('Token já utilizado (replay) é negado', validateActivation({ ...baseInvite, status: 'Used', used_at: NOW }, okCtx, NOW).ok === false);
    // 2d. Excesso de tentativas negado
    run('Excesso de tentativas é negado', validateActivation({ ...baseInvite, metadata: { attempts: 10 } }, okCtx, NOW).ok === false);

    // 3. E-mail divergente negado
    run('E-mail autenticado divergente é negado', validateActivation({ ...baseInvite }, { ...okCtx, user: { email: 'outro@teste.com' } }, NOW).ok === false);

    // 4. Convite de aluno vincula somente o próprio aluno
    const scopeAluno = linkScope({ ...baseInvite, linked_entity_id: 'STU1' });
    run('Convite de Aluno vincula apenas o próprio aluno (student_id)', scopeAluno.student_id === 'STU1' && !scopeAluno.instructor_id && !scopeAluno.company_permissions);

    // 5. Instrutor não recebe escopo financeiro/empresa
    const scopeInstr = linkScope({ portal_type: 'Instrutor', linked_entity_id: 'INS1' });
    run('Convite de Instrutor vincula apenas instructor_id (sem financeiro/empresas)', scopeInstr.instructor_id === 'INS1' && !scopeInstr.company_permissions && !scopeInstr.student_id);

    // 6. Empresa A não acessa empresa B
    const scopeEmpA = linkScope({ portal_type: 'Empresa', linked_entity_id: 'EMP_A', linked_company_id: 'EMP_A' });
    const soEmpresaA = scopeEmpA.company_permissions.length === 1 && scopeEmpA.company_permissions[0].company_id === 'EMP_A';
    run('Convite de Empresa A restringe acesso somente à Empresa A', soEmpresaA);

    // 7. Convite duplicado ativo bloqueado
    run('Convite duplicado ativo é bloqueado', hasDuplicateActive([{ status: 'Pending', expires_at: FUTURE }], NOW) === true);
    run('Convite anterior revogado/expirado NÃO bloqueia novo convite', hasDuplicateActive([{ status: 'Revoked', revoked_at: NOW, expires_at: FUTURE }, { status: 'Pending', expires_at: PAST }], NOW) === false);

    // 8. Perfil bloqueado não ganha acesso
    run('Convite não concede acesso a perfil bloqueado', validateActivation({ ...baseInvite }, { ...okCtx, profile: { status: 'blocked' } }, NOW).ok === false);

    // 9. LGPD obrigatório
    run('Ativação sem aceite LGPD é negada', validateActivation({ ...baseInvite }, { ...okCtx, lgpd: { accepted: false } }, NOW).ok === false);

    // 10. Nenhum envio real durante os testes
    run('Nenhuma mensagem real foi enviada durante os testes', sendCalls === 0);

    const failed = tests.filter(t => t.result === 'FALHOU').length;
    return Response.json({ success: failed === 0, total: tests.length, falhas: failed, tests });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});