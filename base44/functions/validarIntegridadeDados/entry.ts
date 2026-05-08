import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Função de auditoria: Monitora integridade de dados críticos
 * Alerta se há deletions em massa detectadas
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.custom_role !== 'Administrador Master') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const alerts = [];
    const warnings = [];

    // Verificar quantidades mínimas esperadas
    const [students, enrollments, contracts, certificates] = await Promise.all([
      base44.asServiceRole.entities.Student.list(),
      base44.asServiceRole.entities.StudentCourseEnrollment.list(),
      base44.asServiceRole.entities.Contract.list(),
      base44.asServiceRole.entities.Certificate.list(),
    ]);

    // 🔴 CRÍTICO: Se tem alunos mas nenhuma matrícula
    if (students.length > 0 && enrollments.length === 0) {
      alerts.push({
        severity: 'CRÍTICO',
        message: 'POSSÍVEL DELETION: Existem alunos mas NENHUMA matrícula encontrada',
        timestamp: new Date().toISOString(),
        action_required: 'Contatar suporte Base44 imediatamente para restaurar backup',
      });
    }

    // 🔴 CRÍTICO: Se tem contratos, mas nenhuma matrícula
    if (contracts.length > 0 && enrollments.length === 0) {
      alerts.push({
        severity: 'CRÍTICO',
        message: 'POSSÍVEL DELETION: Existem contratos mas NENHUMA matrícula',
        timestamp: new Date().toISOString(),
      });
    }

    // 🟡 AVISO: Desbalanço entre alunos e matrículas
    if (students.length > 0 && enrollments.length > 0) {
      const ratio = enrollments.length / students.length;
      if (ratio < 0.5) {
        warnings.push({
          severity: 'AVISO',
          message: `Desbalanço detectado: ${students.length} alunos mas apenas ${enrollments.length} matrículas (ratio: ${ratio.toFixed(2)})`,
          expected_ratio: 'Mínimo 1:1',
        });
      }
    }

    // 🟡 AVISO: Nenhum certificado mas há matrículas
    if (enrollments.length > 0 && certificates.length === 0) {
      warnings.push({
        severity: 'AVISO',
        message: `${enrollments.length} matrículas mas nenhum certificado gerado`,
        expected: 'Deveria haver certificados',
      });
    }

    return Response.json({
      status: alerts.length === 0 ? 'OK' : 'ALERTA',
      critical_alerts: alerts.length,
      warnings: warnings.length,
      alerts: alerts,
      warnings: warnings,
      data_snapshot: {
        total_students: students.length,
        total_enrollments: enrollments.length,
        total_contracts: contracts.length,
        total_certificates: certificates.length,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});