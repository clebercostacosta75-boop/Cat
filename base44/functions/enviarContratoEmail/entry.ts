import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const contract_id = body.contract_id;
    const appUrl = body.app_url || 'https://app.base44.com';
    if (!contract_id) return Response.json({ error: 'contract_id é obrigatório' }, { status: 400 });

    const contracts = await base44.asServiceRole.entities.Contract.filter({ id: contract_id });
    const contract = contracts[0];
    if (!contract) return Response.json({ error: 'Contrato não encontrado' }, { status: 404 });

    const email = contract.student_email;
    if (!email) return Response.json({ error: 'Aluno não possui e-mail cadastrado.' }, { status: 400 });

    const signUrl = `${appUrl}/ContractSign?code=${contract.auth_code}`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: `Contrato Nº ${contract.contract_number} — Assinatura Digital Necessária — CAT Cursos`,
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1a3a5c; color: white; padding: 20px; text-align: center;">
            <h2 style="margin:0;">CAT Cursos de Aprimoramento do Trabalhador</h2>
            <p style="margin:4px 0; font-size: 12px;">CNPJ: 07.238.084/0001-45</p>
          </div>
          <div style="padding: 24px;">
            <p>Olá, <strong>${contract.student_name}</strong>!</p>
            <p>Seu contrato de prestação de serviços educacionais foi gerado e está aguardando a sua assinatura digital.</p>
            
            <div style="background: #e3f2fd; border: 1px solid #1565c0; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 8px; font-weight: bold; color: #1565c0;">📋 Detalhes do Contrato</p>
              <p style="margin: 4px 0; font-size: 13px;"><strong>Nº do Contrato:</strong> ${contract.contract_number}</p>
              <p style="margin: 4px 0; font-size: 13px;"><strong>Curso:</strong> ${contract.course_name}</p>
              ${contract.course_value ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Valor:</strong> R$ ${parseFloat(contract.course_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>` : ''}
              ${contract.payment_method ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Forma de Pagamento:</strong> ${contract.payment_method}</p>` : ''}
            </div>

            <div style="text-align: center; margin: 28px 0;">
              <a href="${signUrl}" 
                 style="background: #1a3a5c; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: bold; display: inline-block;">
                ✍️ Assinar Contrato Digitalmente
              </a>
            </div>

            <div style="background: #fff8e1; border: 1px solid #ffc107; padding: 12px; border-radius: 6px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 12px; color: #555;">
                <strong>⚠️ Importante:</strong> Leia o contrato com atenção antes de assinar. Ao assinar digitalmente, você confirma que leu e concorda com todos os termos.<br/>
                <strong>Código de Autenticação:</strong> <code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">${contract.auth_code}</code>
              </p>
            </div>

            <p style="font-size: 12px; color: #888;">Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:</p>
            <p style="font-size: 11px; color: #1565c0; word-break: break-all;">${signUrl}</p>

            <p style="font-size: 12px; color: #888; margin-top: 20px;">Após a assinatura de todas as partes, você receberá uma cópia do contrato assinado.<br/>Dúvidas? Entre em contato: (91) 98413-2527</p>
          </div>
          <div style="background: #f5f5f5; padding: 12px; text-align: center; font-size: 10px; color: #888;">
            CAT Cursos — Av. Beira Rio, 1740 — Vila Nova, Barcarena/PA — CNPJ: 07.238.084/0001-45
          </div>
        </div>
      `,
    });

    // Atualizar status e data de envio
    await base44.asServiceRole.entities.Contract.update(contract_id, {
      status: 'Enviado_Assinatura',
      sent_at: new Date().toISOString(),
      sent_via: 'email',
    });

    // Timeline
    await base44.asServiceRole.entities.StudentTimeline.create({
      student_id: contract.student_id,
      student_name: contract.student_name,
      event_type: 'contrato_enviado',
      title: 'Contrato Enviado por E-mail',
      description: `Contrato ${contract.contract_number} enviado por e-mail para ${email}. Aguardando assinatura digital.`,
      performed_by: user.email,
      metadata: { contract_id, contract_number: contract.contract_number, email },
    });

    return Response.json({ success: true, email_sent_to: email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});