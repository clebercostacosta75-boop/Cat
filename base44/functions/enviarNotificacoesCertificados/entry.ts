import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { alerts } = await req.json();
    
    if (!alerts || !Array.isArray(alerts) || alerts.length === 0) {
      return Response.json({ 
        error: 'Nenhum alerta fornecido',
        sent: 0 
      }, { status: 400 });
    }

    let sent = 0;
    const errors = [];

    // Processar cada alerta e enviar notificações
    for (const alert of alerts) {
      try {
        // Email para o aluno
        if (alert.student_email) {
          const riskLevel = alert.days_remaining <= 7 ? 'CRÍTICO' : 
                           alert.days_remaining <= 15 ? 'ALTO' : 'MÉDIO';
          
          const studentEmailBody = `
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
    .header { background: ${riskLevel === 'CRÍTICO' ? '#dc2626' : riskLevel === 'ALTO' ? '#ea580c' : '#d97706'}; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: white; padding: 20px; }
    .alert-box { background: ${riskLevel === 'CRÍTICO' ? '#fee2e2' : riskLevel === 'ALTO' ? '#fef3c7' : '#fef3c7'}; border-left: 4px solid ${riskLevel === 'CRÍTICO' ? '#dc2626' : riskLevel === 'ALTO' ? '#ea580c' : '#d97706'}; padding: 15px; margin: 15px 0; border-radius: 4px; }
    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
    .btn { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
    h1 { color: ${riskLevel === 'CRÍTICO' ? '#dc2626' : riskLevel === 'ALTO' ? '#ea580c' : '#d97706'}; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Alerta de Vencimento de Certificado</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${alert.student_name}</strong>,</p>
      
      <p>Seu certificado de <strong>${alert.course_name}</strong> está próximo do vencimento!</p>
      
      <div class="alert-box">
        <strong>Risco: ${riskLevel}</strong><br>
        <strong>Vence em:</strong> ${new Date(alert.valid_until).toLocaleDateString('pt-BR')}<br>
        <strong>Dias restantes:</strong> <span style="font-size: 18px; color: ${riskLevel === 'CRÍTICO' ? '#dc2626' : riskLevel === 'ALTO' ? '#ea580c' : '#d97706'}">${alert.days_remaining}</span>
      </div>

      <p>Para renovar seu certificado ou obter mais informações, clique no botão abaixo:</p>
      
      <center>
        <a href="${window?.location?.origin || 'https://app.catcursos.com'}/CertificateValidate?code=${alert.certificate_code}" class="btn">Ver Certificado</a>
      </center>

      <p style="margin-top: 20px; font-size: 12px; color: #666;">
        Código do certificado: <strong>${alert.certificate_code}</strong>
      </p>
    </div>
    <div class="footer">
      <p>Este é um e-mail automático de alerta. Não responda a este e-mail.</p>
      <p>Sistema de Certificação Digital - CAT Cursos</p>
    </div>
  </div>
</body>
</html>
          `;

          try {
            await base44.integrations.Core.SendEmail({
              to: alert.student_email,
              subject: `🚨 Alerta: Seu certificado vence em ${alert.days_remaining} dias!`,
              body: studentEmailBody,
              from_name: 'CAT Cursos - Certificados'
            });
            sent++;
          } catch (emailErr) {
            errors.push(`Erro ao enviar e-mail para ${alert.student_email}: ${emailErr.message}`);
          }
        }

        // Email para a empresa (RH)
        if (alert.client_email) {
          const companyEmailBody = `
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
    .header { background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: white; padding: 20px; }
    .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .table th { background: #f0f0f0; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
    .table td { padding: 10px; border-bottom: 1px solid #ddd; }
    .alert-badge { display: inline-block; padding: 5px 10px; border-radius: 4px; font-weight: bold; }
    .critical { background: #fee2e2; color: #dc2626; }
    .high { background: #fef3c7; color: #ea580c; }
    .medium { background: #fef3c7; color: #d97706; }
    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Alerta de Vencimento de Certificado de Funcionário</h1>
    </div>
    <div class="content">
      <p>Prezados,</p>
      
      <p>Informamos que o seguinte certificado de treinamento está próximo do vencimento:</p>
      
      <table class="table">
        <tr>
          <th>Informação</th>
          <th>Detalhes</th>
        </tr>
        <tr>
          <td><strong>Funcionário</strong></td>
          <td>${alert.student_name}</td>
        </tr>
        <tr>
          <td><strong>Curso</strong></td>
          <td>${alert.course_name}</td>
        </tr>
        <tr>
          <td><strong>Data de Vencimento</strong></td>
          <td>${new Date(alert.valid_until).toLocaleDateString('pt-BR')}</td>
        </tr>
        <tr>
          <td><strong>Dias Restantes</strong></td>
          <td><strong style="color: ${alert.days_remaining <= 7 ? '#dc2626' : alert.days_remaining <= 15 ? '#ea580c' : '#d97706'}">${alert.days_remaining}</strong></td>
        </tr>
        <tr>
          <td><strong>Nível de Risco</strong></td>
          <td>
            <span class="alert-badge ${alert.days_remaining <= 7 ? 'critical' : alert.days_remaining <= 15 ? 'high' : 'medium'}">
              ${alert.days_remaining <= 7 ? 'CRÍTICO' : alert.days_remaining <= 15 ? 'ALTO' : 'MÉDIO'}
            </span>
          </td>
        </tr>
      </table>

      <p><strong>Recomendações:</strong></p>
      <ul>
        <li>Agende a renovação do certificado conforme política de compliance</li>
        <li>Comunique ao funcionário sobre o vencimento pendente</li>
        <li>Verifique os requisitos de certificação para o cargo</li>
      </ul>

      <p style="font-size: 12px; color: #666;">
        Código do certificado: <strong>${alert.certificate_code}</strong>
      </p>
    </div>
    <div class="footer">
      <p>Este é um e-mail automático de alerta. Não responda a este e-mail.</p>
      <p>Sistema de Certificação Digital - CAT Cursos</p>
    </div>
  </div>
</body>
</html>
          `;

          try {
            await base44.integrations.Core.SendEmail({
              to: alert.client_email,
              subject: `Alerta: Certificado de ${alert.student_name} vence em ${alert.days_remaining} dias`,
              body: companyEmailBody,
              from_name: 'CAT Cursos - Certificados'
            });
            sent++;
          } catch (emailErr) {
            errors.push(`Erro ao enviar e-mail para ${alert.client_email}: ${emailErr.message}`);
          }
        }
      } catch (alertErr) {
        errors.push(`Erro ao processar alerta ${alert.certificate_code}: ${alertErr.message}`);
      }
    }

    return Response.json({ 
      sent,
      total: alerts.length,
      errors: errors.length > 0 ? errors : null,
      message: `${sent} notificação(ções) enviada(s) com sucesso!`
    });
  } catch (error) {
    console.error('Erro na função enviarNotificacoesCertificados:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});