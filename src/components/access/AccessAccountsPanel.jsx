import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccessAccountCard from "@/components/access/AccessAccountCard";

const tabs = [
  ["cat", "Usuários CAT", (a) => a.access_type === "usuario_cat"], ["alunos", "Alunos", (a) => a.access_type === "aluno"],
  ["empresas", "Empresas", (a) => a.access_type === "empresa"], ["instrutores", "Instrutores", (a) => a.access_type === "instrutor"],
  ["pendentes", "Contas Pendentes", (a) => a.status === "aguardando_ativacao"], ["ativas", "Contas Ativas", (a) => a.status === "ativo"],
  ["bloqueadas", "Contas Bloqueadas", (a) => a.status === "bloqueado"], ["regularizacao", "Regularização", (a) => !a.user_id || ["link_expirado", "acesso_revogado"].includes(a.status)],
];

export default function AccessAccountsPanel({ accounts, links, busyId, onAction, logs }) {
  return <Tabs defaultValue="cat"><TabsList className="h-auto flex-wrap justify-start">{tabs.map(([id, label]) => <TabsTrigger key={id} value={id}>{label}</TabsTrigger>)}<TabsTrigger value="logs">Logs de Acesso</TabsTrigger></TabsList>
    {tabs.map(([id,, filter]) => <TabsContent key={id} value={id} className="space-y-3">{accounts.filter(filter).map((account) => <AccessAccountCard key={account.id} account={account} link={links[account.id]} busy={busyId === account.id} onAction={onAction} />)}{!accounts.some(filter) && <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma conta nesta categoria.</p>}</TabsContent>)}
    <TabsContent value="logs"><div className="rounded-xl border divide-y">{logs.map((log) => <div key={log.id} className="p-3 text-sm"><p className="font-medium">{log.user_email || "Usuário não identificado"} — {log.event_type}</p><p className="text-xs text-muted-foreground">{log.reason || "Sem detalhes"} · {new Date(log.created_date).toLocaleString("pt-BR")}</p></div>)}</div></TabsContent>
  </Tabs>;
}