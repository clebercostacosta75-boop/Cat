import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TrendingUp, User, Package, BookOpen } from "lucide-react";
import { isMatriculaIndividual } from "@/lib/origemMatricula";

const fmtBRL = (v) => `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

function inicioSemana() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

export default function IndicadoresAtendenteTab() {
  const [fAtendente, setFAtendente] = useState("all");
  const [fPeriodo, setFPeriodo] = useState("mes");
  const [fCurso, setFCurso] = useState("all");
  const [fPacote, setFPacote] = useState("all");
  const [fForma, setFForma] = useState("all");
  const [fStatusPgto, setFStatusPgto] = useState("all");

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["enrollments-pf"],
    queryFn: async () => {
      const all = await base44.entities.StudentCourseEnrollment.list("-created_date", 500);
      return (all || []).filter(isMatriculaIndividual);
    },
  });

  // Somente inscrições com atendente registrado (fluxo de vendas)
  const vendas = useMemo(() => enrollments.filter(e => e.atendente_nome), [enrollments]);

  const hoje = new Date().toISOString().slice(0, 10);
  const semana = inicioSemana();
  const mes = hoje.slice(0, 7);
  const dataDe = (e) => (e.data_inscricao || e.created_date || "").slice(0, 10);

  const atendentes = [...new Set(vendas.map(e => e.atendente_nome))].sort();
  const cursos = [...new Set(vendas.map(e => e.course_name).filter(Boolean))].sort();
  const pacotes = [...new Set(vendas.map(e => e.pacote_nome).filter(Boolean))].sort();
  const formas = [...new Set(vendas.map(e => e.forma_pagamento).filter(Boolean))].sort();

  const filtradas = vendas.filter(e => {
    const d = dataDe(e);
    const byPeriodo = fPeriodo === "todos" || (fPeriodo === "hoje" && d === hoje) || (fPeriodo === "semana" && d >= semana) || (fPeriodo === "mes" && d.slice(0, 7) === mes);
    return byPeriodo &&
      (fAtendente === "all" || e.atendente_nome === fAtendente) &&
      (fCurso === "all" || e.course_name === fCurso) &&
      (fPacote === "all" || e.pacote_nome === fPacote) &&
      (fForma === "all" || e.forma_pagamento === fForma) &&
      (fStatusPgto === "all" || e.status_pagamento === fStatusPgto);
  });

  // KPIs gerais (respeitam filtros exceto período, calculados por janela)
  const base = vendas.filter(e =>
    (fAtendente === "all" || e.atendente_nome === fAtendente) &&
    (fCurso === "all" || e.course_name === fCurso) &&
    (fPacote === "all" || e.pacote_nome === fPacote) &&
    (fForma === "all" || e.forma_pagamento === fForma) &&
    (fStatusPgto === "all" || e.status_pagamento === fStatusPgto)
  );
  const kpis = {
    hoje: base.filter(e => dataDe(e) === hoje).length,
    semana: base.filter(e => dataDe(e) >= semana).length,
    mes: base.filter(e => dataDe(e).slice(0, 7) === mes).length,
    valorMes: base.filter(e => dataDe(e).slice(0, 7) === mes).reduce((s, e) => s + (parseFloat(e.unit_value) || 0), 0),
    pagas: filtradas.filter(e => e.status_pagamento === "Pago").length,
    pendentes: filtradas.filter(e => ["Pendente", "Aguardando Confirmação"].includes(e.status_pagamento)).length,
  };

  // Agrupamentos
  const porAtendente = {};
  filtradas.forEach(e => {
    const a = e.atendente_nome;
    if (!porAtendente[a]) porAtendente[a] = { total: 0, valor: 0, pagas: 0, pendentes: 0 };
    porAtendente[a].total++;
    porAtendente[a].valor += parseFloat(e.unit_value) || 0;
    if (e.status_pagamento === "Pago") porAtendente[a].pagas++;
    if (["Pendente", "Aguardando Confirmação"].includes(e.status_pagamento)) porAtendente[a].pendentes++;
  });
  const agrupar = (campo) => {
    const g = {};
    filtradas.forEach(e => { const k = e[campo]; if (k) g[k] = (g[k] || 0) + 1; });
    return Object.entries(g).sort((a, b) => b[1] - a[1]);
  };

  const hasFilters = fAtendente !== "all" || fCurso !== "all" || fPacote !== "all" || fForma !== "all" || fStatusPgto !== "all" || fPeriodo !== "mes";

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Select value={fAtendente} onValueChange={setFAtendente}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Atendente" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos atendentes</SelectItem>{atendentes.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fPeriodo} onValueChange={setFPeriodo}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="semana">Semana</SelectItem>
            <SelectItem value="mes">Mês</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={fCurso} onValueChange={setFCurso}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Curso" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos cursos</SelectItem>{cursos.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fPacote} onValueChange={setFPacote}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Pacote" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos pacotes</SelectItem>{pacotes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fForma} onValueChange={setFForma}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Forma pgto" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas formas</SelectItem>{formas.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fStatusPgto} onValueChange={setFStatusPgto}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status pgto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status pgto</SelectItem>
            {["Pendente", "Pago", "Aguardando Confirmação", "Cancelado", "Cortesia"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => { setFAtendente("all"); setFPeriodo("mes"); setFCurso("all"); setFPacote("all"); setFForma("all"); setFStatusPgto("all"); }}>
            Limpar
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Inscrições hoje", value: kpis.hoje, color: "bg-blue-50 text-blue-700 border-blue-100" },
          { label: "Na semana", value: kpis.semana, color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
          { label: "No mês", value: kpis.mes, color: "bg-purple-50 text-purple-700 border-purple-100" },
          { label: "Valor vendido (mês)", value: fmtBRL(kpis.valorMes), color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
          { label: "Pagas", value: kpis.pagas, color: "bg-green-50 text-green-700 border-green-100" },
          { label: "Pendentes", value: kpis.pendentes, color: "bg-yellow-50 text-yellow-700 border-yellow-100" },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border p-3 ${k.color}`}>
            <div className="text-xl font-bold truncate">{k.value}</div>
            <div className="text-xs">{k.label}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : filtradas.length === 0 ? (
        <Card className="border border-gray-200">
          <CardContent className="py-12 text-center text-gray-400">
            <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Nenhuma inscrição registrada pela Matrícula Rápida no período/filtros selecionados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Por atendente */}
          <Card className="border border-gray-200 lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4" /> Desempenho por Atendente</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-y text-xs">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Atendente</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500">Inscrições</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500">Valor</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500">Pagas</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500">Pendentes</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(porAtendente).sort((a, b) => b[1].total - a[1].total).map(([nome, d]) => (
                    <tr key={nome} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{nome}</td>
                      <td className="px-4 py-2.5 text-right">{d.total}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">{fmtBRL(d.valor)}</td>
                      <td className="px-4 py-2.5 text-right text-green-700">{d.pagas}</td>
                      <td className="px-4 py-2.5 text-right text-yellow-700">{d.pendentes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Por curso */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4" /> Inscrições por Curso</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {agrupar("course_name").map(([nome, qtd]) => (
                <div key={nome} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-1.5">
                  <span className="text-gray-700 truncate">{nome}</span>
                  <span className="font-semibold text-gray-900">{qtd}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Por pacote */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4" /> Inscrições por Pacote</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {agrupar("pacote_nome").length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">Nenhuma inscrição em pacote no período.</p>
              ) : (
                agrupar("pacote_nome").map(([nome, qtd]) => (
                  <div key={nome} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-1.5">
                    <span className="text-gray-700 truncate">{nome}</span>
                    <span className="font-semibold text-gray-900">{qtd}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
      <p className="text-xs text-gray-400">Base de indicadores por atendente — sem cálculo de bônus automático nesta fase.</p>
    </div>
  );
}