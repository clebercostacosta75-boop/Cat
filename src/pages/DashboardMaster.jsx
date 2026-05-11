import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Building2, Users, Award, Calendar, DollarSign, Activity,
  TrendingUp, AlertTriangle, CheckCircle, Clock, Loader2
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function StatCard({ icon: Icon, label, value, color = "blue", loading, sub }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
    gray: "bg-gray-100 text-gray-600",
  };
  return (
    <Card>
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

export default function DashboardMaster() {
  const hoje = new Date();
  const mesAtual = format(hoje, "yyyy-MM");

  const { data: companies = [], isLoading: l1 } = useQuery({
    queryKey: ["master-companies"],
    queryFn: () => base44.entities.Company.list(),
  });
  const { data: students = [], isLoading: l2 } = useQuery({
    queryKey: ["master-students"],
    queryFn: () => base44.entities.Student.list(),
  });
  const { data: instructors = [], isLoading: l3 } = useQuery({
    queryKey: ["master-instructors"],
    queryFn: () => base44.entities.Instructor.filter({ status: "Ativo" }),
  });
  const { data: schedules = [], isLoading: l4 } = useQuery({
    queryKey: ["master-schedules"],
    queryFn: () => base44.entities.ClassSchedule.list("-created_date", 500),
    refetchInterval: 60000,
  });
  const { data: certificates = [], isLoading: l5 } = useQuery({
    queryKey: ["master-certs"],
    queryFn: () => base44.entities.Certificate.list("-created_date", 1000),
    refetchInterval: 60000,
  });
  const { data: dailyRecords = [], isLoading: l6 } = useQuery({
    queryKey: ["master-daily"],
    queryFn: () => base44.entities.ClassDailyRecord.list(),
  });
  const { data: auditLogs = [], isLoading: l7 } = useQuery({
    queryKey: ["master-audit"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 20),
    refetchInterval: 30000,
  });

  const loading = l1 || l2 || l3 || l4 || l5 || l6;

  const metrics = useMemo(() => {
    const hojeStr = format(hoje, "yyyy-MM-dd");
    const cursosHoje = schedules.filter(s => s.realization_dates?.includes(hojeStr));
    const cursosAgendadosMes = schedules.filter(s =>
      (s.status === "Agendado" || s.status === "Em Andamento") &&
      s.realization_dates?.some(d => d?.startsWith(mesAtual))
    );

    const receitaMes = schedules
      .filter(s => s.created_date?.startsWith(mesAtual))
      .reduce((sum, s) => sum + (s.total_value || 0), 0);
    const custoMes = dailyRecords
      .filter(r => r.created_date?.startsWith(mesAtual))
      .reduce((sum, r) => sum + (r.total_daily_cost || 0), 0);

    const certEmitidosMes = certificates.filter(c => c.created_date?.startsWith(mesAtual)).length;
    const certPendentes = certificates.filter(c => c.status === "pending_signature").length;
    const certVencendo30 = certificates.filter(c => {
      if (!c.valid_until) return false;
      const d = differenceInDays(parseISO(c.valid_until), hoje);
      return d >= 0 && d <= 30;
    }).length;
    const certRevogados = certificates.filter(c => c.status === "revoked").length;

    const pagosPendentes = schedules.filter(s =>
      s.payment_status === "Pendente" && (s.instructor_payment_value || 0) > 0
    );

    // Gráfico receita x custo por mês
    const byMonth = {};
    schedules.forEach(s => {
      const m = s.month || s.created_date?.slice(0, 7) || "?";
      if (!byMonth[m]) byMonth[m] = { month: m, receita: 0, custo: 0 };
      byMonth[m].receita += s.total_value || 0;
    });
    dailyRecords.forEach(r => {
      const m = r.created_date?.slice(0, 7) || "?";
      if (!byMonth[m]) byMonth[m] = { month: m, receita: 0, custo: 0 };
      byMonth[m].custo += r.total_daily_cost || 0;
    });
    const chartData = Object.values(byMonth)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    return {
      cursosHoje, cursosAgendadosMes, receitaMes, custoMes,
      certEmitidosMes, certPendentes, certVencendo30, certRevogados,
      pagosPendentes, chartData,
    };
  }, [schedules, certificates, dailyRecords, hoje, mesAtual]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Master</h1>
        <p className="text-sm text-gray-500 mt-1">
          {format(hoje, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* KPIs Gerais */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Visão Geral</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Building2} label="Empresas Cadastradas" value={companies.length} color="blue" loading={l1} />
          <StatCard icon={Users} label="Alunos Cadastrados" value={students.length} color="purple" loading={l2} />
          <StatCard icon={Activity} label="Instrutores Ativos" value={instructors.length} color="green" loading={l3} />
          <StatCard icon={Calendar} label="Cursos Realizados/Mês" value={metrics.cursosAgendadosMes.length} color="orange" loading={l4} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Receita do Mês" value={`R$ ${(metrics.receitaMes / 1000).toFixed(0)}k`} color="green" loading={loading} />
        <StatCard icon={Award} label="Certificados Emitidos/Mês" value={metrics.certEmitidosMes} color="blue" loading={l5} />
        <StatCard icon={Clock} label="Pendentes Assinatura" value={metrics.certPendentes} color="orange" loading={l5} />
        <StatCard icon={AlertTriangle} label="Vencendo em 30 dias" value={metrics.certVencendo30} color="red" loading={l5} />
      </div>

      {/* Acesso Rápido */}
      <div className="flex flex-wrap gap-2">
        <Link to={createPageUrl("Schedule")}><Button size="sm" variant="outline">Cronograma</Button></Link>
        <Link to="/Certificacoes"><Button size="sm" variant="outline">Certificações</Button></Link>
        <Link to={createPageUrl("Companies")}><Button size="sm" variant="outline">Empresas</Button></Link>
        <Link to="/DashboardFinanceiro"><Button size="sm" variant="outline">Financeiro</Button></Link>
        <Link to="/CertificateAuditPanel"><Button size="sm" variant="outline">Auditoria</Button></Link>
        <Link to="/Analytics"><Button size="sm" variant="outline">Relatórios</Button></Link>
      </div>

      {/* Gráfico Receita x Custo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receita × Despesa — Últimos 6 Meses</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={metrics.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={v => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                <Legend />
                <Bar dataKey="receita" name="Receita" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="custo" name="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Operacional + Financeiro + Certificação lado a lado */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Operacional */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-500" />Operacional</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Cursos hoje</span>
              <Badge variant="outline">{metrics.cursosHoje.length}</Badge>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Agendados no mês</span>
              <Badge variant="outline">{metrics.cursosAgendadosMes.length}</Badge>
            </div>
            {metrics.cursosHoje.slice(0, 3).map(s => (
              <div key={s.id} className="text-xs bg-blue-50 rounded p-2 text-gray-700">
                {s.training_name} — {s.company_name}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Financeiro */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-500" />Financeiro</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Receita do mês</span>
              <span className="font-medium text-green-700">R$ {metrics.receitaMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Despesa do mês</span>
              <span className="font-medium text-red-700">R$ {metrics.custoMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Lucro líquido</span>
              <span className={`font-bold ${(metrics.receitaMes - metrics.custoMes) >= 0 ? "text-green-700" : "text-red-700"}`}>
                R$ {(metrics.receitaMes - metrics.custoMes).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Pagamentos pendentes</span>
              <Badge variant="outline" className={metrics.pagosPendentes.length > 0 ? "border-orange-300 text-orange-700" : ""}>
                {metrics.pagosPendentes.length}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Certificações */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Award className="w-4 h-4 text-purple-500" />Certificações</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Emitidos no mês</span>
              <Badge variant="outline">{metrics.certEmitidosMes}</Badge>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Pendentes assinatura</span>
              <Badge variant="outline" className={metrics.certPendentes > 0 ? "border-orange-300 text-orange-700" : ""}>{metrics.certPendentes}</Badge>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Vencendo em 30 dias</span>
              <Badge variant="outline" className={metrics.certVencendo30 > 0 ? "border-red-300 text-red-700" : ""}>{metrics.certVencendo30}</Badge>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Revogados</span>
              <Badge variant="outline">{metrics.certRevogados}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Log de Atividades Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-500" /> Log de Atividades Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {l7 ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : auditLogs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma atividade registrada.</p>
          ) : (
            <div className="space-y-1">
              {auditLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between text-xs p-2 hover:bg-gray-50 rounded">
                  <div>
                    <span className="font-medium text-gray-800">{log.user_name || log.user_email}</span>
                    <span className="text-gray-500 ml-2">{log.action}</span>
                    {log.entity_name && <span className="text-gray-400 ml-2">— {log.entity_name}</span>}
                  </div>
                  <span className="text-gray-400 whitespace-nowrap ml-4">
                    {log.created_date ? format(parseISO(log.created_date), "dd/MM HH:mm") : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}