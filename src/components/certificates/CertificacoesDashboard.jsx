import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Award, Users, BookOpen, Building2, Clock, CheckCircle2, AlertTriangle,
  XCircle, BarChart2, TrendingUp, Filter, X, Eye, Download,
  MessageCircle, Mail, GraduationCap, Send
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import { format, parseISO, isBefore, differenceInDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import GerarCertificadoWizard from "./GerarCertificadoWizard";
import { usePermissions } from "@/hooks/usePermissions";
import { classificarFila } from "@/lib/aptidaoCertificacao";
import { categorizarFilaVisual } from "@/lib/filaVisual";

const AUTHORIZED_ROLES = ["admin", "gestor_master", "Administrador Master", "Certificacao", "Certificação"];
const COLORS = ["#059669", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

function StatCard({ icon: Icon, label, value, color = "bg-gray-50", textColor = "text-gray-900", iconColor = "text-gray-500", badge }) {
  return (
    <div className={`rounded-xl border p-4 ${color} flex flex-col gap-1`}>
      <div className="flex items-center justify-between">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        {badge && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>}
      </div>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function AlertBox({ type, title, items }) {
  if (!items.length) return null;
  const styles = {
    red: { bg: "bg-red-50 border-red-200", title: "text-red-800", icon: <XCircle className="w-4 h-4 text-red-600" />, item: "text-red-700" },
    yellow: { bg: "bg-amber-50 border-amber-200", title: "text-amber-800", icon: <AlertTriangle className="w-4 h-4 text-amber-600" />, item: "text-amber-700" },
    green: { bg: "bg-emerald-50 border-emerald-200", title: "text-emerald-800", icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />, item: "text-emerald-700" },
  }[type];
  return (
    <div className={`border rounded-lg p-3 ${styles.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        {styles.icon}
        <span className={`text-sm font-semibold ${styles.title}`}>{title} ({items.length})</span>
      </div>
      <ul className="space-y-1">
        {items.slice(0, 5).map((item, i) => (
          <li key={i} className={`text-xs ${styles.item}`}>• {item}</li>
        ))}
        {items.length > 5 && <li className={`text-xs ${styles.item} italic`}>... e mais {items.length - 5}</li>}
      </ul>
    </div>
  );
}

export default function CertificacoesDashboard({ onNavigate }) {
  const { role } = usePermissions();
  const canGenerate = AUTHORIZED_ROLES.includes(role);

  const [filters, setFilters] = useState({ dateFrom: "", dateTo: "", course: "", company: "", status: "", tipo: "" });
  const [wizardEnrollment, setWizardEnrollment] = useState(null);

  const { data: certs = [], isLoading: loadingCerts } = useQuery({
    queryKey: ["certs-dashboard-full"],
    queryFn: () => base44.entities.Certificate.list("-created_date", 500),
    staleTime: 30_000,
  });

  const { data: enrollments = [], isLoading: loadingEnr } = useQuery({
    queryKey: ["enrollments-cert-dashboard"],
    queryFn: () => base44.entities.StudentCourseEnrollment.list("-created_date", 500),
    staleTime: 30_000,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-cert-dashboard"],
    queryFn: () => base44.entities.Student.list("-created_date", 300),
    staleTime: 60_000,
  });

  // SPR-2B-2: contexto do motor central para classificar a fila
  const { data: certModels = [] } = useQuery({
    queryKey: ["cert-models-dashboard"],
    queryFn: () => base44.entities.CertificateModel.list(),
    staleTime: 60_000,
  });
  const { data: companies = [] } = useQuery({
    queryKey: ["companies-cert-dashboard"],
    queryFn: () => base44.entities.Company.list("-created_date", 300),
    staleTime: 60_000,
  });
  const { data: solicitacoes = [] } = useQuery({
    queryKey: ["solicitacoes-cert-dashboard"],
    queryFn: () => base44.entities.SolicitacaoLiberacaoFinanceira.list("-created_date", 300),
    staleTime: 60_000,
  });

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const totalAlunos = students.length;
  const totalCursosComAlunos = new Set(enrollments.map(e => e.course_id).filter(Boolean)).size;
  const totalEmpresas = new Set(enrollments.map(e => e.company_id).filter(e => e && e !== "individual")).size;
  const totalMatriculas = enrollments.filter(e => ["Certificado Gerado", "Assinado"].includes(e.status)).length;

  // SPR-2B-2: aptos e pendências classificados pelo motor central (sem regra nova na tela)
  const fila = classificarFila(enrollments, { certModels, certificates: certs, companies, solicitacoes });
  const filaVis = categorizarFilaVisual(fila);
  const aptos = filaVis.aptos;
  const assinadosCount = certs.filter(c => c.status === "signed" || c.status === "active").length;
  const emitidos = certs.length;
  const aguardAssinatura = certs.filter(c => c.status === "pending_signature").length;
  const revogados = certs.filter(c => c.status === "revoked").length;

  const hoje = certs.filter(c => c.issue_date && c.issue_date.startsWith(todayStr)).length;
  const mesAtual = certs.filter(c => {
    if (!c.issue_date) return false;
    const d = parseISO(c.issue_date);
    return d >= startOfMonth(now) && d <= endOfMonth(now);
  }).length;

  // Curso com mais certificados
  const certsByCourse = certs.reduce((acc, c) => { if (c.course_name) acc[c.course_name] = (acc[c.course_name] || 0) + 1; return acc; }, {});
  const topCourse = Object.entries(certsByCourse).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  // Média de dias para emissão (enrollment end_date → issue_date)
  const diasEmissao = certs
    .filter(c => c.issue_date && c.end_date)
    .map(c => differenceInDays(parseISO(c.issue_date), parseISO(c.end_date)))
    .filter(d => d >= 0);
  const mediaDias = diasEmissao.length ? Math.round(diasEmissao.reduce((a, b) => a + b, 0) / diasEmissao.length) : 0;

  // ── ALERTAS ──────────────────────────────────────────────────────────────────
  const aptosUrgentes = aptos.filter(e => {
    const base = e.end_date || e.created_date;
    return base && differenceInDays(now, parseISO(base.substring(0, 10))) > 30;
  }).map(e => `${e.student_name} — ${e.course_name} (${differenceInDays(now, parseISO((e.end_date || e.created_date).substring(0, 10)))}d)`);

  const certsPendentesLongos = certs.filter(c => {
    if (c.status !== "pending_signature" || !c.issue_date) return false;
    return differenceInDays(now, parseISO(c.issue_date)) > 7;
  }).map(c => `${c.student_name} — ${c.course_name}`);

  const aptosAtencao = aptos.filter(e => {
    const base = e.end_date || e.created_date;
    if (!base) return false;
    const dias = differenceInDays(now, parseISO(base.substring(0, 10)));
    return dias > 15 && dias <= 30;
  }).map(e => `${e.student_name} — ${e.course_name}`);

  const semContacto = enrollments.filter(e => e.status === "Autorizado").filter(e => {
    const s = students.find(st => st.id === e.student_id);
    return s && !s.email && !s.whatsapp;
  }).map(e => `${e.student_name} — sem e-mail e WhatsApp`);

  const certHoje = certs.filter(c => c.issue_date?.startsWith(todayStr)).map(c => `${c.student_name} — ${c.course_name}`);

  // ── GRÁFICOS ─────────────────────────────────────────────────────────────────
  const certsByStatus = [
    { name: "Aguard. Assinatura", value: aguardAssinatura },
    { name: "Assinado", value: certs.filter(c => c.status === "signed" || c.status === "active").length },
    { name: "Revogado", value: revogados },
  ].filter(s => s.value > 0);

  const certsByCourseChart = Object.entries(certsByCourse)
    .map(([course, qty]) => ({ course: course.length > 20 ? course.slice(0, 18) + "…" : course, qty }))
    .sort((a, b) => b.qty - a.qty).slice(0, 6);

  const certsByMonth = useMemo(() => {
    const map = {};
    certs.forEach(c => {
      if (!c.issue_date) return;
      const label = format(parseISO(c.issue_date), "MMM/yy", { locale: ptBR });
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([mes, qty]) => ({ mes, qty })).slice(-6);
  }, [certs]);

  const certsByCompany = useMemo(() => {
    const map = {};
    certs.forEach(c => { if (c.client_name) map[c.client_name] = (map[c.client_name] || 0) + 1; });
    return Object.entries(map).map(([empresa, qty]) => ({ empresa: empresa.length > 18 ? empresa.slice(0, 16) + "…" : empresa, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [certs]);

  const tipoPJPF = useMemo(() => {
    const pj = enrollments.filter(e => e.company_id && e.company_id !== "individual").length;
    const pf = enrollments.filter(e => !e.company_id || e.company_id === "individual").length;
    return [{ name: "Empresarial PJ", value: pj }, { name: "Individual PF", value: pf }].filter(v => v.value > 0);
  }, [enrollments]);

  // Rankings
  const topCursos = Object.entries(certsByCourse).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const certsByCompanyRank = Object.entries(
    certs.reduce((acc, c) => { if (c.client_name) acc[c.client_name] = (acc[c.client_name] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Tabela principal — aptos para certificar
  const tabelaAptos = aptos.slice(0, 20);

  const isLoading = loadingCerts || loadingEnr;

  return (
    <div className="space-y-6">
      {/* Ações rápidas */}
      <div className="flex flex-wrap gap-2">
        {canGenerate && (
          <Button className="bg-emerald-700 hover:bg-emerald-800 gap-2 text-sm" onClick={() => onNavigate?.("controle")}>
            <GraduationCap className="w-4 h-4" /> Fila de Certificação
          </Button>
        )}
        <Button variant="outline" className="gap-2 text-sm" onClick={() => onNavigate?.("certificados")}>
          <Eye className="w-4 h-4" /> Ver Certificados
        </Button>
        <Button variant="outline" className="gap-2 text-sm" onClick={() => onNavigate?.("controle")}>
          <Send className="w-4 h-4" /> Emitir em Massa
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-gray-50 border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Filtros Globais</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <Input type="date" placeholder="De" value={filters.dateFrom}
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="text-xs h-8" />
          <Input type="date" placeholder="Até" value={filters.dateTo}
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} className="text-xs h-8" />
          <Input placeholder="Curso" value={filters.course}
            onChange={e => setFilters(f => ({ ...f, course: e.target.value }))} className="text-xs h-8" />
          <Input placeholder="Empresa" value={filters.company}
            onChange={e => setFilters(f => ({ ...f, company: e.target.value }))} className="text-xs h-8" />
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="border rounded-md px-2 text-xs h-8 text-gray-600 bg-white">
            <option value="">Todos status</option>
            <option value="pending_signature">Aguardando Assinatura</option>
            <option value="signed">Assinado</option>
            <option value="revoked">Revogado</option>
          </select>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1"
            onClick={() => setFilters({ dateFrom: "", dateTo: "", course: "", company: "", status: "", tipo: "" })}>
            <X className="w-3 h-3" /> Limpar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <>
          {/* KPIs Linha 1 — Visão Geral */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Visão Geral</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={Users} label="Total de Alunos" value={totalAlunos} color="bg-blue-50 border-blue-200" textColor="text-blue-700" iconColor="text-blue-500" />
              <StatCard icon={BookOpen} label="Cursos com Alunos" value={totalCursosComAlunos} color="bg-indigo-50 border-indigo-200" textColor="text-indigo-700" iconColor="text-indigo-500" />
              <StatCard icon={Building2} label="Empresas Vinculadas" value={totalEmpresas} color="bg-purple-50 border-purple-200" textColor="text-purple-700" iconColor="text-purple-500" />
              <StatCard icon={Award} label="Matrículas Concluídas" value={totalMatriculas} color="bg-gray-50 border-gray-200" textColor="text-gray-700" iconColor="text-gray-500" />
            </div>
          </div>

          {/* SPR-2B-2 — Linha 1: Fila de Matrículas (motor central) — cards clicáveis */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Fila de Matrículas</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button className="text-left" onClick={() => onNavigate?.("controle", { area: "fila", tab: "aptos" })}>
                <StatCard icon={CheckCircle2} label="🟢 Aptos para Emissão" value={filaVis.aptos.length}
                  color="bg-emerald-50 border-emerald-200 hover:border-emerald-400 transition-colors" textColor="text-emerald-700" iconColor="text-emerald-500" />
              </button>
              <button className="text-left" onClick={() => onNavigate?.("controle", { area: "fila", tab: "academicas" })}>
                <StatCard icon={AlertTriangle} label="🟠 Pendências Acadêmicas" value={filaVis.academicas.length}
                  color="bg-amber-50 border-amber-200 hover:border-amber-400 transition-colors" textColor="text-amber-700" iconColor="text-amber-500" />
              </button>
              <button className="text-left" onClick={() => onNavigate?.("controle", { area: "fila", tab: "financeiras" })}>
                <StatCard icon={TrendingUp} label="💰 Pendências Financeiras" value={filaVis.financeiras.length}
                  color="bg-yellow-50 border-yellow-300 hover:border-yellow-500 transition-colors" textColor="text-yellow-700" iconColor="text-yellow-600" />
              </button>
              <button className="text-left" onClick={() => onNavigate?.("controle", { area: "fila", tab: "bloqueados" })}>
                <StatCard icon={XCircle} label="🔴 Bloqueados / Não Aptos" value={filaVis.bloqueados.length}
                  color="bg-red-50 border-red-200 hover:border-red-400 transition-colors" textColor="text-red-700" iconColor="text-red-500" />
              </button>
            </div>
          </div>

          {/* SPR-2B-2 — Linha 2: Certificados — cards clicáveis */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Certificados</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button className="text-left" onClick={() => onNavigate?.("controle", { area: "emitidos", tab: "aguardando" })}>
                <StatCard icon={Clock} label="⏳ Aguardando Assinatura" value={aguardAssinatura}
                  color="bg-yellow-50 border-yellow-200 hover:border-yellow-400 transition-colors" textColor="text-yellow-700" iconColor="text-yellow-500" />
              </button>
              <button className="text-left" onClick={() => onNavigate?.("controle", { area: "emitidos", tab: "assinados" })}>
                <StatCard icon={CheckCircle2} label="✅ Assinados" value={assinadosCount}
                  color="bg-green-50 border-green-200 hover:border-green-400 transition-colors" textColor="text-green-700" iconColor="text-green-500" />
              </button>
              <button className="text-left" onClick={() => onNavigate?.("controle", { area: "emitidos", tab: "revogados" })}>
                <StatCard icon={XCircle} label="🚫 Revogados" value={revogados}
                  color="bg-red-50 border-red-200 hover:border-red-400 transition-colors" textColor="text-red-700" iconColor="text-red-500" />
              </button>
              <button className="text-left" onClick={() => onNavigate?.("controle", { area: "emitidos", tab: "assinados" })}>
                <StatCard icon={TrendingUp} label="📈 Emitidos no Mês" value={mesAtual}
                  color="bg-blue-50 border-blue-200 hover:border-blue-400 transition-colors" textColor="text-blue-700" iconColor="text-blue-500" />
              </button>
            </div>
          </div>

          {/* KPIs Linha 3 — Produtividade */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Produtividade</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={TrendingUp} label="Emitidos Hoje" value={hoje} color="bg-green-50 border-green-200" textColor="text-green-700" iconColor="text-green-500" />
              <StatCard icon={BarChart2} label="Emitidos no Mês" value={mesAtual} color="bg-blue-50 border-blue-200" textColor="text-blue-700" iconColor="text-blue-500" />
              <div className="rounded-xl border bg-purple-50 border-purple-200 p-4">
                <Award className="w-5 h-5 text-purple-500 mb-1" />
                <p className="text-sm font-bold text-purple-700 truncate">{topCourse}</p>
                <p className="text-xs text-gray-500">Curso com mais certificados</p>
              </div>
              <StatCard icon={Clock} label="Média dias p/ emissão" value={`${mediaDias}d`} color="bg-indigo-50 border-indigo-200" textColor="text-indigo-700" iconColor="text-indigo-500" />
            </div>
          </div>

          {/* Alertas */}
          <div className="grid md:grid-cols-3 gap-3">
            <AlertBox type="red" title="🔴 Urgente" items={[...aptosUrgentes.slice(0, 3), ...certsPendentesLongos.slice(0, 2)]} />
            <AlertBox type="yellow" title="🟡 Atenção" items={[...aptosAtencao, ...semContacto]} />
            <AlertBox type="green" title="🟢 Hoje" items={certHoje} />
          </div>

          {/* Tabela — Aptos para Certificar */}
          {tabelaAptos.length > 0 && (
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-amber-50 border-b px-4 py-3 flex items-center justify-between">
                <h3 className="font-semibold text-amber-800 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Aptos para Certificar ({aptos.length})
                </h3>
                {canGenerate && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7" onClick={() => onNavigate?.("controle")}>
                    <GraduationCap className="w-3 h-3 mr-1" /> Ir para Fila
                  </Button>
                )}
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Aluno</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 hidden md:table-cell">Curso</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 hidden lg:table-cell">Empresa</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Conclusão</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Dias em Aberto</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tabelaAptos.map(e => {
                    const base = e.end_date || e.created_date;
                    const dias = base ? differenceInDays(now, parseISO(base.substring(0, 10))) : 0;
                    const urgente = dias > 30;
                    return (
                      <tr key={e.id} className={`border-b ${urgente ? "bg-red-50" : "hover:bg-gray-50"}`}>
                        <td className="px-4 py-2">
                          <div className="font-medium text-gray-900 text-sm">{e.student_name}</div>
                          <div className="text-xs text-gray-400 font-mono">{e.student_cpf}</div>
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-600 hidden md:table-cell max-w-[160px] truncate">{e.course_name}</td>
                        <td className="px-4 py-2 text-xs text-gray-500 hidden lg:table-cell">{e.company_name || "PF"}</td>
                        <td className="px-4 py-2 text-xs text-gray-600">{e.end_date ? format(parseISO(e.end_date), "dd/MM/yyyy") : "—"}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${urgente ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                            {dias}d {urgente ? "⚠️" : ""}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <Badge className="bg-amber-100 text-amber-800 text-xs">🟡 Apto — Aguardando Emissão</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {aptos.length > 20 && (
                <div className="text-center py-3 text-xs text-gray-400 bg-gray-50">
                  Mostrando 20 de {aptos.length}. <button className="text-emerald-600 underline" onClick={() => onNavigate?.("controle")}>Ver todos</button>
                </div>
              )}
            </div>
          )}

          {/* Gráficos */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Certificados por curso */}
            <Card className="border border-gray-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">📚 Certificados por Curso</CardTitle></CardHeader>
              <CardContent>
                {certsByCourseChart.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sem dados</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={certsByCourseChart} layout="vertical" barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} fontSize={11} stroke="#9ca3af" />
                      <YAxis type="category" dataKey="course" fontSize={10} stroke="#9ca3af" width={100} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={v => [v, "Certificados"]} />
                      <Bar dataKey="qty" fill="#059669" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Status pizza */}
            <Card className="border border-gray-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">📊 Status dos Certificados</CardTitle></CardHeader>
              <CardContent>
                {certsByStatus.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sem dados</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={certsByStatus} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                        {certsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => [v, "Certificados"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Evolução mensal */}
            <Card className="border border-gray-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">📅 Evolução Mensal (últimos 6 meses)</CardTitle></CardHeader>
              <CardContent>
                {certsByMonth.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sem dados</div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={certsByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" fontSize={11} stroke="#9ca3af" />
                      <YAxis allowDecimals={false} fontSize={11} stroke="#9ca3af" width={28} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={v => [v, "Emitidos"]} />
                      <Line type="monotone" dataKey="qty" stroke="#059669" strokeWidth={2} dot={{ r: 4, fill: "#059669" }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top empresas */}
            <Card className="border border-gray-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">🏢 Top Empresas com mais Certificados</CardTitle></CardHeader>
              <CardContent>
                {certsByCompany.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sem dados</div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={certsByCompany} layout="vertical" barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} fontSize={11} stroke="#9ca3af" />
                      <YAxis type="category" dataKey="empresa" fontSize={10} stroke="#9ca3af" width={110} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={v => [v, "Certificados"]} />
                      <Bar dataKey="qty" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* PF x PJ pizza */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border border-gray-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">📋 Individual PF x Empresarial PJ</CardTitle></CardHeader>
              <CardContent>
                {tipoPJPF.length === 0 ? (
                  <div className="h-36 flex items-center justify-center text-gray-400 text-sm">Sem dados</div>
                ) : (
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={tipoPJPF} cx="50%" cy="50%" outerRadius={55} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {tipoPJPF.map((_, i) => <Cell key={i} fill={i === 0 ? "#3b82f6" : "#059669"} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Rankings */}
            <Card className="border border-gray-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">🏆 Top 5 Cursos com mais Certificados</CardTitle></CardHeader>
              <CardContent className="p-0">
                {topCursos.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">Sem dados</div>
                ) : (
                  <div className="divide-y">
                    {topCursos.map(([curso, qty], i) => (
                      <div key={curso} className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${i === 0 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>#{i + 1}</span>
                          <span className="text-sm text-gray-800 truncate max-w-[200px]">{curso}</span>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-800">{qty}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Empresas ranking */}
          {certsByCompanyRank.length > 0 && (
            <Card className="border border-gray-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">🏢 Top 5 Empresas com mais Certificados</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {certsByCompanyRank.map(([empresa, qty], i) => (
                    <div key={empresa} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${i === 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>#{i + 1}</span>
                        <span className="text-sm text-gray-800">{empresa}</span>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">{qty} alunos</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {wizardEnrollment && (
        <GerarCertificadoWizard
          enrollment={wizardEnrollment}
          onConfirm={() => setWizardEnrollment(null)}
          onCancel={() => setWizardEnrollment(null)}
        />
      )}
    </div>
  );
}