import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { contract_id, signature_data_url, signer_type } = await req.json();

    // signer_type: 'student' ou 'manager'
    if (!contract_id || !signature_data_url) {
      return Response.json({ error: 'contract_id e signature_data_url são obrigatórios' }, { status: 400 });
    }

    const contracts = await base44.asServiceRole.entities.Contract.filter({ id: contract_id });
    const contract = contracts[0];
    if (!contract) return Response.json({ error: 'Contrato não encontrado' }, { status: 404 });

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const now = new Date().toISOString();

    let updateData = {};
    let newStatus = contract.status;
    let eventType = '';
    let eventTitle = '';

    if (signer_type === 'student') {
      updateData = {
        student_signature_url: signature_data_url,
        student_signed_at: now,
        student_signed_ip: ip,
        student_signed_device: userAgent,
        status: 'Assinado_Aluno'
      };
      newStatus = 'Assinado_Aluno';
      eventType = 'contrato_assinado';
      eventTitle = 'Contrato Assinado pelo Aluno';
    } else if (signer_type === 'manager') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      updateData = {
        manager_signed_at: now,
        manager_signed_by: user.email,
        status: 'Vigente'
      };
      newStatus = 'Vigente';
      eventType = 'contrato_assinado';
      eventTitle = `Contrato Vigente — Assinado pelo Gestor (${user.email})`;
    } else {
      return Response.json({ error: 'signer_type inválido' }, { status: 400 });
    }

    await base44.asServiceRole.entities.Contract.update(contract_id, updateData);

    // Timeline
    await base44.asServiceRole.entities.StudentTimeline.create({
      student_id: contract.student_id,
      student_name: contract.student_name,
      event_type: eventType,
      title: eventTitle,
      description: `Contrato ${contract.contract_number} — IP: ${ip}`,
      performed_by: signer_type === 'student' ? contract.student_name : (updateData.manager_signed_by || 'Gestor'),
      ip_address: ip,
      metadata: { contract_id, contract_number: contract.contract_number, signer_type }
    });

    return Response.json({ success: true, status: newStatus });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});