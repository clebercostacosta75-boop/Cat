import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Verifica se todas as assinaturas obrigatórias foram feitas
function calcularNovoStatus(contract, signerType, updateData) {
  const updated = { ...contract, ...updateData };
  const studentSigned = !!updated.student_signed_at;
  const isMinor = !!updated.is_minor;
  const hasRespLegal = !!(updated.resp_legal_nome);
  const hasRespFinanceiro = !!(updated.resp_financeiro_nome);
  const respLegalSigned = !hasRespLegal || !!updated.resp_legal_signed_at;
  const respFinanceiroSigned = !hasRespFinanceiro || !!updated.resp_financeiro_signed_at;
  const mandatoryAluno = isMinor ? respLegalSigned : studentSigned;
  if (mandatoryAluno && respFinanceiroSigned) {
    return 'Assinado_Todas_Partes';
  }
  if (signerType === 'student') return 'Aguardando_Assinatura_Responsavel_Financeiro';
  if (signerType === 'resp_legal') return hasRespFinanceiro ? 'Aguardando_Assinatura_Responsavel_Financeiro' : 'Assinado_Todas_Partes';
  if (signerType === 'resp_financeiro') return 'Assinado_Todas_Partes';
  return 'Assinado_Parcialmente';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { contract_id, signature_data_url, signer_type, lgpd_accepted, signer_name, signer_cpf } = body;

    if (!contract_id || !signature_data_url || !signer_type) {
      return Response.json({ error: 'contract_id, signature_data_url e signer_type são obrigatórios' }, { status: 400 });
    }

    const contracts = await base44.asServiceRole.entities.Contract.filter({ id: contract_id });
    const contract = contracts[0];
    if (!contract) return Response.json({ error: 'Contrato não encontrado' }, { status: 404 });

    // Não permitir reassinatura de contrato já totalmente assinado
    if (contract.status === 'Assinado_Todas_Partes' || contract.status === 'PDF_Gerado') {
      return Response.json({ error: 'Contrato já foi totalmente assinado e não pode ser alterado.' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const now = new Date().toISOString();

    let updateData = {};
    let eventTitle = '';

    if (signer_type === 'student') {
      updateData = {
        student_signature_url: signature_data_url,
        student_signed_at: now,
        student_signed_ip: ip,
        student_signed_device: userAgent,
        ...(lgpd_accepted ? { student_lgpd_accepted_at: now } : {})
      };
      eventTitle = `Contrato Assinado Digitalmente pelo Aluno`;
    } else if (signer_type === 'resp_legal') {
      updateData = {
        resp_legal_signature_url: signature_data_url,
        resp_legal_signed_at: now,
        resp_legal_signed_ip: ip,
        resp_legal_signed_device: userAgent,
      };
      eventTitle = `Contrato Assinado pelo Responsável Legal (${signer_name || ''})`;
    } else if (signer_type === 'resp_financeiro') {
      updateData = {
        resp_financeiro_signature_url: signature_data_url,
        resp_financeiro_signed_at: now,
        resp_financeiro_signed_ip: ip,
        resp_financeiro_signed_device: userAgent,
      };
      eventTitle = `Contrato Assinado pelo Responsável Financeiro (${signer_name || ''})`;
    } else if (signer_type === 'manager') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      updateData = {
        manager_signed_at: now,
        manager_signed_by: user.email,
        status: 'Assinado_Todas_Partes'
      };
      eventTitle = `Contrato Assinado pela CAT Cursos (${user.email})`;
      await base44.asServiceRole.entities.Contract.update(contract_id, updateData);
      await base44.asServiceRole.entities.StudentTimeline.create({
        student_id: contract.student_id,
        student_name: contract.student_name,
        event_type: 'contrato_assinado',
        title: eventTitle,
        description: `Contrato ${contract.contract_number} assinado pela CAT Cursos. IP: ${ip}`,
        performed_by: user.email,
        ip_address: ip,
        metadata: { contract_id, contract_number: contract.contract_number, signer_type }
      });
      return Response.json({ success: true, status: 'Assinado_Todas_Partes' });
    } else {
      return Response.json({ error: 'signer_type inválido. Use: student, resp_legal, resp_financeiro, manager' }, { status: 400 });
    }

    const newStatus = calcularNovoStatus(contract, signer_type, updateData);
    updateData.status = newStatus;

    await base44.asServiceRole.entities.Contract.update(contract_id, updateData);

    // Atualizar HTML do contrato com a nova assinatura
    const contractsUpdated = await base44.asServiceRole.entities.Contract.filter({ id: contract_id });
    const contractUpdated = contractsUpdated[0];

    // Timeline
    await base44.asServiceRole.entities.StudentTimeline.create({
      student_id: contract.student_id,
      student_name: contract.student_name,
      event_type: 'contrato_assinado',
      title: eventTitle,
      description: `Contrato ${contract.contract_number} — Assinante: ${signer_name || signer_type} — IP: ${ip} — Status: ${newStatus}`,
      performed_by: signer_name || signer_type,
      ip_address: ip,
      metadata: { contract_id, contract_number: contract.contract_number, signer_type, lgpd_accepted: !!lgpd_accepted }
    });

    // Se LGPD foi aceita, registrar evento separado
    if (lgpd_accepted && signer_type === 'student') {
      await base44.asServiceRole.entities.StudentTimeline.create({
        student_id: contract.student_id,
        student_name: contract.student_name,
        event_type: 'contrato_assinado',
        title: 'Aluno Aceitou os Termos LGPD',
        description: `LGPD aceita no ato da assinatura do contrato ${contract.contract_number}. IP: ${ip}`,
        performed_by: signer_name || contract.student_name,
        ip_address: ip,
        metadata: { contract_id, lgpd_accepted_at: now }
      });
    }

    // Se todas as partes assinaram, notificar o aluno por e-mail e WhatsApp
    if (newStatus === 'Assinado_Todas_Partes') {
      const appUrl = Deno.env.get('BASE44_APP_URL') || 'https://app.base44.com';
      const signUrl = `${appUrl}/ContractSign?code=${contract.auth_code}`;

      // Enviar e-mail de confirmação ao aluno
      if (contract.student_email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: contract.student_email,
            subject: `✅ Contrato Nº ${contract.contract_number} — Assinado com Sucesso! — CAT Cursos`,
            body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #1a3a5c; color: white; padding: 20px; text-align: center;">
                  <h2 style="margin:0;">CAT Cursos de Aprimoramento do Trabalhador</h2>
                  <p style="margin:4px 0; font-size: 12px;">CNPJ: 07.238.084/0001-45</p>
                </div>
                <div style="padding: 24px;">
                  <p>Olá, <strong>${contract.student_name}</strong>!</p>
                  <p>🎉 Seu contrato foi <strong>assinado com sucesso por todas as partes</strong>. Sua matrícula no curso está confirmada!</p>

                  <div style="background: #e8f5e9; border: 1px solid #2e7d32; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0 0 8px; font-weight: bold; color: #2e7d32;">✅ Contrato Confirmado</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>Nº do Contrato:</strong> ${contract.contract_number}</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>Curso:</strong> ${contract.course_name}</p>
                    ${contract.course_value ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Valor:</strong> R$ ${parseFloat(contract.course_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>` : ''}
                    ${contract.payment_method ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Forma de Pagamento:</strong> ${contract.payment_method}</p>` : ''}
                    ${contract.course_start_date ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Data de Início:</strong> ${new Date(contract.course_start_date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>` : ''}
                    <p style="margin: 8px 0 0; font-size: 12px; color: #555;"><strong>Código de Autenticação:</strong> <code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">${contract.auth_code}</code></p>
                  </div>

                  <div style="text-align: center; margin: 28px 0;">
                    <a href="${signUrl}"
                       style="background: #1a3a5c; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: bold; display: inline-block;">
                      📄 Visualizar Contrato Assinado
                    </a>
                  </div>

                  <p style="font-size: 12px; color: #888; margin-top: 20px;">
                    Guarde este e-mail como comprovante. O contrato assinado digitalmente tem validade jurídica conforme a Lei nº 14.063/2020.<br/>
                    Dúvidas? Entre em contato: (91) 98413-2527
                  </p>
                </div>
                <div style="background: #f5f5f5; padding: 12px; text-align: center; font-size: 10px; color: #888;">
                  CAT Cursos — Av. Beira Rio, 1740 — Vila Nova, Barcarena/PA — CNPJ: 07.238.084/0001-45
                </div>
              </div>
            `,
          });
        } catch (emailErr) {
          console.error('Erro ao enviar e-mail de confirmação:', emailErr.message);
        }
      }

      // Enviar WhatsApp de confirmação ao aluno
      const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
      const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
      if (WHATSAPP_TOKEN && PHONE_NUMBER_ID && contract.student_phone) {
        try {
          const sanitizePhone = (phone) => {
            let p = phone.replace(/\D/g, '');
            if (p.length === 11) p = '55' + p;
            if (p.length === 10) p = '55' + p;
            return p;
          };
          const phone = sanitizePhone(contract.student_phone);
          const message = `✅ *Contrato Assinado com Sucesso!*\n\nOlá, *${contract.student_name}*!\n\nSeu contrato da *CAT CURSOS* foi assinado por todas as partes e sua matrícula está confirmada!\n\n📋 *Detalhes:*\n• Contrato: ${contract.contract_number}\n• Curso: ${contract.course_name}${contract.course_start_date ? `\n• Início: ${new Date(contract.course_start_date + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}\n\n🔗 Acesse seu contrato assinado:\n${signUrl}\n\n*CAT CURSOS* — Capacitação que protege vidas e fortalece operações.`;
          await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: phone,
              type: 'text',
              text: { body: message }
            })
          });
        } catch (waErr) {
          console.error('Erro ao enviar WhatsApp de confirmação:', waErr.message);
        }
      }
    }

    return Response.json({ success: true, status: newStatus, all_signed: newStatus === 'Assinado_Todas_Partes' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});