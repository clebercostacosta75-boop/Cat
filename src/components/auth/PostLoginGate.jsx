import React from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "@/lib/PermissionsContext";
import { firstAllowedRoute } from "@/lib/authz";
import AccessPendingScreen from "@/components/auth/AccessPendingScreen";

// Pós-login: encaminha para o primeiro módulo explicitamente permitido.
export default function PostLoginGate() {
  const { access, loading } = usePermissions();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!access?.granted) return <AccessPendingScreen reason={access?.reasonMessage} />;

  const route = firstAllowedRoute(access);
  if (route) return <Navigate to={route} replace />;

  return <AccessPendingScreen reason="Nenhum módulo permitido possui rota disponível" />;
}