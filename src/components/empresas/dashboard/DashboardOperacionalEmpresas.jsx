/**
 * Dashboard Operacional — Gestão Acadêmica Empresas.
 * Camada de consolidação: consome ClassSchedule, StudentCourseEnrollment, Course,
 * CertificateModel, Company, Certificate e SolicitacaoLiberacaoFinanceira existentes.
 * Origem: regra central (origemMatricula). Aptidão: motor central (aptidaoCertificacao + filaVisual).
 * Somente turmas/matrículas EMPRESARIAIS — alunos individuais (PF) não aparecem aqui.
 */
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isMatriculaEmpresarial } from "@/lib/origemMatricula";
import { classificarFila } from "@/lib/aptidaoCertificacao";
import { categorizarFilaVisual } from "@/lib/filaVisual";
import {
  FILTROS_DASH_INICIAIS, isTurmaEmpresarial, matchTurma, matchMatricula, uniq,
} from "./dashDataEmpresas";
import DashFiltros from "./DashFiltros";
import DashIndicadores from "./DashIndicadores";
import DashCronograma from "./DashCronograma";
import DashAgenda from "./DashAgenda";
import DashPendencias from "./DashPendencias";
import DashInstrutores from "./DashInstrutores";
import DashCursos from "./DashCursos";
import DashEmpresas from "./DashEmpresas";
import DashMatriculas from "./DashMatriculas";

export default function DashboardOperacionalEmpresas({ onOpenTab }) {
  const [filtros, setFiltros] = useState(FILTROS_DASH_INICIAIS);

  const { data: turmasAll = [], isLoading: loadingTurmas } = useQuery({
    queryKey: ["dash-emp-turmas"],
    queryFn: () => base44.entities.ClassSchedule.list("-created_date", 300),
  });
  const { data: matsAll = [] } = useQuery({
    queryKey: ["dash-emp-matriculas"],
    queryFn: () => base44.entities.StudentCourseEnrollment.list("-created_date", 500),
  });
  const { data: certModels = [] } = useQuery({
    queryKey: ["dash-emp-models"],
    queryFn: () => base44.entities.CertificateModel.list(),
  });
  const { data: companies = [] } = useQuery({
    queryKey: ["dash-emp-companies"],
    queryFn: () => base44.entities.Company.list("-created_date", 300),
  });
  const { data: certificates = [] } = useQuery({
    queryKey: ["dash-emp-certs"],
    queryFn: () => base44.entities.Certificate.list("-created_date", 300),
  });
  const { data: solicitacoes = [] } = useQuery({
    queryKey: ["dash-emp-solic"],
    queryFn: () => base44.entities.SolicitacaoLiberacaoFinanceira.list("-created_date", 300),
  });

  // Somente registros empresariais (regra central de origem)
  const turmasEmp = useMemo(() => turmasAll.filter(isTurmaEmpresarial), [turmasAll]);
  const matsEmp = useMemo(() => matsAll.filter(isMatriculaEmpresarial), [matsAll]);

  // Aptidão: exclusivamente pelo motor central + categorização visual da fila
  const filaVis = useMemo(() => {
    const ctx = { certModels, certificates, companies, solicitacoes };
    return categorizarFilaVisual(classificarFila(matsEmp, ctx));
  }, [matsEmp, certModels, certificates, companies, solicitacoes]);
  const aptosIds = useMemo(() => new Set(filaVis.aptos.map(m => m.id)), [filaVis]);
  const bloqIds = useMemo(() => new Set([...filaVis.bloqueados, ...filaVis.academicas].map(m => m.id)), [filaVis]);
  const finIds = useMemo(() => new Set(filaVis.financeiras.map(m => m.id)), [filaVis]);

  const matsByTurma = useMemo(() => {
    const map = {};
    matsEmp.forEach(m => { if (m.class_schedule_id) (map[m.class_schedule_id] ||= []).push(m); });
    return map;
  }, [matsEmp]);

  // Filtros afetam todos os blocos
  const turmasF = useMemo(
    () => turmasEmp.filter(t => matchTurma(t, filtros, matsByTurma[t.id] || [])),
    [turmasEmp, filtros, matsByTurma]
  );
  const matsF = useMemo(() => matsEmp.filter(m => matchMatricula(m, filtros)), [matsEmp, filtros]);

  const opcoes = useMemo(() => ({
    empresas: uniq(turmasEmp.map(t => t.company_name).concat(matsEmp.map(m => m.company_name))),
    cursos: uniq(turmasEmp.map(t => t.training_name).concat(matsEmp.map(m => m.course_name))),
    instrutores: uniq(turmasEmp.map(t => t.instructor_name)),
    modalidades: uniq(turmasEmp.map(t => t.category)),
    locais: uniq(turmasEmp.map(t => t.location)),
  }), [turmasEmp, matsEmp]);

  const cursosSemModelo = useMemo(() => {
    const nomes = uniq(turmasF.map(t => t.training_name));
    return nomes.filter(n => !certModels.some(m => (m.name || "").toLowerCase().includes(n.toLowerCase().slice(0, 12))));
  }, [turmasF, certModels]);

  const ind = useMemo(() => {
    const res = (m) => m.resultado_academico || "Pendente";
    return {
      turmasProgramadas: turmasF.filter(t => ["Agendado", "Confirmado", "Pendente", "Aguardando"].includes(t.status)).length,
      turmasAndamento: turmasF.filter(t => t.status === "Em Andamento").length,
      turmasConcluidas: turmasF.filter(t => t.status === "Concluído").length,
      turmasCanceladas: turmasF.filter(t => t.status === "Cancelado").length,
      alunosMatriculados: matsF.length,
      aprovados: matsF.filter(m => res(m) === "Aprovado").length,
      reprovados: matsF.filter(m => res(m) === "Reprovado").length,
      pendentes: matsF.filter(m => res(m) === "Pendente").length,
      aptos: matsF.filter(m => aptosIds.has(m.id)).length,
      bloqueados: matsF.filter(m => bloqIds.has(m.id)).length,
      instrutores: uniq(turmasF.map(t => t.instructor_name)).length,
      cursos: uniq(turmasF.map(t => t.training_name)).length,
      empresas: uniq(turmasF.map(t => t.company_name)).length,
    };
  }, [turmasF, matsF, aptosIds, bloqIds]);

  if (loadingTurmas) {
    return <div className="text-center py-16 text-gray-400 text-sm">Carregando dashboard operacional...</div>;
  }

  return (
    <div className="space-y-4">
      <DashFiltros filtros={filtros} setFiltros={setFiltros} opcoes={opcoes} />
      <DashIndicadores ind={ind} />
      <DashCronograma turmas={turmasF} />
      <DashAgenda turmas={turmasF} matsByTurma={matsByTurma} />
      <DashPendencias turmas={turmasF} matriculas={matsF} matsByTurma={matsByTurma}
        cursosSemModelo={cursosSemModelo} onOpenTab={onOpenTab} />
      <DashInstrutores turmas={turmasF} matsByTurma={matsByTurma} />
      <DashCursos turmas={turmasF} matriculas={matsF} certModels={certModels} />
      <DashEmpresas turmas={turmasF} matriculas={matsF} filtros={filtros} setFiltros={setFiltros} />
      <DashMatriculas matriculas={matsF} aptosIds={aptosIds} bloqIds={bloqIds} finIds={finIds} onOpenTab={onOpenTab} />
    </div>
  );
}