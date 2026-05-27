import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users, BookOpen, FileText, DollarSign, AlertTriangle, Award,
  Bell, CheckCircle, Clock, TrendingUp, Calendar, BarChart3
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from "recharts";

const fmt = (v) => `R$ ${(parseFloat(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";
const todayStr = () => new Date().toISOString().split("T")[0];

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

export default function DashboardPF() {
  const today = todayStr();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [filterFrom, setFilterFrom] = useState(today);
  const [filterTo, setFilterTo] = useState(today);

  const { data: students = [] } = useQuery({
    queryKey: ["students-pf"],
    queryFn: () => base44.entities.Student.list("-created_date", 500),
    initialData: [],
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["enrollments-pf"],
    queryFn: async () => {
      const all = await base44.entities.StudentCourseEnrollment.list("-created_date", 500);
      return (all || []).filter(e => !e.company_id || e.company_id === "individual" || e.company_name === "Individual (PF)");
    },
    staleTime: 0, gcTime: 0,
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["all-contracts-pf"],
    queryFn: () => base44.entities.Contract.list("-created_date", 300),
    initialData: [],
  });

  const { data: receipts = [] } = useQuery({
    queryKey: ["receipts-pf"],
    queryFn: () => base44.entities.Receipt.list("-created_date", 500),
    initialData: [],
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ["certificates-pf"],
    queryFn: () => base44.entities.Certificate.list("-created_date", 500),
    initialData: [],
  });

  const inRange = (dateField, item) => {
    const d = (item[dateField] || item.created_date || "").slice(0, 10);
    return d >= filterFrom && d <= filterTo;
  };

  // KPIs do período
  const studentsInPeriod = students.filter(s => inRange("created_date", s));
  const enrollmentsInPeriod = enrollments.filter(e => inRange("created_date", e));
  const contractsInPeriod = contracts.filter(c => inRange("created_date", c));
  const receiptsInPeriod = receipts.filter(r => inRange("created_date", r));
  const certsInPeriod = certificates.filter(c => inRange("created_date", c));

  const totalRecebido = receiptsInPeriod
    .filter(r => r.status === "Emitido")
    .reduce((a, r) => a + (parseFloat(r.amount) || 0), 0);

  const inadimplentes = enrollments.filter(e => e.status_pagamento === "Inadimplente").length;
  const totalInadimplencia = enrollments
    .filter(e => e.status_pagamento === "Inadimplente")
    .reduce((a, e) => a + (parseFloat(e.unit_value) || 0), 0);

  const ativos = students.filter(s => s.status === "Ativo").length;
  const inativos = students.filter(s => s.status === "Inativo").length;
  const contratosAssinados = contracts.filter(c => c.status === "Assinado_Todas_Partes").length;
  const contratosPendentes = contracts.filter(c =>
    ["Gerado_Automaticamente", "Gerado_Manualmente", "Enviado_Assinatura", "Aguardando_Assinatura_Aluno"].includes(c.status)
  ).length;

  // Matrículas por curso
  const byCourse = {};
  enrollments.forEach(e => {
    if (e.course_name) byCourse[e.course_name] = (byCourse[e.course_name] || 0) + 1;
  });
  const courseData = Object.entries(byCourse)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name: name.length > 12 ? name.slice(0, 12) + "…" : name, value }));

  // Formas de pagamento
  const byPayment = {};
  enrollments.forEach(e => {
    const k = e.forma_pagamento || "Não informado";
    byPayment[k] = (byPayment[k] || 0) + 1;
  });
  const paymentData = Object.entries(byPayment).map(([name, value]) => ({ name, value }));

  // Evolução de matrículas por dia (últimos 30 dias)
  const last30 = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    const count = enrollments.filter(e => (e.created_date || "").slice(0, 10) === ds).length;
    last30.push({ day: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), matrículas: count });
  }

  const handleBuscar = () => { setFilterFrom(dateFrom); setFilterTo(dateTo); };
  const handleHoje = () => { const t = todayStr(); setDateFrom(t); setDateTo(t); setFilterFrom(t); setFilterTo(t); };

  const isToday = filterFrom === today && filterTo === today;

  return (
    <div className="space-y-6">
      {/* Filtro de Data */}
      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Data Início</p>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Data Fim</p>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
            </div>
            <Button onClick={handleBuscar} className="bg-gray-900 hover:bg-gray-800">Buscar</Button>
            <Button variant="outline" onClick={handleHoje}>Hoje</Button>
            {isToday && <Badge className="bg-blue-100 text-blue-700 h-8 px-3">Exibindo dados de hoje</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Cards do Período */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, color: "text-blue-600", bg: "bg-blue-50", value: studentsInPeriod.length, label: "Novos Alunos" },
          { icon: BookOpen, color: "text-indigo-600", bg: "bg-indigo-50", value: enrollmentsInPeriod.length, label: "Matrículas" },
          { icon: FileText, color: "text-purple-600", bg: "bg-purple-50", value: contractsInPeriod.length, label: "Contratos Gerados" },
          { icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", value: fmt(totalRecebido), label: "Valor Recebido" },
          { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", value: inadimplentes, label: "Inadimplentes" },
          { icon: Award, color: "text-yellow-600", bg: "bg-yellow-50", value: certsInPeriod.length, label: "Certificados" },
          { icon: Bell, color: "text-orange-600", bg: "bg-orange-50", value: receiptsInPeriod.length, label: "Recibos Emitidos" },
          { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", value: contratosAssinados, label: "Contratos Assinados" },
        ].map((kpi, i) => (
          <Card key={i} className="border border-gray-200">
            <CardContent className={`p-4 ${kpi.bg} rounded-lg`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color} mb-1`} />
              <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-gray-600">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cards secundários */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Alunos Ativos / Inativos</p>
            <p className="text-xl font-bold text-green-700">{ativos} <span className="text-sm font-normal text-gray-400">/ {inativos}</span></p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Contratos Assinados / Pendentes</p>
            <p className="text-xl font-bold text-blue-700">{contratosAssinados} <span className="text-sm font-normal text-gray-400">/ {contratosPendentes}</span></p>
          </CardContent>
        </Card>
        <Card className="border border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Valor em Inadimplência</p>
            <p className="text-xl font-bold text-red-700">{fmt(totalInadimplencia)}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Total de Certificados (mês)</p>
            <p className="text-xl font-bold text-yellow-700">{certificates.filter(c => {
              const d = (c.created_date || "").slice(0, 7);
              return d === today.slice(0, 7);
            }).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Matrículas por Curso</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={courseData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4" /> Formas de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name.slice(0,8)} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Evolução de Matrículas (últimos 30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={last30}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 9 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="matrículas" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela do período */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Matrículas do Período
            <span className="ml-auto text-xs font-normal text-gray-500">{enrollmentsInPeriod.length} registro(s)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {enrollmentsInPeriod.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Nenhuma matrícula no período selecionado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Aluno", "CPF", "Curso", "Data Matrícula", "Pagamento", "Valor", "Status Pagamento", "Status Contrato"].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {enrollmentsInPeriod.map(e => {
                    const contract = contracts.find(c => c.enrollment_id === e.id);
                    const pagBg = { Pago: "bg-green-100 text-green-800", Pendente: "bg-yellow-100 text-yellow-800", Inadimplente: "bg-red-100 text-red-800", "Parcialmente Pago": "bg-blue-100 text-blue-800" };
                    return (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{e.student_name}</td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{e.student_cpf}</td>
                        <td className="px-3 py-2 text-gray-600">{e.course_name}</td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmtDate(e.created_date?.slice(0,10))}</td>
                        <td className="px-3 py-2 text-gray-600">{e.forma_pagamento || "—"}</td>
                        <td className="px-3 py-2 font-semibold text-gray-900 whitespace-nowrap">{e.unit_value ? fmt(e.unit_value) : "—"}</td>
                        <td className="px-3 py-2">
                          <Badge className={pagBg[e.status_pagamento] || "bg-gray-100 text-gray-700"}>{e.status_pagamento || "Pendente"}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          {contract ? (
                            <Badge className="bg-blue-100 text-blue-700 text-xs">{contract.status?.replace(/_/g, " ")}</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-600 text-xs">Sem contrato</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}