import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ShieldCheck, ShieldX } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePermissions } from "@/lib/PermissionsContext";
import { MODULE_CATALOG } from "@/lib/moduleCatalog";
import { Card, CardContent } from "@/components/ui/card";

const mask = (value = "") => value ? `${value.slice(0, 3)}•••${value.slice(-3)}` : "—";
const Row = ({ label, value }) => <div className="flex justify-between gap-4 border-b py-2 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium break-all">{value}</span></div>;

export default function AccessDiagnostics() {
  const location = useLocation();
  const { access, profile, allowedKeys, loading, hasPermission } = usePermissions();
  const [user, setUser] = useState(null);
  const requested = new URLSearchParams(location.search).get("route") || location.pathname;
  const module = MODULE_CATALOG.find((item) => item.route === requested);
  const allowed = module ? hasPermission(module.module_id) : Boolean(access?.granted);
  useEffect(() => { base44.auth.me().then(setUser).catch(() => setUser(null)); }, []);
  if (loading) return <div className="p-6">Carregando diagnóstico...</div>;
  return <div className="p-6 max-w-3xl mx-auto space-y-4">
    <div><h1 className="text-2xl font-bold">Diagnóstico de Acesso</h1><p className="text-sm text-muted-foreground">Resumo seguro da decisão de autorização da sessão atual.</p></div>
    <Card><CardContent className="p-5">
      <div className={`mb-4 flex items-center gap-2 font-semibold ${allowed ? "text-green-700" : "text-red-700"}`}>{allowed ? <ShieldCheck /> : <ShieldX />}{allowed ? "Acesso permitido" : "Acesso negado"}</div>
      <Row label="Usuário autenticado" value={user ? mask(user.email) : "Não"} />
      <Row label="UserProfile encontrado" value={profile?.id ? "Sim" : "Não"} />
      <Row label="Vínculo user_id" value={profile?.user_id === user?.id ? "Válido" : "Ausente ou divergente"} />
      <Row label="Perfil / status" value={`${profile?.role || "—"} / ${profile?.status || "—"}`} />
      <Row label="Empresa / escopo" value={`${profile?.company_permissions?.length || 0} empresa(s)`} />
      <Row label="Módulos carregados" value={allowedKeys === null ? "Acesso total" : `${allowedKeys?.length || 0}`} />
      <Row label="Permissões" value={allowedKeys === null ? "Todos" : (allowedKeys || []).join(", ") || "Nenhuma"} />
      <Row label="Rota solicitada" value={requested} />
      <Row label="Resultado" value={allowed ? "Permitido" : "Negado"} />
      <Row label="Motivo exato" value={allowed ? (access?.reasonMessage || "Autorizado") : (access?.reasonMessage || "Rota ou módulo não autorizado")} />
    </CardContent></Card>
  </div>;
}