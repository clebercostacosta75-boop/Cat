import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sigs = await base44.asServiceRole.entities.DigitalSignature.list('-created_date', 100);
    console.log('Assinaturas encontradas:', sigs.map(s => ({ id: s.id, name: s.name, has_url: !!s.signature_url })));

    // Busca TODOS os modelos
    const models = await base44.asServiceRole.entities.CertificateModel.list('-updated_date', 50);
    console.log('Total de modelos:', models.length);

    const normalize = (s) => (s || "").trim().toLowerCase();
    const results = [];

    for (const model of models) {
      const resps = model.technical_responsibles || [];
      const hasUnlinked = resps.some(r => !r.signature_id || !r.signature_url);
      
      if (!hasUnlinked) {
        results.push({ model: model.name, status: 'ja_vinculado' });
        continue;
      }

      const newResps = resps.map(r => {
        const sig = sigs.find(s => normalize(s.name) === normalize(r.name));
        if (sig) {
          return {
            name: r.name,
            title: r.title || '',
            titles: r.titles || [],
            registration: r.registration || '',
            signature_id: sig.id,
            signature_url: sig.signature_url,
          };
        }
        return r;
      });

      console.log(`Atualizando modelo ${model.name} (${model.id})...`);
      console.log('Novos responsáveis:', JSON.stringify(newResps.map(r => ({ name: r.name, sig_id: r.signature_id, has_url: !!r.signature_url }))));

      const updateResult = await base44.asServiceRole.entities.CertificateModel.update(model.id, {
        technical_responsibles: newResps,
      });

      const after = (updateResult.technical_responsibles || []);
      console.log(`Resultado após update:`, JSON.stringify(after.map(r => ({ name: r.name, sig_id: r.signature_id, has_url: !!r.signature_url }))));

      results.push({
        model: model.name,
        id: model.id,
        status: 'atualizado',
        before_had_sig: resps.some(r => !!r.signature_id),
        after_has_sig: after.some(r => !!r.signature_id),
      });
    }

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});