import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Calendar, Clock, Users, Bell, CheckCircle, XCircle, Mail, MessageSquare, RefreshCw, TrendingUp, AlertTriangle } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const EVENTO_LABEL = {
  "30dias": "Alerta 30 dias",
  "15dias": "Alerta 15 dias",
  "5dias": "Alerta 5 dias",
  assinatura: "Assinatura Digital",
  confirmacao_agendamento: "Confirmação de Agendamento",
};

const TIPO_ICON = { email: Mail, whatsapp: MessageSquare, sms: MessageSquare };
const TIPO_COLOR = {
  email: "text-blue-600 bg-blue-50 border-blue-200",
  whatsapp: "text-green-600 bg-green-50 border-green-200",
  sms: "text-purple-600 bg-purple-50 border-purple-200",
};

function MetricCard({ icon: Icon, label, value, sub, color = "blue", loading }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
    gray: "bg-gray-100 text-gray-600",
  };
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
            {loading ? (
              <div className="h-8 w-16 bg-gray-100 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-3xl font-bold text-gray-900 mt-1">{value ?? "—"}</p>
            )}
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const { data: certificates = [], isLoading: loadingCerts } = useQuery({
    queryKey: ["admin-certs"],
    queryFn: () => base44.entities.Certificate.list("-created_date", 1000),
    refetchInterval: 60000,
  });

  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ["admin-schedules"],
    queryFn: () => base44.entities.ClassSchedule.list("-created_date", 500),
    refetchInterval: 60000,
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["admin-logs"],
    queryFn: () => base44.entities.LogNotificacoes.list("-data_envio", 100),
    refetchInterval: 30000,
  });

  // Métricas calculadas
  const treinamentosAtivos = schedules.filter((s) => s.status === "Em Andamento" || s.status === "Agendado").length;

  const proximosVencer = certificates.filter((c) => {
    if (!c.valid_until) return false;
    const diff = differenceInDays(parseISO(c.valid_until), hoje);
    return diff >= 0 && diff <= 30;
  });
  const vencendo5 = proximosVencer.filter((c) => differenceInDays(parseISO(c.valid_until), hoje) <= 5).length;
  const vencendo15 = proximosVencer.filter((c) => {
    const d = differenceInDays(parseISO(c.valid_until), hoje);
    return d > 5 && d <= 15;
  }).length;
  const vencendo30 = proximosVencer.filter((c) => differenceInDays(parseISO(c.valid_until), hoje) > 15).length;

  const pendentesAssinatura = certificates.filter((c) => c.status === "pending_signature").length;
  const totalCertificados = certificates.length;

  const enviados = logs.filter((l) => l.status === "enviado").length;
  const erros = logs.filter((l) => l.status === "erro").length;
  const taxaSucesso = logs.length > 0 ? Math.round((enviados / logs.length) * 100) : 100;

  const [lastUpdate, setLastUpdate] = useState(new Date());
  useEffect(() => {
    if (!loadingLogs) setLastUpdate(new Date());
  }, [logs]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Administrativo</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Visão geral em tempo real — atualizado às{" "}
            {format(lastUpdate, "HH:mm:ss", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <RefreshCw className="w-3.5 h-3.5" />
          Atualização automática a cada 60s
        </div>
      </div>

      {/* Linha 1 — Treinamentos & Certificados */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Treinamentos & Certificados</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard icon={Calendar} label="Treinamentos Ativos" value={treinamentosAtivos} color="blue" loading={loadingSchedules} sub="Em andamento ou agendado" />
          <MetricCard icon={Award} label="Total de Certificados" value={totalCertificados} color="purple" loading={loadingCerts} />
          <MetricCard icon={Users} label="Pendentes de Assinatura" value={pendentesAssinatura} color="orange" loading={loadingCerts} sub="Aguardando assinatura digital" />
          <MetricCard icon={CheckCircle} label="Certificados Ativos" value={certificates.filter((c) => c.status === "active" || c.status === "signed").length} color="green" loading={loadingCerts} />
        </div>
      </div>

      {/* Linha 2 — Vencimentos */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Alertas de Vencimento</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-500 uppercase tracking-wider">Crítico — até 5 dias</p>
                  <p className="text-3xl font-bold text-red-700 mt-1">{loadingCerts ? "…" : vencendo5}</p>
                  <p className="text-xs text-red-400 mt-1">Certificados em estado crítico</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-red-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-orange-500 uppercase tracking-wider">Atenção — 6 a 15 dias</p>
                  <p className="text-3xl font-bold text-orange-700 mt-1">{loadingCerts ? "…" : vencendo15}</p>
                  <p className="text-xs text-orange-400 mt-1">Certificados com alerta médio</p>
                </div>
                <Clock className="w-10 h-10 text-orange-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-yellow-600 uppercase tracking-wider">Aviso — 16 a 30 dias</p>
                  <p className="text-3xl font-bold text-yellow-700 mt-1">{loadingCerts ? "…" : vencendo30}</p>
                  <p className="text-xs text-yellow-500 mt-1">Certificados com aviso prévio</p>
                </div>
                <Bell className="w-10 h-10 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Linha 3 — Notificações */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Notificações</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard icon={TrendingUp} label="Total Enviadas" value={logs.length} color="blue" loading={loadingLogs} />
          <MetricCard icon={CheckCircle} label="Com sucesso" value={enviados} color="green" loading={loadingLogs} />
          <MetricCard icon={XCircle} label="Com erro" value={erros} color="red" loading={loadingLogs} />
          <MetricCard icon={Bell} label="Taxa de sucesso" value={`${taxaSucesso}%`} color={taxaSucesso >= 90 ? "green" : taxaSucesso >= 70 ? "orange" : "red"} loading={loadingLogs} />
        </div>
      </div>

      {/* Tabela últimas atividades */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Últimas Atividades — Log de Notificações</h2>
          <span className="text-xs text-gray-400">{logs.length} registros</span>
        </div>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Aluno</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Curso / Empresa</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Canal</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Evento</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Data/Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingLogs && (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                )}
                {!loadingLogs && logs.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">Nenhuma atividade registrada ainda.</td></tr>
                )}
                {!loadingLogs && logs.slice(0, 20).map((log) => {
                  const Icon = TIPO_ICON[log.tipo] || Mail;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 truncate max-w-[140px]">{log.aluno_nome || "—"}</div>
                        {log.aluno_email && <div className="text-xs text-gray-400 truncate max-w-[140px]">{log.aluno_email}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-700 truncate max-w-[160px]">{log.curso_nome || "—"}</div>
                        {log.empresa_nome && <div className="text-xs text-gray-400 truncate max-w-[160px]">{log.empresa_nome}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${TIPO_COLOR[log.tipo] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                          <Icon className="w-3 h-3" />{log.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs whitespace-nowrap">{EVENTO_LABEL[log.evento] || log.evento}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {log.status === "enviado"
                          ? <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle className="w-3.5 h-3.5" />Enviado</span>
                          : <span className="flex items-center gap-1 text-red-600 text-xs font-medium" title={log.mensagem_erro}><XCircle className="w-3.5 h-3.5" />Erro</span>
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
        </Card>
      </div>
    </div>
  );
}