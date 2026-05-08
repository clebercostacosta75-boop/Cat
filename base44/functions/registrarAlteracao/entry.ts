import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data, changed_fields } = payload;

    if (!event || !event.entity_name) {
      return Response.json({ ok: true, msg: 'Evento inválido' });
    }

    const user = await base44.auth.me().catch(() => null);
    const userEmail = user?.email || 'sistema';

    // Determinar tipo de ação
    let actionType = 'desconhecida';
    let details = '';

    if (event.type === 'create') {
      actionType = 'create';
      details = `Novo registro criado`;
    } else if (event.type === 'update') {
      actionType = 'update';
      const changedFieldsList = changed_fields?.join(', ') || 'campos desconhecidos';
      details = `Campos alterados: ${changedFieldsList}`;

      // Capturar valores anteriores vs novos
      if (old_data && data) {
        const changes = {};
        for (const field of changed_fields || []) {
          changes[field] = {
            antes: old_data[field],
            depois: data[field]
          };
        }
        details += ` | Mudanças: ${JSON.stringify(changes)}`;
      }
    } else if (event.type === 'delete') {
      actionType = 'delete';
      details = `Registro deletado`;
    }

    // Registrar em AuditLog
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: userEmail,
      action: actionType,
      entity_type: event.entity_name,
      entity_id: event.entity_id,
      entity_name: data?.full_name || data?.name || data?.student_name || event.entity_id,
      details: details,
      ip_address: 'entity-automation'
    });

    return Response.json({ ok: true, msg: 'Alteração registrada' });
  } catch (error) {
    console.error('[registrarAlteracao] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});