import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ban, CheckCircle, Copy, Send, ShieldCheck, UserCheck, XCircle } from "lucide-react";

const labels = { usuario_cat: "Usuário CAT", aluno: "Aluno", empresa: "Empresa", instrutor: "Instrutor", contratada: "Contratada" };
const statusStyle = { ativo: "bg-green-100 text-green-800", bloqueado: "bg-red-100 text-red-800", aguardando_ativacao: "bg-amber-100 text-amber-800", acesso_revogado: "bg-gray-200 text-gray-700" };

export default function AccessAccountCard({ account, link, busy, onAction }) {
  return <div className="rounded-xl border bg-card p-4 space-y-3">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="font-semibold text-foreground">{account.person_name}</p><p className="text-sm text-muted-foreground">{account.email}</p></div>
      <div className="flex gap-2"><Badge variant="outline">{labels[account.access_type]}</Badge><Badge className={statusStyle[account.status] || "bg-muted text-muted-foreground"}>{account.status?.replaceAll("_", " ")}</Badge></div>
    </div>
    <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-3"><span>Perfil: {account.profile || "—"}</span><span>Portal: {account.allowed_portal}</span><span>Módulos: {account.allowed_modules?.length || 0}</span><span>Vínculo: {account.user_id ? "confirmado" : "pendente"}</span><span>Último acesso: {account.last_access_at ? new Date(account.last_access_at).toLocaleString("pt-BR") : "—"}</span></div>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => onAction("send", account)} disabled={busy}><Send />{account.last_invite_sent_at ? "Reenviar link" : "Enviar link"}</Button>
      {link && <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(link)}><Copy />Copiar link</Button>}
      <Button size="sm" variant="outline" onClick={() => onAction("test_permissions", account)}><ShieldCheck />Testar permissões</Button>
      {account.status === "bloqueado" ? <Button size="sm" variant="outline" onClick={() => onAction("reactivate", account)}><UserCheck />Reativar</Button> : <Button size="sm" variant="outline" onClick={() => onAction("block", account)}><Ban />Bloquear</Button>}
      <Button size="sm" variant="ghost" onClick={() => onAction("revoke", account)}><XCircle />Revogar</Button>
    </div>
  </div>;
}