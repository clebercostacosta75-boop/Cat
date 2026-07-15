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
    setLoading(true); setAccess(null); setProfile(null); setRole(null);
    try {
      const user = await base44.auth.me().catch(() => null);
      if (!user) { setAccess(resolveAccess(null, null)); return; }
      const previousUserId = sessionStorage.getItem("cat_auth_user_id");
      if (previousUserId && previousUserId !== user.id) clearLocalAccessState();
      sessionStorage.setItem("cat_auth_user_id", user.id);
      let matches = await base44.entities.AccessAccount.filter({ user_id: user.id }, "-updated_date", 10);
      if (!matches.length) matches = await base44.entities.AccessAccount.filter({ email: user.email.trim().toLowerCase() }, "-updated_date", 10);
      const account = matches.length > 1 ? { _access_error: "duplicate_account" } : (matches[0] || null);
      let legacyProfile = null;
      if (account?.user_profile_id) legacyProfile = await base44.entities.UserProfile.get(account.user_profile_id).catch(() => null);
      const resolved = resolveAccess(user, account);
      if (!resolved.granted && !["account_unlinked", "no_access_account"].includes(resolved.reason)) logAccessDenied("access_denied", resolved.reasonMessage);
      if (resolved.granted && !sessionStorage.getItem("cat_account_touched")) {
        sessionStorage.setItem("cat_account_touched", "1");
        base44.functions.invoke("registrarMinhaContaAcesso", {}).catch(() => sessionStorage.removeItem("cat_account_touched"));
      }
      setAccess(resolved);
      setProfile(legacyProfile ? { ...legacyProfile, role: account.profile, status: account.status === "ativo" ? "active" : "blocked", password_changed: true } : null);
      setRole(account?.profile || null);
    } catch { setAccess(resolveAccess(null, null)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (isLoadingAuth) return;
    load();
    const handler = () => load();
    window.addEventListener("permissions-updated", handler);
    const forceReloadHandler = () => load(true);
    window.addEventListener("permissions-force-reload", forceReloadHandler);
    const unsubscribeAccount = base44.entities.AccessAccount.subscribe(() => load(false));
    const unsubscribeProfile = base44.entities.UserProfile.subscribe(() => load(false));
    return () => {
      window.removeEventListener("permissions-updated", handler);
      window.removeEventListener("permissions-force-reload", forceReloadHandler);
      unsubscribeAccount();
      unsubscribeProfile();
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