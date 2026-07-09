import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data, changed_fields, payload_too_large } = payload;

    if (!event || !event.entity_name) {
      return Response.json({ ok: true, msg: 'Evento inválido' });
    }

    const user = await base44.auth.me().catch(() => null);
    const userEmail = user?.email || 'sistema';

    // Se o payload for muito grande, buscar dados da entidade diretamente
    let entityData = data;
    let entityOldData = old_data;
    if (payload_too_large && event.entity_id) {
      try {
        entityData = await base44.asServiceRole.entities[event.entity_name]?.get(event.entity_id) || null;
      } catch {
        entityData = null;
      }
    }

    // Helper: trunca valores longos para não estourar o campo details do AuditLog
    const truncateVal = (v) => {
      if (typeof v === 'string' && v.length > 200) return v.substring(0, 200) + '...';
      if (v && typeof v === 'object') {
        const s = JSON.stringify(v);
        if (s.length > 200) return s.substring(0, 200) + '...';
      }
      return v;
    };

    // Determinar tipo de ação (enum do AuditLog: create, update, delete, view, etc.)
    let actionType = 'view';
    let details = '';

    if (event.type === 'create') {
      actionType = 'create';
      details = `Novo registro criado`;
    } else if (event.type === 'update') {
      actionType = 'update';
      const changedFieldsList = changed_fields?.slice(0, 15).join(', ') || 'campos desconhecidos';
      details = `Campos alterados: ${changedFieldsList}`;

      if (entityOldData && entityData) {
        const changes = {};
        for (const field of (changed_fields || []).slice(0, 10)) {
          changes[field] = {
            antes: truncateVal(entityOldData[field]),
            depois: truncateVal(entityData[field])
          };
        }
        let changesStr = JSON.stringify(changes);
        if (changesStr.length > 1500) changesStr = changesStr.substring(0, 1500) + '...[truncado]';
        details += ` | Mudanças: ${changesStr}`;
      }
    } else if (event.type === 'delete') {
      actionType = 'delete';
      details = `Registro deletado`;
    }

    // Registrar em AuditLog (com retry — eventos em massa causavam falha por limite de requisições)
    const record = {
      user_email: userEmail,
      action: actionType,
      entity_type: event.entity_name,
      entity_id: event.entity_id,
      entity_name: entityData?.full_name || entityData?.name || entityData?.student_name || event.entity_id,
      details: details,
      ip_address: 'entity-automation'
    };
    let lastErr = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        await base44.asServiceRole.entities.AuditLog.create(record);
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        await new Promise(r => setTimeout(r, 400 * (attempt + 1) + Math.random() * 300));
      }
    }
    if (lastErr) throw lastErr;

    return Response.json({ ok: true, msg: 'Alteração registrada' });
  } catch (error) {
    console.error('[registrarAlteracao] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});