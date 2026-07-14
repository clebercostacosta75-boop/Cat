import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { resolveAccess, hasModuleAccess, ALL_MODULES as AUTHZ_ALL_MODULES } from "@/lib/authz";

// Reexporta para compatibilidade com importadores existentes
export const ALL_MODULES = AUTHZ_ALL_MODULES;

export const ROUTE_TO_MODULE = Object.fromEntries(AUTHZ_ALL_MODULES.map((moduleId) => [moduleId, moduleId]));

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  const [role, setRole] = useState(null);
  const [access, setAccess] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      let user = null;
      try { user = await base44.auth.me(); } catch { user = null; }

      let foundProfile = null;
      if (user) {
        try {
          let profiles = await base44.entities.UserProfile.filter({ user_email: user.email }, "-updated_date", 10);
          const linked = profiles.filter(p => p.user_id === user.id);
          if (profiles.length > 1) {
            foundProfile = { _access_error: "duplicate_profile" };
          } else if (linked.length === 1) {
            foundProfile = linked[0];
          } else if (profiles.length === 1 && !profiles[0].user_id) {
            const response = await base44.functions.invoke("atualizarMeuPerfil", { action: "reconcile" });
            if (response.data?.success) profiles = await base44.entities.UserProfile.filter({ user_email: user.email }, "-updated_date", 10);
            foundProfile = profiles.find(p => p.user_id === user.id) || profiles[0] || null;
          } else if (profiles.length === 0 && user.role === "admin") {
            const response = await base44.functions.invoke("atualizarMeuPerfil", { action: "reconcile" });
            if (response.data?.success) profiles = await base44.entities.UserProfile.filter({ user_email: user.email }, "-updated_date", 10);
            foundProfile = profiles.find(p => p.user_id === user.id) || null;
          } else {
            foundProfile = profiles[0] || null;
          }
        } catch {
          foundProfile = null;
        }
      }

      // Resolvedor central — negar por padrão
      const resolved = resolveAccess(user, foundProfile);
      setAccess(resolved);
      setProfile(foundProfile);
      setRole(foundProfile?.role || null);
    } catch {
      setAccess(resolveAccess(null, null));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("permissions-updated", handler);
    const forceReloadHandler = () => load(true);
    window.addEventListener("permissions-force-reload", forceReloadHandler);
    const unsubscribe = base44.entities.UserProfile.subscribe(() => load(false));
    return () => {
      window.removeEventListener("permissions-updated", handler);
      window.removeEventListener("permissions-force-reload", forceReloadHandler);
      unsubscribe();
    };
  }, [load, profile?.id]);

  // Compatibilidade: null = acesso total; array = módulos permitidos (canônicos)
  const allowedKeys = access?.fullAccess ? null : (access?.allowedModules || []);

  const hasPermission = useCallback((key) => hasModuleAccess(access, key), [access]);

  const refreshPermissions = useCallback(() => { load(false); }, [load]);

  return (
    <PermissionsContext.Provider value={{ role, allowedKeys, access, profile, loading, hasPermission, reload: load, refreshPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions deve ser usado dentro de PermissionsProvider");
  return ctx;
}