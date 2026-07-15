import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AccessAccountsPanel from "@/components/access/AccessAccountsPanel";
import { Plus, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function GestaoAcessos() {
  const [accounts, setAccounts] = useState([]), [logs, setLogs] = useState([]), [query, setQuery] = useState("");
  const [links, setLinks] = useState({}), [busyId, setBusyId] = useState("");
  const load = async () => { const [items, accessLogs] = await Promise.all([base44.entities.AccessAccount.list("-created_date", 500), base44.entities.AccessLog.list("-created_date", 100)]); setAccounts(items); setLogs(accessLogs); };
  useEffect(() => { load(); }, []);
  const migrate = async () => { await base44.functions.invoke("migrateAccessAccounts", {}); await load(); toast.success("Contas antigas regularizadas sem duplicidade."); };
  const action = async (type, account) => {
    setBusyId(account.id);
    try {
      if (type === "send") {
        const response = await base44.functions.invoke("convidarUsuario", { account_id: account.id, app_url: window.location.origin });
        setLinks((current) => ({ ...current, [account.id]: response.data.activation_url }));
        toast.success("Link enviado e disponível para cópia.");
      } else {
        const response = await base44.functions.invoke("gerenciarContaAcesso", { account_id: account.id, action: type });
        if (type === "test_permissions") toast.info(`${response.data.portal}: ${response.data.modules.length} módulo(s), vínculo ${response.data.linked ? "confirmado" : "pendente"}.`);
      }
      await load();
    } catch (error) { toast.error(error?.response?.data?.error || "Não foi possível concluir a ação."); }
    finally { setBusyId(""); }
  };
  const filtered = accounts.filter((a) => !query || `${a.person_name} ${a.email} ${a.access_type}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="p-6 max-w-7xl mx-auto space-y-5"><div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck />Gestão de Acessos</h1><p className="text-sm text-muted-foreground">Contas, vínculos, portais e módulos em uma única fonte.</p></div><div className="flex gap-2"><Button variant="outline" onClick={migrate}><RefreshCw />Regularizar existentes</Button><Button asChild><Link to="/Users"><Plus />Novo usuário interno</Link></Button></div></div><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder="Buscar conta..." value={query} onChange={(e) => setQuery(e.target.value)} /></div><AccessAccountsPanel accounts={filtered} links={links} busyId={busyId} onAction={action} logs={logs} /></div>;
}