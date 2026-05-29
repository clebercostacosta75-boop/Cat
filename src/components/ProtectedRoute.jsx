import React from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "@/lib/PermissionsContext";

// pageKey: chave exata do item no menu (ex: "Dashboard Financeiro")
export default function ProtectedRoute({ pageKey, children }) {
  const { allowedKeys, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
      </div>
    );
  }

  // null = acesso total
  if (allowedKeys === null) return children;

  if (!allowedKeys.includes(pageKey)) {
    return <Navigate to="/Dashboard" replace />;
  }

  return children;
}