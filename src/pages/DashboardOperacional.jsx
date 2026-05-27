import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Plus, Upload, Download, MessageSquare, Bell, Loader2,
  BarChart3, Table2, AlertTriangle, Calendar, Trophy, RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

import OpResumoCards from "@/components/operacional/OpResumoCards";
import OpFiltros from "@/components/operacional/OpFiltros";
import OpTabelaTreinamentos from "@/components/operacional/OpTabelaTreinamentos";
import OpGraficos from "@/components/operacional/OpGraficos";
import OpAlertas from "@/components/operacional/OpAlertas";
import OpAgendaSemanal from "@/components/operacional/OpAgendaSemanal";
import OpRankings from "@/components/operacional/OpRankings";

const FILTROS_INICIAL = {
  dataInicio: "", dataFim: "", empresa: "_all", instrutor: "_all",
  status: "_all", modalidade: "_all", categoria: "_all", busca: "",
};

export default function DashboardOperacional() {
  const qc = useQueryClient();
  const hoje = new Date();

  const [filtros, setFiltros] = useState(FILTROS_INICIAL);
  const [filtrosAtivos, setFiltrosAtivos] = useState(FILTROS_INICIAL);
  const [activeSection, setActiveSection] = useState("tabela");

  const { data: allSchedules = [], isLoading: loadSch } = useQuery({
    queryKey: ["op-schedules-v2"],
    queryFn: () => base44.entities.ClassSchedule.list("-created_date", 1000),
    refetchInterval: 90000,
  });

  const { data: companies = [], isLoading: loadCo } = useQuery({
    queryKey: ["op-companies"],
    queryFn: () => base44.entities.Company.list(),
    staleTime: 300000,
  });

  const { data: instructors = [], isLoading: loadIn } = useQuery({
    queryKey: ["op-instructors"],
    queryFn: () => base44.entities.Instructor.list(),
    staleTime: 300000,
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ["op-certs"],
    queryFn: () => base44.entities.Certificate.filter({ status: "pending_signature" }),
    staleTime: 300000,
  });

  const loading = loadSch || loadCo || loadIn;

  // Aplicar filtros
  const schedules = useMemo(() => {
    return allSchedules.filter(s => {
      if (filtrosAtivos.empresa !== "_all" && s.company_id !== filtrosAtivos.empresa) return false;
      if (filtrosAtivos.instrutor !== "_all" && s.instructor_id !== filtrosAtivos.instrutor) return false;
      if (filtrosAtivos.status !== "_all" && s.status !== filtrosAtivos.status) return false;
      if (filtrosAtivos.modalidade !== "_all" && s.modality !== filtrosAtivos.modalidade) return false;
      if (filtrosAtivos.categoria !== "_all" && s.category !== filtrosAtivos.categoria) return false;
      if (filtrosAtivos.dataInicio || filtrosAtivos.dataFim) {
        const dates = s.realization_dates || [];
        const hasDate = dates.some(d => {
          if (filtrosAtivos.dataInicio && d < filtrosAtivos.dataInicio) return false;
          if (filtrosAtivos.dataFim && d > filtrosAtivos.dataFim) return false;
          return true;
        });
        if (!hasDate && dates.length > 0) return false;
      }
      if (filtrosAtivos.busca) {
        const q = filtrosAtivos.busca.toLowerCase();
        const hay = [s.training_name, s.company_name, s.instructor_name, s.location, s.status]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allSchedules, filtrosAtivos]);

  const handleFiltrar = () => setFiltrosAtivos({ ...filtros });
  const handleLimpar = () => { setFiltros(FILTROS_INICIAL); setFiltrosAtivos(FILTROS_INICIAL); };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClassSchedule.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["op-schedules-v2"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClassSchedule.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["op-schedules-v2"] }); toast.success("Turma excluída."); },
  });

  const handleConcluir = (s) => {
    if (window.confirm(`Marcar "${s.training_name}" como Concluído?`)) {
      updateMutation.mutate({ id: s.id, data: { status: "Concluído" } });
      toast.success("Turma marcada como Concluída.");
    }
  };
  const handleDelete = (s) => {
    if (window.confirm(`Excluir a turma "${s.training_name}"? Esta ação não pode ser desfeita.`)) {
      deleteMutation.mutate(s.id);
    }
  };

  const handleExportExcel = () => {
    const headers = ["Treinamento","Modalidade","Categoria","Empresa","Alunos","Local","Status","CH","Mês","Instrutor"];
    const rows = schedules.map(s => [
      s.training_name, s.modality, s.category, s.company_name,
      s.students_count, s.location, s.status, s.duration_hours, s.month, s.instructor_name
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `treinamentos_${format(hoje, "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportado com sucesso!");
  };

  const handleExportPDF = () => {
    const w = window.open("", "_blank");
    const rows = schedules.map(s => `
      <tr>
        <td>${s.training_name || ""}</td><td>${s.company_name || ""}</td>
        <td>${s.status || ""}</td><td>${s.students_count || 0}</td>
        <td>${s.instructor_name || ""}</td><td>${s.location || ""}</td>
        <td>${s.duration_hours || ""}h</td>
      </tr>`).join("");
    w.document.write(`
      <html><head><title>Relatório de Treinamentos</title>
      <style>body{font-family:Arial;font-size:11px;padding:20px}
      table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:5px}
      th{background:#1e3a5f;color:white}h2{color:#1e3a5f}</style></head>
      <body><h2>CAT Cursos — Relatório de Treinamentos</h2>
      <p>Gerado em: ${format(hoje, "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
      <table><thead><tr><th>Treinamento</th><th>Empresa</th><th>Status</th>
      <th>Alunos</th><th>Instrutor</th><th>Local</th><th>CH</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`);
    w.document.close(); w.print();
  };

  const sections = [
    { key: "tabela", label: "Tabela", icon: Table2 },
    { key: "graficos", label: "Gráficos", icon: BarChart3 },
    { key: "alertas", label: "Alertas", icon: AlertTriangle },
    { key: "agenda", label: "Agenda", icon: Calendar },
    { key: "rankings", label: "Rankings", icon: Trophy },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" /> Dashboard Operacional
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(hoje, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            {" · "}{schedules.length} registro(s) exibido(s)
          </p>
        </div>
        {/* Acesso Rápido */}
        <div className="flex flex-wrap gap-2">
          <Link to="/AgendaTreinamentos">
            <Button size="sm" className="bg-blue-700 hover:bg-blue-800 gap-1">
              <Plus className="w-3.5 h-3.5" /> Nova Turma
            </Button>
          </Link>
          <Link to={createPageUrl("Import")}>
            <Button size="sm" variant="outline" className="gap-1">
              <Upload className="w-3.5 h-3.5" /> Importar Excel
            </Button>
          </Link>
          <Button size="sm" variant="outline" className="gap-1" onClick={handleExportExcel}>
            <Download className="w-3.5 h-3.5" /> Exportar
          </Button>
          <Button
            size="sm" variant="ghost" className="gap-1"
            onClick={() => qc.invalidateQueries({ queryKey: ["op-schedules-v2"] })}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* CARDS DE RESUMO */}
      <OpResumoCards
        schedules={allSchedules}
        companies={companies}
        instructors={instructors}
        loading={loading}
      />

      {/* FILTROS */}
      <OpFiltros
        filtros={filtros}
        setFiltros={setFiltros}
        companies={companies}
        instructors={instructors}
        onFiltrar={handleFiltrar}
        onLimpar={handleLimpar}
      />

      {/* SEÇÃO TABS */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-1">
        {sections.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeSection === key
                ? "bg-blue-700 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* TABELA */}
      {activeSection === "tabela" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 font-medium">{schedules.length} treinamento(s)</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={handleExportExcel}>
                <Download className="w-3 h-3" /> Excel
              </Button>
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={handleExportPDF}>
                <Download className="w-3 h-3" /> PDF
              </Button>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <OpTabelaTreinamentos
              schedules={schedules}
              onConcluir={handleConcluir}
              onDelete={handleDelete}
              onEdit={(s) => window.location.href = `/AgendaTreinamentos?id=${s.id}`}
            />
          )}
        </div>
      )}

      {/* GRÁFICOS */}
      {activeSection === "graficos" && (
        <OpGraficos schedules={schedules} />
      )}

      {/* ALERTAS */}
      {activeSection === "alertas" && (
        <OpAlertas schedules={allSchedules} certificates={certificates} />
      )}

      {/* AGENDA SEMANAL */}
      {activeSection === "agenda" && (
        <OpAgendaSemanal schedules={allSchedules} />
      )}

      {/* RANKINGS */}
      {activeSection === "rankings" && (
        <OpRankings schedules={schedules} />
      )}
    </div>
  );
}