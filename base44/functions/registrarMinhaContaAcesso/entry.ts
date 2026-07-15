import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });
    const accounts = await base44.asServiceRole.entities.AccessAccount.filter({ user_id: user.id });
    if (accounts.length !== 1 || accounts[0].status !== 'ativo') return Response.json({ success: false }, { status: 409 });
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.AccessAccount.update(accounts[0].id, { last_access_at: now });
    return Response.json({ success: true, last_access_at: now });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});