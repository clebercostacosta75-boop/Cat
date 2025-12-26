import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { 
  requireAuth, 
  requireInstructorOwnership, 
  validateInput,
  checkRateLimit,
  sanitizeData 
} from './securityMiddleware.js';

Deno.serve(async (req) => {
  try {
    // 1. Verificar autenticação
    const { base44, user } = await requireAuth(req);
    
    const { turma_id } = await req.json();

    // 2. Validar entrada
    validateInput({ turma_id }, ['turma_id']);

    // 3. Verificar rate limit (máximo 5 finalizações por minuto)
    checkRateLimit(user.id, 'finalizarTurma', 5, 60000);

    // 4. Verificar permissão: apenas instrutor da turma ou admin pode finalizar
    const userRole = user.custom_role || user.role || 'user';
    let turma;
    
    if (userRole === 'Instrutor') {
      // Se for instrutor, verificar se é o dono da turma
      const ownership = await requireInstructorOwnership(base44, user, turma_id);
      turma = ownership.turma;
    } else if (userRole === 'Administrador Master' || userRole === 'admin') {
      // Admin pode finalizar qualquer turma
      const turmas = await base44.asServiceRole.entities.ClassSchedule.filter({ id: turma_id });
      if (turmas.length === 0) {
        return Response.json({ error: 'Turma não encontrada' }, { status: 404 });
      }
      turma = turmas[0];
    } else {
      return Response.json({ 
        error: 'Forbidden: Você não tem permissão para finalizar turmas' 
      }, { status: 403 });
    }

    // 5. Atualizar status para Concluído
    await base44.asServiceRole.entities.ClassSchedule.update(turma_id, {
      status: 'Concluído'
    });

    // 6. Registrar no log de auditoria (dados sanitizados)
    const auditData = sanitizeData({
      msg: 'Turma finalizada. Liberado para faturamento e pagamento de instrutor',
      empresa: turma.company_name,
      instrutor: turma.instructor_name,
      valor_total: turma.total_value,
      finalized_by_role: userRole
    });
    
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      user_name: user.full_name || user.email,
      user_email: user.email,
      action: 'TURMA_CONCLUÍDA',
      entity: 'ClassSchedule',
      entity_id: turma_id,
      entity_name: turma.training_name,
      details: auditData,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
      user_agent: req.headers.get('user-agent') || ''
    });

    // 7. Buscar usuários admin e financeiro para notificar (somente roles autorizadas)
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminsFinanceiros = allUsers.filter(u => 
      u.custom_role === 'Administrador Master' || 
      u.custom_role === 'Financeiro' ||
      u.role === 'admin'
    );

    // 8. Preparar notificações (sem expor dados sensíveis)
    const notificacoes = [];
    for (const admin of adminsFinanceiros) {
      if (admin.phone && admin.is_whatsapp) {
        // Sanitizar mensagem - não incluir valores exatos, apenas indicação
        const mensagem = `🎓 *Turma Finalizada*\n\n` +
          `*Curso:* ${turma.training_name}\n` +
          `*Empresa:* ${turma.company_name}\n` +
          `*Instrutor:* ${turma.instructor_name}\n\n` +
          `✅ Ações necessárias:\n` +
          `• Gerar BMM no sistema\n` +
          `• Processar pagamento do instrutor\n\n` +
          `Acesse o sistema para mais detalhes.`;

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