import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Lê como user normal (não service role) — igual ao frontend
    const models = await base44.entities.CertificateModel.list('-updated_date', 10);
    
    return Response.json({
      total: models.length,
      models: models.map(m => ({
        name: m.name,
        id: m.id,
        responsibles: (m.technical_responsibles || []).map(r => ({
          name: r.name,
          signature_id: r.signature_id || null,
          has_url: !!r.signature_url,
        }))
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});