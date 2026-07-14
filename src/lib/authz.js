import { MODULE_IDS, MODULE_BY_ID, canonicalizeModule as catalogCanonicalize } from "@/lib/moduleCatalog";

// Fonte canônica: UserProfile.permissions (module_id estável). Negar por padrão.
// Acesso total SOMENTE: UserProfile gestor_master, ativo e vinculado ao usuário autenticado.
export const ALL_MODULES = MODULE_IDS;

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
  return catalogCanonicalize(key);
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

  // Acesso total: Gestor Master ativo e corretamente vinculado
  if (profile.role === "gestor_master") {
    return { granted: true, fullAccess: true, allowedModules: [...ALL_MODULES], reason: "full_access", reasonMessage: "Acesso total (Gestor Master ativo e vinculado)" };
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
  for (const moduleId of ALL_MODULES) {
    if (access.allowedModules.includes(moduleId) && MODULE_BY_ID[moduleId]?.route) return MODULE_BY_ID[moduleId].route;
  }
  return null;
}