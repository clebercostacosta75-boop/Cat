import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users, BookOpen, FileText, DollarSign, AlertTriangle, Award,
  Bell, CheckCircle, Clock, TrendingUp, Calendar, BarChart3,
  XCircle, CreditCard, ChevronRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from "recharts";

const fmt = (v) => `R$ ${(parseFloat(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";
const todayStr = () => new Date().toISOString().split("T")[0];

const COLORS = ["#8b5cf6", "#3b82f6", "#f59e0b", "#22c55e", "#ef4444", "#6366f1", "#ec4899"];

const PAG_COLORS = {
  "Pix": "#8b5cf6",
  "PIX Asaas": "#3b82f6",
  "Boleto": "#f59e0b",
  "À Vista": "#22c55e",
  "Dinheiro em Espécie": "#16a34a",
  "Parcelado 2x": "#ef4444",
  "Parcelado 3x": "#dc2626",
  "Parcelado 4x": "#b91c1c",
  "Parcelado 5x": "#991b1b",
  "Parcelado 6x": "#7f1d1d",
  "Cartão de Crédito": "#06b6d4",
  "Cartão de Débito": "#0891b2",
  "Transferência Bancária": "#64748b",
};

export default function DashboardPF() {
  const today = todayStr();

  // Período inicial: mês atual
  const firstOfMonth = today.slice(0, 7) + "-01";
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [filterFrom, setFilterFrom] = useState(firstOfMonth);
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
    const d = ((item[dateField] || item.created_date || "").slice(0, 10));
    return d >= filterFrom && d <= filterTo;
  };

  // ─── KPIs do período ──────────────────────────────────────────────────────
  const studentsInPeriod = students.filter(s => inRange("created_date", s));
  const enrollmentsInPeriod = enrollments.filter(e => inRange("created_date", e));
  const contractsInPeriod = contracts.filter(c => inRange("created_date", c));
  const receiptsInPeriod = receipts.filter(r => inRange("created_date", r) && r.status === "Emitido");
  const certsInPeriod = certificates.filter(c => inRange("created_date", c));

  // ─── KPIs gerais (sem valores financeiros consolidados — ver módulo Financeiro) ──
  const ativos = students.filter(s => s.status === "Ativo").length;
  const inativos = students.filter(s => s.status === "Inativo").length;

  const contratosAssinados = contracts.filter(c => c.status === "Assinado_Todas_Partes").length;
  const contratosPendentes = contracts.filter(c =>
    ["Gerado_Automaticamente", "Gerado_Manualmente", "Enviado_Assinatura", "Aguardando_Assinatura_Aluno"].includes(c.status)
  ).length;
  const matriculasAutorizadas = enrollments.filter(e => ["Autorizado", "Certificado Gerado", "Assinado"].includes(e.status)).length;
  const matriculasAguardando = enrollments.filter(e => e.status === "Aguardando Autorização").length;

  // ─── Alertas ──────────────────────────────────────────────────────────────
  const pixAguardando = enrollments.filter(e => e.forma_pagamento === "Pix" && e.status_pagamento === "Pendente");
  const pixUrgente = pixAguardando.filter(e => {
    const d = new Date(e.created_date);
    return (new Date() - d) / (1000 * 60 * 60 * 24) > 3;
  });

  const vencidos = enrollments.filter(e => {
    if (!e.data_vencimento_pagamento || e.status_pagamento === "Pago") return false;
    return e.data_vencimento_pagamento < today;
  });

  const vence7dias = enrollments.filter(e => {
    if (!e.data_vencimento_pagamento || e.status_pagamento === "Pago") return false;
    const diff = (new Date(e.data_vencimento_pagamento + "T00:00:00") - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  });

  const contratosSemAssinar7dias = contracts.filter(c => {
    if (c.status === "Assinado_Todas_Partes") return false;
    const d = (new Date() - new Date(c.created_date)) / (1000 * 60 * 60 * 24);
    return d > 7 && ["Gerado_Automaticamente", "Gerado_Manualmente", "Enviado_Assinatura", "Aguardando_Assinatura_Aluno"].includes(c.status);
  });

  const novosHoje = students.filter(s => (s.created_date || "").slice(0, 10) === today);
  const contratosAssinadosHoje = contracts.filter(c => c.status === "Assinado_Todas_Partes" && (c.updated_date || "").slice(0, 10) === today);
  const pagamentosHoje = receipts.filter(r => r.status === "Emitido" && (r.created_date || "").slice(0, 10) === today);

  // ─── Gráficos ─────────────────────────────────────────────────────────────
  // Matrículas por curso (todos)
  const byCourse = {};
  enrollments.forEach(e => { if (e.course_name) byCourse[e.course_name] = (byCourse[e.course_name] || 0) + 1; });
  const courseData = Object.entries(byCourse).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name: name.length > 15 ? name.slice(0, 15) + "…" : name, value }));

  // Formas de pagamento (todos)
  const byPayment = {};
  enrollments.forEach(e => { const k = e.forma_pagamento || "Não informado"; byPayment[k] = (byPayment[k] || 0) + 1; });
  const paymentData = Object.entries(byPayment).map(([name, value]) => ({ name, value }));

  // Status de matrículas
  const statusMatData = [
    { name: "Aguardando Auth.", value: enrollments.filter(e => e.status === "Aguardando Autorização").length, color: "#f59e0b" },
    { name: "Autorizado", value: enrollments.filter(e => e.status === "Autorizado").length, color: "#22c55e" },
    { name: "Certificado", value: enrollments.filter(e => e.status === "Certificado Gerado").length, color: "#3b82f6" },
    { name: "Assinado", value: enrollments.filter(e => e.status === "Assinado").length, color: "#8b5cf6" },
    { name: "Vencido", value: enrollments.filter(e => e.status === "Vencido").length, color: "#ef4444" },
    { name: "Revogado", value: enrollments.filter(e => e.status === "Revogado").length, color: "#6b7280" },
  ].filter(d => d.value > 0);

  // Tabela: 10 mais recentes ou urgentes
  const tabelaAlunos = [...enrollments]
    .sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))
    .slice(0, 10);

  // ─── Handlers de período ──────────────────────────────────────────────────
  const handleBuscar = () => { setFilterFrom(dateFrom); setFilterTo(dateTo); };
  const handleHoje = () => { const t = todayStr(); setDateFrom(t); setDateTo(t); setFilterFrom(t); setFilterTo(t); };
  const handleSemana = () => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay());
    const ini = d.toISOString().split("T")[0];
    setDateFrom(ini); setDateTo(today); setFilterFrom(ini); setFilterTo(today);
  };
  const handleMes = () => {
    const ini = today.slice(0, 7) + "-01";
    setDateFrom(ini); setDateTo(today); setFilterFrom(ini); setFilterTo(today);
  };
  const handleAno = () => {
    const ini = today.slice(0, 4) + "-01-01";
    setDateFrom(ini); setDateTo(today); setFilterFrom(ini); setFilterTo(today);
  };

  const pagBg = { Pago: "bg-green-100 text-green-800", Pendente: "bg-yellow-100 text-yellow-800", Inadimplente: "bg-red-100 text-red-800", "Parcialmente Pago": "bg-blue-100 text-blue-800" };
  const statusBg = { "Aguardando Autorização": "bg-blue-100 text-blue-800", Autorizado: "bg-green-100 text-green-800", "Certificado Gerado": "bg-emerald-100 text-emerald-800", Assinado: "bg-purple-100 text-purple-800", Vencido: "bg-red-100 text-red-800", Revogado: "bg-gray-100 text-gray-700" };

  return (
    <div className="space-y-6">

      {/* ── Filtro de Período ─────────────────────────────────────────────── */}
      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Data Início</p>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Data Fim</p>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36" />
            </div>
            <Button onClick={handleBuscar} className="bg-gray-900 hover:bg-gray-800">Buscar</Button>
            <Button variant="outline" size="sm" onClick={handleHoje}>Hoje</Button>
            <Button variant="outline" size="sm" onClick={handleSemana}>Esta Semana</Button>
            <Button variant="outline" size="sm" onClick={handleMes}>Este Mês</Button>
            <Button variant="outline" size="sm" onClick={handleAno}>Este Ano</Button>
            <Badge className="bg-blue-100 text-blue-700 h-8 px-3 text-xs">
              {filterFrom === filterTo ? fmtDate(filterFrom) : `${fmtDate(filterFrom)} → ${fmtDate(filterTo)}`}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ── LINHA 1: Alunos ───────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> Alunos</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border border-gray-200 bg-blue-50">
            <CardContent className="p-4">
              <Users className="w-5 h-5 text-blue-600 mb-1" />
              <p className="text-2xl font-bold text-blue-700">{ativos}</p>
              <p className="text-xs text-gray-600">👥 Total Alunos Ativos</p>
              {inativos > 0 && <p className="text-xs text-gray-400 mt-0.5">{inativos} inativos</p>}
            </CardContent>
          </Card>
          <Card className="border border-gray-200 bg-indigo-50">
            <CardContent className="p-4">
              <Users className="w-5 h-5 text-indigo-600 mb-1" />
              <p className="text-2xl font-bold text-indigo-700">{studentsInPeriod.length}</p>
              <p className="text-xs text-gray-600">🆕 Novos Alunos (período)</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-200 bg-purple-50">
            <CardContent className="p-4">
              <BookOpen className="w-5 h-5 text-purple-600 mb-1" />
              <p className="text-2xl font-bold text-purple-700">{enrollments.length}</p>
              <p className="text-xs text-gray-600">📋 Total de Matrículas</p>
              <p className="text-xs text-gray-400 mt-0.5">{enrollmentsInPeriod.length} no período</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-200 bg-green-50">
            <CardContent className="p-4">
              <CheckCircle className="w-5 h-5 text-green-600 mb-1" />
              <p className="text-2xl font-bold text-green-700">{matriculasAutorizadas}</p>
              <p className="text-xs text-gray-600">✅ Matrículas Concluídas</p>
              <p className="text-xs text-gray-400 mt-0.5">{matriculasAguardando} aguardando auth.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── LINHA 3: Documentos ───────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><FileText className="w-3 h-3" /> Documentos</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border border-gray-200 bg-blue-50">
            <CardContent className="p-4">
              <FileText className="w-5 h-5 text-blue-600 mb-1" />
              <p className="text-2xl font-bold text-blue-700">{contractsInPeriod.length}</p>
              <p className="text-xs text-gray-600">📄 Contratos Gerados (período)</p>
              <p className="text-xs text-gray-400 mt-0.5">{contracts.length} no total</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-200 bg-green-50">
            <CardContent className="p-4">
              <CheckCircle className="w-5 h-5 text-green-600 mb-1" />
              <p className="text-2xl font-bold text-green-700">{contratosAssinados}</p>
              <p className="text-xs text-gray-600">✍️ Contratos Assinados</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-200 bg-orange-50">
            <CardContent className="p-4">
              <Clock className="w-5 h-5 text-orange-600 mb-1" />
              <p className="text-2xl font-bold text-orange-700">{contratosPendentes}</p>
              <p className="text-xs text-gray-600">⏳ Contratos Pendentes</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-200 bg-yellow-50">
            <CardContent className="p-4">
              <Award className="w-5 h-5 text-yellow-600 mb-1" />
              <p className="text-2xl font-bold text-yellow-700">{certsInPeriod.length}</p>
              <p className="text-xs text-gray-600">🎓 Certificados (período)</p>
              <p className="text-xs text-gray-400 mt-0.5">{certificates.length} no total</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── LINHA 4: Alertas ──────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Bell className="w-3 h-3" /> Alertas</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className={`border ${pixAguardando.length > 0 ? "border-purple-300 bg-purple-50" : "border-gray-200"}`}>
            <CardContent className="p-4">
              <CreditCard className={`w-5 h-5 mb-1 ${pixAguardando.length > 0 ? "text-purple-600" : "text-gray-400"}`} />
              <p className={`text-2xl font-bold ${pixAguardando.length > 0 ? "text-purple-700" : "text-gray-800"}`}>{pixAguardando.length}</p>
              <p className="text-xs text-gray-600">⚠️ PIX Aguardando Confirmação</p>
              {pixUrgente.length > 0 && <p className="text-xs text-red-500 mt-0.5">{pixUrgente.length} há mais de 3 dias!</p>}
            </CardContent>
          </Card>
          <Card className={`border ${vence7dias.length > 0 ? "border-orange-300 bg-orange-50" : "border-gray-200"}`}>
            <CardContent className="p-4">
              <Calendar className={`w-5 h-5 mb-1 ${vence7dias.length > 0 ? "text-orange-600" : "text-gray-400"}`} />
              <p className={`text-2xl font-bold ${vence7dias.length > 0 ? "text-orange-700" : "text-gray-800"}`}>{vence7dias.length}</p>
              <p className="text-xs text-gray-600">📅 Vencem em 7 dias</p>
            </CardContent>
          </Card>
          <Card className={`border ${matriculasAguardando > 0 ? "border-blue-300 bg-blue-50" : "border-gray-200"}`}>
            <CardContent className="p-4">
              <BookOpen className={`w-5 h-5 mb-1 ${matriculasAguardando > 0 ? "text-blue-600" : "text-gray-400"}`} />
              <p className={`text-2xl font-bold ${matriculasAguardando > 0 ? "text-blue-700" : "text-gray-800"}`}>{matriculasAguardando}</p>
              <p className="text-xs text-gray-600">📋 Aguardando Autorização</p>
            </CardContent>
          </Card>
          <Card className={`border ${vencidos.length > 0 ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
            <CardContent className="p-4">
              <XCircle className={`w-5 h-5 mb-1 ${vencidos.length > 0 ? "text-red-600" : "text-gray-400"}`} />
              <p className={`text-2xl font-bold ${vencidos.length > 0 ? "text-red-700" : "text-gray-800"}`}>{vencidos.length}</p>
              <p className="text-xs text-gray-600">🔴 Pagamentos Vencidos</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Seção de Alertas Prioritários ─────────────────────────────────── */}
      {(pixUrgente.length > 0 || vencidos.length > 0 || contratosSemAssinar7dias.length > 0 || vence7dias.length > 0 || novosHoje.length > 0) && (
        <Card className="border border-gray-200">
          <CardHeader className="pb-2 bg-gray-50 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" /> ⚠️ Requer Atenção
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {/* URGENTE */}
            {(pixUrgente.length > 0 || vencidos.length > 0 || contratosSemAssinar7dias.length > 0) && (
              <div>
                <p className="text-xs font-bold text-red-700 mb-2">🔴 URGENTE</p>
                <div className="space-y-1">
                  {pixUrgente.map(e => (
                    <div key={e.id} className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded-md text-xs">
                      <span><strong>{e.student_name}</strong> — PIX aguardando há mais de 3 dias</span>
                      <Badge className="bg-red-100 text-red-700">{fmt(e.unit_value)}</Badge>
                    </div>
                  ))}
                  {vencidos.slice(0, 5).map(e => (
                    <div key={e.id} className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded-md text-xs">
                      <span><strong>{e.student_name}</strong> — Pagamento vencido em {fmtDate(e.data_vencimento_pagamento)}</span>
                      <Badge className="bg-red-100 text-red-700">{fmt(e.unit_value)}</Badge>
                    </div>
                  ))}
                  {contratosSemAssinar7dias.slice(0, 3).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded-md text-xs">
                      <span><strong>{c.student_name}</strong> — Contrato {c.contract_number} sem assinatura há mais de 7 dias</span>
                      <Badge className="bg-orange-100 text-orange-700">{c.status?.replace(/_/g, " ")}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ATENÇÃO */}
            {(vence7dias.length > 0 || matriculasAguardando > 0) && (
              <div>
                <p className="text-xs font-bold text-yellow-700 mb-2">🟡 ATENÇÃO</p>
                <div className="space-y-1">
                  {vence7dias.slice(0, 5).map(e => (
                    <div key={e.id} className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded-md text-xs">
                      <span><strong>{e.student_name}</strong> — {e.course_name} — vence em {fmtDate(e.data_vencimento_pagamento)}</span>
                      <Badge className="bg-yellow-100 text-yellow-700">{fmt(e.unit_value)}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* INFORMATIVO */}
            {(novosHoje.length > 0 || contratosAssinadosHoje.length > 0 || pagamentosHoje.length > 0) && (
              <div>
                <p className="text-xs font-bold text-green-700 mb-2">🟢 INFORMATIVO HOJE</p>
                <div className="flex flex-wrap gap-2">
                  {novosHoje.length > 0 && (
                    <Badge className="bg-green-100 text-green-800">🆕 {novosHoje.length} novo(s) cadastro(s)</Badge>
                  )}
                  {contratosAssinadosHoje.length > 0 && (
                    <Badge className="bg-emerald-100 text-emerald-800">✍️ {contratosAssinadosHoje.length} contrato(s) assinado(s)</Badge>
                  )}
                  {pagamentosHoje.length > 0 && (
                    <Badge className="bg-blue-100 text-blue-800">💰 {pagamentosHoje.length} pagamento(s) confirmado(s)</Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Gráficos ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Matrículas por Curso */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Matrículas por Curso
            </CardTitle>
          </CardHeader>
          <CardContent>
            {courseData.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={courseData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 10 }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Formas de Pagamento */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Formas de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentData.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({ name, percent }) => `${name.slice(0, 8)} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {paymentData.map((entry, i) => (
                      <Cell key={i} fill={PAG_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status de Matrículas */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Status das Matrículas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusMatData.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusMatData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {statusMatData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Lista Resumida de Alunos ───────────────────────────────────────── */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Últimas Matrículas
            </span>
            <span className="text-xs font-normal text-gray-500">{tabelaAlunos.length} de {enrollments.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tabelaAlunos.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Nenhuma matrícula encontrada</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Aluno", "Curso", "Status Matrícula", "Status Pagamento", "Vencimento", "Forma Pag."].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tabelaAlunos.map(e => {
                    const isPixPend = e.forma_pagamento === "Pix" && e.status_pagamento === "Pendente";
                    return (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap max-w-[140px] truncate">{e.student_name}</td>
                        <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate">{e.course_name}</td>
                        <td className="px-3 py-2">
                          <Badge className={`text-xs ${statusBg[e.status] || "bg-gray-100 text-gray-700"}`}>{e.status}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge className={`text-xs ${isPixPend ? "bg-purple-100 text-purple-800" : pagBg[e.status_pagamento] || "bg-gray-100 text-gray-700"}`}>
                            {isPixPend ? "🟡 Aguard. PIX" : (e.status_pagamento || "Pendente")}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{fmtDate(e.data_vencimento_pagamento)}</td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{e.forma_pagamento || "—"}</td>
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