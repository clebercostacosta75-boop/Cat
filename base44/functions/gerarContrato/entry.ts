import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { template_id, student_id, enrollment_id } = await req.json();
    if (!template_id || !student_id) {
      return Response.json({ error: 'template_id e student_id são obrigatórios' }, { status: 400 });
    }

    // Buscar dados
    const [templates, students] = await Promise.all([
      base44.asServiceRole.entities.ContractTemplate.filter({ id: template_id }),
      base44.asServiceRole.entities.Student.filter({ id: student_id })
    ]);

    const template = templates[0];
    const student = students[0];
    if (!template || !student) {
      return Response.json({ error: 'Template ou aluno não encontrado' }, { status: 404 });
    }

    let enrollment = null;
    if (enrollment_id) {
      const enrollments = await base44.asServiceRole.entities.StudentCourseEnrollment.filter({ id: enrollment_id });
      enrollment = enrollments[0];
    }

    // Gerar número do contrato
    const contracts = await base44.asServiceRole.entities.Contract.list('-created_date', 1);
    const lastNum = contracts.length > 0
      ? parseInt((contracts[0].contract_number || 'CAT-2026-0000').split('-')[2] || '0') + 1
      : 1;
    const contractNumber = `CAT-${new Date().getFullYear()}-${String(lastNum).padStart(4, '0')}`;

    // Preencher variáveis no template
    const today = new Date();
    const todayStr = today.toLocaleDateString('pt-BR');
    
    const vars = {
      '{{student.full_name}}': student.full_name || '',
      '{{student.cpf}}': student.cpf || '',
      '{{student.rg}}': student.rg || '',
      '{{student.rg_orgao_emissor}}': student.rg_orgao_emissor || '',
      '{{student.email}}': student.email || '',
      '{{student.whatsapp}}': student.whatsapp || '',
      '{{student.data_nascimento}}': student.data_nascimento || '',
      '{{student.logradouro}}': student.logradouro || '',
      '{{student.numero}}': student.numero || '',
      '{{student.bairro}}': student.bairro || '',
      '{{student.cidade}}': student.cidade || '',
      '{{student.estado}}': student.estado || '',
      '{{student.cep}}': student.cep || '',
      '{{course.name}}': enrollment?.course_name || '',
      '{{course.start_date}}': enrollment?.start_date || '',
      '{{course.end_date}}': enrollment?.end_date || '',
      '{{course.value}}': enrollment?.unit_value ? `R$ ${parseFloat(enrollment.unit_value).toFixed(2).replace('.', ',')}` : '',
      '{{course.payment_method}}': enrollment?.forma_pagamento || '',
      '{{contract.number}}': contractNumber,
      '{{contract.date}}': todayStr,
      '{{company.name}}': template.company_info?.corporate_name || 'CAT Cursos',
      '{{company.cnpj}}': template.company_info?.cnpj || '',
      '{{company.address}}': template.company_info?.address || '',
      '{{fine_percentage}}': String(template.fine_percentage || 2),
      '{{interest_percentage}}': String(template.interest_percentage || 1),
    };

    let htmlFilled = template.html_content;
    for (const [key, val] of Object.entries(vars)) {
      htmlFilled = htmlFilled.split(key).join(val);
    }

    // Criar contrato
    const contractData = {
      contract_number: contractNumber,
      template_id: template.id,
      template_name: template.name,
      student_id: student.id,
      student_name: student.full_name,
      student_cpf: student.cpf,
      student_email: student.email || '',
      student_phone: student.whatsapp || '',
      enrollment_id: enrollment_id || '',
      course_name: enrollment?.course_name || '',
      course_value: enrollment?.unit_value ? parseFloat(enrollment.unit_value) : 0,
      payment_method: enrollment?.forma_pagamento || '',
      status: 'Rascunho',
      html_content_filled: htmlFilled,
    };

    const contract = await base44.asServiceRole.entities.Contract.create(contractData);

    // Registrar na timeline
    await base44.asServiceRole.entities.StudentTimeline.create({
      student_id: student.id,
      student_name: student.full_name,
      event_type: 'contrato_gerado',
      title: 'Contrato Gerado',
      description: `Contrato ${contractNumber} gerado a partir do modelo "${template.name}"`,
      performed_by: user.email,
      metadata: { contract_id: contract.id, contract_number: contractNumber }
    });

    return Response.json({ success: true, contract_id: contract.id, contract_number: contractNumber });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});