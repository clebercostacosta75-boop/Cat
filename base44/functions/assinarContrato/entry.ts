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

    return Response.json({ success: true, status: newStatus, all_signed: newStatus === 'Assinado_Todas_Partes' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});