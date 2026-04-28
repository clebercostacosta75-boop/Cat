import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Mail, MessageSquare, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPO_ICON = { email: Mail, whatsapp: MessageSquare, sms: MessageSquare };
const TIPO_COLOR = { email: "text-blue-600 bg-blue-50", whatsapp: "text-green-600 bg-green-50", sms: "text-purple-600 bg-purple-50" };
const EVENTO_LABEL = { "30dias": "30 dias", "15dias": "15 dias", "5dias": "5 dias", assinatura: "Assinatura", confirmacao_agendamento: "Confirmação" };

export default function LogNotificacoes() {
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("all");
  const [filtroEvento, setFiltroEvento] = useState("all");
  const [filtroStatus, setFiltroStatus] = useState("all");

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["log-notificacoes"],
    queryFn: () => base44.entities.LogNotificacoes.list("-data_envio", 500),
  });

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = !search || [l.aluno_nome, l.aluno_email, l.empresa_nome, l.curso_nome].some((v) => v?.toLowerCase().includes(q));
    const matchTipo = filtroTipo === "all" || l.tipo === filtroTipo;
    const matchEvento = filtroEvento === "all" || l.evento === filtroEvento;
    const matchStatus = filtroStatus === "all" || l.status === filtroStatus;
    return matchSearch && matchTipo && matchEvento && matchStatus;
  });

  const stats = {
    total: logs.length,
    enviados: logs.filter((l) => l.status === "enviado").length,
    erros: logs.filter((l) => l.status === "erro").length,
    email: logs.filter((l) => l.tipo === "email").length,
    whatsapp: logs.filter((l) => l.tipo === "whatsapp").length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Log de Notificações</h1>
          <p className="text-sm text-gray-500 mt-0.5">Histórico de todos os alertas enviados</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total", value: stats.total, color: "text-gray-900" },
          { label: "Enviados", value: stats.enviados, color: "text-green-600" },
          { label: "Erros", value: stats.erros, color: "text-red-600" },
          { label: "E-mails", value: stats.email, color: "text-blue-600" },
          { label: "WhatsApp", value: stats.whatsapp, color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar aluno, empresa, curso..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Canal" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos canais</SelectItem>
            <SelectItem value="email">E-mail</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroEvento} onValueChange={setFiltroEvento}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Evento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos eventos</SelectItem>
            <SelectItem value="30dias">30 dias</SelectItem>
            <SelectItem value="15dias">15 dias</SelectItem>
            <SelectItem value="5dias">5 dias</SelectItem>
            <SelectItem value="assinatura">Assinatura</SelectItem>
            <SelectItem value="confirmacao_agendamento">Confirmação</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="enviado">Enviados</SelectItem>
            <SelectItem value="erro">Com erro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Aluno</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Curso / Empresa</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Canal</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Evento</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Data/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400">Nenhum log encontrado.</td></tr>
              )}
              {filtered.map((log) => {
                const Icon = TIPO_ICON[log.tipo] || Mail;
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{log.aluno_nome || "—"}</div>
                      {log.aluno_email && <div className="text-xs text-gray-400">{log.aluno_email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700">{log.curso_nome || "—"}</div>
                      {log.empresa_nome && <div className="text-xs text-gray-400">{log.empresa_nome}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${TIPO_COLOR[log.tipo] || "bg-gray-100 text-gray-600"}`}>
                        <Icon className="w-3 h-3" />{log.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">{EVENTO_LABEL[log.evento] || log.evento}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {log.status === "enviado"
                        ? <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle className="w-3.5 h-3.5" /> Enviado</span>
                        : <span className="flex items-center gap-1 text-red-600 text-xs" title={log.mensagem_erro}><XCircle className="w-3.5 h-3.5" /> Erro</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {log.data_envio ? format(new Date(log.data_envio), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}