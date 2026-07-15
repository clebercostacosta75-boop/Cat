import { MODULE_CATALOG, MODULE_IDS, MODULE_BY_ID, canonicalizeModule as catalogCanonicalize, normalizeRole } from "@/lib/moduleCatalog";

// Fonte canônica: AccessAccount. Negar por padrão até resolver conta, vínculo e status.
// Acesso total SOMENTE para conta interna administrativa, ativa e vinculada.
export const ALL_MODULES = MODULE_IDS;

// Derivados do catálogo único; não mantêm definições paralelas.
export const MODULE_ALIASES = Object.fromEntries(MODULE_CATALOG.flatMap((module) => module.aliases.map((alias) => [alias, module.module_id])));
export const MODULE_ROUTES = Object.fromEntries(MODULE_CATALOG.flatMap((module) => [[module.module_id, module.route], [module.name, module.route], ...module.aliases.map((alias) => [alias, module.route])]));

// Normaliza uma chave de módulo para a forma canônica; null = rota desconhecida
export function canonicalizeModule(key) {
  return catalogCanonicalize(key);
}

function deny(code, message) {
  return { granted: false, fullAccess: false, allowedModules: [], reason: code, reasonMessage: message };
}

// Resolvedor único: (User, AccessAccount) → decisão de acesso
export function resolveAccess(user, account) {
  if (!user) return deny("not_authenticated", "Usuário não autenticado");
  if (!account) return deny("no_access_account", "Nenhuma Conta de Acesso foi encontrada");
  if (account._access_error === "duplicate_account") return deny("duplicate_account", "Existem Contas de Acesso duplicadas para este e-mail");
  if (!account.user_id) return deny("account_unlinked", "Conta aguardando ativação");
  if (account.user_id !== user.id) return deny("account_mismatch", "A Conta de Acesso pertence a outro usuário");
  if (account.status !== "ativo") return deny(`status_${account.status || "indefinido"}`, `Conta com status ${account.status || "indefinido"}`);
  const role = normalizeRole(account.profile);
  if (account.access_type === "aluno") return { granted: true, fullAccess: false, role, portalRoute: "/PortalAluno", allowedModules: [], reason: "portal_access", reasonMessage: "Portal do Aluno" };
  if (account.access_type === "empresa") return { granted: true, fullAccess: false, role, portalRoute: "/CompanyPortal", allowedModules: [], reason: "portal_access", reasonMessage: "Portal da Empresa" };
  if (account.access_type === "instrutor") return { granted: true, fullAccess: false, role, portalRoute: "/PortalInstrutor", allowedModules: [], reason: "portal_access", reasonMessage: "Portal do Instrutor" };
  if (account.access_type !== "usuario_cat") return deny("unsupported_access_type", "Tipo de acesso ainda não liberado");
  if (["gestor_master", "admin"].includes(role)) return { granted: true, fullAccess: true, role, allowedModules: [...ALL_MODULES], reason: "full_access", reasonMessage: "Acesso administrativo ativo" };
  const allowed = [...new Set((account.allowed_modules || []).map(canonicalizeModule).filter(Boolean))];
  if (!allowed.length) return deny("permissions_pending", "Conta ativa sem módulos internos definidos");
  return { granted: true, fullAccess: false, role, allowedModules: allowed, reason: "explicit_permissions", reasonMessage: "Módulos da Conta de Acesso" };
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
  if (access.portalRoute) return access.portalRoute;
  if (access.fullAccess) return "/Dashboard";
  for (const moduleId of ALL_MODULES) {
    if (access.allowedModules.includes(moduleId) && MODULE_BY_ID[moduleId]?.route) return MODULE_BY_ID[moduleId].route;
  }
  return null;
}