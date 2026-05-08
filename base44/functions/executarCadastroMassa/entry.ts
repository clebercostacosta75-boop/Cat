import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity, registros } = await req.json();
    if (!entity || !Array.isArray(registros)) {
      return Response.json({ 
        error: 'Envie: {entity: "Course", registros: [{...}, {...}]}' 
      }, { status: 400 });
    }

    const resultados = [];
    
    for (const data of registros) {
      try {
        const created = await base44.asServiceRole.entities[entity].create(data);
        
        try {
          await base44.asServiceRole.entities.AuditLog.create({
            user_email: user.email,
            action: 'create',
            entity_type: entity,
            entity_id: created.id,
            entity_name: data.name || data.full_name || data.company_name || 'Registro',
            details: `Cadastro em massa via assistente`,
            ip_address: 'assistant-function'
          });
        } catch (e) {}

        resultados.push({
          success: true,
          id: created.id,
          name: data.name || data.full_name || data.company_name
        });
      } catch (e) {
        resultados.push({
          success: false,
          name: data.name || data.full_name || data.company_name,
          error: e.message
        });
      }
    }

    const sucessos = resultados.filter(r => r.success).length;
    const erros = resultados.filter(r => !r.success).length;

    return Response.json({
      success: sucessos > 0,
      entity,
      total: registros.length,
      sucessos,
      erros,
      resultados,
      message: `✅ ${sucessos}/${registros.length} ${entity}s cadastrados`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});