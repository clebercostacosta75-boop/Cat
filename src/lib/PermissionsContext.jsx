import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// ─── TODOS OS MÓDULOS DO SISTEMA ────────────────────────────────────────────
export const ALL_MODULES = [
  // Geral
  "Dashboard",
  "Cronograma",
  "Agenda de Treinamentos",
  "Chamada Presencial",
  // Operacional
  "Entrada de Propostas",
  "Gestão de BMM",
  "Instrutores",
  "Empresas",
  "Contratadas",
  "Cursos",
  "Alunos Individuais (PF)",
  "Gestão de Contratos",
  "Dashboard Operacional",
  "Dashboard Financeiro",
  // Certificações
  "Certificações",
  "Alertas de Vencimento",
  "Designer de Certificados",
  "Assinaturas Digitais",
  "Auditoria de Certificados",
  // Comercial
  "Dashboard Comercial",
  // Comunicação
  "Central de Comunicação",
  // Relatórios
  "Dashboard de Relatórios",
  "Dashboard Admin",
  // Administração
  "Usuários",
  "Log de Auditoria",
  "Auditoria Completa",
  "Log de Acesso",
];

// Mapa de chaves de rota → chave de módulo (para ProtectedRoute)
export const ROUTE_TO_MODULE = {
  "Schedule": "Cronograma",
  "AttendanceCall": "Chamada Presencial",
  "CertDesigner": "Designer de Certificados",
  "CertificateAlerts": "Alertas de Vencimento",
  "CommunicationCenter": "Central de Comunicação",
  "Companies": "Empresas",
  "Contractors": "Contratadas",
  "Courses": "Cursos",
  "Instructors": "Instrutores",
  "Users": "Usuários",
  "AuditLog": "Log de Auditoria",
};

// Módulos bloqueados para perfil Editor
const ADMIN_MODULES = [
  "Usuários",
  "Log de Auditoria",
  "Auditoria Completa",
  "Log de Acesso",
  "Dashboard Admin",
];

// Módulos do perfil Cliente
const CLIENT_MODULES = ["Dashboard", "Certificações", "Alertas de Vencimento"];

// Módulos do perfil Editor (tudo exceto Administração)
const EDITOR_MODULES = ALL_MODULES.filter(m => !ADMIN_MODULES.includes(m));

// ─── CONTEXT ────────────────────────────────────────────────────────────────
const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  const [role, setRole] = useState(null);
  // null = acesso total (gestor_master / admin da plataforma)
  // array = lista exata de módulos permitidos
  const [allowedKeys, setAllowedKeys] = useState(null);
  const [loading, setLoading] = useState(true);
  // Cache local com TTL de 5 minutos para evitar recarregamentos desnecessários
  const [permissionCache, setPermissionCache] = useState({ data: null, timestamp: null });

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // CACHE: Se houver dados em cache e ainda válidos (< 5 min), usar cache
      const now = Date.now();
      if (permissionCache.data && permissionCache.timestamp && (now - permissionCache.timestamp) < 300000) {
        setRole(permissionCache.data.role);
        setAllowedKeys(permissionCache.data.allowedKeys);
        setLoading(false);
        return;
      }

      // PASSO 1: Verificar autenticação
      let u;
      try {
        u = await base44.auth.me();
      } catch {
        setAllowedKeys([]);
        setLoading(false);
        return;
      }

      if (!u) {
        setAllowedKeys([]);
        setLoading(false);
        return;
      }

      // PASSO 2: Admin da plataforma Base44 = acesso total
      if (u.role === "admin") {
        setRole("admin");
        setAllowedKeys(null);
        setPermissionCache({ data: { role: "admin", allowedKeys: null }, timestamp: Date.now() });
        setLoading(false);
        return;
      }

      // PASSO 3: Buscar perfil SEMPRE do servidor, sem cache
      // Pega o mais recente (updated_date desc) para evitar usar perfil duplicado/antigo
      let profile = null;
      try {
        const profiles = await base44.entities.UserProfile.filter({ user_email: u.email }, "-updated_date", 10);
        // Prioriza perfil com role definido; fallback para o mais recente
        profile = profiles.find(p => p.role) || profiles[0] || null;
      } catch {
        // Se falhar a busca, nega acesso por segurança
        setAllowedKeys([]);
        setLoading(false);
        return;
      }

      if (!profile) {
        // Usuário sem perfil = acesso mínimo
        setRole("cliente");
        setAllowedKeys(CLIENT_MODULES);
        setPermissionCache({ data: { role: "cliente", allowedKeys: CLIENT_MODULES }, timestamp: Date.now() });
        setLoading(false);
        return;
      }

      const profileRole = profile.role || "cliente";
      setRole(profileRole);

      // PASSO 4: Aplicar regras por perfil
      let finalAllowedKeys = null;
      if (profileRole === "gestor_master") {
        // Acesso total irrestrito
        finalAllowedKeys = null;
      } else if (profileRole === "editor") {
        // Tudo exceto Administração
        finalAllowedKeys = EDITOR_MODULES;
      } else if (profileRole === "cliente") {
        // Apenas Dashboard, Certificações, Alertas
        finalAllowedKeys = CLIENT_MODULES;
      } else if (profileRole === "personalizado") {
        // Lista definida manualmente pelo admin
        const perms = profile.permissions || [];
        finalAllowedKeys = perms.length > 0 ? perms : [];
      } else {
        // Qualquer outro perfil legado: usar permissões salvas ou lista vazia
        const perms = profile.permissions || [];
        finalAllowedKeys = perms.length > 0 ? perms : [];
      }
      
      setAllowedKeys(finalAllowedKeys);
      // Cache o resultado por 5 minutos
      setPermissionCache({ data: { role: profileRole, allowedKeys: finalAllowedKeys }, timestamp: Date.now() });
    } catch {
      setAllowedKeys([]);
    } finally {
      setLoading(false);
    }
  }, [permissionCache]);

  useEffect(() => {
    load();

    // Recarrega quando admin salvar permissões (mesma janela)
    const handler = () => load();
    window.addEventListener("permissions-updated", handler);
    
    // Recarrega imediatamente quando permissões são alteradas
    const forceReloadHandler = () => load(true);
    window.addEventListener("permissions-force-reload", forceReloadHandler);

    // Polling a cada 30 segundos (balanço entre segurança e performance)
    const interval = setInterval(() => load(false), 30000);

    return () => {
      window.removeEventListener("permissions-updated", handler);
      window.removeEventListener("permissions-force-reload", forceReloadHandler);
      clearInterval(interval);
    };
  }, [load]);

  const hasPermission = useCallback((key) => {
    if (allowedKeys === null) return true;
    if (!Array.isArray(allowedKeys)) return false;
    return allowedKeys.includes(key);
  }, [allowedKeys]);

  const refreshPermissions = useCallback(() => {
    load(false);
  }, [load]);

  return (
    <PermissionsContext.Provider value={{ role, allowedKeys, loading, hasPermission, reload: load, refreshPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions deve ser usado dentro de PermissionsProvider");
  return ctx;
}