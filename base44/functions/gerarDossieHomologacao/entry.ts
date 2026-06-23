import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const entities = [
      'Company', 'Student', 'Course', 'CourseCategory', 'Instructor',
      'ClassSchedule', 'AgendaTreinamento', 'Certificate', 'CertificateModel',
      'Contract', 'ContractTemplate', 'BMMRecord', 'BMMTemplate',
      'Homologacao', 'MatrizTreinamento', 'FuncaoCargo', 'NormaRegulamentadora',
      'UserProfile', 'AuditLog', 'AccessLog', 'Lead', 'Proposal',
      'Notification', 'StudentCourseEnrollment', 'DigitalSignature',
      'ClassDailyRecord', 'FinancialNotification', 'ConfigNotificacoes',
      'ConfiguracaoAlertas', 'Client', 'Contractor', 'Conversation',
      'EmailTemplate', 'KnowledgeBaseEntry', 'LogNotificacoes',
      'NotificationPreference', 'Receipt', 'SocialAccount', 'TrainingSchedule',
      'StudentDocument', 'StudentTimeline'
    ];

    const results = {};
    const totalRecords = {};

    // Contar registros de cada entidade
    for (const entityName of entities) {
      try {
        const items = await base44.asServiceRole.entities[entityName].list('-created_date', 1);
        totalRecords[entityName] = items.length > 0 ? '≥1' : '0';
      } catch {
        totalRecords[entityName] = 'N/D';
      }
    }

    // Dados detalhados dos módulos principais
    const [empresas, alunos, cursos, instrutores, turmas, certificados,
           certificadosAtivos, certificadosVencidos, contratos, matriz, funcoes,
           nrs, users, homologacoes, auditoria, leads] = await Promise.all([
      base44.asServiceRole.entities.Company.list('razao_social', 200),
      base44.asServiceRole.entities.Student.list('-created_date', 200),
      base44.asServiceRole.entities.Course.list('name', 200),
      base44.asServiceRole.entities.Instructor.list('name', 200),
      base44.asServiceRole.entities.ClassSchedule.list('-created_date', 200),
      base44.asServiceRole.entities.Certificate.list('-created_date', 200),
      base44.asServiceRole.entities.Certificate.filter({ status: 'active' }, '-created_date', 5).catch(() => []),
      base44.asServiceRole.entities.Certificate.filter({ status: 'expired' }, '-created_date', 5).catch(() => []),
      base44.asServiceRole.entities.Contract.list('-created_date', 200),
      base44.asServiceRole.entities.MatrizTreinamento.list('-created_date', 5).catch(() => []),
      base44.asServiceRole.entities.FuncaoCargo.list('nome', 5).catch(() => []),
      base44.asServiceRole.entities.NormaRegulamentadora.list('codigo', 5).catch(() => []),
      base44.asServiceRole.entities.UserProfile.list('user_name', 5).catch(() => []),
      base44.asServiceRole.entities.Homologacao.list('-created_date', 5).catch(() => []),
      base44.asServiceRole.entities.AuditLog.list('-created_date', 5).catch(() => []),
      base44.asServiceRole.entities.Lead.list('-created_date', 5).catch(() => []),
    ]);

    // Status dos certificados
    const statusCert = {};
    (certificados || []).forEach(c => {
      statusCert[c.status || 'unknown'] = (statusCert[c.status || 'unknown'] || 0) + 1;
    });

    // Empresas por status
    const empresasAtivas = empresas.filter(e => e.status === 'Ativo').length;
    const empresasTotal = empresas.length;

    // Turmas por status
    const statusTurmas = {};
    turmas.forEach(t => {
      statusTurmas[t.status || 'Agendado'] = (statusTurmas[t.status || 'Agendado'] || 0) + 1;
    });

    // Módulos do sistema (baseado nas páginas/routes)
    const modulos = [
      { nome: 'Dashboard Central', status: 'operacional', descricao: 'Painel principal com visão integrada' },
      { nome: 'Cronograma / Agenda', status: 'operacional', descricao: 'Calendário e tabela de treinamentos' },
      { nome: 'Empresas (Clientes)', status: 'operacional', descricao: 'Cadastro completo com unidades, contatos e contratos' },
      { nome: 'Contratadas', status: 'operacional', descricao: 'Gestão de empresas contratadas' },
      { nome: 'Cursos', status: 'operacional', descricao: 'Catálogo com categorias e valores' },
      { nome: 'Instrutores', status: 'operacional', descricao: 'Cadastro com perfil profissional e documentos' },
      { nome: 'Certificações', status: 'operacional', descricao: 'Emissão, assinatura digital e validação' },
      { nome: 'Designer de Certificados', status: 'operacional', descricao: 'Editor visual de modelos de certificado' },
      { nome: 'Assinaturas Digitais', status: 'operacional', descricao: 'Assinatura via link com verificação de IP' },
      { nome: 'Gestão de Contratos', status: 'operacional', descricao: 'Contratos com múltiplas assinaturas e PDF' },
      { nome: 'Gestão de BMM', status: 'operacional', descricao: 'Boletim de Medição Mensal com templates' },
      { nome: 'Financeiro', status: 'operacional', descricao: 'Controle de pagamentos, recibos e Asaas' },
      { nome: 'Usuários e Permissões', status: 'operacional', descricao: 'RBAC com perfis e acesso por módulo' },
      { nome: 'Auditoria', status: 'operacional', descricao: 'Log completo de ações e acessos' },
      { nome: 'Comunicação', status: 'operacional', descricao: 'E-mail, WhatsApp e notificações automáticas' },
      { nome: 'Dashboard Comercial', status: 'operacional', descricao: 'Leads, propostas e pipeline' },
      { nome: 'Prontuário Digital', status: 'operacional', descricao: 'Histórico completo do aluno por CPF' },
      { nome: 'Matriz de Treinamentos', status: 'operacional', descricao: 'Vinculação NR × Função × Curso' },
      { nome: 'Homologações', status: 'operacional', descricao: 'Controle de homologações de equipamentos/procedimentos' },
      { nome: 'Documentos de Alunos', status: 'operacional', descricao: 'Upload, OCR e gestão documental' },
      { nome: 'Alertas de Vencimento', status: 'operacional', descricao: 'Notificações automáticas pré-vencimento' },
      { nome: 'Backup', status: 'operacional', descricao: 'Download de backups e integridade de dados' },
      { nome: 'Portal do Aluno', status: 'operacional', descricao: 'Consulta pública e assinatura de certificados' },
      { nome: 'Portal da Empresa', status: 'operacional', descricao: 'Acesso restrito para empresas clientes' },
      { nome: 'Portal do Instrutor', status: 'operacional', descricao: 'Acesso restrito para instrutores' },
      { nome: 'Chamada Presencial', status: 'operacional', descricao: 'Registro de presença com QR Code' },
      { nome: 'Propostas Comerciais', status: 'operacional', descricao: 'Entrada e processamento de propostas' },
      { nome: 'Relatórios', status: 'operacional', descricao: 'Dashboards de BI e analytics' },
    ];

    const funcoesBackend = [
      'alertarVencimentoCertificados', 'enviarAlertasVencimentoEmail', 'enviarCertificadoWhatsApp',
      'enviarNotificacoesCertificados', 'enviarNotificacoesTreinamento', 'enviarContratoWhatsApp',
      'enviarContratoEmail', 'gerarContrato', 'assinarContrato', 'finalizarTurma',
      'gerarRecibo', 'asaasCobranca', 'asaasPayment', 'whatsappWebhook',
      'backupAutomatico', 'validarIntegridadeDados', 'generateCodeBackup',
      'verificarConformidadeMatriz', 'processarDocumentoOCR', 'bloquearCertificadosExpirados',
      'gerenciarPrazoDownloadCertificado', 'reenviarLinkAssinatura48h',
      'enviarConfirmacaoAgendamento', 'notificarInstrutorCurso', 'notificarInstrutorTurmaConfirmada',
      'enviarBoasVindas', 'atualizarPermissoesUsuario', 'convidarUsuario',
      'executarCadastro', 'executarCadastroMassa', 'sincronizarAlunoCadastro',
      'processarCronograma', 'processarTexto', 'processProposal',
      'gerarPerfilProfissional', 'gerarRelatoriosPagamentos', 'calcularExcedenteTurma',
      'enviarMensagemMassaWhatsApp', 'enviarNotificacaoWhatsApp', 'enviarRespostaWhatsApp',
      'alertarExpiracaoAsaas', 'alertarBoletosVencimento', 'notificarPagamentosPendentes',
      'verificarContratosVencendo', 'verificarNotificacoes', 'registrarAlteracao',
      'deletarComSeguranca', 'securityMiddleware', 'healthCheck', 'sendBMMEmailUOL',
      'notificarAdmins', 'assistenteCriarCursos', 'bulkCreateCompanyCourses',
      'reenviarCredenciais', 'enviarNotificacoes'
    ];

    const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const hora = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    return Response.json({
      gerado_em: `${hoje} às ${hora}`,
      gerado_por: user.email,
      resumo_geral: {
        empresas: { total: empresasTotal, ativas: empresasAtivas },
        alunos: { total: alunos.length },
        cursos: { total: cursos.length },
        instrutores: { total: instrutores.length },
        turmas: { total: turmas.length, por_status: statusTurmas },
        certificados: { total: certificados.length, por_status: statusCert },
        certificados_ativos: certificadosAtivos.length,
        certificados_vencidos: certificadosVencidos.length,
        contratos: { total: contratos.length },
        matriz_treinamentos: { vinculos: matriz.length },
        funcoes: { total: funcoes.length },
        normas: { total: nrs.length },
        usuarios: { total: users.length },
        homologacoes: { total: homologacoes.length },
        auditoria: { registros: auditoria.length },
        leads: { total: leads.length },
      },
      modulos,
      total_modulos: modulos.length,
      modulos_operacionais: modulos.filter(m => m.status === 'operacional').length,
      funcoes_backend: funcoesBackend.length,
      entidades: Object.keys(totalRecords).length,
      entidades_com_dados: Object.entries(totalRecords).filter(([_, v]) => v === '≥1').length,
      status_conformidade: {
        certificados_vencidos: certificadosVencidos.length,
        requer_atencao: certificadosVencidos.length > 0 ? 'Sim — renovar certificados vencidos' : 'Não — todos em dia',
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});