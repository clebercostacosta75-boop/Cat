import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.custom_role !== 'Administrador Master') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const notifications = [];
    
    // Buscar todos os usuários e suas preferências
    const users = await base44.asServiceRole.entities.User.list();
    const preferences = await base44.asServiceRole.entities.NotificationPreference.list();
    const prefsMap = Object.fromEntries(preferences.map(p => [p.user_id, p]));

    // Buscar dados necessários
    const completedClasses = await base44.asServiceRole.entities.ClassSchedule.filter({ status: 'Concluído' });
    const courses = await base44.asServiceRole.entities.Course.list();
    const scheduledClasses = await base44.asServiceRole.entities.ClassSchedule.filter({ status: 'Agendado' });

    // 1. Verificar cursos expirando
    for (const classItem of completedClasses) {
      const course = courses.find(c => c.name === classItem.training_name);
      if (!course || !course.validity || !classItem.end_date) continue;

      const validityMonths = parseInt(course.validity);
      if (isNaN(validityMonths)) continue;

      const expirationDate = new Date(classItem.end_date);
      expirationDate.setMonth(expirationDate.getMonth() + validityMonths);

      const today = new Date();
      const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

      // Notificar usuários com permissão
      for (const u of users) {
        const userPrefs = prefsMap[u.id] || { course_expiring_enabled: true, course_expiring_days_before: 30 };
        
        if (!userPrefs.course_expiring_enabled) continue;
        if (daysUntilExpiration > userPrefs.course_expiring_days_before || daysUntilExpiration < 0) continue;

        // Verificar se já existe notificação similar
        const existing = await base44.asServiceRole.entities.Notification.filter({
          user_id: u.id,
          type: 'course_expiring',
          related_entity_id: classItem.id
        });

        if (existing.length === 0) {
          const priority = daysUntilExpiration <= 7 ? 'urgent' : daysUntilExpiration <= 30 ? 'high' : 'medium';
          
          await base44.asServiceRole.entities.Notification.create({
            user_id: u.id,
            type: 'course_expiring',
            title: '⏰ Curso Próximo do Vencimento',
            message: `O treinamento "${classItem.training_name}" da empresa "${classItem.company_name}" vence em ${daysUntilExpiration} dias.`,
            link: `/recycling-alerts`,
            related_entity: 'ClassSchedule',
            related_entity_id: classItem.id,
            priority,
          });
          
          notifications.push({
            user: u.email,
            type: 'course_expiring',
            class: classItem.training_name,
            days: daysUntilExpiration
          });
        }
      }
    }

    // 2. Verificar turmas com vagas limitadas
    for (const classItem of scheduledClasses) {
      if (!classItem.students_count) continue;

      const maxStudents = 30; // Capacidade padrão
      const availableSlots = maxStudents - classItem.students_count;

      for (const u of users) {
        const userPrefs = prefsMap[u.id] || { class_slots_limited_enabled: true, class_slots_threshold: 5 };
        
        if (!userPrefs.class_slots_limited_enabled) continue;
        if (availableSlots > userPrefs.class_slots_threshold || availableSlots <= 0) continue;

        const existing = await base44.asServiceRole.entities.Notification.filter({
          user_id: u.id,
          type: 'class_slots_limited',
          related_entity_id: classItem.id
        });

        if (existing.length === 0) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: u.id,
            type: 'class_slots_limited',
            title: '🎯 Vagas Limitadas',
            message: `A turma "${classItem.training_name}" tem apenas ${availableSlots} vagas restantes.`,
            link: `/class-details?id=${classItem.id}`,
            related_entity: 'ClassSchedule',
            related_entity_id: classItem.id,
            priority: 'medium',
          });
          
          notifications.push({
            user: u.email,
            type: 'class_slots_limited',
            class: classItem.training_name,
            slots: availableSlots
          });
        }
      }
    }

    // 3. Verificar pagamentos pendentes de instrutores
    const classesWithPendingPayment = await base44.asServiceRole.entities.ClassSchedule.filter({
      status: 'Concluído',
      payment_status: 'Pendente'
    });

    for (const classItem of classesWithPendingPayment) {
      for (const u of users) {
        const userPrefs = prefsMap[u.id] || { payment_pending_enabled: true };
        if (!userPrefs.payment_pending_enabled) continue;

        // Notificar apenas admins e financeiro
        if (u.custom_role !== 'Administrador Master' && u.custom_role !== 'Financeiro' && u.role !== 'admin') continue;

        const existing = await base44.asServiceRole.entities.Notification.filter({
          user_id: u.id,
          type: 'payment_pending',
          related_entity_id: classItem.id
        });

        if (existing.length === 0) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: u.id,
            type: 'payment_pending',
            title: '💰 Pagamento Pendente',
            message: `O pagamento do instrutor "${classItem.instructor_name}" para a turma "${classItem.training_name}" está pendente.`,
            link: `/class-details?id=${classItem.id}`,
            related_entity: 'ClassSchedule',
            related_entity_id: classItem.id,
            priority: 'high',
          });
          
          notifications.push({
            user: u.email,
            type: 'payment_pending',
            instructor: classItem.instructor_name,
            class: classItem.training_name
          });
        }
      }
    }

    return Response.json({
      success: true,
      notifications_created: notifications.length,
      details: notifications
    });

  } catch (error) {
    console.error('Erro ao verificar notificações:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});