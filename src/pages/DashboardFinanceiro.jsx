import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DollarSign, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Loader2
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function StatCard({ icon: Icon, label, value, color = "blue", loading, prefix = "R$" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
            {loading ? (
              <div className="h-8 w-24 bg-gray-100 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {prefix} {typeof value === "number" ? value.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : value}
              </p>
            )}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardFinanceiro() {
  const hoje = new Date();
  const mesAtual = format(hoje, "yyyy-MM");
  const mesAnterior = format(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1), "yyyy-MM");

  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ["fin-schedules"],
    queryFn: () => base44.entities.ClassSchedule.list("-created_date", 500),
    refetchInterval: 60000,
  });

  const { data: dailyRecords = [], isLoading: loadingRecords } = useQuery({
    queryKey: ["fin-daily"],
    queryFn: () => base44.entities.ClassDailyRecord.list(),
  });

  const loading = loadingSchedules || loadingRecords;

  const financials = useMemo(() => {
    const receitaMes = schedules
      .filter(s => s.month === mesAtual || s.created_date?.startsWith(mesAtual))
      .reduce((sum, s) => sum + (s.total_value || 0), 0);

    const receitaMesAnterior = schedules
      .filter(s => s.month === mesAnterior || s.created_date?.startsWith(mesAnterior))
      .reduce((sum, s) => sum + (s.total_value || 0), 0);

    const custoMes = dailyRecords
      .filter(r => r.created_date?.startsWith(mesAtual))
      .reduce((sum, r) => sum + (r.total_daily_cost || 0), 0);

    const custoMesAnterior = dailyRecords
      .filter(r => r.created_date?.startsWith(mesAnterior))
      .reduce((sum, r) => sum + (r.total_daily_cost || 0), 0);

    const lucro = receitaMes - custoMes;

    // Pagamentos pendentes de instrutores
    const pendentes = schedules.filter(s =>
      s.payment_status === "Pendente" &&
      (s.instructor_payment_value || 0) > 0
    );

    const pagos = schedules.filter(s => s.payment_status === "Pago");

    // Dados para gráfico mensal
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

    return { receitaMes, receitaMesAnterior, custoMes, custoMesAnterior, lucro, pendentes, pagos, chartData };
  }, [schedules, dailyRecords, mesAtual, mesAnterior]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Financeiro</h1>
        <p className="text-sm text-gray-500 mt-1">
          {format(hoje, "MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Receita Total do Mês" value={financials.receitaMes} color="green" loading={loading} />
        <StatCard icon={TrendingDown} label="Despesas do Mês" value={financials.custoMes} color="red" loading={loading} />
        <StatCard icon={DollarSign} label="Lucro Líquido" value={financials.lucro} color={financials.lucro >= 0 ? "green" : "red"} loading={loading} />
        <StatCard icon={AlertCircle} label="Pagamentos Pendentes" value={financials.pendentes.length} color="orange" loading={loading} prefix="" />
      </div>

      {/* Acesso Rápido */}
      <div className="flex flex-wrap gap-3">
        <Link to={createPageUrl("InstructorFinancialControl")}><Button variant="outline" className="gap-2"><DollarSign className="w-4 h-4" />Controle Financeiro</Button></Link>
        <Link to={createPageUrl("PaymentAutomation")}><Button variant="outline" className="gap-2"><CheckCircle className="w-4 h-4" />Automação de Pagamentos</Button></Link>
        <Link to={createPageUrl("Reports")}><Button variant="outline" className="gap-2"><TrendingUp className="w-4 h-4" />Relatórios</Button></Link>
      </div>

      {/* Gráfico receita x despesa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receita × Despesa — Últimos 6 Meses</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={financials.chartData}>
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

      {/* Pagamentos Pendentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" /> Pagamentos Pendentes de Instrutores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {financials.pendentes.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nenhum pagamento pendente.</p>
          ) : (
            <div className="space-y-2">
              {financials.pendentes.slice(0, 10).map(s => (
                <div key={s.id} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{s.instructor_name || "Instrutor"}</p>
                    <p className="text-xs text-gray-500">{s.training_name} — {s.company_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-700">
                      R$ {(s.instructor_payment_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">Pendente</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparativo com mês anterior */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm text-gray-600">Comparativo Receita</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Mês atual</p>
            <p className="text-xl font-bold text-green-700">R$ {financials.receitaMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-gray-500 mt-2">Mês anterior</p>
            <p className="text-lg font-semibold text-gray-600">R$ {financials.receitaMesAnterior.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-gray-600">Comparativo Despesa</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Mês atual</p>
            <p className="text-xl font-bold text-red-700">R$ {financials.custoMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-gray-500 mt-2">Mês anterior</p>
            <p className="text-lg font-semibold text-gray-600">R$ {financials.custoMesAnterior.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}