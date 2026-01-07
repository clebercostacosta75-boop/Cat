import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { month, year, instructors } = await req.json();

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const notifications = [];

    for (const instructor of instructors) {
      if (instructor.pendingValue <= 0) continue;

      // Criar notificação no sistema
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_id: instructor.id,
          type: 'payment_pending',
          title: 'Pagamento Pendente',
          message: `Você possui R$ ${instructor.pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pendente de pagamento referente ao período ${monthNames[parseInt(month) - 1]}/${year}.`,
          priority: 'high',
          link: '/instructor-financial-control'
        });
      } catch (notifError) {
        console.error('Erro ao criar notificação:', notifError);
      }

      // Preparar envio de email
      if (instructor.email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: instructor.email,
            subject: `Notificação de Pagamento - ${monthNames[parseInt(month) - 1]}/${year}`,
            body: `
              <h2>Olá, ${instructor.name}!</h2>
              <p>Este é um lembrete sobre pagamentos pendentes:</p>
              <p><strong>Período:</strong> ${monthNames[parseInt(month) - 1]}/${year}</p>
              <p><strong>Valor Pendente:</strong> R$ ${instructor.pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p>Para mais detalhes, acesse o sistema de controle financeiro.</p>
              <br>
              <p>Atenciosamente,<br>Equipe Administrativa</p>
            `
          });
          
          notifications.push({
            instructor: instructor.name,
            email: instructor.email,
            status: 'sent'
          });
        } catch (emailError) {
          console.error('Erro ao enviar email:', emailError);
          notifications.push({
            instructor: instructor.name,
            email: instructor.email,
            status: 'failed',
            error: emailError.message
          });
        }
      }

      // Preparar mensagem WhatsApp
      if (instructor.phone) {
        const message = `Olá ${instructor.name}! 📱\n\nLembramos que você possui *R$ ${instructor.pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}* pendente de pagamento referente a *${monthNames[parseInt(month) - 1]}/${year}*.\n\nQualquer dúvida, entre em contato conosco.`;
        
        notifications.push({
          instructor: instructor.name,
          phone: instructor.phone,
          message: message,
          type: 'whatsapp'
        });
      }
    }

    // Log de auditoria
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: user.id,
        user_name: user.full_name,
        user_email: user.email,
        action: 'ENVIO_EMAIL',
        entity: 'Pagamentos',
        details: {
          month,
          year,
          instructorsNotified: instructors.length,
          notifications
        }
      });
    } catch (auditError) {
      console.error('Erro ao criar log de auditoria:', auditError);
    }

    return Response.json({
      success: true,
      notifications,
      totalNotified: notifications.filter(n => n.status === 'sent' || n.type === 'whatsapp').length
    });

  } catch (error) {
    console.error('Erro ao notificar pagamentos pendentes:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});