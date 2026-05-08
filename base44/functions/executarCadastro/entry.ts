import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity, data } = await req.json();
    if (!entity || !data) {
      return Response.json({ error: 'Envie: {entity: "Course", data: {...}}' }, { status: 400 });
    }

    try {
      const created = await base44.asServiceRole.entities[entity].create(data);
      
      // Auditoria
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: user.email,
          action: 'create',
          entity_type: entity,
          entity_id: created.id,
          entity_name: data.name || data.full_name || data.company_name || 'Registro',
          details: `Cadastro criado via assistente: ${entity}`,
          ip_address: 'assistant-function'
        });
      } catch (e) {
        console.log('Aviso auditoria:', e.message);
      }

      return Response.json({
        success: true,
        entity,
        id: created.id,
        message: `✅ ${entity} cadastrado com sucesso! ID: ${created.id}`
      });
    } catch (e) {
      return Response.json({ 
        success: false, 
        error: e.message 
      }, { status: 400 });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});