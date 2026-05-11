import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { contract_id, send_to } = await req.json(); // send_to: 'student' | 'resp_legal' | 'resp_financeiro'
    if (!contract_id) return Response.json({ error: 'contract_id é obrigatório' }, { status: 400 });

    const contracts = await base44.asServiceRole.entities.Contract.filter({ id: contract_id });
    const contract = contracts[0];
    if (!contract) return Response.json({ error: 'Contrato não encontrado' }, { status: 404 });

    const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
      return Response.json({ error: 'WhatsApp não configurado' }, { status: 500 });
    }

    const appUrl = Deno.env.get('BASE44_APP_URL') || 'https://app.base44.com';
    const signUrl = `${appUrl}/ContractSign?code=${contract.auth_code}`;

    const sanitizePhone = (phone) => {
      if (!phone) return null;
      let p = phone.replace(/\D/g, '');
      if (p.length === 11) p = '55' + p;
      if (p.length === 10) p = '55' + p;
      return p;
    };

    const sendWhatsApp = async (phone, message) => {
      const p = sanitizePhone(phone);
      if (!p) return { error: 'Telefone inválido' };
      const res = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: p,
          type: 'text',
          text: { body: message }
        })
      });
      return res.json();
    };

    const targets = send_to ? [send_to] : ['student'];
    const results = [];

    for (const target of targets) {
      let phone, name, message;

      if (target === 'student') {
        phone = contract.student_phone;
        name = contract.student_name;
        message = `Olá, ${name}.\n\nSegue o seu Contrato de Prestação de Serviço da CAT CURSOS referente ao curso *${contract.course_name}*.\n\nPara confirmar sua matrícula, leia o contrato completo, aceite os termos da LGPD e realize sua assinatura digital pelo link abaixo:\n\n🔗 ${signUrl}\n\nApós assinar, você poderá baixar o contrato assinado em PDF e também receberá uma cópia pelo WhatsApp.\n\n*CAT CURSOS*\nCapacitação que protege vidas e fortalece operações.`;
      } else if (target === 'resp_legal') {
        phone = contract.resp_legal_phone;
        name = contract.resp_legal_nome || 'Responsável Legal';
        const respSignUrl = `${appUrl}/ContractSign?code=${contract.auth_code}&signer=resp_legal`;
        message = `Olá, ${name}.\n\nVocê foi indicado(a) como responsável pelo aluno *${contract.student_name}* no curso *${contract.course_name}* da CAT CURSOS.\n\nPara validar a matrícula, acesse o link abaixo, leia o contrato e realize sua assinatura digital:\n\n🔗 ${respSignUrl}\n\n*CAT CURSOS*\nCapacitação que protege vidas e fortalece operações.`;
      } else if (target === 'resp_financeiro') {
        phone = contract.resp_financeiro_phone;
        name = contract.resp_financeiro_nome || 'Responsável Financeiro';
        const respSignUrl = `${appUrl}/ContractSign?code=${contract.auth_code}&signer=resp_financeiro`;
        message = `Olá, ${name}.\n\nVocê foi indicado(a) como responsável financeiro pelo aluno *${contract.student_name}* no curso *${contract.course_name}* da CAT CURSOS.\n\nPara validar a matrícula, acesse o link abaixo, leia o contrato e realize sua assinatura digital:\n\n🔗 ${respSignUrl}\n\n*CAT CURSOS*\nCapacitação que protege vidas e fortalece operações.`;
      }

      if (phone && message) {
        const result = await sendWhatsApp(phone, message);
        results.push({ target, phone, result });
      }
    }

    // Atualizar status e timeline
    await base44.asServiceRole.entities.Contract.update(contract_id, {
      status: 'Enviado_Assinatura',
      sent_at: new Date().toISOString(),
      sent_via: 'whatsapp'
    });

    await base44.asServiceRole.entities.StudentTimeline.create({
      student_id: contract.student_id,
      student_name: contract.student_name,
      event_type: 'contrato_enviado',
      title: 'Link de Assinatura Enviado pelo WhatsApp',
      description: `Link de assinatura do contrato ${contract.contract_number} enviado via WhatsApp para: ${targets.join(', ')}`,
      performed_by: user.email,
      metadata: { contract_id, contract_number: contract.contract_number, targets, sign_url: signUrl }
    });

    return Response.json({ success: true, results, sign_url: signUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});