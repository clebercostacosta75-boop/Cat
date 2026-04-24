import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { month, year, instructors } = await req.json();

    // Buscar dados
    const classSchedules = await base44.asServiceRole.entities.ClassSchedule.list();
    const instructorsList = await base44.asServiceRole.entities.Instructor.list();

    // Filtrar turmas pelo período
    const filteredClasses = classSchedules.filter(cls => {
      if (!cls.start_date) return false;
      const classDate = new Date(cls.start_date);
      const classMonth = classDate.getMonth() + 1;
      const classYear = classDate.getFullYear();
      
      return classMonth === parseInt(month) && 
             classYear === parseInt(year) &&
             instructors.includes(cls.instructor_id);
    });

    // Agrupar por instrutor
    const paymentData = {};
    
    filteredClasses.forEach(cls => {
      if (!cls.instructor_id) return;
      
      if (!paymentData[cls.instructor_id]) {
        const instructor = instructorsList.find(i => i.id === cls.instructor_id);
        paymentData[cls.instructor_id] = {
          name: cls.instructor_name || instructor?.name || 'Desconhecido',
          email: instructor?.email || '',
          bank_data: instructor?.bank_data || {},
          pix_keys: instructor?.pix_keys || [],
          classes: [],
          totalValue: 0,
          paidValue: 0,
          pendingValue: 0,
        };
      }

      const paid = cls.payment_installments?.filter(i => i.status === "Pago")
        .reduce((sum, i) => sum + (i.amount || 0), 0) || 
        (cls.payment_status === "Pago" ? cls.instructor_payment_value : 0);

      paymentData[cls.instructor_id].classes.push({
        training_name: cls.training_name,
        company_name: cls.company_name,
        start_date: cls.start_date,
        totalValue: cls.instructor_payment_value || 0,
        paidValue: paid,
        pendingValue: (cls.instructor_payment_value || 0) - paid,
        payment_status: cls.payment_status,
      });

      paymentData[cls.instructor_id].totalValue += cls.instructor_payment_value || 0;
      paymentData[cls.instructor_id].paidValue += paid;
    });

    Object.values(paymentData).forEach(instructor => {
      instructor.pendingValue = instructor.totalValue - instructor.paidValue;
    });

    // Gerar HTML do relatório
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    let html = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #059669; border-bottom: 3px solid #059669; padding-bottom: 10px; }
            h2 { color: #1f2937; margin-top: 30px; }
            .summary { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .instructor { border: 1px solid #d1d5db; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
            .instructor-header { background: #e5e7eb; padding: 10px; margin: -15px -15px 15px -15px; border-radius: 8px 8px 0 0; }
            .bank-info { background: #fef3c7; padding: 10px; border-radius: 4px; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
            th { background: #f3f4f6; font-weight: bold; }
            .paid { color: #059669; font-weight: bold; }
            .pending { color: #dc2626; font-weight: bold; }
            .total { background: #e5e7eb; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Relatório de Pagamentos de Instrutores</h1>
          <div class="summary">
            <strong>Período:</strong> ${monthNames[parseInt(month) - 1]}/${year}<br>
            <strong>Data de Geração:</strong> ${new Date().toLocaleDateString('pt-BR')}<br>
            <strong>Total de Instrutores:</strong> ${Object.keys(paymentData).length}
          </div>
    `;

    Object.values(paymentData).forEach(instructor => {
      html += `
        <div class="instructor">
          <div class="instructor-header">
            <h2 style="margin: 0;">${instructor.name}</h2>
            ${instructor.email ? `<div>📧 ${instructor.email}</div>` : ''}
          </div>
          
          ${instructor.bank_data?.bank_name ? `
            <div class="bank-info">
              <strong>Dados Bancários:</strong><br>
              ${instructor.bank_data.bank_name} - Agência: ${instructor.bank_data.agency} - Conta: ${instructor.bank_data.account}<br>
              ${instructor.pix_keys && instructor.pix_keys.length > 0 ? 
                `PIX (${instructor.pix_keys[0].type}): ${instructor.pix_keys[0].key}` : ''}
            </div>
          ` : ''}

          <table>
            <thead>
              <tr>
                <th>Treinamento</th>
                <th>Empresa</th>
                <th>Data</th>
                <th>Valor Total</th>
                <th>Pago</th>
                <th>Pendente</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
      `;

      instructor.classes.forEach(cls => {
        html += `
          <tr>
            <td>${cls.training_name}</td>
            <td>${cls.company_name}</td>
            <td>${new Date(cls.start_date).toLocaleDateString('pt-BR')}</td>
            <td>R$ ${cls.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td class="paid">R$ ${cls.paidValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td class="pending">R$ ${cls.pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td>${cls.payment_status}</td>
          </tr>
        `;
      });

      html += `
              <tr class="total">
                <td colspan="3">TOTAL ${instructor.name.toUpperCase()}</td>
                <td>R$ ${instructor.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td class="paid">R$ ${instructor.paidValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td class="pending">R$ ${instructor.pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    });

    html += `
        </body>
      </html>
    `;

    // Converter para Blob e retornar
    const blob = new Blob([html], { type: 'text/html' });
    const buffer = await blob.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename=pagamentos_${month}_${year}.html`
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});