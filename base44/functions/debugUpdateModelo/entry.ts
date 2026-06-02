import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Busca o primeiro modelo
    const models = await base44.asServiceRole.entities.CertificateModel.list('-updated_date', 1);
    if (!models.length) return Response.json({ error: 'no models' });
    
    const model = models[0];
    console.log('Model ID:', model.id);
    console.log('Before update - technical_responsibles:', JSON.stringify(model.technical_responsibles));

    // Faz um update simples com um campo de texto primeiro
    const updateResult = await base44.asServiceRole.entities.CertificateModel.update(model.id, {
      notes_test: 'test_' + Date.now()
    });
    console.log('Update result (text field):', JSON.stringify(updateResult));

    // Agora tenta atualizar technical_responsibles com um item simples
    const testResponsibles = (model.technical_responsibles || []).map((r, i) => {
      if (i === 0) return { ...r, _test_flag: 'updated_' + Date.now() };
      return r;
    });

    const updateResult2 = await base44.asServiceRole.entities.CertificateModel.update(model.id, {
      technical_responsibles: testResponsibles
    });
    console.log('Update result (array field):', JSON.stringify(updateResult2));

    // Re-busca para verificar
    const refreshed = await base44.asServiceRole.entities.CertificateModel.list('-updated_date', 1);
    const recheck = refreshed[0];
    
    return Response.json({
      model_id: model.id,
      before: (model.technical_responsibles || []).map(r => ({ name: r.name, has_sig_id: !!r.signature_id })),
      after: (recheck.technical_responsibles || []).map(r => ({ name: r.name, has_sig_id: !!r.signature_id, test_flag: r._test_flag })),
      update_result_2: updateResult2,
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});