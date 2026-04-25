import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp, DollarSign, RefreshCw, Users, Bell, CheckCircle,
  AlertTriangle, BarChart3, Calendar, Building2
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, FunnelChart, Funnel, LabelList
} from "recharts";

const fmt = (v) => `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const fmtK = (v) => v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : fmt(v);
const COLORS = ["#1d4ed8", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

export default function FinancialDashboard() {
  const [period, setPeriod] = useState("all");

  // ---- Dados ----
  const { data: certificates = [] } = useQuery({
    queryKey: ["certs-fd"],
    queryFn: () => base44.entities.Certificate.list("-created_date", 500),
    initialData: [],
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes-fd"],
    queryFn: () => base44.entities.ClassSchedule.list("-created_date", 500),
    initialData: [],
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["auditlogs-fd"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 1000),
    initialData: [],
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-fd"],
    queryFn: () => base44.entities.Company.list(),
    initialData: [],
  });

  // ---- Filtro por período ----
  const filterByPeriod = (date) => {
    if (period === "all") return true;
    const d = new Date(date);
    const now = new Date();
    if (period === "3m") {
      const limit = new Date(); limit.setMonth(now.getMonth() - 3);
      return d >= limit;
    }
    if (period === "6m") {
      const limit = new Date(); limit.setMonth(now.getMonth() - 6);
      return d >= limit;
    }
    if (period === "12m") {
      const limit = new Date(); limit.setMonth(now.getMonth() - 12);
      return d >= limit;
    }
    return true;
  };

  const filteredCerts = useMemo(() =>
    certificates.filter(c => filterByPeriod(c.created_date)),
    [certificates, period]
  );

  const filteredClasses = useMemo(() =>
    classes.filter(c => filterByPeriod(c.created_date) && c.status === "Concluído"),
    [classes, period]
  );

  // ---- Alertas enviados (do AuditLog) ----
  const alertsSent = useMemo(() =>
    auditLogs.filter(l => l.action === "send_whatsapp" && l.entity_type === "Certificate" && filterByPeriod(l.created_date)),
    [auditLogs, period]
  );

  // ---- Identificar renovações ----
  // Uma renovação é um certificado ativo/signed para um aluno que já tinha outro certificado
  // do mesmo curso com valid_until expirado ou próximo.
  const renewals = useMemo(() => {
    const groupedByCpfCourse = {};
    const sorted = [...certificates].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

    sorted.forEach(cert => {
      const key = `${cert.student_cpf}|${cert.course_name}`;
      if (!groupedByCpfCourse[key]) {
        groupedByCpfCourse[key] = [];
      }
      groupedByCpfCourse[key].push(cert);
    });

    const renewalList = [];
    Object.values(groupedByCpfCourse).forEach(certs => {
      if (certs.length > 1) {
        // Cada certificado além do primeiro é uma renovação
        certs.slice(1).forEach(cert => {
          renewalList.push(cert);
        });
      }
    });
    return renewalList;
  }, [certificates]);

  // ---- Conversão: alunos alertados que renovaram ----
  // Verificar se existe um alerta do AuditLog para o certificado, e se o aluno depois
  // tem um certificado novo do mesmo curso (renovação).
  const conversionData = useMemo(() => {
    const alertedCertIds = new Set(alertsSent.map(l => l.entity_id));
    const alertedCerts = certificates.filter(c => alertedCertIds.has(c.id));

    let converted = 0;
    let notConverted = 0;

    alertedCerts.forEach(cert => {
      const wasRenewed = renewals.some(r =>
        r.student_cpf === cert.student_cpf &&
        r.course_name === cert.course_name &&
        new Date(r.created_date) > new Date(cert.created_date)
      );
      if (wasRenewed) converted++;
      else notConverted++;
    });

    const total = converted + notConverted;
    const rate = total > 0 ? ((converted / total) * 100).toFixed(1) : 0;

    return { converted, notConverted, total, rate };
  }, [alertsSent, certificates, renewals]);

  // ---- Receita Recorrente de Renovações ----
  const renewalRevenue = useMemo(() => {
    return renewals
      .filter(r => filterByPeriod(r.created_date))
      .reduce((sum, r) => {
        // Tentar pegar valor da turma vinculada
        const cls = classes.find(c => c.id === r.class_schedule_id);
        return sum + (cls?.total_value || 0);
      }, 0);
  }, [renewals, classes, period]);

  // ---- Receita total de novas turmas concluídas ----
  const totalRevenue = useMemo(() =>
    filteredClasses.reduce((sum, c) => sum + (c.total_value || 0), 0),
    [filteredClasses]
  );

  // ---- MRR estimado (Monthly Recurring Revenue) ----
  // Receita de renovações / meses ativos do período
  const mrrEstimate = useMemo(() => {
    const months = period === "3m" ? 3 : period === "6m" ? 6 : period === "12m" ? 12 : 24;
    return months > 0 ? renewalRevenue / months : renewalRevenue;
  }, [renewalRevenue, period]);

  // ---- Gráfico: Receita por mês (renovações vs novas) ----
  const monthlyRevenueChart = useMemo(() => {
    const map = {};

    filteredClasses.forEach(c => {
      const month = c.month || "Sem mês";
      if (!map[month]) map[month] = { month, nova: 0, renovacao: 0 };
      const isRenewal = renewals.some(r => r.class_schedule_id === c.id);
      if (isRenewal) map[month].renovacao += c.total_value || 0;
      else map[month].nova += c.total_value || 0;
    });

    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredClasses, renewals]);

  // ---- Gráfico: Conversão funil ----
  const funnelChartData = [
    { name: "Certificados Emitidos", value: filteredCerts.length, fill: "#1d4ed8" },
    { name: "Alertas Enviados", value: alertsSent.length, fill: "#d97706" },
    { name: "Renovações Realizadas", value: renewals.filter(r => filterByPeriod(r.created_date)).length, fill: "#16a34a" },
  ];

  // ---- Gráfico: Alunos alertados vs renovados (pizza) ----
  const conversionPieData = [
    { name: "Renovaram após alerta", value: conversionData.converted, fill: "#16a34a" },
    { name: "Não renovaram ainda", value: conversionData.notConverted, fill: "#e5e7eb" },
  ];

  // ---- Gráfico: Top cursos por renovação ----
  const topCourseRenewals = useMemo(() => {
    const map = {};
    renewals.filter(r => filterByPeriod(r.created_date)).forEach(r => {
      map[r.course_name] = (map[r.course_name] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name: name.length > 20 ? name.slice(0, 20) + "…" : name, count }));
  }, [renewals, period]);

  // ---- Gráfico: Evolução de alertas por mês ----
  const alertsByMonth = useMemo(() => {
    const map = {};
    alertsSent.forEach(l => {
      const d = new Date(l.created_date);
      const key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort().map(([month, count]) => ({ month, count }));
  }, [alertsSent]);

  // ---- Certificados por status ----
  const certsByStatus = useMemo(() => {
    const map = {};
    filteredCerts.forEach(c => {
      map[c.status] = (map[c.status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value], i) => ({ name, value, fill: COLORS[i] }));
  }, [filteredCerts]);

  // ---- Próximos vencimentos (receita potencial) ----
  const upcomingRenewals = useMemo(() => {
    const today = new Date();
    const in90 = new Date(); in90.setDate(today.getDate() + 90);

    return certificates
      .filter(c => {
        if (!c.valid_until || c.status === "revoked") return false;
        const d = new Date(c.valid_until);
        return d >= today && d <= in90;
      })
      .sort((a, b) => new Date(a.valid_until) - new Date(b.valid_until))
      .slice(0, 8);
  }, [certificates]);

  const potentialRevenue = useMemo(() => {
    return upcomingRenewals.reduce((sum, cert) => {
      const cls = classes.find(c => c.company_name === cert.client_name && c.training_name === cert.course_name);
      return sum + (cls?.unit_value || 0);
    }, 0);
  }, [upcomingRenewals, classes]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Dashboard Financeiro — Renovações
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Receita recorrente e conversão de alunos via alertas de vencimento
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3m">Últimos 3 meses</SelectItem>
            <SelectItem value="6m">Últimos 6 meses</SelectItem>
            <SelectItem value="12m">Últimos 12 meses</SelectItem>
            <SelectItem value="all">Todo o período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<DollarSign className="w-5 h-5 text-blue-600" />}
          label="Receita Total"
          value={fmtK(totalRevenue)}
          bg="bg-blue-50 border-blue-200"
          textColor="text-blue-900"
        />
        <KPICard
          icon={<RefreshCw className="w-5 h-5 text-green-600" />}
          label="Receita de Renovações"
          value={fmtK(renewalRevenue)}
          sub={`${totalRevenue > 0 ? ((renewalRevenue / totalRevenue) * 100).toFixed(1) : 0}% do total`}
          bg="bg-green-50 border-green-200"
          textColor="text-green-900"
        />
        <KPICard
          icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
          label="MRR Estimado"
          value={fmtK(mrrEstimate)}
          sub="Média mensal de renovações"
          bg="bg-purple-50 border-purple-200"
          textColor="text-purple-900"
        />
        <KPICard
          icon={<Bell className="w-5 h-5 text-orange-600" />}
          label="Taxa de Conversão"
          value={`${conversionData.rate}%`}
          sub={`${conversionData.converted} de ${conversionData.total} alertados`}
          bg="bg-orange-50 border-orange-200"
          textColor="text-orange-900"
        />
      </div>

      {/* Segunda linha de KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Certificados Emitidos" value={filteredCerts.length} icon={<CheckCircle className="w-4 h-4 text-gray-500" />} />
        <StatCard label="Alertas Enviados" value={alertsSent.length} icon={<Bell className="w-4 h-4 text-orange-500" />} />
        <StatCard label="Renovações Realizadas" value={renewals.filter(r => filterByPeriod(r.created_date)).length} icon={<RefreshCw className="w-4 h-4 text-green-500" />} />
        <StatCard label="Receita Potencial (90d)" value={fmtK(potentialRevenue)} icon={<TrendingUp className="w-4 h-4 text-blue-500" />} />
      </div>

      {/* Gráficos principais */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Receita Mensal: Novas vs Renovações */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-800">Receita Mensal: Novas vs Renovações</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyRevenueChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={270}>
                <BarChart data={monthlyRevenueChart} margin={{ top: 5, right: 10, bottom: 40, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" fontSize={10} angle={-30} textAnchor="end" />
                  <YAxis fontSize={10} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="nova" name="Nova Turma" fill="#1d4ed8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="renovacao" name="Renovação" fill="#16a34a" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </CardContent>
        </Card>

        {/* Funil de Conversão */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-800">Funil de Conversão por Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 pt-2">
              {funnelChartData.map((item, i) => {
                const pct = funnelChartData[0].value > 0
                  ? ((item.value / funnelChartData[0].value) * 100).toFixed(1)
                  : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{item.name}</span>
                      <span className="font-bold" style={{ color: item.fill }}>
                        {item.value} <span className="text-xs text-gray-400">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-center text-white text-xs font-bold transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: item.fill,
                          minWidth: item.value > 0 ? "2rem" : 0
                        }}
                      >
                        {item.value > 0 && item.value}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Taxa de conversão alerta → renovação */}
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-700 font-medium">Taxa alerta → renovação</span>
                  <span className="text-xl font-bold text-green-800">{conversionData.rate}%</span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  {conversionData.converted} alunos renovaram após receber o alerta de vencimento
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Gráfico pizza conversão */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-800">Conversão de Alertados</CardTitle>
          </CardHeader>
          <CardContent>
            {conversionData.total > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={conversionPieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                      {conversionPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `${v} alunos`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 justify-center text-xs mt-1">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-600 inline-block" /> Renovaram ({conversionData.converted})</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-200 inline-block" /> Pendentes ({conversionData.notConverted})</span>
                </div>
              </>
            ) : <EmptyChart height={200} msg="Nenhum alerta enviado ainda" />}
          </CardContent>
        </Card>

        {/* Top cursos por renovação */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-800">Top Cursos por Renovação</CardTitle>
          </CardHeader>
          <CardContent>
            {topCourseRenewals.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topCourseRenewals} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={10} />
                  <YAxis type="category" dataKey="name" fontSize={10} width={120} />
                  <Tooltip formatter={(v) => [`${v} renovações`]} />
                  <Bar dataKey="count" name="Renovações" fill="#16a34a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart height={220} msg="Nenhuma renovação registrada" />}
          </CardContent>
        </Card>
      </div>

      {/* Alertas por mês */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-800">Evolução de Alertas Enviados por Mês</CardTitle>
        </CardHeader>
        <CardContent>
          {alertsByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={alertsByMonth} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#d97706" strokeWidth={2} name="Alertas" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart height={220} msg="Nenhum alerta registrado ainda" />}
        </CardContent>
      </Card>

      {/* Próximos vencimentos — receita potencial */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-800">
              Próximos Vencimentos (90 dias) — Receita Potencial
            </CardTitle>
            {potentialRevenue > 0 && (
              <Badge className="bg-green-100 text-green-800 border border-green-300">
                Potencial: {fmt(potentialRevenue)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {upcomingRenewals.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p>Nenhum certificado vencendo nos próximos 90 dias.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingRenewals.map(cert => {
                const days = Math.round((new Date(cert.valid_until) - new Date()) / 86400000);
                const urgency = days <= 15 ? "text-red-600 bg-red-50 border-red-200" : days <= 30 ? "text-orange-600 bg-orange-50 border-orange-200" : "text-yellow-700 bg-yellow-50 border-yellow-200";
                return (
                  <div key={cert.id} className={`flex items-center justify-between p-3 rounded-lg border ${urgency}`}>
                    <div>
                      <span className="font-semibold text-sm">{cert.student_name}</span>
                      <span className="text-xs mx-2">•</span>
                      <span className="text-xs">{cert.course_name}</span>
                      {cert.client_name && (
                        <span className="text-xs text-gray-500 ml-2">— {cert.client_name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold">{days}d restantes</span>
                      <span className="text-xs">{new Date(cert.valid_until).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({ icon, label, value, sub, bg, textColor }) {
  return (
    <Card className={`border ${bg}`}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-gray-600 font-medium">{label}</span></div>
        <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
        {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <Card className="border border-gray-200">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-gray-500">{label}</span></div>
        <div className="text-xl font-bold text-gray-900">{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ height = 270, msg = "Sem dados disponíveis" }) {
  return (
    <div className={`flex items-center justify-center text-gray-400 text-sm`} style={{ height }}>
      {msg}
    </div>
  );
}