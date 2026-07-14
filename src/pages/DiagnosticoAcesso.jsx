import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { usePermissions } from "@/lib/PermissionsContext";
import { canonicalizeModule, hasModuleAccess } from "@/lib/authz";
import AccessDiagnosticCard from "@/components/auth/AccessDiagnosticCard";

const maskEmail = (email = "") => {
  const [name, domain] = email.split("@");
  return domain ? `${name.slice(0, 2)}***@${domain}` : "Não disponível";
};

export default function DiagnosticoAcesso() {
  const location = useLocation();
  const { access, profile, loading } = usePermissions();
  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser).catch(() => setUser(null)); }, []);
  const requested = new URLSearchParams(location.search).get("route") || location.pathname;
  const moduleId = canonicalizeModule(requested);
  const allowed = moduleId ? hasModuleAccess(access, moduleId) : access?.granted;
  const scopes = (profile?.company_permissions || []).map((item) => item.company_name || "Empresa vinculada");

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Carregando diagnóstico...</div>;
  const rows = [
    ["Usuário autenticado", maskEmail(user?.email), Boolean(user)], ["UserProfile encontrado", profile?.id ? "Sim" : "Não", Boolean(profile?.id)],
    ["user_id vinculado", profile?.user_id === user?.id ? "Sim" : "Não", profile?.user_id === user?.id], ["Perfil", profile?.role],
    ["Status", profile?.status, profile?.status === "active"], ["Empresa / escopo", scopes], ["Permissões carregadas", profile?.permissions || []],
    ["Módulos autorizados", access?.fullAccess ? "Todos" : access?.allowedModules || []], ["Rota solicitada", requested],
    ["Módulo resolvido", moduleId || "Rota sem módulo canônico"], ["Resultado", allowed ? "Permitido" : "Negado", allowed],
    ["Motivo exato", access?.reasonMessage || access?.reason],
  ];
  return <div className="mx-auto max-w-5xl p-6"><h1 className="text-2xl font-bold">Diagnóstico de Acesso</h1><p className="mb-6 mt-1 text-sm text-muted-foreground">Leitura segura da decisão de autorização da sessão atual.</p><div className="grid gap-3 md:grid-cols-2">{rows.map(([title, value, ok]) => <AccessDiagnosticCard key={title} title={title} value={value} ok={ok} />)}</div></div>;
}