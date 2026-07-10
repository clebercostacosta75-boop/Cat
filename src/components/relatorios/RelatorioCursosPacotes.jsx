import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { fmtBRL, fmtData } from "./relatoriosUtils";

const STATUS_CLS = {
  Aberta: "bg-green-100 text-green-800",
  "Em divulgação": "bg-blue-100 text-blue-800",
  Esgotada: "bg-amber-100 text-amber-800",
  Encerrada: "bg-gray-100 text-gray-600",
  Cancelada: "bg-red-100 text-red-700",
};

export default function RelatorioCursosPacotes({ filtered, lancByEnrollment, offers, packages, filters, onNavigate }) {
  // Agrupa matrículas filtradas por curso avulso / pacote (somente leitura)
  const grupos = {};
  filtered.forEach((e) => {
    const key = e.pacote_id ? `pacote|${e.pacote_nome}` : `curso|${e.course_name}`;
    if (!grupos[key]) grupos[key] = { nome: e.pacote_id ? e.pacote_nome : e.course_name, tipo: e.pacote_id ? "Pacote" : "Curso avulso", inscritos: 0, vendido: 0, recebido: 0, inicio: e.start_date, fim: e.end_date };
    const g = grupos[key];
    g.inscritos += 1;
    const l = lancByEnrollment[e.id];
    g.vendido += l ? parseFloat(l.valor) || 0 : parseFloat(e.unit_value) || 0;
    g.recebido += l ? parseFloat(l.valor_pago) || 0 : e.status_pagamento === "Pago" ? parseFloat(e.unit_value) || 0 : 0;
    if (e.start_date && (!g.inicio || e.start_date < g.inicio)) g.inicio = e.start_date;
    if (e.end_date && (!g.fim || e.end_date > g.fim)) g.fim = e.end_date;
  });

  const ofertaInfo = (nome, tipo) => {
    const lista = tipo === "Pacote" ? packages : offers;
    return lista.find((o) => (tipo === "Pacote" ? o.nome === nome : o.nome_comercial === nome || o.course_name === nome));
  };

  const rows = Object.values(grupos)
    .map((g) => {
      const of = ofertaInfo(g.nome, g.tipo);
      const vagasTotal = of?.vagas_total || 0;
      const vagasPreench = of?.vagas_preenchidas ?? g.inscritos;
      return {
        ...g,
        vagasTotal,
        vagasPreench,
        vagasDisp: Math.max(vagasTotal - vagasPreench, 0),
        ocupacao: vagasTotal ? Math.round((vagasPreench / vagasTotal) * 100) : null,
        statusOferta: of?.status || "—",
        pendente: Math.max(g.vendido - g.recebido, 0),
      };
    })
    .filter((r) => filters.statusOferta === "all" || r.statusOferta === filters.statusOferta)
    .sort((a, b) => b.inscritos - a.inscritos);

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> Relatório de Cursos e Pacotes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Nenhum curso/pacote no período ou filtro selecionado</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500">
                {["Curso / Pacote", "Tipo", "Inscritos", "Vagas", "Ocupação", "Vendido", "Recebido", "Pendente", "Início", "Término", "Status", "Ações"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.tipo}|${r.nome}`} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-900 max-w-56 truncate">{r.nome}</td>
                  <td className="px-3 py-2">
                    <Badge className={r.tipo === "Pacote" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}>{r.tipo}</Badge>
                  </td>
                  <td className="px-3 py-2 font-semibold">{r.inscritos}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.vagasTotal ? `${r.vagasPreench}/${r.vagasTotal} (${r.vagasDisp} disp.)` : "—"}</td>
                  <td className="px-3 py-2">{r.ocupacao === null ? "—" : `${r.ocupacao}%`}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtBRL(r.vendido)}</td>
                  <td className="px-3 py-2 text-emerald-700 whitespace-nowrap">{fmtBRL(r.recebido)}</td>
                  <td className="px-3 py-2 text-amber-700 whitespace-nowrap">{fmtBRL(r.pendente)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtData(r.inicio)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtData(r.fim)}</td>
                  <td className="px-3 py-2"><Badge className={STATUS_CLS[r.statusOferta] || "bg-gray-100 text-gray-600"}>{r.statusOferta}</Badge></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => onNavigate("vendas")}>Oferta</Button>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => onNavigate("matriculas")}>Matrículas</Button>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => onNavigate("financeiro")}>Financeiro</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}