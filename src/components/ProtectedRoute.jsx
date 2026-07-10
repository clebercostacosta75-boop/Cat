import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { usePermissions } from "@/lib/PermissionsContext";
import { toast } from "sonner";

export default function ProtectedRoute({ pageKey, children }) {
  const { allowedKeys, loading } = usePermissions();
  const location = useLocation();

  // pageKey pode ser uma string ou um array de chaves alternativas (qualquer uma libera o acesso)
  const keys = Array.isArray(pageKey) ? pageKey : [pageKey];
  const hasAccess = allowedKeys === null || (Array.isArray(allowedKeys) && keys.some(k => allowedKeys.includes(k)));

  useEffect(() => {
    if (!loading && !hasAccess) {
      toast.warning(`Você não tem acesso ao módulo "${keys[0]}".`);
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
    return <Navigate to="/Dashboard" replace />;
  }

  return children;
}