import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Users, Award, AlertTriangle, BookOpen, Building2 } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";
import { differenceInDays, parseISO, isBefore } from "date-fns";

const COLORS = ["#059669", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#84CC16"];

function KPICard({ title, value, subtitle, color = "text-gray-900", bg = "bg-white" }) {
  return (
    <div className={`${bg} rounded-xl border p-4 shadow-sm`}>
      <p className="text-xs text-gray-500 mb-1">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

export default function BIAdvanced() {
  const { data: certificates = [], isLoading: loadingCerts } = useQuery({
    queryKey: ["bi_certificates"],
    queryFn: () => base44.entities.Certificate.list(),
    initialData: [],
  });

  const { data: enrollments = [], isLoading: loadingEnrollments } = useQuery({
    queryKey: ["bi_enrollments"],
    queryFn: () => base44.entities.StudentCourseEnrollment.list(),
    initialData: [],
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["bi_companies"],
    queryFn: () => base44.entities.Company.list(),
    initialData: [],
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["bi_classes"],
    queryFn: () => base44.entities.ClassSchedule.list(),
    initialData: [],
  });

  const isLoading = loadingCerts || loadingEnrollments;

  // ===== KPIs Gerais =====
  const kpis = useMemo(() => {
    const total = certificates.length;
    const signed = certificates.filter(c => ["signed", "active"].includes(c.status)).length;
    const pending = certificates.filter(c => c.status === "pending_signature").length;
    const expired = certificates.filter(c => {
      if (c.status === "revoked") return false;
      return c.valid_until && isBefore(parseISO(c.valid_until), new Date());
    }).length;
    const expiring30 = certificates.filter(c => {
      if (!c.valid_until || c.status === "revoked") return false;
      const days = differenceInDays(parseISO(c.valid_until), new Date());
      return days >= 0 && days <= 30;
    }).length;
    const taxaAssinatura = total > 0 ? ((signed / total) * 100).toFixed(1) : 0;
    const empresasComCerts = new Set(certificates.map(c => c.client_id).filter(Boolean)).size;

    return { total, signed, pending, expired, expiring30, taxaAssinatura, empresasComCerts };
  }, [certificates]);

  // ===== Cursos mais realizados =====
  const topCourses = useMemo(() => {
    const grouped = {};
    enrollments.forEach(e => {
      const name = e.course_name || "Sem nome";
      if (!grouped[name]) grouped[name] = { name, count: 0, signed: 0 };
      grouped[name].count++;
      if (e.status === "Assinado" || e.status === "Certificado Gerado") grouped[name].signed++;
    });
    return Object.values(grouped).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [enrollments]);

  // ===== Empresas com mais certificados =====
  const topEmpresas = useMemo(() => {
    const grouped = {};
    certificates.forEach(c => {
      const name = c.client_name || "Sem empresa";
      if (!grouped[name]) grouped[name] = { name, total: 0, signed: 0, expired: 0 };
      grouped[name].total++;
      if (["signed", "active"].includes(c.status)) grouped[name].signed++;
      if (c.valid_until && isBefore(parseISO(c.valid_until), new Date()) && c.status !== "revoked") grouped[name].expired++;
    });
    return Object.values(grouped).sort((a, b) => b.total - a.total).slice(0, 7);
  }, [certificates]);

  // ===== Evolução de emissões por mês =====
  const evolucaoMensal = useMemo(() => {
    const grouped = {};
    certificates.forEach(c => {
      if (!c.issue_date) return;
      const month = c.issue_date.slice(0, 7); // YYYY-MM
      if (!grouped[month]) grouped[month] = { month, emitidos: 0, assinados: 0 };
      grouped[month].emitidos++;
      if (["signed", "active"].includes(c.status)) grouped[month].assinados++;
    });
    return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  }, [certificates]);

  // ===== Distribuição de status =====
  const statusDist = useMemo(() => {
    const map = { "Assinado": 0, "Pendente": 0, "Vencido": 0, "Revogado": 0 };
    certificates.forEach(c => {
      if (c.status === "revoked") map["Revogado"]++;
      else if (c.valid_until && isBefore(parseISO(c.valid_until), new Date())) map["Vencido"]++;
      else if (c.status === "pending_signature") map["Pendente"]++;
      else map["Assinado"]++;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [certificates]);

  // ===== Previsão de vencimentos próximos (próximos 90 dias) =====
  const vencimentosFuturos = useMemo(() => {
    const buckets = { "0-15 dias": 0, "16-30 dias": 0, "31-60 dias": 0, "61-90 dias": 0 };
    certificates.forEach(c => {
      if (!c.valid_until || c.status === "revoked") return;
      const days = differenceInDays(parseISO(c.valid_until), new Date());
      if (days < 0) return;
      if (days <= 15) buckets["0-15 dias"]++;
      else if (days <= 30) buckets["16-30 dias"]++;
      else if (days <= 60) buckets["31-60 dias"]++;
      else if (days <= 90) buckets["61-90 dias"]++;
    });
    return Object.entries(buckets).map(([label, count]) => ({ label, count }));
  }, [certificates]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="ml-3 text-gray-500">Carregando análises...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <TrendingUp className="w-6 h-6 text-emerald-600" />
        <div>
          <h2 className="text-xl font-bold text-gray-900">Business Intelligence</h2>
          <p className="text-sm text-gray-500">Análises preditivas e estratégicas em tempo real</p>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KPICard title="Total Certificados" value={kpis.total} bg="bg-blue-50" color="text-blue-700" />
        <KPICard title="Assinados" value={kpis.signed} bg="bg-green-50" color="text-green-700" />
        <KPICard title="Pendentes" value={kpis.pending} bg="bg-yellow-50" color="text-yellow-700" />
        <KPICard title="Vencidos" value={kpis.expired} bg="bg-red-50" color="text-red-700" />
        <KPICard title="Vencendo (30d)" value={kpis.expiring30} bg="bg-orange-50" color="text-orange-700" />
        <KPICard title="Taxa de Assinatura" value={`${kpis.taxaAssinatura}%`} bg="bg-emerald-50" color="text-emerald-700" />
        <KPICard title="Empresas Ativas" value={kpis.empresasComCerts} bg="bg-purple-50" color="text-purple-700" />
      </div>

      {/* Alerta Preditivo */}
      {kpis.expiring30 > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-orange-800">Alerta Preditivo</p>
            <p className="text-sm text-orange-700">
              <strong>{kpis.expiring30}</strong> certificado(s) vencem nos próximos 30 dias. Contate as empresas para agendar renovação.
            </p>
          </div>
        </div>
      )}

      {/* Gráficos Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Evolução Mensal */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-bold text-gray-900">Emissões por Mês (últimos 12 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            {evolucaoMensal.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={evolucaoMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={10} />
                  <YAxis stroke="#6b7280" fontSize={10} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="emitidos" stroke="#3B82F6" strokeWidth={2} name="Emitidos" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="assinados" stroke="#059669" strokeWidth={2} name="Assinados" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">Sem dados suficientes</div>
            )}
          </CardContent>
        </Card>

        {/* Distribuição de Status */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-bold text-gray-900">Distribuição de Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusDist} cx="50%" cy="50%" outerRadius={90}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    dataKey="value" labelLine={false}
                  >
                    {statusDist.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">Sem dados</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Cursos */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" /> Cursos Mais Realizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCourses.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topCourses} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" fontSize={10} />
                  <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={9} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#059669" name="Realizações" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">Sem dados</div>
            )}
          </CardContent>
        </Card>

        {/* Previsão de Vencimentos */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" /> Previsão de Vencimentos (90 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={vencimentosFuturos}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" stroke="#6b7280" fontSize={10} />
                <YAxis stroke="#6b7280" fontSize={10} />
                <Tooltip />
                <Bar dataKey="count" name="Certificados" radius={[4, 4, 0, 0]}>
                  {vencimentosFuturos.map((entry, index) => (
                    <Cell key={index} fill={index === 0 ? "#EF4444" : index === 1 ? "#F59E0B" : "#3B82F6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Empresas */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" /> Empresas — Volume de Certificados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topEmpresas.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topEmpresas}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={10} />
                <YAxis stroke="#6b7280" fontSize={10} />
                <Tooltip />
                <Legend />
                <Bar dataKey="signed" fill="#059669" name="Assinados" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expired" fill="#EF4444" name="Vencidos" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">Sem dados</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}