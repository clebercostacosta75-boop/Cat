import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const operator = await base44.auth.me();
    if (!operator || operator.role !== 'admin') return Response.json({ error: 'Apenas administrador nativo' }, { status: 403 });
    const ids = ['dashboard', 'certificacoes', 'usuarios', 'cursos'];
    const aliases = { Dashboard: 'dashboard', Certificações: 'certificacoes', Certificacoes: 'certificacoes', Usuários: 'usuarios', Users: 'usuarios', Cursos: 'cursos' };
    const canon = key => ids.includes(key) ? key : aliases[key] || null;
    const deny = reason => ({ granted: false, fullAccess: false, allowedModules: [], reason });
    const resolve = (user, profile) => {
      if (!user) return deny('not_authenticated');
      if (!profile) return deny('no_profile');
      if (!profile.user_id) return deny('profile_unlinked');
      if (profile.user_id !== user.id) return deny('profile_mismatch');
      if (profile.status !== 'active') return deny('status_invalid');
      if (profile.role === 'gestor_master') return { granted: true, fullAccess: true, allowedModules: ids };
      const allowedModules = [...new Set((profile.permissions || []).map(canon).filter(Boolean))];
      return allowedModules.length ? { granted: true, fullAccess: false, allowedModules } : deny('no_permissions');
    };
    const has = (access, key) => !!access?.granted && (access.fullAccess || access.allowedModules.includes(canon(key)));
    const user = { id: 'U1', role: 'user' };
    const tests = [];
    const test = (name, actual, expected) => tests.push({ name, actual, expected, pass: actual === expected });
    test('Usuário sem perfil é negado', resolve(user, null).granted, false);
    test('Perfil sem user_id é negado', resolve(user, { status: 'active', permissions: ['dashboard'] }).granted, false);
    test('Vínculo divergente é negado', resolve(user, { user_id: 'U2', status: 'active', permissions: ['dashboard'] }).granted, false);
    test('Perfil inativo é negado', resolve(user, { user_id: 'U1', status: 'blocked', permissions: ['dashboard'] }).granted, false);
    test('Lista vazia é negada', resolve(user, { user_id: 'U1', status: 'active', role: 'cliente', permissions: [] }).granted, false);
    test('Módulo explícito por ID é permitido', has(resolve(user, { user_id: 'U1', status: 'active', role: 'personalizado', permissions: ['dashboard'] }), 'dashboard'), true);
    test('Alias antigo é normalizado', has(resolve(user, { user_id: 'U1', status: 'active', role: 'personalizado', permissions: ['certificacoes'] }), 'Certificacoes'), true);
    test('Rota não autorizada é negada', has(resolve(user, { user_id: 'U1', status: 'active', role: 'cliente', permissions: ['dashboard'] }), 'usuarios'), false);
    test('Módulo desconhecido é negado', has(resolve(user, { user_id: 'U1', status: 'active', role: 'cliente', permissions: ['dashboard'] }), 'desconhecido'), false);
    test('Gestor Master ativo e vinculado tem acesso integral', resolve(user, { user_id: 'U1', status: 'active', role: 'gestor_master', permissions: [] }).fullAccess, true);
    const passed = tests.filter(t => t.pass).length;
    return Response.json({ total: tests.length, passed, failed: tests.length - passed, tests });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});