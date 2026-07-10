import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutDashboard, Trophy, Target, ListOrdered } from "lucide-react";
import { isMatriculaIndividual } from "@/lib/origemMatricula";
import { dataDe, inicioSemana } from "./desempenho/desempenhoUtils";
import DesempenhoKPIs from "./desempenho/DesempenhoKPIs";
import RankingAtendentes from "./desempenho/RankingAtendentes";
import MetasAbonoTab from "./desempenho/MetasAbonoTab";
import ListaInscricoesDetalhada from "./desempenho/ListaInscricoesDetalhada";

const ORIGENS = ["Presencial", "WhatsApp", "Telefone", "Indicação", "QR Code", "QR Code do Atendente", "Instagram", "Facebook", "Site", "Outro"];
const STATUS_PGTO = ["Pendente", "Pago", "Parcialmente Pago", "Aguardando Confirmação", "Inadimplente", "Cancelado", "Cortesia"];
const STATUS_MATRICULA = ["Matriculado", "Em Andamento", "Concluído", "Cancelado"];

export default function IndicadoresAtendenteTab() {
  const [sub, setSub] = useState("visao"); // visao | ranking | metas | lista
  const [fAtendente, setFAtendente] = useState("all");
  const [fPeriodo, setFPeriodo] = useState("mes");
  const [fData, setFData] = useState("");
  const [fCurso, setFCurso] = useState("all");
  const [fPacote, setFPacote] = useState("all");
  const [fForma, setFForma] = useState("all");
  const [fStatusPgto, setFStatusPgto] = useState("all");
  const [fStatusMat, setFStatusMat] = useState("all");
  const [fOrigem, setFOrigem] = useState("all");

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["enrollments-pf"],
    queryFn: async () => {
      const all = await base44.entities.StudentCourseEnrollment.list("-created_date", 500);
      return (all || []).filter(isMatriculaIndividual);
    },
  });

  const { data: preCadastros = [] } = useQuery({
    queryKey: ["pre-cadastros"],
    queryFn: () => base44.entities.PreCadastro.list("-created_date", 300),
  });

  const { data: lancamentos = [] } = useQuery({
    queryKey: ["lanc-matriculas"],
    queryFn: () => base44.entities.LancamentoFinanceiro.filter({ origem_modulo: "Matrícula" }, "-created_date", 500),
  });

  const lancPorOrigem = useMemo(() => {
    const m = {};
    lancamentos.forEach(l => { if (l.origem_id) m[l.origem_id] = l; });
    return m;
  }, [lancamentos]);

  // Somente inscrições do fluxo de vendas (com atendente registrado)
  const vendas = useMemo(() => enrollments.filter(e => e.atendente_nome), [enrollments]);

  const hoje = new Date().toISOString().slice(0, 10);
  const semana = inicioSemana();
  const mes = hoje.slice(0, 7);

  const atendentes = [...new Set(vendas.map(e => e.atendente_nome))].sort();
  const cursos = [...new Set(vendas.map(e => e.course_name).filter(Boolean))].sort();
  const pacotes = [...new Set(vendas.map(e => e.pacote_nome).filter(Boolean))].sort();
  const formas = [...new Set(vendas.map(e => e.forma_pagamento).filter(Boolean))].sort();

  const byDimensoes = (e) =>
    (fAtendente === "all" || e.atendente_nome === fAtendente) &&
    (fCurso === "all" || e.course_name === fCurso) &&
    (fPacote === "all" || e.pacote_nome === fPacote) &&
    (fForma === "all" || e.forma_pagamento === fForma) &&
    (fStatusPgto === "all" || e.status_pagamento === fStatusPgto) &&
    (fStatusMat === "all" || (e.status_matricula || "Matriculado") === fStatusMat) &&
    (fOrigem === "all" || e.origem_inscricao === fOrigem);

  const byPeriodo = (e) => {
    const d = dataDe(e);
    if (fData) return d === fData;
    if (fPeriodo === "hoje") return d === hoje;
    if (fPeriodo === "semana") return d >= semana;
    if (fPeriodo === "mes") return d.slice(0, 7) === mes;
    return true;
  };

  const filtradas = vendas.filter(e => byDimensoes(e) && byPeriodo(e));
  const basePeriodos = vendas.filter(byDimensoes); // p/ contagens hoje/semana/mês

  const hasFilters = fAtendente !== "all" || fCurso !== "all" || fPacote !== "all" || fForma !== "all" || fStatusPgto !== "all" || fStatusMat !== "all" || fOrigem !== "all" || fPeriodo !== "mes" || fData;
  const limpar = () => { setFAtendente("all"); setFPeriodo("mes"); setFData(""); setFCurso("all"); setFPacote("all"); setFForma("all"); setFStatusPgto("all"); setFStatusMat("all"); setFOrigem("all"); };

  const SUBS = [
    { key: "visao", label: "Visão Geral", icon: LayoutDashboard },
    { key: "ranking", label: "Ranking", icon: Trophy },
    { key: "metas", label: "Metas & Abono", icon: Target },
    { key: "lista", label: "Inscrições", icon: ListOrdered },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {SUBS.map(s => (
          <button key={s.key} onClick={() => setSub(s.key)} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${sub === s.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>
            <s.icon className="w-4 h-4" /> {s.label}
          </button>
        ))}
      </div>

      {/* Filtros (não se aplicam à aba Metas) */}
      {sub !== "metas" && (
        <div className="flex flex-wrap gap-2">
          <Select value={fAtendente} onValueChange={setFAtendente}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Atendente" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos atendentes</SelectItem>{atendentes.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fPeriodo} onValueChange={v => { setFPeriodo(v); setFData(""); }}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="semana">Semana</SelectItem>
              <SelectItem value="mes">Mês</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" className="w-36 h-9 text-xs" value={fData} onChange={e => setFData(e.target.value)} title="Dia específico" />
          <Select value={fCurso} onValueChange={setFCurso}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Curso" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos cursos</SelectItem>{cursos.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fPacote} onValueChange={setFPacote}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Pacote" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos pacotes</SelectItem>{pacotes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fForma} onValueChange={setFForma}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Forma pgto" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas formas</SelectItem>{formas.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fStatusPgto} onValueChange={setFStatusPgto}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status pgto" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos status pgto</SelectItem>{STATUS_PGTO.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fStatusMat} onValueChange={setFStatusMat}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status matrícula" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas matrículas</SelectItem>{STATUS_MATRICULA.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fOrigem} onValueChange={setFOrigem}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas origens</SelectItem>{ORIGENS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
          {hasFilters && <Button variant="outline" size="sm" className="text-xs h-9" onClick={limpar}>Limpar</Button>}
          <span className="text-xs text-gray-500 self-center">{filtradas.length} inscrição(ões)</span>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : (
        <>
          {sub === "visao" && <DesempenhoKPIs filtradas={filtradas} basePeriodos={basePeriodos} />}
          {sub === "ranking" && <RankingAtendentes filtradas={filtradas} preCadastros={preCadastros} />}
          {sub === "metas" && <MetasAbonoTab vendas={vendas} atendentes={atendentes} />}
          {sub === "lista" && <ListaInscricoesDetalhada filtradas={filtradas} lancPorOrigem={lancPorOrigem} />}
        </>
      )}
      <p className="text-xs text-gray-400">FASE 3 — Painel de desempenho e base para abono/bônus futuro. Sem comissão automática, sem pagamento automático e sem alteração no Financeiro geral.</p>
    </div>
  );
}