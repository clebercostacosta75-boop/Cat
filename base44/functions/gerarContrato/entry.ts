import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Template HTML oficial da CAT Cursos
function gerarHtmlContrato(vars) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #222; margin: 0; padding: 20px; }
  .cabecalho { background: #1a3a5c; color: white; padding: 12px 20px; text-align: center; margin-bottom: 10px; }
  .cabecalho h2 { margin:0; font-size:14px; letter-spacing:1px; }
  .cabecalho p { margin:2px 0; font-size:10px; }
  .bloco-financeiro { border: 2px solid #1a3a5c; padding: 10px; margin-bottom: 12px; }
  .bloco-financeiro h3 { color: #1a3a5c; font-size:11px; margin:0 0 8px; text-transform:uppercase; border-bottom:1px solid #ccc; padding-bottom:4px; }
  .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
  .grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; }
  .campo { border:1px solid #ccc; padding:4px 8px; }
  .campo label { font-size:9px; color:#666; display:block; }
  .campo span { font-weight:bold; font-size:11px; }
  .secao { margin-bottom:12px; }
  .secao h3 { color:#1a3a5c; font-size:12px; font-weight:bold; border-bottom:2px solid #1a3a5c; padding-bottom:3px; margin-bottom:6px; text-transform:uppercase; }
  .clausula { margin-bottom:8px; }
  .clausula h4 { font-size:11px; margin:0 0 3px; color:#1a3a5c; }
  .clausula p { margin:2px 0; text-align:justify; }
  .assinatura-box { border:1px solid #999; padding:10px; margin-bottom:8px; background:#fafafa; }
  .assinatura-img { max-height:60px; border-bottom:1px solid #333; min-width:200px; display:block; margin-bottom:4px; }
  .assinatura-linha { border-bottom:1px solid #333; min-width:200px; height:50px; display:block; margin-bottom:4px; }
  .assinatura-meta { font-size:9px; color:#555; }
  .rodape { text-align:center; font-size:9px; color:#666; border-top:1px solid #ccc; margin-top:20px; padding-top:8px; }
  .highlight { background:#fffde7; padding:2px 4px; }
  table { width:100%; border-collapse:collapse; }
  td, th { border:1px solid #ddd; padding:4px 6px; font-size:10px; }
  th { background:#1a3a5c; color:white; }
</style>
</head>
<body>

<!-- CABEÇALHO -->
<div class="cabecalho">
  <h2>CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS</h2>
  <p>CAT CURSOS DE APRIMORAMENTO DO TRABALHADOR — V.S. NUNES CURSOS E TREINAMENTO LTDA</p>
  <p>CNPJ: 07.238.084/0001-45</p>
</div>

<!-- BLOCO FINANCEIRO (CABEÇALHO DO CONTRATO) -->
<div class="bloco-financeiro">
  <h3>📋 Resumo Financeiro do Contrato</h3>
  <div class="grid-3">
    <div class="campo"><label>Nº do Contrato</label><span>${vars.contract_number}</span></div>
    <div class="campo"><label>Código do Aluno</label><span>${vars.student_code}</span></div>
    <div class="campo"><label>Data de Emissão</label><span>${vars.contract_date}</span></div>
  </div>
  <div class="grid-3" style="margin-top:6px">
    <div class="campo"><label>Convênio / Parceria</label><span>${vars.convenio || 'Direto'}</span></div>
    <div class="campo"><label>Nº de Parcelas</label><span>${vars.num_parcelas || '1'}</span></div>
    <div class="campo"><label>Primeiro Vencimento</label><span>${vars.primeiro_vencimento || '-'}</span></div>
  </div>
  <div class="grid-3" style="margin-top:6px">
    <div class="campo"><label>Valor Entrada</label><span>R$ ${vars.valor_entrada || '0,00'}</span></div>
    <div class="campo"><label>Valor s/ Desconto</label><span>R$ ${vars.course_value_sem_desconto || vars.course_value}</span></div>
    <div class="campo"><label>Desconto (%)</label><span>${vars.desconto_percentual || '0'}%</span></div>
  </div>
  <div class="grid-3" style="margin-top:6px">
    <div class="campo" style="background:#e8f5e9"><label>Valor c/ Desconto</label><span style="color:#2e7d32">R$ ${vars.course_value}</span></div>
    <div class="campo"><label>Valor da Parcela</label><span>R$ ${vars.valor_parcela || vars.course_value}</span></div>
    <div class="campo"><label>Carga Horária</label><span>${vars.course_duration || '-'}</span></div>
  </div>
</div>

<!-- DADOS DAS PARTES -->
<div class="secao">
  <h3>1. Identificação das Partes</h3>
  
  <p style="font-weight:bold; margin-bottom:4px;">CONTRATADA:</p>
  <div class="grid-2">
    <div class="campo"><label>Razão Social</label><span>V.S. NUNES CURSOS E TREINAMENTO LTDA</span></div>
    <div class="campo"><label>Nome Fantasia</label><span>CAT CURSOS DE APRIMORAMENTO DO TRABALHADOR</span></div>
    <div class="campo"><label>CNPJ</label><span>07.238.084/0001-45</span></div>
    <div class="campo"><label>Telefone</label><span>(91) 98413-2527 / (91) 3754-1500</span></div>
  </div>
  <div class="campo" style="margin-top:4px"><label>Endereço</label><span>Av. Beira Rio, 1740 — Vila Nova, Barcarena/PA — CEP 68445-000</span></div>

  <p style="font-weight:bold; margin:8px 0 4px;">CONTRATANTE (ALUNO):</p>
  <div class="grid-2">
    <div class="campo"><label>Nome Completo</label><span>${vars.student_name}</span></div>
    <div class="campo"><label>CPF</label><span>${vars.student_cpf}</span></div>
    <div class="campo"><label>RG</label><span>${vars.student_rg || '-'}</span></div>
    <div class="campo"><label>Data de Nascimento</label><span>${vars.student_data_nascimento || '-'}</span></div>
    <div class="campo"><label>E-mail</label><span>${vars.student_email || '-'}</span></div>
    <div class="campo"><label>WhatsApp</label><span>${vars.student_phone || '-'}</span></div>
  </div>
  <div class="campo" style="margin-top:4px"><label>Endereço Completo</label><span>${vars.student_address || '-'}</span></div>

  ${vars.resp_legal_nome ? `
  <p style="font-weight:bold; margin:8px 0 4px;">RESPONSÁVEL LEGAL (MENOR DE IDADE):</p>
  <div class="grid-2">
    <div class="campo"><label>Nome Completo</label><span>${vars.resp_legal_nome}</span></div>
    <div class="campo"><label>CPF</label><span>${vars.resp_legal_cpf || '-'}</span></div>
    <div class="campo"><label>WhatsApp</label><span>${vars.resp_legal_phone || '-'}</span></div>
    <div class="campo"><label>Grau de Vínculo</label><span>${vars.resp_legal_vinculo || '-'}</span></div>
  </div>` : ''}

  ${vars.resp_financeiro_nome ? `
  <p style="font-weight:bold; margin:8px 0 4px;">RESPONSÁVEL FINANCEIRO:</p>
  <div class="grid-2">
    <div class="campo"><label>Nome Completo</label><span>${vars.resp_financeiro_nome}</span></div>
    <div class="campo"><label>CPF</label><span>${vars.resp_financeiro_cpf || '-'}</span></div>
    <div class="campo"><label>WhatsApp</label><span>${vars.resp_financeiro_phone || '-'}</span></div>
    <div class="campo"><label>E-mail</label><span>${vars.resp_financeiro_email || '-'}</span></div>
  </div>` : ''}
</div>

<!-- DADOS DO CURSO -->
<div class="secao">
  <h3>2. Objeto do Contrato — Dados do Curso</h3>
  <div class="grid-3">
    <div class="campo"><label>Curso Contratado</label><span>${vars.course_name}</span></div>
    <div class="campo"><label>Carga Horária</label><span>${vars.course_duration || '-'}</span></div>
    <div class="campo"><label>Modalidade</label><span>${vars.course_modality || 'Presencial'}</span></div>
    <div class="campo"><label>Data de Início</label><span>${vars.course_start_date || '-'}</span></div>
    <div class="campo"><label>Previsão de Término</label><span>${vars.course_end_date || '-'}</span></div>
    <div class="campo"><label>Local de Realização</label><span>Barcarena/PA</span></div>
  </div>
</div>

<!-- CLÁUSULAS -->
<div class="secao">
  <h3>3. Cláusulas Contratuais</h3>

  <div class="clausula">
    <h4>Cláusula 1ª — Objetivo</h4>
    <p>A CONTRATADA compromete-se a ministrar ao CONTRATANTE o curso de <strong>${vars.course_name}</strong>, com carga horária de <strong>${vars.course_duration || '-'}</strong>, conforme programação e cronograma definidos pela instituição, com objetivo de capacitação e desenvolvimento profissional do aluno.</p>
  </div>

  <div class="clausula">
    <h4>Cláusula 2ª — Avaliação e Prazos</h4>
    <p>O aluno deverá cumprir <strong>75% (setenta e cinco por cento) de frequência</strong> mínima para aprovação. A avaliação poderá ser teórica, prática ou por meio de exercícios, conforme metodologia adotada para o respectivo curso.</p>
  </div>

  <div class="clausula">
    <h4>Cláusula 3ª — Material Didático</h4>
    <p>O material didático necessário para a realização do curso, quando aplicável, será fornecido pela CONTRATADA ou informado previamente ao aluno no ato da matrícula.</p>
  </div>

  <div class="clausula">
    <h4>Cláusula 4ª — Desistência e Cancelamento</h4>
    <p>O CONTRATANTE poderá solicitar cancelamento de matrícula em até <strong>7 (sete) dias corridos</strong> após a assinatura do contrato, com reembolso integral dos valores pagos, conforme Art. 49 do CDC. Após esse prazo, o cancelamento estará sujeito às seguintes condições: (a) antes do início do curso: devolução de 80% do valor pago; (b) após início: sem direito a reembolso, podendo haver crédito interno para outro curso. A solicitação deve ser feita por escrito à CONTRATADA.</p>
  </div>

  <div class="clausula">
    <h4>Cláusula 5ª — Trancamento de Matrícula</h4>
    <p>O trancamento de matrícula poderá ser solicitado uma única vez, por motivo justificado e documentado, com aprovação da coordenação pedagógica. O aluno terá prazo de até <strong>6 (seis) meses</strong> para retomar o curso sem custos adicionais. Após esse prazo, nova matrícula deverá ser realizada.</p>
  </div>

  <div class="clausula">
    <h4>Cláusula 6ª — Certificado</h4>
    <p>O certificado de conclusão será emitido após cumprimento de todos os requisitos: frequência mínima, aprovação nas avaliações e quitação integral dos valores contratados. O certificado digital estará disponível no portal do aluno após assinatura digital do interessado.</p>
  </div>

  <div class="clausula">
    <h4>Cláusula 7ª — Atrasos no Pagamento</h4>
    <p>O não pagamento das parcelas nas datas acordadas implicará: <strong>multa de ${vars.fine_percentage || '2'}%</strong> sobre o valor da parcela, <strong>juros de ${vars.interest_percentage || '1'}% ao mês</strong> e correção monetária pelo IPCA. O inadimplemento por mais de 30 dias poderá acarretar suspensão do acesso ao portal e ao curso, sem prejuízo da execução judicial da dívida.</p>
  </div>

  <div class="clausula">
    <h4>Cláusula 8ª — Deveres do Aluno</h4>
    <p>São deveres do CONTRATANTE: (a) comparecer pontualmente às aulas; (b) manter conduta ética e respeitosa; (c) zelar pelo patrimônio da CONTRATADA; (d) manter seus dados cadastrais atualizados; (e) cumprir o regulamento interno da instituição.</p>
  </div>

  <div class="clausula">
    <h4>Cláusula 9ª — Condutas Vedadas</h4>
    <p>É vedado ao CONTRATANTE: usar indevidamente os recursos da instituição; reproduzir materiais didáticos sem autorização; praticar atos que atentem contra a ordem, a moral ou os direitos de terceiros. O descumprimento poderá acarretar desligamento imediato, sem reembolso.</p>
  </div>

  <div class="clausula">
    <h4>Cláusula 10ª — Acesso ao Portal do Aluno</h4>
    <p>O acesso ao portal digital da CAT Cursos será liberado após: (a) assinatura digital do presente contrato; (b) confirmação do pagamento ou emissão de boleto/cobrança. O acesso poderá ser suspenso em caso de inadimplência ou violação contratual.</p>
  </div>

  <div class="clausula">
    <h4>Cláusula 11ª — Transferência para Outro Curso</h4>
    <p>O CONTRATANTE poderá solicitar transferência para outro curso de igual ou maior valor, mediante aditivo contratual. Em caso de diferença de valor, nova cobrança será gerada. A transferência não implica devolução de valores já pagos.</p>
  </div>

  <div class="clausula">
    <h4>Cláusula 12ª — Aditivo Contratual</h4>
    <p>Qualquer alteração nas condições deste contrato, após assinatura de todas as partes, somente será válida mediante aditivo contratual devidamente assinado por ambas as partes.</p>
  </div>

  <div class="clausula">
    <h4>Cláusula 13ª — Assinatura Digital</h4>
    <p>As partes reconhecem e aceitam expressamente a validade jurídica da assinatura digital realizada neste instrumento, nos termos da Lei nº 14.063/2020 e MP nº 2.200-2/2001. A assinatura digital constitui prova plena de autoria e integridade do documento. O código de autenticação <strong>${vars.auth_code}</strong> identifica exclusivamente este contrato.</p>
  </div>

  <div class="clausula">
    <h4>Cláusula 14ª — Envio e Disponibilização do Contrato Assinado</h4>
    <p>Após a assinatura de todas as partes, o contrato assinado em formato PDF será disponibilizado no portal do aluno e enviado ao WhatsApp do CONTRATANTE, servindo como comprovante legal da relação contratual.</p>
  </div>

  <div class="clausula" style="background:#fff8e1; border:1px solid #ffc107; padding:8px;">
    <h4>Cláusula 15ª — Lei Geral de Proteção de Dados — LGPD (Lei nº 13.709/2018)</h4>
    <p>A CONTRATADA, na qualidade de CONTROLADORA de dados, declara que os dados pessoais coletados neste contrato serão tratados com finalidades específicas e legítimas, exclusivamente para: (1) cadastro e matrícula do aluno; (2) execução do curso contratado; (3) controle financeiro e emissão de recibos; (4) emissão de certificados; (5) comunicação por WhatsApp, SMS e e-mail; (6) registro acadêmico; (7) cumprimento de obrigações legais e regulatórias. Os dados não serão compartilhados com terceiros sem consentimento, exceto por obrigação legal. O titular tem direito ao acesso, correção, portabilidade e exclusão dos seus dados, mediante solicitação formal.</p>
    <p style="margin-top:6px; font-weight:bold;">Ao assinar digitalmente este contrato, o CONTRATANTE declara expressamente que leu, compreendeu e consente com o tratamento de seus dados pessoais conforme descrito nesta cláusula.</p>
  </div>
</div>

<!-- CAMPO DE CIÊNCIA -->
<div class="secao">
  <h3>16. Declaração de Ciência</h3>
  <p>O CONTRATANTE declara que leu e compreendeu todas as cláusulas deste contrato antes de assinar digitalmente, concordando plenamente com todos os termos e condições aqui estabelecidos.</p>
</div>

<!-- ASSINATURAS -->
<div class="secao">
  <h3>17. Assinaturas Digitais</h3>
  <p style="font-size:10px; margin-bottom:10px;">Barcarena/PA, ${vars.contract_date}</p>

  <!-- ASSINATURA DO ALUNO -->
  <div class="assinatura-box">
    <p style="font-weight:bold; font-size:11px; margin:0 0 6px;">CONTRATANTE — ALUNO</p>
    ${vars.student_signature_url 
      ? `<img src="${vars.student_signature_url}" class="assinatura-img" alt="Assinatura do aluno" />`
      : `<div class="assinatura-linha"></div>`}
    <div class="assinatura-meta">
      <strong>${vars.student_name}</strong> — CPF: ${vars.student_cpf}<br/>
      ${vars.student_signed_at ? `Data/Hora: ${new Date(vars.student_signed_at).toLocaleString('pt-BR')} | IP: ${vars.student_signed_ip || '-'}` : 'Aguardando assinatura...'}<br/>
      ${vars.student_lgpd_accepted_at ? `LGPD aceita em: ${new Date(vars.student_lgpd_accepted_at).toLocaleString('pt-BR')}` : ''}<br/>
      Código de Autenticação: ${vars.auth_code}
    </div>
  </div>

  ${vars.is_minor && vars.resp_legal_nome ? `
  <!-- ASSINATURA DO RESPONSÁVEL LEGAL -->
  <div class="assinatura-box">
    <p style="font-weight:bold; font-size:11px; margin:0 0 6px;">RESPONSÁVEL LEGAL</p>
    ${vars.resp_legal_signature_url
      ? `<img src="${vars.resp_legal_signature_url}" class="assinatura-img" alt="Assinatura responsável legal" />`
      : `<div class="assinatura-linha"></div>`}
    <div class="assinatura-meta">
      <strong>${vars.resp_legal_nome}</strong> — CPF: ${vars.resp_legal_cpf || '-'}<br/>
      ${vars.resp_legal_signed_at ? `Data/Hora: ${new Date(vars.resp_legal_signed_at).toLocaleString('pt-BR')} | IP: ${vars.resp_legal_signed_ip || '-'}` : 'Aguardando assinatura...'}<br/>
      Código de Autenticação: ${vars.auth_code}
    </div>
  </div>` : ''}

  ${vars.resp_financeiro_nome ? `
  <!-- ASSINATURA DO RESPONSÁVEL FINANCEIRO -->
  <div class="assinatura-box">
    <p style="font-weight:bold; font-size:11px; margin:0 0 6px;">RESPONSÁVEL FINANCEIRO</p>
    ${vars.resp_financeiro_signature_url
      ? `<img src="${vars.resp_financeiro_signature_url}" class="assinatura-img" alt="Assinatura responsável financeiro" />`
      : `<div class="assinatura-linha"></div>`}
    <div class="assinatura-meta">
      <strong>${vars.resp_financeiro_nome}</strong> — CPF: ${vars.resp_financeiro_cpf || '-'}<br/>
      ${vars.resp_financeiro_signed_at ? `Data/Hora: ${new Date(vars.resp_financeiro_signed_at).toLocaleString('pt-BR')} | IP: ${vars.resp_financeiro_signed_ip || '-'}` : 'Aguardando assinatura...'}<br/>
      Código de Autenticação: ${vars.auth_code}
    </div>
  </div>` : ''}

  <!-- ASSINATURA DA CAT CURSOS -->
  <div class="assinatura-box">
    <p style="font-weight:bold; font-size:11px; margin:0 0 6px;">CONTRATADA — CAT CURSOS</p>
    <div class="assinatura-linha"></div>
    <div class="assinatura-meta">
      <strong>V.S. NUNES CURSOS E TREINAMENTO LTDA</strong><br/>
      CNPJ: 07.238.084/0001-45<br/>
      ${vars.manager_signed_at ? `Assinado por: ${vars.manager_signed_by} em ${new Date(vars.manager_signed_at).toLocaleString('pt-BR')}` : 'Aguardando assinatura da contratada...'}<br/>
      Código de Autenticação: ${vars.auth_code}
    </div>
  </div>
</div>

<div class="rodape">
  <p>Contrato Nº ${vars.contract_number} | Código de Autenticação: ${vars.auth_code}</p>
  <p>CAT Cursos de Aprimoramento do Trabalhador — CNPJ: 07.238.084/0001-45 — Barcarena/PA</p>
  <p>Documento gerado digitalmente em ${vars.contract_date} — Validade garantida nos termos da Lei nº 14.063/2020</p>
</div>

</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { student_id, enrollment_id, template_id, force_regen } = await req.json();
    if (!student_id) return Response.json({ error: 'student_id é obrigatório' }, { status: 400 });

    // Buscar dados em paralelo
    const [students, enrollments] = await Promise.all([
      base44.asServiceRole.entities.Student.filter({ id: student_id }),
      enrollment_id ? base44.asServiceRole.entities.StudentCourseEnrollment.filter({ id: enrollment_id }) : Promise.resolve([])
    ]);

    const student = students[0];
    const enrollment = enrollments[0];
    if (!student) return Response.json({ error: 'Aluno não encontrado' }, { status: 404 });

    // Verificar se já existe contrato não assinado para essa matrícula
    if (enrollment_id && !force_regen) {
      const existingContracts = await base44.asServiceRole.entities.Contract.filter({ enrollment_id });
      const active = existingContracts.find(c => !['Cancelado','Substituido_Aditivo'].includes(c.status));
      if (active) {
        return Response.json({ success: true, contract_id: active.id, contract_number: active.contract_number, already_exists: true });
      }
    }

    // Gerar número do contrato
    const allContracts = await base44.asServiceRole.entities.Contract.list('-created_date', 1);
    const lastNum = allContracts.length > 0
      ? parseInt((allContracts[0].contract_number || 'CAT-2026-0000').split('-')[2] || '0') + 1
      : 1;
    const year = new Date().getFullYear();
    const contractNumber = `CAT-${year}-${String(lastNum).padStart(4, '0')}`;
    
    // Gerar código de autenticação
    const authCode = `CAT-AUTH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;

    const today = new Date();
    const todayStr = today.toLocaleDateString('pt-BR');

    // Verificar menor de idade
    let isMinor = false;
    if (student.data_nascimento) {
      const nascimento = new Date(student.data_nascimento);
      const idade = Math.floor((today - nascimento) / (365.25 * 24 * 60 * 60 * 1000));
      isMinor = idade < 18;
    }

    // Montar endereço completo
    const parts = [student.logradouro, student.numero, student.complemento, student.bairro, student.cidade, student.estado, student.cep].filter(Boolean);
    const studentAddress = parts.join(', ');

    // Calcular valor da parcela
    const courseValue = enrollment?.unit_value ? parseFloat(enrollment.unit_value) : 0;
    const numParcelas = enrollment?.forma_pagamento?.includes('Parcelado')
      ? parseInt(enrollment.forma_pagamento.replace(/\D/g,'')) || 1
      : 1;
    const valorParcela = numParcelas > 1 ? (courseValue / numParcelas) : courseValue;

    const vars = {
      contract_number: contractNumber,
      contract_date: todayStr,
      auth_code: authCode,
      student_code: student.ra || student.id.substring(0, 8).toUpperCase(),
      student_name: student.full_name || '',
      student_cpf: student.cpf || '',
      student_rg: student.rg ? `${student.rg} ${student.rg_orgao_emissor || ''}` : '-',
      student_email: student.email || '-',
      student_phone: student.whatsapp || '-',
      student_data_nascimento: student.data_nascimento ? new Date(student.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-',
      student_address: studentAddress || '-',
      is_minor: isMinor,
      resp_legal_nome: isMinor ? student.resp_financeiro_nome || '' : '',
      resp_legal_cpf: isMinor ? student.resp_financeiro_cpf || '' : '',
      resp_legal_phone: isMinor ? student.resp_financeiro_telefone || '' : '',
      resp_financeiro_nome: !isMinor && student.resp_financeiro_nome ? student.resp_financeiro_nome : '',
      resp_financeiro_cpf: student.resp_financeiro_cpf || '',
      resp_financeiro_phone: student.resp_financeiro_telefone || '',
      resp_financeiro_email: student.resp_financeiro_email || '',
      course_name: enrollment?.course_name || '-',
      course_duration: enrollment?.course_duration || '-',
      course_modality: 'Presencial',
      course_start_date: enrollment?.start_date ? new Date(enrollment.start_date + 'T00:00:00').toLocaleDateString('pt-BR') : '-',
      course_end_date: enrollment?.end_date ? new Date(enrollment.end_date + 'T00:00:00').toLocaleDateString('pt-BR') : '-',
      course_value: courseValue.toFixed(2).replace('.', ','),
      course_value_sem_desconto: courseValue.toFixed(2).replace('.', ','),
      desconto_percentual: '0',
      valor_entrada: '0,00',
      num_parcelas: String(numParcelas),
      valor_parcela: valorParcela.toFixed(2).replace('.', ','),
      primeiro_vencimento: enrollment?.data_vencimento_pagamento ? new Date(enrollment.data_vencimento_pagamento + 'T00:00:00').toLocaleDateString('pt-BR') : '-',
      fine_percentage: '2',
      interest_percentage: '1',
      student_signature_url: null,
      student_signed_at: null,
      student_signed_ip: null,
      student_lgpd_accepted_at: null,
      resp_legal_signature_url: null,
      resp_legal_signed_at: null,
      resp_legal_signed_ip: null,
      resp_financeiro_signature_url: null,
      resp_financeiro_signed_at: null,
      resp_financeiro_signed_ip: null,
      manager_signed_at: null,
      manager_signed_by: null,
    };

    const htmlFilled = gerarHtmlContrato(vars);

    // Determinar status inicial
    const initialStatus = 'Gerado_Automaticamente';

    const contractData = {
      contract_number: contractNumber,
      student_id: student.id,
      student_name: student.full_name,
      student_cpf: student.cpf,
      student_email: student.email || '',
      student_phone: student.whatsapp || '',
      student_data_nascimento: student.data_nascimento || '',
      is_minor: isMinor,
      enrollment_id: enrollment_id || '',
      course_name: enrollment?.course_name || '',
      course_duration: enrollment?.course_duration || '',
      course_value: courseValue,
      payment_method: enrollment?.forma_pagamento || '',
      course_start_date: enrollment?.start_date || '',
      course_end_date: enrollment?.end_date || '',
      num_parcelas: numParcelas,
      valor_parcela: valorParcela,
      resp_legal_nome: vars.resp_legal_nome,
      resp_legal_cpf: vars.resp_legal_cpf,
      resp_legal_phone: vars.resp_legal_phone,
      resp_financeiro_nome: vars.resp_financeiro_nome,
      resp_financeiro_cpf: vars.resp_financeiro_cpf,
      resp_financeiro_phone: vars.resp_financeiro_phone,
      auth_code: authCode,
      status: initialStatus,
      html_content_filled: htmlFilled,
    };

    const contract = await base44.asServiceRole.entities.Contract.create(contractData);

    // ─── Gerar lançamentos financeiros a receber (evita duplicidade) ───
    const existingLancs = await base44.asServiceRole.entities.LancamentoFinanceiro.filter({
      origem_modulo: 'Contrato', origem_id: contract.id
    });
    if (existingLancs.length === 0) {
      const numParc = numParcelas || 1;
      const valorParc = numParc > 1 ? valorParcela : courseValue;
      const baseDate = enrollment?.data_vencimento_pagamento || new Date().toISOString().split('T')[0];
      const lancamentos = [];
      for (let i = 1; i <= numParc; i++) {
        let venc = baseDate;
        if (numParc > 1 && i > 1) {
          const d = new Date(baseDate + 'T00:00:00');
          d.setMonth(d.getMonth() + (i - 1));
          venc = d.toISOString().split('T')[0];
        }
        lancamentos.push({
          tipo: 'Receita',
          natureza: 'Previsto',
          status: 'Pendente',
          descricao: `Contrato ${contractNumber}${numParc > 1 ? ` — Parcela ${i}/${numParc}` : ''} — ${student.full_name} — ${enrollment?.course_name || ''}`,
          valor: valorParc,
          data_vencimento: venc,
          origem_modulo: 'Contrato',
          origem_id: contract.id,
          cliente_id: student.id,
          cliente_nome: student.full_name,
          curso_nome: enrollment?.course_name || '',
          numero_parcela: i,
          total_parcelas: numParc,
          observacoes: 'Lançamento gerado automaticamente pelo gerarContrato',
        });
      }
      if (lancamentos.length > 0) {
        await base44.asServiceRole.entities.LancamentoFinanceiro.bulkCreate(lancamentos);
      }
    }

    // Timeline
    await base44.asServiceRole.entities.StudentTimeline.create({
      student_id: student.id,
      student_name: student.full_name,
      event_type: 'contrato_gerado',
      title: 'Contrato Gerado Automaticamente',
      description: `Contrato ${contractNumber} gerado automaticamente após finalização da matrícula. Código de autenticação: ${authCode}`,
      performed_by: user.email,
      metadata: { contract_id: contract.id, contract_number: contractNumber, auth_code: authCode, enrollment_id: enrollment_id }
    });

    return Response.json({ success: true, contract_id: contract.id, contract_number: contractNumber, auth_code: authCode });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});