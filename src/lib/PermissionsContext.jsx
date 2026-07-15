import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { resolveAccess, hasModuleAccess, ALL_MODULES as AUTHZ_ALL_MODULES } from "@/lib/authz";
import { clearLocalAccessState, logAccessDenied } from "@/lib/accessLogger";
import { useAuth } from "@/lib/AuthContext";

// Reexporta para compatibilidade com importadores existentes
export const ALL_MODULES = AUTHZ_ALL_MODULES;

export const ROUTE_TO_MODULE = Object.fromEntries(AUTHZ_ALL_MODULES.map((moduleId) => [moduleId, moduleId]));

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  const { user: authenticatedUser, isAuthenticated, isLoadingAuth } = useAuth();
  const [role, setRole] = useState(null);
  const [access, setAccess] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setAccess(null);
    setProfile(null);
    setRole(null);
    try {
      let user = null;
      try { user = await base44.auth.me(); } catch { user = null; }
      if (!user) {
        setAccess(resolveAccess(null, null));
        return;
      }

      const previousUserId = sessionStorage.getItem("cat_auth_user_id");
      if (previousUserId && previousUserId !== user.id) clearLocalAccessState();
      sessionStorage.setItem("cat_auth_user_id", user.id);

      let foundProfile = null;
      const byId = await base44.entities.UserProfile.filter({ user_id: user.id }, "-updated_date", 10);
      if (byId.length > 1) {
        foundProfile = { _access_error: "duplicate_profile" };
      } else if (byId.length === 1) {
        foundProfile = byId[0].user_email?.trim().toLowerCase() === user.email?.trim().toLowerCase()
          ? byId[0]
          : { _access_error: "profile_mismatch" };
      } else {
        let byEmail = await base44.entities.UserProfile.filter({ user_email: user.email.trim().toLowerCase() }, "-updated_date", 10);
        if (byEmail.length > 1) {
          foundProfile = { _access_error: "duplicate_profile" };
        } else if (byEmail.length === 1 && byEmail[0].user_id && byEmail[0].user_id !== user.id) {
          foundProfile = { _access_error: "profile_mismatch" };
        } else if (byEmail.length === 1 && !byEmail[0].user_id) {
          const response = await base44.functions.invoke("atualizarMeuPerfil", { action: "reconcile" });
          if (response.data?.success) byEmail = await base44.entities.UserProfile.filter({ user_id: user.id }, "-updated_date", 10);
          foundProfile = byEmail.length === 1 ? byEmail[0] : null;
        } else if (byEmail.length === 0 && user.role === "admin") {
          await base44.functions.invoke("atualizarMeuPerfil", { action: "reconcile" });
          const created = await base44.entities.UserProfile.filter({ user_id: user.id }, "-updated_date", 10);
          foundProfile = created.length === 1 ? created[0] : null;
        }
      }

      const resolved = resolveAccess(user, foundProfile);
      if (["duplicate_profile", "profile_mismatch"].includes(resolved.reason)) logAccessDenied("access_denied", resolved.reasonMessage);
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
    if (isLoadingAuth) return;
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
  }, [load, isLoadingAuth, isAuthenticated, authenticatedUser?.id]);

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