import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [models, sigs] = await Promise.all([
      base44.asServiceRole.entities.CertificateModel.list('-updated_date', 50),
      base44.asServiceRole.entities.DigitalSignature.list('-created_date', 100),
    ]);

    const normalize = (s) => (s || "").trim().toLowerCase();

    let updated = 0;
    const details = [];

    for (const model of models) {
      if (!model.technical_responsibles?.length) continue;

      let changed = false;
      const newResponsibles = model.technical_responsibles.map(r => {
        // Se já tem ambos, não precisa tocar
        if (r.signature_id && r.signature_url) return r;
        // Busca pelo nome
        const sig = sigs.find(s => normalize(s.name) === normalize(r.name));
        if (sig) {
          changed = true;
          return { ...r, signature_id: sig.id, signature_url: sig.signature_url };
        }
        return r;
      });

      if (!changed) continue;

      await base44.asServiceRole.entities.CertificateModel.update(model.id, {
        technical_responsibles: newResponsibles,
      });
      updated++;
      details.push({
        model: model.name,
        responsibles: newResponsibles.map(r => ({
          name: r.name,
          linked: !!r.signature_id,
          has_url: !!r.signature_url,
        })),
      });
    }

    return Response.json({ success: true, models_updated: updated, details });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});