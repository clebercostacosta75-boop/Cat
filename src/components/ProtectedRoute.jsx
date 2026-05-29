import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { usePermissions } from "@/lib/PermissionsContext";
import { toast } from "sonner";

export default function ProtectedRoute({ pageKey, children }) {
  const { allowedKeys, loading } = usePermissions();
  const location = useLocation();

  const hasAccess = allowedKeys === null || (Array.isArray(allowedKeys) && allowedKeys.includes(pageKey));

  useEffect(() => {
    if (!loading && !hasAccess) {
      toast.warning(`Você não tem acesso ao módulo "${pageKey}".`);
    }
  }, [loading, hasAccess, pageKey]);

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