import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck, TrendingUp, AlertTriangle, CheckCircle, XCircle, Clock,
  Building2, Users, Briefcase, BookOpen, Search, RefreshCw, Loader2,
  ChevronDown, ChevronUp, Target, ArrowUpDown
} from "lucide-react";

const ScoreBadge = ({ score }) => {
  let color = "bg-red-100 text-red-700 border-red-300";
  if (score >= 80) color = "bg-green-100 text-green-700 border-green-300";
  else if (score >= 50) color = "bg-amber-100 text-amber-700 border-amber-300";
  return <Badge className={`text-xs font-bold border ${color}`}>{score}%</Badge>;
};

const ScoreBar = ({ value, label }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${value >= 80 ? "bg-green-500" : value >= 50 ? "bg-amber-500" : "bg-red-500"}`}
        style={{ width: `${Math.max(value, 2)}%` }}
      />
    </div>
    {label && <span className="text-xs font-medium text-gray-600 w-10 text-right">{value}%</span>}
  </div>
);

export default function Compliance360() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("geral");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("calcularCompliance360", {});
      setData(res.data);
    } catch (e) {
      setError(e.message || "Erro ao carregar");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="ml-3 text-gray-500">Calculando Compliance 360...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-red-300 mx-auto mb-3" />
        <p className="text-red-600 font-medium">{error}</p>
        <Button onClick={load} variant="outline" className="mt-4">Tentar novamente</Button>
      </div>
    );
  }

  const r = data?.resumo || {};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Compliance 360
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Conformidade regulatória integrada: Matriz × Certificados × Colaboradores</p>
        </div>
        <Button onClick={load} variant="outline" size="sm" className="gap-1.5" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Score Gauge */}
      <Card className="border-2 border-indigo-100 bg-gradient-to-br from-white to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <circle cx="60" cy="60" r="52" fill="none"
                  stroke={r.score_geral >= 80 ? "#22c55e" : r.score_geral >= 50 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${(r.score_geral / 100) * 327} 327`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{r.score_geral ?? 0}%</span>
                <span className="text-[10px] text-gray-500">COMPLIANCE</span>
              </div>
            </div>
            <div className="flex-1 min-w-[200px] space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{r.conformes ?? 0}</p>
                  <p className="text-[11px] text-gray-500 flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" />Conformes</p>
                </div>
                <div className="bg-white rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{r.vencendo ?? 0}</p>
                  <p className="text-[11px] text-gray-500 flex items-center justify-center gap-1"><Clock className="w-3 h-3" />Vencendo</p>
                </div>
                <div className="bg-white rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{r.vencidos ?? 0}</p>
                  <p className="text-[11px] text-gray-500 flex items-center justify-center gap-1"><XCircle className="w-3 h-3" />Vencidos</p>
                </div>
                <div className="bg-white rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-gray-600">{r.pendentes ?? 0}</p>
                  <p className="text-[11px] text-gray-500 flex items-center justify-center gap-1"><AlertTriangle className="w-3 h-3" />Pendentes</p>
                </div>
              </div>
              <div className="flex gap-6 text-xs text-gray-500 flex-wrap">
                <span><Users className="w-3 h-3 inline mr-1" />{r.total_alunos} alunos</span>
                <span><Building2 className="w-3 h-3 inline mr-1" />{r.empresas} empresas</span>
                <span><Briefcase className="w-3 h-3 inline mr-1" />{r.funcoes} funções</span>
                <span><BookOpen className="w-3 h-3 inline mr-1" />{r.nrs_cobertas} NRs cobertas</span>
                {r.alunos_sem_funcao > 0 && (
                  <span className="text-amber-600 font-medium">⚠ {r.alunos_sem_funcao} sem função</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100">
          <TabsTrigger value="empresas" className="data-[state=active]:bg-white"><Building2 className="w-4 h-4 mr-1.5" />Empresas</TabsTrigger>
          <TabsTrigger value="funcoes" className="data-[state=active]:bg-white"><Briefcase className="w-4 h-4 mr-1.5" />Funções</TabsTrigger>
          <TabsTrigger value="nrs" className="data-[state=active]:bg-white"><BookOpen className="w-4 h-4 mr-1.5" />NRs</TabsTrigger>
          <TabsTrigger value="alunos" className="data-[state=active]:bg-white"><Users className="w-4 h-4 mr-1.5" />Alunos</TabsTrigger>
        </TabsList>

        {/* Empresas */}
        <TabsContent value="empresas" className="mt-4 space-y-3">
          {(data?.byCompany || []).map(c => (
            <div key={c.nome} className="flex items-center gap-4 bg-white border rounded-lg px-4 py-3">
              <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">{c.nome}</p>
                <p className="text-xs text-gray-500">{c.alunos} aluno{c.alunos !== 1 ? "s" : ""} · {c.total} requisitos</p>
              </div>
              <div className="w-32"><ScoreBar value={c.score} label /></div>
              <ScoreBadge score={c.score} />
            </div>
          ))}
          {(!data?.byCompany || data.byCompany.length === 0) && (
            <p className="text-center text-gray-400 py-8">Nenhuma empresa com alunos vinculados à matriz</p>
          )}
        </TabsContent>

        {/* Funções */}
        <TabsContent value="funcoes" className="mt-4 space-y-3">
          {(data?.byFuncao || []).map(f => (
            <div key={f.nome} className="flex items-center gap-4 bg-white border rounded-lg px-4 py-3">
              <Briefcase className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900">{f.nome}</p>
                <p className="text-xs text-gray-500">{f.alunos} aluno{f.alunos !== 1 ? "s" : ""} · {f.total} requisitos</p>
              </div>
              <div className="w-32"><ScoreBar value={f.score} label /></div>
              <ScoreBadge score={f.score} />
            </div>
          ))}
          {(!data?.byFuncao || data.byFuncao.length === 0) && (
            <p className="text-center text-gray-400 py-8">Nenhuma função com alunos vinculados</p>
          )}
        </TabsContent>

        {/* NRs */}
        <TabsContent value="nrs" className="mt-4 space-y-3">
          {(data?.byNR || []).map(n => (
            <div key={n.nr} className="flex items-center gap-4 bg-white border rounded-lg px-4 py-3">
              <div className="w-12 h-9 rounded-lg bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center flex-shrink-0">{n.nr.replace("NR-", "")}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 font-mono">{n.nr}</p>
                <p className="text-xs text-gray-500">{n.total} verificações · {n.pendentes} pendentes · criticidade {n.criticidade}%</p>
              </div>
              <div className="w-32"><ScoreBar value={n.score} label /></div>
              <Badge className={`text-xs ${n.criticidade >= 50 ? "bg-red-100 text-red-700" : n.criticidade >= 20 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                {n.criticidade >= 50 ? "Crítica" : n.criticidade >= 20 ? "Atenção" : "OK"}
              </Badge>
            </div>
          ))}
          {(!data?.byNR || data.byNR.length === 0) && (
            <p className="text-center text-gray-400 py-8">Nenhum dado de conformidade por NR</p>
          )}
        </TabsContent>

        {/* Alunos Críticos */}
        <TabsContent value="alunos" className="mt-4 space-y-3">
          {(data?.alunosCriticos || []).map(a => (
            <div key={a.id} className="flex items-center gap-4 bg-white border rounded-lg px-4 py-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${a.score === null ? "bg-gray-400" : a.score >= 50 ? "bg-amber-500" : "bg-red-500"}`}>
                {a.score !== null ? a.score : "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">{a.nome}</p>
                <p className="text-xs text-gray-500">
                  {a.company_name || "Sem empresa"} · {a.funcao_nome || "Sem função"}
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                {a.sem_funcao ? (
                  <Badge className="bg-gray-100 text-gray-600">Sem função</Badge>
                ) : (
                  <>
                    {a.vencidos > 0 && <Badge className="bg-red-100 text-red-700">-{a.vencidos} venc.</Badge>}
                    {a.pendentes > 0 && <Badge className="bg-gray-100 text-gray-600">-{a.pendentes} pend.</Badge>}
                    {a.vencendo > 0 && <Badge className="bg-amber-100 text-amber-700">-{a.vencendo} vinc.</Badge>}
                    <Badge className="bg-green-100 text-green-700">{a.conformes} OK</Badge>
                  </>
                )}
              </div>
            </div>
          ))}
          {(!data?.alunosCriticos || data.alunosCriticos.length === 0) && (
            <p className="text-center text-gray-400 py-8">Nenhum aluno em situação crítica</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}