import { MODULE_CATALOG, MODULE_IDS, MODULE_BY_ID, canonicalizeModule as catalogCanonicalize, normalizeRole } from "@/lib/moduleCatalog";

// Fonte canônica: UserProfile.permissions (module_id estável). Negar por padrão.
// Acesso total SOMENTE: UserProfile gestor_master, ativo e vinculado ao usuário autenticado.
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

// Resolvedor único: (User, UserProfile) → decisão de acesso
export function resolveAccess(user, profile) {
  if (!user) return deny("not_authenticated", "Usuário não autenticado");
  if (!profile) return deny("no_profile", "Nenhum perfil de acesso foi encontrado");
  if (profile._access_error === "duplicate_profile") return deny("duplicate_profile", "Existem perfis duplicados para esta conta; a reconciliação administrativa é necessária");
  if (!profile.user_id) return deny("profile_unlinked", "Perfil localizado, mas ainda não vinculado à conta autenticada");
  if (profile.user_id !== user.id) return deny("profile_mismatch", "Vínculo user_id divergente do usuário autenticado");
  if (profile.status !== "active") return deny(`status_${profile.status || "indefinido"}`, `Perfil com status "${profile.status || "indefinido"}" — acesso pendente ou bloqueado`);

  const role = normalizeRole(profile.role);
  if (["gestor_master", "admin"].includes(role)) {
    return { granted: true, fullAccess: true, role, allowedModules: [...ALL_MODULES], reason: "full_access", reasonMessage: "Acesso administrativo total, ativo e vinculado" };
  }
  if (role === "aluno") return { granted: true, fullAccess: false, role, portalRoute: "/PortalAluno", allowedModules: [], reason: "portal_access", reasonMessage: "Acesso autenticado ao Portal do Aluno" };
  if (role === "empresa") return { granted: true, fullAccess: false, role, portalRoute: "/CompanyPortal", allowedModules: [], reason: "portal_access", reasonMessage: "Acesso autenticado ao Portal da Empresa" };
  if (role === "instrutor" && !(profile.permissions || []).length) return { granted: true, fullAccess: false, role, portalRoute: "/PortalInstrutor", allowedModules: [], reason: "portal_access", reasonMessage: "Acesso autenticado ao Portal do Instrutor" };

  const allowed = [...new Set((profile.permissions || []).map(canonicalizeModule).filter(Boolean))];
  if (allowed.length === 0) return deny("permissions_pending", "Perfil ativo, mas aguardando definição de módulos pelo administrador");
  return { granted: true, fullAccess: false, role, allowedModules: allowed, reason: "explicit_permissions", reasonMessage: "Permissões explícitas e atualizadas do perfil" };
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