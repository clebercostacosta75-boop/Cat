import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cursos } = await req.json();
    if (!Array.isArray(cursos) || cursos.length === 0) {
      return Response.json({ error: 'Envie um array de cursos com: name, validity, description' }, { status: 400 });
    }

    const resultados = [];
    for (const curso of cursos) {
      try {
        const created = await base44.asServiceRole.entities.Course.create({
          name: curso.name || curso.nome || '',
          validity: curso.validity || curso.validade || '',
          description: curso.description || curso.descricao || ''
        });

        // Registrar auditoria
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: user.email,
          action: 'create',
          entity_type: 'Course',
          entity_id: created.id,
          entity_name: created.name,
          details: `Curso criado via assistente: ${created.name}`,
          ip_address: 'assistant-function'
        });

        resultados.push({
          success: true,
          id: created.id,
          name: created.name
        });
      } catch (e) {
        resultados.push({
          success: false,
          name: curso.name || curso.nome,
          error: e.message
        });
      }
    }

    return Response.json({
      total: cursos.length,
      criados: resultados.filter(r => r.success).length,
      erros: resultados.filter(r => !r.success).length,
      resultados
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});