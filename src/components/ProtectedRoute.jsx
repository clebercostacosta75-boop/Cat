import React, { useEffect } from "react";
import { usePermissions } from "@/lib/PermissionsContext";
import { hasModuleAccess } from "@/lib/authz";
import { logRouteDenied } from "@/lib/accessLogger";
import AccessDeniedScreen from "@/components/auth/AccessDeniedScreen";

export default function ProtectedRoute({ pageKey, children }) {
  const { access, loading } = usePermissions();

  // pageKey pode ser string ou array de chaves alternativas
  const keys = Array.isArray(pageKey) ? pageKey : [pageKey];
  const hasAccess = keys.some(k => hasModuleAccess(access, k));

  useEffect(() => {
    if (!loading && !hasAccess) {
      logRouteDenied(keys[0], access?.reasonMessage || access?.reason || "Módulo não autorizado");
    }
  }, [loading, hasAccess]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return <AccessDeniedScreen module={keys[0]} reason={access?.reasonMessage} reasonCode={access?.reason} />;
  }

  return children;
}