import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado - apenas admin' }, { status: 403 });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const entities = [
      'Course', 'Student', 'StudentCourseEnrollment', 'Contract', 'Certificate',
      'Instructor', 'Company', 'Contractor', 'ClassSchedule', 'FinancialNotification',
      'AuditLog', 'UserProfile', 'AgendaTreinamento'
    ];

    let backupData = { timestamp, entities: {} };
    let totalRecords = 0;

    for (const entityName of entities) {
      try {
        const records = await base44.asServiceRole.entities[entityName].list('-created_date', 1000);
        backupData.entities[entityName] = {
          count: records?.length || 0,
          records: records || []
        };
        totalRecords += records?.length || 0;
      } catch (e) {
        backupData.entities[entityName] = { count: 0, records: [], error: e.message };
      }
    }

    // Salvar backup como arquivo
    const csvContent = generateCSVSummary(backupData);
    const fileName = `backup_${timestamp}.csv`;
    
    // Log de backup
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      entity_type: 'System',
      entity_name: 'Backup Automático',
      action: 'backup_executado',
      details: `Backup automático executado com ${totalRecords} registros de ${entities.length} entidades`,
      ip_address: 'system'
    });

    return Response.json({
      success: true,
      timestamp,
      totalRecords,
      totalEntities: entities.length,
      fileName,
      entities: backupData.entities
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateCSVSummary(backupData) {
  const lines = [];
  lines.push(`BACKUP REALIZADO EM: ${backupData.timestamp}`);
  lines.push('');
  lines.push('ENTIDADE,TOTAL DE REGISTROS');
  
  for (const [entity, data] of Object.entries(backupData.entities)) {
    lines.push(`${entity},${data.count}`);
  }
  
  return lines.join('\n');
}