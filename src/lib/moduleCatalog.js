export const MODULE_CATALOG = [
  { module_id: "dashboard", name: "Dashboard", route: "/Dashboard", group: "Geral", status: "active", aliases: ["DashboardCentral"] },
  { module_id: "cronograma", name: "Cronograma", route: "/Schedule", group: "Geral", status: "active", aliases: ["Schedule"] },
  { module_id: "agenda_treinamentos", name: "Agenda de Treinamentos", route: "/AgendaTreinamentos", group: "Geral", status: "active", aliases: ["AgendaTreinamentos"] },
  { module_id: "chamada_presencial", name: "Chamada Presencial", route: "/AttendanceCall", group: "Geral", status: "active", aliases: ["AttendanceCall"] },
  { module_id: "entrada_propostas", name: "Entrada de Propostas", route: "/ProposalEntry", group: "Operacional", status: "active", aliases: ["ProposalEntry"] },
  { module_id: "gestao_bmm", name: "Gestão de BMM", route: "/GestaoBMM", group: "Operacional", status: "active", aliases: ["GestaoBMM"] },
  { module_id: "instrutores", name: "Instrutores", route: "/Instructors", group: "Operacional", status: "active", aliases: ["Instructors"] },
  { module_id: "empresas", name: "Empresas", route: "/Companies", group: "Operacional", status: "active", aliases: ["Companies"] },
  { module_id: "contratadas", name: "Contratadas", route: "/Contractors", group: "Operacional", status: "active", aliases: ["Contractors"] },
  { module_id: "cursos", name: "Cursos", route: "/Courses", group: "Operacional", status: "active", aliases: ["Courses"] },
  { module_id: "gestao_academica_individual", name: "Gestão Acadêmica Individual", route: "/GestaoAlunosIndividuais", group: "Operacional", status: "active", aliases: ["Alunos Individuais (PF)", "GestaoAlunosIndividuais"] },
  { module_id: "gestao_academica_empresas", name: "Gestão Acadêmica Empresas", route: "/GestaoAcademicaEmpresas", group: "Operacional", status: "active", aliases: ["GestaoAcademicaEmpresas"] },
  { module_id: "gestao_contratos", name: "Gestão de Contratos", route: "/GestaoContratos", group: "Operacional", status: "active", aliases: ["GestaoContratos"] },
  { module_id: "dashboard_operacional", name: "Dashboard Operacional", route: "/DashboardOperacionalV2", group: "Operacional", status: "active", aliases: ["DashboardOperacional", "DashboardOperacionalV2"] },
  { module_id: "dashboard_financeiro", name: "Dashboard Financeiro", route: "/DashboardFinanceiro", group: "Operacional", status: "active", aliases: ["DashboardFinanceiro"] },
  { module_id: "financeiro", name: "Financeiro", route: "/Financeiro", group: "Operacional", status: "active", aliases: ["FinanceiroHub"] },
  { module_id: "prontuario_digital", name: "Prontuário Digital", route: "/ProntuarioDigital", group: "Operacional", status: "active", aliases: ["ProntuarioDigital"] },
  { module_id: "documentos_alunos", name: "Documentos de Alunos", route: "/GestaoDocumentosAluno", group: "Operacional", status: "active", aliases: ["GestaoDocumentosAluno"] },
  { module_id: "certificacoes", name: "Certificações", route: "/Certificacoes", group: "Certificações", status: "active", aliases: ["Certificacoes", "CertificateEmissao"] },
  { module_id: "alertas_vencimento", name: "Alertas de Vencimento", route: "/CertificateAlerts", group: "Certificações", status: "active", aliases: ["CertificateAlerts"] },
  { module_id: "designer_certificados", name: "Designer de Certificados", route: "/CertDesigner", group: "Certificações", status: "active", aliases: ["CertDesigner"] },
  { module_id: "assinaturas_digitais", name: "Assinaturas Digitais", route: "/DigitalSignatures", group: "Certificações", status: "active", aliases: ["DigitalSignatures"] },
  { module_id: "auditoria_certificados", name: "Auditoria de Certificados", route: "/CertificateAuditPanel", group: "Certificações", status: "active", aliases: ["CertificateAuditPanel"] },
  { module_id: "dashboard_comercial", name: "Dashboard Comercial", route: "/DashboardComercial", group: "Comercial", status: "active", aliases: ["DashboardComercial"] },
  { module_id: "central_comunicacao", name: "Central de Comunicação", route: "/CommunicationCenter", group: "Comunicação", status: "active", aliases: ["CommunicationCenter"] },
  { module_id: "relatorios", name: "Dashboard de Relatórios", route: "/Analytics", group: "Relatórios", status: "active", aliases: ["Analytics"] },
  { module_id: "dashboard_admin", name: "Dashboard Admin", route: "/AdminDashboard", group: "Relatórios", status: "active", aliases: ["AdminDashboard"] },
  { module_id: "dashboard_master", name: "Dashboard Master", route: "/DashboardMaster", group: "Relatórios", status: "active", aliases: ["DashboardMaster"] },
  { module_id: "dashboard_certificacao", name: "Dashboard Certificação", route: "/DashboardCertificacao", group: "Relatórios", status: "active", aliases: ["DashboardCertificacao"] },
  { module_id: "dashboard_instrutor", name: "Dashboard Instrutor", route: "/DashboardInstrutor", group: "Relatórios", status: "active", aliases: ["DashboardInstrutor"] },
  { module_id: "homologacoes", name: "Homologações", route: "/Homologacoes", group: "Homologação", status: "active", aliases: ["Homologacoes"] },
  { module_id: "dossie_homologacao", name: "Dossiê de Homologação", route: "/DossieHomologacao", group: "Homologação", status: "active", aliases: ["DossieHomologacao"] },
  { module_id: "matriz_treinamentos", name: "Matriz de Treinamentos", route: "/MatrizTreinamentos", group: "Homologação", status: "active", aliases: ["MatrizTreinamentos"] },
  { module_id: "usuarios", name: "Usuários", route: "/Users", group: "Administração", status: "active", aliases: ["Users", "Usuarios"] },
  { module_id: "log_auditoria", name: "Log de Auditoria", route: "/AuditLog", group: "Administração", status: "active", aliases: ["AuditLog"] },
  { module_id: "auditoria_completa", name: "Auditoria Completa", route: "/AuditoriaCompleta", group: "Administração", status: "active", aliases: ["AuditoriaCompleta"] },
  { module_id: "log_acesso", name: "Log de Acesso", route: "/AccessLog", group: "Administração", status: "active", aliases: ["AccessLog"] },
  { module_id: "backup_download", name: "Download de Backups", route: "/BackupDownload", group: "Administração", status: "active", aliases: ["BackupDownload"] },
  { module_id: "alertas_config", name: "Configuração de Alertas", route: "/AlertasConfig", group: "Administração", status: "active", aliases: ["AlertasConfig"] },
];

export const MODULE_IDS = MODULE_CATALOG.filter(m => m.status === "active").map(m => m.module_id);
export const MODULE_BY_ID = Object.fromEntries(MODULE_CATALOG.map(m => [m.module_id, m]));
const MODULE_LOOKUP = new Map();
MODULE_CATALOG.forEach(m => [m.module_id, m.name, m.route, ...m.aliases].forEach(k => MODULE_LOOKUP.set(k, m.module_id)));
export const canonicalizeModule = key => typeof key === "string" ? (MODULE_LOOKUP.get(key.trim()) || null) : null;
export const normalizePermissionIds = values => [...new Set((values || []).map(canonicalizeModule).filter(Boolean))];
export const MODULE_GROUPS = [...new Set(MODULE_CATALOG.map(m => m.group))].map(group => ({ group, modules: MODULE_CATALOG.filter(m => m.group === group && m.status === "active") }));