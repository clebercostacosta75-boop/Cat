// ─── RESOLVEDOR CENTRAL DE AUTORIZAÇÃO ──────────────────────────────────────
// Fonte canônica: UserProfile.permissions. Negar por padrão.
// Acesso total SOMENTE: User.role=admin E UserProfile.role=gestor_master E status=active.

export const ALL_MODULES = [
  "Dashboard", "Cronograma", "Agenda de Treinamentos", "Chamada Presencial",
  "Entrada de Propostas", "Gestão de BMM", "Instrutores", "Empresas", "Contratadas", "Cursos",
  "Alunos Individuais (PF)", "Gestão Acadêmica Individual", "Gestão Acadêmica Empresas",
  "Gestão de Contratos", "Dashboard Operacional", "Dashboard Financeiro",
  "Certificações", "Alertas de Vencimento", "Designer de Certificados", "Assinaturas Digitais",
  "Auditoria de Certificados", "Dashboard Comercial", "Central de Comunicação",
  "Dashboard de Relatórios", "Dashboard Admin", "Usuários", "Log de Auditoria",
  "Auditoria Completa", "Log de Acesso", "Homologações", "Matriz de Treinamentos",
  "Financeiro", "BackupDownload", "ProntuarioDigital", "GestaoDocumentosAluno",
  "DossieHomologacao", "DashboardMaster", "DashboardCertificacao", "DashboardInstrutor",
  "AlertasConfig",
  "Assistente de Cadastros", "Base de Conhecimento", "Compliance 360°", "Contas Sociais",
  "Log de Notificações", "Saúde Ocupacional", "Auditoria do Sistema", "Dashboard SST",
  "Empresas Mestre (SST)", "Colaboradores SST", "PGR — Leitura Inteligente",
  "PCMSO — Leitura Inteligente", "Conferência PGR × PCMSO", "LTCAT", "Gestão de Exames",
  "Matriz de Exames por Função", "PCMSO — Detalhe Completo", "Gestão de EPI",
  "Orçamento de Conformidade", "Agendamento de Treinamentos SST",
];

// Mapa central de aliases (nomes de rota/legados/sem acento → chave canônica)
export const MODULE_ALIASES = {
  "Certificacoes": "Certificações",
  "CertificateEmissao": "Certificações",
  "DashboardOperacionalV2": "Dashboard Operacional",
  "DashboardOperacional": "Dashboard Operacional",
  "Usuarios": "Usuários",
  "Users": "Usuários",
  "Homologacoes": "Homologações",
  "Schedule": "Cronograma",
  "AttendanceCall": "Chamada Presencial",
  "CertDesigner": "Designer de Certificados",
  "CertificateAlerts": "Alertas de Vencimento",
  "CommunicationCenter": "Central de Comunicação",
  "Companies": "Empresas",
  "Contractors": "Contratadas",
  "Courses": "Cursos",
  "Instructors": "Instrutores",
  "AuditLog": "Log de Auditoria",
  "AuditoriaCompleta": "Auditoria Completa",
  "AccessLog": "Log de Acesso",
  "Analytics": "Dashboard de Relatórios",
  "AdminDashboard": "Dashboard Admin",
  "ProposalEntry": "Entrada de Propostas",
  "GestaoBMM": "Gestão de BMM",
  "GestaoAlunosIndividuais": "Alunos Individuais (PF)",
  "GestaoAcademicaEmpresas": "Gestão Acadêmica Empresas",
  "GestaoContratos": "Gestão de Contratos",
  "AgendaTreinamentos": "Agenda de Treinamentos",
  "DashboardComercial": "Dashboard Comercial",
  "DashboardFinanceiro": "Dashboard Financeiro",
  "DigitalSignatures": "Assinaturas Digitais",
  "CertificateAuditPanel": "Auditoria de Certificados",
  "MatrizTreinamentos": "Matriz de Treinamentos",
  "FinanceiroHub": "Financeiro",
};

// Rota de destino de cada módulo (para redirecionamento pós-login)
export const MODULE_ROUTES = {
  "Dashboard": "/Dashboard",
  "Cronograma": "/Schedule",
  "Agenda de Treinamentos": "/AgendaTreinamentos",
  "Chamada Presencial": "/AttendanceCall",
  "Entrada de Propostas": "/ProposalEntry",
  "Gestão de BMM": "/GestaoBMM",
  "Instrutores": "/Instructors",
  "Empresas": "/Companies",
  "Contratadas": "/Contractors",
  "Cursos": "/Courses",
  "Alunos Individuais (PF)": "/GestaoAlunosIndividuais",
  "Gestão Acadêmica Individual": "/GestaoAlunosIndividuais",
  "Gestão Acadêmica Empresas": "/GestaoAcademicaEmpresas",
  "Gestão de Contratos": "/GestaoContratos",
  "Dashboard Operacional": "/DashboardOperacionalV2",
  "Dashboard Financeiro": "/DashboardFinanceiro",
  "Certificações": "/Certificacoes",
  "Alertas de Vencimento": "/CertificateAlerts",
  "Designer de Certificados": "/CertDesigner",
  "Assinaturas Digitais": "/DigitalSignatures",
  "Auditoria de Certificados": "/CertificateAuditPanel",
  "Dashboard Comercial": "/DashboardComercial",
  "Central de Comunicação": "/CommunicationCenter",
  "Dashboard de Relatórios": "/Analytics",
  "Dashboard Admin": "/AdminDashboard",
  "Usuários": "/Users",
  "Log de Auditoria": "/AuditLog",
  "Auditoria Completa": "/AuditoriaCompleta",
  "Log de Acesso": "/AccessLog",
  "Homologações": "/Homologacoes",
  "Matriz de Treinamentos": "/MatrizTreinamentos",
  "Financeiro": "/Financeiro",
  "BackupDownload": "/BackupDownload",
  "ProntuarioDigital": "/ProntuarioDigital",
  "GestaoDocumentosAluno": "/GestaoDocumentosAluno",
  "DossieHomologacao": "/DossieHomologacao",
  "DashboardMaster": "/DashboardMaster",
  "DashboardCertificacao": "/DashboardCertificacao",
  "DashboardInstrutor": "/DashboardInstrutor",
  "AlertasConfig": "/AlertasConfig",
};

// Normaliza uma chave de módulo para a forma canônica; null = rota desconhecida
export function canonicalizeModule(key) {
  if (!key || typeof key !== "string") return null;
  if (ALL_MODULES.includes(key)) return key;
  const mapped = MODULE_ALIASES[key];
  return mapped && ALL_MODULES.includes(mapped) ? mapped : null;
}

function deny(code, message) {
  return { granted: false, fullAccess: false, allowedModules: [], reason: code, reasonMessage: message };
}

// Resolvedor único: (User, UserProfile) → decisão de acesso
export function resolveAccess(user, profile) {
  if (!user) return deny("not_authenticated", "Usuário não autenticado");
  if (!profile) return deny("no_profile", "Nenhum UserProfile cadastrado para este usuário");
  if (!profile.user_id) return deny("profile_unlinked", "Perfil não vinculado — execute a reconciliação");
  if (profile.user_id !== user.id) return deny("profile_mismatch", "Vínculo user_id divergente do usuário autenticado");
  if (profile.status !== "active") return deny(`status_${profile.status || "indefinido"}`, `Perfil com status "${profile.status || "indefinido"}" — acesso pendente ou bloqueado`);

  // Acesso total: exige as três condições simultaneamente
  if (user.role === "admin" && profile.role === "gestor_master") {
    return { granted: true, fullAccess: true, allowedModules: [...ALL_MODULES], reason: "full_access", reasonMessage: "Acesso total (admin + gestor_master ativo)" };
  }

  // Demais perfis: SOMENTE permissões explícitas do UserProfile (sem fallback por role)
  const allowed = [...new Set((profile.permissions || []).map(canonicalizeModule).filter(Boolean))];
  if (allowed.length === 0) return deny("no_permissions", "Nenhum módulo explicitamente autorizado no perfil");
  return { granted: true, fullAccess: false, allowedModules: allowed, reason: "explicit_permissions", reasonMessage: "Permissões explícitas do perfil" };
}

// Verifica acesso a um módulo; chave desconhecida = negado (exceto acesso total)
export function hasModuleAccess(access, moduleKey) {
  if (!access || !access.granted) return false;
  if (access.fullAccess) return true;
  const canonical = canonicalizeModule(moduleKey);
  if (!canonical) return false;
  return access.allowedModules.includes(canonical);
}

// Primeira rota explicitamente permitida (pós-login)
export function firstAllowedRoute(access) {
  if (!access || !access.granted) return null;
  if (access.fullAccess) return "/Dashboard";
  for (const mod of ALL_MODULES) {
    if (access.allowedModules.includes(mod) && MODULE_ROUTES[mod]) return MODULE_ROUTES[mod];
  }
  return null;
}