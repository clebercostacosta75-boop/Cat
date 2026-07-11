import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Testes automatizados do resolvedor central de autorização (lógica pura, sem tocar em dados).
// v2 — redeploy
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Apenas admin' }, { status: 403 });

    // ── Réplica exata do resolvedor central (src/lib/authz.js) ──
    const ALL_MODULES = ['Dashboard', 'Certificações', 'Usuários', 'Cursos'];
    const ALIASES = { 'Certificacoes': 'Certificações' };
    const canon = (k) => ALL_MODULES.includes(k) ? k : (ALIASES[k] && ALL_MODULES.includes(ALIASES[k]) ? ALIASES[k] : null);
    const deny = (code) => ({ granted: false, fullAccess: false, allowedModules: [], reason: code });
    const resolveAccess = (u, p) => {
      if (!u) return deny('not_authenticated');
      if (!p) return deny('no_profile');
      if (!p.user_id) return deny('profile_unlinked');
      if (p.user_id !== u.id) return deny('profile_mismatch');
      if (p.status !== 'active') return deny('status_' + (p.status || 'indefinido'));
      if (u.role === 'admin' && p.role === 'gestor_master') {
        return { granted: true, fullAccess: true, allowedModules: [...ALL_MODULES], reason: 'full_access' };
      }
      const allowed = [...new Set((p.permissions || []).map(canon).filter(Boolean))];
      if (allowed.length === 0) return deny('no_permissions');
      return { granted: true, fullAccess: false, allowedModules: allowed, reason: 'explicit_permissions' };
    };
    const hasModuleAccess = (a, k) => {
      if (!a || !a.granted) return false;
      if (a.fullAccess) return true;
      const c = canon(k);
      return c ? a.allowedModules.includes(c) : false;
    };
    // Réplica do guard de salvamento de permissões (nunca 404)
    const saveGuard = (target) => {
      if (!target) return { status: 200, success: false, error: 'Perfil não encontrado — nenhuma alteração realizada.' };
      if (!target.user_id) return { status: 200, success: false, error: 'Perfil não vinculado — execute a reconciliação' };
      return { status: 200, success: true };
    };

    // ── Cenários ──
    const uAdmin = { id: 'U1', role: 'admin' };
    const uComum = { id: 'U2', role: 'user' };
    const results = [];
    const test = (name, actual, expected) => results.push({ name, expected, actual, pass: actual === expected });

    test('1. Usuário sem perfil = negado',
      resolveAccess(uComum, null).granted, false);
    test('2. Perfil sem user_id = negado',
      resolveAccess(uComum, { user_id: null, status: 'active', role: 'editor', permissions: ['Dashboard'] }).granted, false);
    test('3a. Status blocked = negado',
      resolveAccess(uComum, { user_id: 'U2', status: 'blocked', role: 'editor', permissions: ['Dashboard'] }).granted, false);
    test('3b. Status pending_password_change = negado',
      resolveAccess(uComum, { user_id: 'U2', status: 'pending_password_change', role: 'editor', permissions: ['Dashboard'] }).granted, false);
    test('4. Módulo ausente nas permissões = negado',
      hasModuleAccess(resolveAccess(uComum, { user_id: 'U2', status: 'active', role: 'personalizado', permissions: ['Dashboard'] }), 'Usuários'), false);
    test('5. Módulo explícito = permitido (com alias acentuado)',
      hasModuleAccess(resolveAccess(uComum, { user_id: 'U2', status: 'active', role: 'personalizado', permissions: ['Certificações'] }), 'Certificacoes'), true);
    test('6. Admin SEM gestor_master ativo = sem acesso total',
      resolveAccess(uAdmin, { user_id: 'U1', status: 'active', role: 'editor', permissions: [] }).fullAccess, false);
    test('6b. Admin com perfil gestor_master INATIVO = negado',
      resolveAccess(uAdmin, { user_id: 'U1', status: 'blocked', role: 'gestor_master', permissions: [] }).granted, false);
    test('7. Admin + gestor_master ativo vinculado = acesso total',
      resolveAccess(uAdmin, { user_id: 'U1', status: 'active', role: 'gestor_master', permissions: [] }).fullAccess, true);
    test('8a. Salvamento sem perfil = 200 (não 404)',
      saveGuard(null).status, 200);
    test('8b. Salvamento com perfil não vinculado = bloqueado com mensagem de reconciliação',
      saveGuard({ user_id: null }).error, 'Perfil não vinculado — execute a reconciliação');
    test('9. user_id divergente = negado',
      resolveAccess(uComum, { user_id: 'OUTRO', status: 'active', role: 'editor', permissions: ['Dashboard'] }).granted, false);
    test('10. Rota desconhecida = negado',
      hasModuleAccess(resolveAccess(uComum, { user_id: 'U2', status: 'active', role: 'personalizado', permissions: ['Dashboard'] }), 'RotaInexistente'), false);

    const passed = results.filter(r => r.pass).length;
    return Response.json({ total: results.length, passed, failed: results.length - passed, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});