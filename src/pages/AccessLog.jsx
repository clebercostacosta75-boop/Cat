import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Search, CheckCircle, Clock, RefreshCw, User, Monitor } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const EVENT_CONFIG = {
  login_success:     { label: "Login OK",          color: "bg-green-100 text-green-800" },
  login_failed:      { label: "Falha no Login",     color: "bg-red-100 text-red-800" },
  not_registered:    { label: "Não Cadastrado",     color: "bg-orange-100 text-orange-800" },
  blocked:           { label: "Bloqueado",          color: "bg-red-200 text-red-900" },
  consent_required:  { label: "Sem Consentimento",  color: "bg-yellow-100 text-yellow-800" },
  token_expired:     { label: "Token Expirado",     color: "bg-purple-100 text-purple-800" },
  module_access:     { label: "Acesso a Módulo",    color: "bg-blue-100 text-blue-800" },
  logout:            { label: "Logout",             color: "bg-gray-100 text-gray-700" },
};

const NON_FAILURE_EVENTS = ["login_success", "module_access", "logout"];

const REASON_LABELS = {
  auth_required:       "Autenticação necessária (sem token ou token inválido)",
  user_not_registered: "Usuário não está cadastrado no sistema",
  blocked:             "Conta bloqueada pelo administrador",
  consent_required:    "Usuário não aceitou o termo de consentimento LGPD",
  token_expired:       "Token de sessão expirado (401/403)",
  unknown:             "Erro desconhecido ao carregar o app",
};

export default function AccessLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEvent, setFilterEvent] = useState("all");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.AccessLog.list("-created_date", 500);
      setLogs(data);
    } catch {
      toast.error("Erro ao carregar logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, []);

  const markResolved = async (log) => {
    try {
      await base44.entities.AccessLog.update(log.id, { resolved: true });
      setLogs(prev => prev.map(l => l.id === log.id ? { ...l, resolved: true } : l));
      toast.success("Marcado como resolvido");
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || (l.user_email || "").toLowerCase().includes(q) || (l.reason || "").toLowerCase().includes(q);
    const matchEvent = filterEvent === "all" || l.event_type === filterEvent;
    return matchSearch && matchEvent;
  });

  const unresolvedFails = logs.filter(l => !l.resolved && !NON_FAILURE_EVENTS.includes(l.event_type)).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 text-gray-700" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Log de Acesso</h1>
            <p className="text-sm text-gray-500">Tentativas de acesso ao sistema</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unresolvedFails > 0 && (
            <Badge className="bg-red-100 text-red-800 text-sm px-3 py-1">
              {unresolvedFails} pendente{unresolvedFails > 1 ? "s" : ""}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={loadLogs}>
            <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por e-mail ou motivo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filterEvent}
          onChange={e => setFilterEvent(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">Todos os eventos</option>
          {Object.entries(EVENT_CONFIG).map(([val, cfg]) => (
            <option key={val} value={val}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(EVENT_CONFIG).filter(([k]) => k !== "login_success").map(([key, cfg]) => {
          const count = logs.filter(l => l.event_type === key).length;
          return (
            <Card key={key} className="cursor-pointer hover:shadow-md" onClick={() => setFilterEvent(key === filterEvent ? "all" : key)}>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <Badge className={`${cfg.color} text-xs mt-1`}>{cfg.label}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Nenhum registro encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => {
            const cfg = EVENT_CONFIG[log.event_type] || { label: log.event_type, color: "bg-gray-100 text-gray-800" };
            const reasonText = REASON_LABELS[log.reason] || log.reason || "—";
            const isFailure = !NON_FAILURE_EVENTS.includes(log.event_type);
            return (
              <Card key={log.id} className={`border-l-4 ${log.resolved ? "border-l-green-400 opacity-60" : isFailure ? "border-l-red-400" : "border-l-green-400"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge className={cfg.color}>{cfg.label}</Badge>
                        {log.resolved && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" /> Resolvido
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
                        <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="font-medium">{log.user_email || "E-mail não capturado"}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Motivo:</span> {reasonText}
                      </p>
                      {log.user_agent && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Monitor className="w-3 h-3" />
                          <span className="truncate max-w-md">{log.user_agent}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {log.created_date
                          ? format(new Date(log.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "—"}
                      </div>
                      {isFailure && !log.resolved && (
                        <Button size="sm" variant="outline" onClick={() => markResolved(log)}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Resolver
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}