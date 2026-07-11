import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Registra tentativas de acesso negadas/falhas no AccessLog.
// Chamado pelo frontend quando o usuário não consegue entrar no app
// (usuário sem permissão de escrita — por isso usa service role).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const allowed = ['login_failed', 'not_registered', 'blocked', 'consent_required', 'token_expired', 'access_denied'];
    const eventType = allowed.includes(body.event_type) ? body.event_type : 'login_failed';

    const user = await base44.auth.me().catch(() => null);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';

    await base44.asServiceRole.entities.AccessLog.create({
      user_email: user?.email || String(body.user_email || '').slice(0, 200),
      event_type: eventType,
      reason: String(body.reason || '').slice(0, 300),
      module: String(body.module || 'Login').slice(0, 120),
      session_id: String(body.session_id || '').slice(0, 64),
      ip_address: ip,
      user_agent: (req.headers.get('user-agent') || '').slice(0, 300),
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});