import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado - apenas admin pode deletar' }, { status: 403 });
    }

    const { entity_name, entity_id, confirm_token } = await req.json();
    
    if (!entity_name || !entity_id) {
      return Response.json({ error: 'entity_name e entity_id são obrigatórios' }, { status: 400 });
    }

    // Token de confirmação dupla (implementado no frontend)
    if (!confirm_token || confirm_token.length < 20) {
      return Response.json({ 
        error: 'Confirmação dupla obrigatória',
        requiresConfirmation: true 
      }, { status: 403 });
    }

    // Registrar a exclusão em auditoria ANTES de deletar
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      entity_type: entity_name,
      entity_id: entity_id,
      action: 'delete',
      details: `Usuário ${user.full_name} deletou registro ${entity_id} da entidade ${entity_name}`,
      ip_address: 'backend-function'
    });

    // Deletar registro
    await base44.asServiceRole.entities[entity_name].delete(entity_id);

    return Response.json({
      success: true,
      message: `Registro ${entity_id} deletado com sucesso`,
      auditedAt: new Date().toISOString(),
      deletedBy: user.email
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});