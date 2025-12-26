import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { turma_id } = await req.json();

    if (!turma_id) {
      return Response.json({ error: 'turma_id é obrigatório' }, { status: 400 });
    }

    // 1. Buscar turma
    const turmas = await base44.asServiceRole.entities.ClassSchedule.filter({ id: turma_id });
    if (turmas.length === 0) {
      return Response.json({ error: 'Turma não encontrada' }, { status: 404 });
    }

    const turma = turmas[0];

    // 2. Atualizar status para Concluído
    await base44.asServiceRole.entities.ClassSchedule.update(turma_id, {
      status: 'Concluído'
    });

    // 3. Registrar no log de auditoria
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      user_name: user.full_name || user.email,
      user_email: user.email,
      action: 'TURMA_CONCLUÍDA',
      entity: 'ClassSchedule',
      entity_id: turma_id,
      entity_name: turma.training_name,
      details: {
        msg: 'Turma finalizada. Liberado para faturamento e pagamento de instrutor',
        empresa: turma.company_name,
        instrutor: turma.instructor_name,
        valor_total: turma.total_value
      },
      ip_address: '',
      user_agent: req.headers.get('user-agent') || ''
    });

    // 4. Buscar usuários admin e financeiro para notificar
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminsFinanceiros = allUsers.filter(u => 
      u.custom_role === 'Administrador Master' || 
      u.custom_role === 'Financeiro' ||
      u.role === 'admin'
    );

    // 5. Enviar notificações via WhatsApp para admins com WhatsApp cadastrado
    const notificacoes = [];
    for (const admin of adminsFinanceiros) {
      if (admin.phone && admin.is_whatsapp) {
        const mensagem = `🎓 *Turma Finalizada*\n\n` +
          `*Curso:* ${turma.training_name}\n` +
          `*Empresa:* ${turma.company_name}\n` +
          `*Instrutor:* ${turma.instructor_name}\n` +
          `*Valor Total:* R$ ${turma.total_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}\n\n` +
          `✅ Liberado para:\n` +
          `• Geração do BMM\n` +
          `• Pagamento do instrutor`;

        notificacoes.push({
          admin: admin.full_name || admin.email,
          phone: admin.phone,
          mensagem: mensagem
        });
      }
    }

    return Response.json({
      success: true,
      message: 'Turma finalizada com sucesso',
      turma: {
        id: turma_id,
        nome: turma.training_name,
        empresa: turma.company_name
      },
      notificacoes: notificacoes
    });

  } catch (error) {
    console.error('Erro ao finalizar turma:', error);
    return Response.json({ 
      error: error.message || 'Erro desconhecido' 
    }, { status: 500 });
  }
});