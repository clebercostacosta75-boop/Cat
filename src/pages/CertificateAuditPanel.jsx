/**
 * CertificateAuditPanel — Painel de auditoria de certificados
 * Exibe todos os eventos de criação/edição de modelos e emissão de certificados.
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Shield, Award, FileText, Edit3, Plus, Trash2, Download, User, Clock, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACTION_CONFIG = {
  "emissao_individual": { label: "Emissão Individual", color: "bg-emerald-100 text-emerald-800", icon: Award },
  "emissao_massa": { label: "Emissão em Massa", color: "bg-teal-100 text-teal-800", icon: Award },
  "modelo_criado": { label: "Modelo Criado", color: "bg-blue-100 text-blue-800", icon: Plus },
  "modelo_editado": { label: "Modelo Editado", color: "bg-amber-100 text-amber-800", icon: Edit3 },
  "modelo_excluido": { label: "Modelo Excluído", color: "bg-red-100 text-red-800", icon: Trash2 },
  "modelo_duplicado": { label: "Modelo Duplicado", color: "bg-purple-100 text-purple-800", icon: FileText },
  "create": { label: "Emissão", color: "bg-emerald-100 text-emerald-800", icon: Award },
  "update": { label: "Atualização", color: "bg-amber-100 text-amber-800", icon: Edit3 },
  "delete": { label: "Exclusão", color: "bg-red-100 text-red-800", icon: Trash2 },
  "sign": { label: "Assinatura", color: "bg-indigo-100 text-indigo-800", icon: Edit3 },
  "send_whatsapp": { label: "Envio WhatsApp", color: "bg-green-100 text-green-800", icon: FileText },
};

function ActionBadge({ action }) {
  const cfg = ACTION_CONFIG[action] || { label: action, color: "bg-gray-100 text-gray-700", icon: FileText };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function ExpandableRow({ log }) {
  const [open, setOpen] = useState(false);
  const date = log.created_date ? new Date(log.created_date) : null;
  const hasDetails = log.details && Object.keys(log.details).length > 0;

  return (
    <>
      <TableRow className="hover:bg-gray-50 cursor-pointer" onClick={() => hasDetails && setOpen(o => !o)}>
        <TableCell className="text-xs text-gray-500 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <div>
              <div className="font-medium text-gray-700">
                {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "—"}
              </div>
              <div className="text-gray-400">
                {date ? format(date, "HH:mm:ss") : ""}
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <div>
              <div className="text-xs font-medium text-gray-800">{log.user_name || "—"}</div>
              <div className="text-xs text-gray-400">{log.user_email || ""}</div>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <ActionBadge action={log.action} />
        </TableCell>
        <TableCell className="text-xs text-gray-700 max-w-[200px] truncate">
          {log.entity_name || log.entity_id?.slice(0, 12) || "—"}
        </TableCell>
        <TableCell className="text-xs text-gray-500">
          {log.entity_type || log.entity || "—"}
        </TableCell>
        <TableCell className="text-xs text-gray-500 max-w-[240px] truncate">
          {log.details ? (typeof log.details === "string" ? log.details : log.details.descricao || log.details.summary || "") : "—"}
        </TableCell>
        <TableCell>
          {hasDetails && (
            <button className="text-gray-400 hover:text-gray-600">
              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </TableCell>
      </TableRow>
      {open && hasDetails && (
        <TableRow className="bg-gray-50">
          <TableCell colSpan={7} className="px-6 py-3">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-white border border-gray-200 rounded p-3 max-h-48 overflow-y-auto">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function CertificateAuditPanel() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["auditLogs", "certificates"],
    queryFn: async () => {
      const all = await base44.entities.AuditLog.list("-created_date", 1000);
      // Filtrar apenas eventos relacionados a certificados
      return all.filter(l =>
        ["Certificate", "CertificateModel", "emissao_individual", "emissao_massa",
         "modelo_criado", "modelo_editado", "modelo_excluido", "modelo_duplicado"].includes(l.entity_type || l.entity || "") ||
        ["emissao_individual", "emissao_massa", "modelo_criado", "modelo_editado",
         "modelo_excluido", "modelo_duplicado", "create", "update", "delete", "sign", "send_whatsapp"].includes(l.action || "") &&
        (l.entity_type === "Certificate" || l.entity_type === "CertificateModel" || l.entity === "Certificate" || l.entity === "CertificateModel")
      );
    },
    refetchInterval: 30000, // atualiza a cada 30s
  });

  const users = [...new Set(logs.map(l => l.user_email).filter(Boolean))];

  const filtered = logs.filter(log => {
    const matchSearch =
      !search ||
      log.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_name?.toLowerCase().includes(search.toLowerCase()) ||
      (typeof log.details === "string" ? log.details : JSON.stringify(log.details || "")).toLowerCase().includes(search.toLowerCase());

    const matchAction = actionFilter === "all" || log.action === actionFilter;
    const matchUser = userFilter === "all" || log.user_email === userFilter;

    const logDate = log.created_date ? new Date(log.created_date) : null;
    const matchFrom = !dateFrom || (logDate && logDate >= new Date(dateFrom));
    const matchTo = !dateTo || (logDate && logDate <= new Date(dateTo + "T23:59:59"));

    return matchSearch && matchAction && matchUser && matchFrom && matchTo;
  });

  // Métricas
  const totalEmissoes = filtered.filter(l => ["emissao_individual", "emissao_massa", "create"].includes(l.action) && (l.entity_type === "Certificate" || l.entity === "Certificate")).length;
  const totalEdicoes = filtered.filter(l => ["modelo_editado", "update"].includes(l.action) && (l.entity_type === "CertificateModel" || l.entity === "CertificateModel")).length;
  const totalModelos = filtered.filter(l => ["modelo_criado"].includes(l.action)).length;
  const usuariosAtivos = new Set(filtered.map(l => l.user_email).filter(Boolean)).size;

  const handleExport = () => {
    const csv = [
      ["Data/Hora", "Usuário", "Email", "Ação", "Entidade", "Registro", "Detalhes"].join(";"),
      ...filtered.map(l => {
        const date = l.created_date ? format(new Date(l.created_date), "dd/MM/yyyy HH:mm:ss") : "";
        const details = typeof l.details === "string" ? l.details : JSON.stringify(l.details || "");
        return [date, l.user_name || "", l.user_email || "", l.action || "", l.entity_type || l.entity || "", l.entity_name || "", details].join(";");
      })
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria_certificados_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-600" />
            Auditoria de Certificados
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Rastreabilidade completa de emissões e edições — conformidade com normas técnicas
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Certificados Emitidos", value: totalEmissoes, color: "text-emerald-600", bg: "bg-emerald-50", icon: Award },
          { label: "Edições de Modelos", value: totalEdicoes, color: "text-amber-600", bg: "bg-amber-50", icon: Edit3 },
          { label: "Modelos Criados", value: totalModelos, color: "text-blue-600", bg: "bg-blue-50", icon: Plus },
          { label: "Usuários Ativos", value: usuariosAtivos, color: "text-purple-600", bg: "bg-purple-50", icon: User },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <Card key={label} className="border border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome, modelo, usuário..." className="pl-8 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Ação</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[180px] text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  <SelectItem value="emissao_individual">Emissão Individual</SelectItem>
                  <SelectItem value="emissao_massa">Emissão em Massa</SelectItem>
                  <SelectItem value="modelo_criado">Modelo Criado</SelectItem>
                  <SelectItem value="modelo_editado">Modelo Editado</SelectItem>
                  <SelectItem value="modelo_excluido">Modelo Excluído</SelectItem>
                  <SelectItem value="modelo_duplicado">Modelo Duplicado</SelectItem>
                  <SelectItem value="sign">Assinatura Digital</SelectItem>
                  <SelectItem value="send_whatsapp">Envio WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Usuário</label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-[180px] text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {users.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">De</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[150px] text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Até</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[150px] text-sm" />
            </div>
            {(search || actionFilter !== "all" || userFilter !== "all" || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setActionFilter("all"); setUserFilter("all"); setDateFrom(""); setDateTo(""); }}>
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="border border-gray-200">
        <CardHeader className="py-3 px-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Filter className="w-4 h-4" /> Histórico de Eventos
            </CardTitle>
            <span className="text-xs text-gray-400">{filtered.length} registro(s)</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-xs font-semibold">Data/Hora</TableHead>
                  <TableHead className="text-xs font-semibold">Usuário</TableHead>
                  <TableHead className="text-xs font-semibold">Ação</TableHead>
                  <TableHead className="text-xs font-semibold">Registro</TableHead>
                  <TableHead className="text-xs font-semibold">Entidade</TableHead>
                  <TableHead className="text-xs font-semibold">Observação</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
                        <span className="text-sm">Carregando...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                      <Shield className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">Nenhum registro de auditoria encontrado</p>
                      <p className="text-xs mt-1">Os eventos serão registrados conforme as ações ocorrerem</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(log => <ExpandableRow key={log.id} log={log} />)
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}