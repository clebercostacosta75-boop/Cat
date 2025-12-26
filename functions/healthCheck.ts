import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Endpoint de Health Check para monitoramento do sistema
 * Verifica conectividade com banco de dados e status geral
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Testar conexão com banco de dados
    const testQuery = await base44.asServiceRole.entities.User.list();
    
    // Verificar se há dados críticos
    const [companies, courses, instructors] = await Promise.all([
      base44.asServiceRole.entities.Company.list(),
      base44.asServiceRole.entities.Course.list(),
      base44.asServiceRole.entities.Instructor.list()
    ]);

    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      entities: {
        companies: companies.length,
        courses: courses.length,
        instructors: instructors.length
      },
      version: '1.0.0'
    });

  } catch (error) {
    return Response.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
      details: error.message
    }, { status: 503 });
  }
});