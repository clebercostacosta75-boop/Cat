import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Download, FileBarChart } from "lucide-react";
import { toast } from "sonner";
import { isMatriculaIndividual } from "@/lib/origemMatricula";
import { filtrarMatriculas, calcularIndicadores, exportarCSV, dataBase, fmtData } from "./relatoriosUtils";
import RelatoriosFiltros from "./RelatoriosFiltros";
import RelatoriosIndicadores from "./RelatoriosIndicadores";
import RelatorioCursosPacotes from "./RelatorioCursosPacotes";
import RelatorioAtendentes from "./RelatorioAtendentes";
import RelatorioPendencias from "./RelatorioPendencias";
import RelatorioFinanceiroOperacional from "./RelatorioFinanceiroOperacional";

const FILTROS_INICIAIS = {
  de: "", ate: "", curso: "all", pacote: "all", atendente: "all",
  statusFinanceiro: "all", statusAcademico: "all", statusContrato: "all",
  origem: "all", formaPagamento: "all", statusOferta: "all", pendencia: "all",
};

export default function RelatoriosGerenciaisTab({ onNavigate }) {
  const [filters, setFilters] = useState(FILTROS_INICIAIS);

  // Consolidação SOMENTE LEITURA — nenhum registro é criado ou alterado
  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["rel-enrollments-pf"],
    queryFn: async () => {
      const all = await base44.entities.StudentCourseEnrollment.list("-created_date", 500);
      return (all || []).filter(isMatriculaIndividual);
    },
  });
  const { data: contracts = [] } = useQuery({
    queryKey: ["rel-contracts"],
    queryFn: () => base44.entities.Contract.list("-created_date", 500),
    initialData: [],
  });
  const { data: lancamentos = [] } = useQuery({
    queryKey: ["rel-lancamentos"],
    queryFn: () => base44.entities.LancamentoFinanceiro.filter({ origem_modulo: "Matrícula" }, "-created_date", 500),
    initialData: [],
  });
  const { data: offers = [] } = useQuery({
    queryKey: ["rel-offers"],
    queryFn: () => base44.entities.CourseOffer.list("-created_date", 200),
    initialData: [],
  });
  const { data: packages = [] } = useQuery({
    queryKey: ["rel-packages"],
    queryFn: () => base44.entities.CoursePackage.list("-created_date", 200),
    initialData: [],
  });
  const { data: preCadastros = [] } = useQuery({
    queryKey: ["rel-precadastros"],
    queryFn: () => base44.entities.PreCadastro.list("-created_date", 300),
    initialData: [],
  });
  const { data: receipts = [] } = useQuery({
    queryKey: ["rel-receipts"],
    queryFn: () => base44.entities.Receipt.list("-created_date", 300),
    initialData: [],
  });

  const contractByEnrollment = useMemo(() => {
    const m = {};
    contracts.forEach((c) => { if (c.enrollment_id) m[c.enrollment_id] = c; });
    return m;
  }, [contracts]);

  const lancByEnrollment = useMemo(() => {
    const m = {};
    lancamentos.forEach((l) => { if (l.origem_id && !m[l.origem_id]) m[l.origem_id] = l; });
    return m;
  }, [lancamentos]);

  const receiptsByEnrollment = useMemo(() => {
    const m = {};
    receipts.forEach((r) => { if (r.enrollment_id && r.status !== "Cancelado" && !m[r.enrollment_id]) m[r.enrollment_id] = r; });
    return m;
  }, [receipts]);

  const opcoes = useMemo(() => {
    const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort();
    return {
      cursos: uniq(enrollments.map((e) => e.course_name)),
      pacotes: uniq(enrollments.map((e) => e.pacote_nome)),
      atendentes: uniq(enrollments.map((e) => e.atendente_nome || "Sem atendente")),
      origens: uniq(enrollments.map((e) => e.origem_inscricao || "Não informada")),
      formasPagamento: uniq(enrollments.map((e) => e.forma_pagamento)),
    };
  }, [enrollments]);

  const filtered = useMemo(
    () => filtrarMatriculas(enrollments, contractByEnrollment, filters),
    [enrollments, contractByEnrollment, filters]
  );

  const indicadores = useMemo(
    () => calcularIndicadores({ filtered, contractByEnrollment, lancByEnrollment, offers, packages, preCadastros, filters }),
    [filtered, contractByEnrollment, lancByEnrollment, offers, packages, preCadastros, filters]
  );

  const handleExportar = async () => {
    exportarCSV(
      `relatorio-gerencial-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Aluno", "CPF (mascarado)", "Curso/Pacote", "Data Inscrição", "Atendente", "Origem", "Valor", "Forma Pgto", "Status Pgto", "Resultado Acadêmico", "Contrato"],
      filtered.map((e) => {
        const cpfD = (e.student_cpf || "").replace(/\D/g, "");
        const cpfMask = cpfD.length === 11 ? `${cpfD.slice(0, 3)}.***.***-${cpfD.slice(9)}` : "—";
        const c = contractByEnrollment[e.id];
        return [
          e.student_name, cpfMask,
          e.pacote_nome ? `${e.course_name} (Pacote: ${e.pacote_nome})` : e.course_name,
          fmtData(dataBase(e)), e.atendente_nome || "—", e.origem_inscricao || "—",
          e.unit_value || 0, e.forma_pagamento || "—", e.status_pagamento || "—",
          e.resultado_academico || "Pendente", c ? c.status?.replace(/_/g, " ") : "Sem contrato",
        ];
      })
    );
    // Auditoria da exportação (ação sensível)
    try {
      const user = await base44.auth.me();
      await base44.entities.AuditLog.create({
        user_email: user?.email || "desconhecido",
        user_name: user?.full_name || user?.email || "Usuário",
        action: "export",
        entity_type: "RelatorioGerencial",
        entity_name: "Relatórios Gerenciais — Gestão Acadêmica Individual",
        details: `Exportação CSV do relatório gerencial (${filtered.length} matrícula(s), CPFs mascarados) em ${new Date().toLocaleString("pt-BR")}`,
      });
    } catch { /* auditoria não bloqueia a exportação */ }
    toast.success("Relatório exportado em CSV.");
  };

  if (isLoading) return <div className="text-center py-12 text-gray-400">Carregando relatórios...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FileBarChart className="w-5 h-5 text-gray-700" />
          <div>
            <p className="text-sm font-bold text-gray-900">Relatórios Gerenciais — Gestão Acadêmica Individual</p>
            <p className="text-xs text-gray-500">Consolidação somente leitura das matrículas individuais. Nenhum dado é criado ou alterado.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportar} disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      <RelatoriosFiltros filters={filters} setFilters={setFilters} opcoes={opcoes} />
      <RelatoriosIndicadores ind={indicadores} />
      <RelatorioCursosPacotes filtered={filtered} lancByEnrollment={lancByEnrollment} offers={offers} packages={packages} filters={filters} onNavigate={onNavigate} />
      <RelatorioAtendentes filtered={filtered} lancByEnrollment={lancByEnrollment} />
      <RelatorioPendencias filtered={filtered} contractByEnrollment={contractByEnrollment} preCadastros={preCadastros} onNavigate={onNavigate} />
      <RelatorioFinanceiroOperacional filtered={filtered} lancByEnrollment={lancByEnrollment} contractByEnrollment={contractByEnrollment} receiptsByEnrollment={receiptsByEnrollment} />
    </div>
  );
}