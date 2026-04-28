import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Verifica certificados vencendo em EXATAMENTE N dias e envia e-mails
 * para o aluno e para a empresa, usando os templates configurados em ConfiguracaoAlertas.
 * Chamada pela automação agendada com payload: { days: 30 } | { days: 15 } | { days: 5 }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const targetDays = body.days ?? 30;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + targetDays);
    const targetDateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // Buscar configuração do alerta para esse período
    const configs = await base44.asServiceRole.entities.ConfiguracaoAlertas.filter({ dias_antecedencia: targetDays });
    const config = configs.find(c => c.ativo !== false);

    if (!config) {
      return Response.json({
        success: true,
        message: `Nenhuma configuração ativa para ${targetDays} dias. Nada enviado.`,
        sent: 0,
      });
    }

    // Buscar certificados que vencem EXATAMENTE em targetDays dias
    const allCerts = await base44.asServiceRole.entities.Certificate.list('-valid_until', 1000);
    const expiring = allCerts.filter(cert => {
      if (!cert.valid_until || cert.status === 'revoked') return false;
      const validUntil = new Date(cert.valid_until + 'T00:00:00');
      validUntil.setHours(0, 0, 0, 0);
      const diffDays = Math.round((validUntil - today) / (1000 * 60 * 60 * 24));
      return diffDays === targetDays;
    });

    if (expiring.length === 0) {
      return Response.json({
        success: true,
        message: `Nenhum certificado vencendo em exatamente ${targetDays} dias.`,
        sent: 0,
      });
    }

    let sent = 0;
    const errors = [];

    for (const cert of expiring) {
      const validUntilFormatted = new Date(cert.valid_until + 'T12:00:00').toLocaleDateString('pt-BR');

      const replacer = (template) =>
        (template || '')
          .replace(/\{nome_aluno\}/g, cert.student_name || '')
          .replace(/\{nome_treinamento\}/g, cert.course_name || '')
          .replace(/\{data_vencimento\}/g, validUntilFormatted)
          .replace(/\{empresa\}/g, cert.client_name || '')
          .replace(/\{dias_restantes\}/g, String(targetDays));

      // E-mail para o ALUNO
      const studentEmail = cert.student_email || null;
      if (studentEmail && config.mensagem_aluno) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: studentEmail,
            subject: replacer(config.assunto_aluno) || `Certificado vencendo em ${targetDays} dias`,
            body: replacer(config.mensagem_aluno),
          });
          sent++;
        } catch (e) {
          errors.push(`Aluno ${cert.student_name}: ${e.message}`);
        }
      }

      // E-mail para a EMPRESA
      if (cert.client_id || cert.client_name) {
        let companyEmail = null;
        try {
          let companies = [];
          if (cert.client_id) {
            companies = await base44.asServiceRole.entities.Company.filter({ id: cert.client_id });
          }
          if (companies.length === 0 && cert.client_name) {
            const all = await base44.asServiceRole.entities.Company.list('-created_date', 500);
            companies = all.filter(c =>
              c.nome_fantasia === cert.client_name || c.razao_social === cert.client_name
            );
          }
          if (companies.length > 0) {
            companyEmail = companies[0].email_faturamento ||
              companies[0].contacts?.find(c => c.email)?.email ||
              null;
          }
        } catch { /* empresa não encontrada */ }

        if (companyEmail && config.mensagem_empresa) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: companyEmail,
              subject: replacer(config.assunto_empresa) || `Certificado de colaborador vencendo em ${targetDays} dias`,
              body: replacer(config.mensagem_empresa),
            });
            sent++;
          } catch (e) {
            errors.push(`Empresa ${cert.client_name}: ${e.message}`);
          }
        }
      }

      // Registrar no AuditLog
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: 'sistema@catcursos.com.br',
        user_name: 'Sistema Automático',
        action: 'send_whatsapp',
        entity_type: 'Certificate',
        entity_id: cert.id,
        entity_name: `${cert.student_name} — ${cert.course_name}`,
        details: `Alerta de e-mail ${targetDays} dias enviado. Vencimento: ${validUntilFormatted}.`,
        company_id: cert.client_id || '',
        company_name: cert.client_name || '',
      });
    }

    return Response.json({
      success: true,
      message: `${sent} e-mail(s) enviado(s) para ${expiring.length} certificado(s) vencendo em ${targetDays} dias.`,
      sent,
      total_certs: expiring.length,
      errors,
    });

  } catch (error) {
    console.error('Erro ao enviar alertas de e-mail:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});