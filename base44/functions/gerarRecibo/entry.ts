import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function gerarHtmlRecibo(vars) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #222; margin: 0; padding: 20px; max-width: 800px; }
  .cabecalho { background: #1a3a5c; color: white; padding: 14px 20px; text-align: center; margin-bottom: 16px; }
  .cabecalho h2 { margin:0; font-size:16px; letter-spacing:1px; }
  .cabecalho p { margin:3px 0; font-size:10px; opacity: 0.9; }
  .titulo-recibo { text-align: center; font-size: 18px; font-weight: bold; color: #1a3a5c; margin: 16px 0; text-transform: uppercase; letter-spacing: 2px; }
  .numero-recibo { text-align: center; font-size: 12px; color: #666; margin-bottom: 20px; }
  .bloco { border: 1px solid #ccc; padding: 12px 14px; margin-bottom: 12px; border-radius: 4px; }
  .bloco-destaque { border: 2px solid #1a3a5c; padding: 12px 14px; margin-bottom: 12px; border-radius: 4px; background: #f0f4f8; }
  .bloco h3 { color: #1a3a5c; font-size: 11px; margin: 0 0 8px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .campo { margin-bottom: 6px; }
  .campo label { font-size: 9px; color: #888; display: block; text-transform: uppercase; }
  .campo span { font-weight: bold; font-size: 11px; }
  .valor-destaque { font-size: 28px; font-weight: bold; color: #1a7a3c; text-align: center; padding: 16px; border: 3px solid #1a7a3c; border-radius: 8px; background: #e8f5e9; margin: 16px 0; }
  .valor-destaque small { font-size: 12px; color: #555; display: block; font-weight: normal; margin-top: 4px; }
  .extenso { text-align: center; font-size: 11px; color: #333; font-style: italic; margin-bottom: 16px; }
  .assinatura-area { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px; }
  .assinatura-box { text-align: center; }
  .assinatura-linha { border-bottom: 1px solid #333; margin-bottom: 6px; height: 50px; }
  .assinatura-meta { font-size: 9px; color: #555; }
  .rodape { text-align: center; font-size: 9px; color: #888; border-top: 1px solid #ccc; margin-top: 24px; padding-top: 10px; }
  .valido { background: #e8f5e9; border: 1px solid #4caf50; padding: 8px 12px; border-radius: 4px; margin-bottom: 12px; font-size: 10px; color: #2e7d32; text-align: center; }
  .observacoes { background: #fffde7; border: 1px solid #ffc107; padding: 8px 12px; border-radius: 4px; margin-bottom: 12px; font-size: 10px; }
</style>
</head>
<body>

<div class="cabecalho">
  <h2>CAT CURSOS DE APRIMORAMENTO DO TRABALHADOR</h2>
  <p>V.S. NUNES CURSOS E TREINAMENTO LTDA — CNPJ: 07.238.084/0001-45</p>
  <p>Av. Beira Rio, 1740 — Vila Nova, Barcarena/PA — CEP 68445-000</p>
  <p>Tel: (91) 98413-2527 / (91) 3754-1500</p>
</div>

<div class="titulo-recibo">Recibo de Pagamento</div>
<div class="numero-recibo">Nº ${vars.receipt_number} | Data de Emissão: ${vars.issue_date}</div>

<div class="valido">✔ Documento válido como comprovante de pagamento — Emitido eletronicamente nos termos da legislação vigente</div>

<div class="valor-destaque">
  R$ ${vars.amount_formatted}
  <small>Forma de Pagamento: ${vars.payment_method}</small>
</div>
<div class="extenso">Valor por extenso: ${vars.amount_extenso}</div>

<div class="bloco">
  <h3>Dados do Pagante (Aluno)</h3>
  <div class="grid-2">
    <div class="campo"><label>Nome Completo</label><span>${vars.student_name}</span></div>
    <div class="campo"><label>CPF</label><span>${vars.student_cpf}</span></div>
  </div>
</div>

<div class="bloco">
  <h3>Referência do Pagamento</h3>
  <div class="grid-2">
    <div class="campo"><label>Curso / Serviço</label><span>${vars.course_name}</span></div>
    <div class="campo"><label>Data do Pagamento</label><span>${vars.payment_date}</span></div>
  </div>
</div>

${vars.description ? `<div class="observacoes"><strong>Descrição/Observações:</strong> ${vars.description}</div>` : ''}

<div class="bloco">
  <h3>Dados da Empresa Recebedora</h3>
  <div class="grid-2">
    <div class="campo"><label>Razão Social</label><span>V.S. NUNES CURSOS E TREINAMENTO LTDA</span></div>
    <div class="campo"><label>Nome Fantasia</label><span>CAT Cursos de Aprimoramento do Trabalhador</span></div>
    <div class="campo"><label>CNPJ</label><span>07.238.084/0001-45</span></div>
    <div class="campo"><label>Recebido por</label><span>${vars.received_by_name}</span></div>
  </div>
</div>

<div class="assinatura-area">
  <div class="assinatura-box">
    <div class="assinatura-linha"></div>
    <div class="assinatura-meta">
      <strong>${vars.student_name}</strong><br/>
      CPF: ${vars.student_cpf}<br/>
      Pagante
    </div>
  </div>
  <div class="assinatura-box">
    <div class="assinatura-linha"></div>
    <div class="assinatura-meta">
      <strong>CAT Cursos de Aprimoramento do Trabalhador</strong><br/>
      CNPJ: 07.238.084/0001-45<br/>
      Responsável pelo Recebimento: ${vars.received_by_name}
    </div>
  </div>
</div>

<div class="rodape">
  <p>Recibo Nº ${vars.receipt_number} | CAT Cursos — CNPJ: 07.238.084/0001-45 — Barcarena/PA</p>
  <p>Este recibo é válido como comprovante de pagamento. Emitido em ${vars.issue_date}.</p>
</div>

</body>
</html>`;
}

function valorPorExtenso(valor) {
  if (!valor || valor === 0) return "zero reais";
  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);
  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
    "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const centenas = ["", "cem", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  function grupo(n) {
    if (n === 0) return "";
    if (n === 100) return "cem";
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    let resultado = "";
    if (c > 0) resultado += centenas[c];
    const resto = n % 100;
    if (resto > 0) {
      if (resultado) resultado += " e ";
      if (resto < 20) resultado += unidades[resto];
      else {
        resultado += dezenas[d];
        if (u > 0) resultado += " e " + unidades[u];
      }
    }
    return resultado;
  }

  let texto = "";
  if (inteiro >= 1000) {
    const mil = Math.floor(inteiro / 1000);
    const resto = inteiro % 1000;
    texto += (mil === 1 ? "mil" : grupo(mil) + " mil");
    if (resto > 0) texto += " e " + grupo(resto);
  } else {
    texto = grupo(inteiro);
  }

  texto += inteiro === 1 ? " real" : " reais";
  if (centavos > 0) {
    texto += " e " + (centavos < 20 ? unidades[centavos] : dezenas[Math.floor(centavos / 10)] + (centavos % 10 > 0 ? " e " + unidades[centavos % 10] : ""));
    texto += centavos === 1 ? " centavo" : " centavos";
  }
  return texto;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { enrollment_id, student_id, amount, payment_method, payment_date, description, send_email } = await req.json();
    if (!enrollment_id && !student_id) return Response.json({ error: 'enrollment_id ou student_id é obrigatório' }, { status: 400 });
    if (!amount || !payment_method || !payment_date) return Response.json({ error: 'amount, payment_method e payment_date são obrigatórios' }, { status: 400 });

    // Buscar dados do aluno e matrícula
    let student = null;
    let enrollment = null;

    if (enrollment_id) {
      const enrollments = await base44.asServiceRole.entities.StudentCourseEnrollment.filter({ id: enrollment_id });
      enrollment = enrollments[0];
      if (enrollment) {
        const students = await base44.asServiceRole.entities.Student.filter({ id: enrollment.student_id });
        student = students[0];
      }
    } else if (student_id) {
      const students = await base44.asServiceRole.entities.Student.filter({ id: student_id });
      student = students[0];
    }

    if (!student) return Response.json({ error: 'Aluno não encontrado' }, { status: 404 });

    // Gerar número do recibo
    const allReceipts = await base44.asServiceRole.entities.Receipt.list('-created_date', 1);
    const lastNum = allReceipts.length > 0
      ? parseInt((allReceipts[0].receipt_number || 'REC-2026-0000').split('-')[2] || '0') + 1
      : 1;
    const year = new Date().getFullYear();
    const receiptNumber = `REC-${year}-${String(lastNum).padStart(4, '0')}`;

    const issueDate = new Date().toLocaleDateString('pt-BR');
    const paymentDateFormatted = new Date(payment_date + 'T00:00:00').toLocaleDateString('pt-BR');
    const amountNum = parseFloat(amount);
    const amountFormatted = amountNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    const vars = {
      receipt_number: receiptNumber,
      issue_date: issueDate,
      student_name: student.full_name,
      student_cpf: student.cpf,
      course_name: enrollment?.course_name || 'Curso CAT Cursos',
      amount_formatted: amountFormatted,
      amount_extenso: valorPorExtenso(amountNum),
      payment_method,
      payment_date: paymentDateFormatted,
      description: description || '',
      received_by_name: user.full_name || user.email,
    };

    const htmlRecibo = gerarHtmlRecibo(vars);

    // Salvar registro do recibo
    const receipt = await base44.asServiceRole.entities.Receipt.create({
      receipt_number: receiptNumber,
      student_id: student.id,
      student_name: student.full_name,
      student_cpf: student.cpf,
      enrollment_id: enrollment_id || '',
      course_name: enrollment?.course_name || '',
      amount: amountNum,
      payment_method,
      payment_date,
      description: description || '',
      received_by: user.email,
      received_by_name: user.full_name || user.email,
      status: 'Emitido',
    });

    // Atualizar status_pagamento da matrícula se for Dinheiro em Espécie
    if (enrollment_id && enrollment) {
      await base44.asServiceRole.entities.StudentCourseEnrollment.update(enrollment_id, {
        status_pagamento: 'Pago',
        forma_pagamento: payment_method,
        unit_value: amountNum,
      });
    }

    // Registrar na timeline
    await base44.asServiceRole.entities.StudentTimeline.create({
      student_id: student.id,
      student_name: student.full_name,
      event_type: 'pagamento_confirmado',
      title: `Pagamento Registrado — ${payment_method}`,
      description: `Recibo ${receiptNumber} emitido. Valor: R$ ${amountFormatted}. Forma: ${payment_method}.${description ? ' Obs: ' + description : ''}`,
      performed_by: user.email,
      metadata: { receipt_id: receipt.id, receipt_number: receiptNumber, amount: amountNum, payment_method },
    });

    // Enviar e-mail com o recibo (se solicitado e se houver e-mail do aluno)
    let emailSent = false;
    if (send_email && student.email) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: student.email,
          subject: `Recibo de Pagamento Nº ${receiptNumber} — CAT Cursos`,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1a3a5c; color: white; padding: 20px; text-align: center;">
                <h2 style="margin:0;">CAT Cursos de Aprimoramento do Trabalhador</h2>
                <p style="margin:4px 0; font-size: 12px;">CNPJ: 07.238.084/0001-45</p>
              </div>
              <div style="padding: 20px;">
                <p>Olá, <strong>${student.full_name}</strong>!</p>
                <p>Seu recibo de pagamento foi emitido com sucesso. Segue o resumo:</p>
                <div style="background: #e8f5e9; border: 2px solid #4caf50; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
                  <p style="font-size: 24px; font-weight: bold; color: #2e7d32; margin:0;">R$ ${amountFormatted}</p>
                  <p style="color: #555; font-size: 12px; margin:4px 0;">Recibo Nº ${receiptNumber}</p>
                </div>
                <table style="width:100%; border-collapse: collapse; font-size: 13px;">
                  <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #888;">Curso</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight:bold;">${enrollment?.course_name || 'CAT Cursos'}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #888;">Forma de Pagamento</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight:bold;">${payment_method}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #888;">Data do Pagamento</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight:bold;">${paymentDateFormatted}</td></tr>
                  <tr><td style="padding: 8px; color: #888;">Emitido em</td><td style="padding: 8px; font-weight:bold;">${issueDate}</td></tr>
                </table>
                ${description ? `<p style="background: #fffde7; padding: 10px; border-radius: 4px; font-size: 12px; margin-top: 16px;"><strong>Observação:</strong> ${description}</p>` : ''}
                <p style="font-size: 12px; color: #888; margin-top: 24px;">Este é um recibo digital válido como comprovante de pagamento.<br/>Em caso de dúvidas, entre em contato: (91) 98413-2527</p>
              </div>
              <div style="background: #f5f5f5; padding: 12px; text-align: center; font-size: 10px; color: #888;">
                CAT Cursos — Av. Beira Rio, 1740 — Vila Nova, Barcarena/PA
              </div>
            </div>
          `,
        });
        await base44.asServiceRole.entities.Receipt.update(receipt.id, { email_sent: true, email_sent_at: new Date().toISOString() });
        emailSent = true;
      } catch (e) {
        console.warn("Erro ao enviar e-mail:", e.message);
      }
    }

    // Registrar no AuditLog
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      user_name: user.full_name || user.email,
      action: 'create',
      entity_type: 'Receipt',
      entity_id: receipt.id,
      entity_name: `Recibo ${receiptNumber} — ${student.full_name}`,
      details: `Recibo de pagamento emitido. Valor: R$ ${amountFormatted}. Forma: ${payment_method}. Data: ${paymentDateFormatted}.`,
    });

    return Response.json({
      success: true,
      receipt_id: receipt.id,
      receipt_number: receiptNumber,
      html: htmlRecibo,
      email_sent: emailSent,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});