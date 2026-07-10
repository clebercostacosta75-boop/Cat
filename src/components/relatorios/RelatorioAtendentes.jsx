import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { fmtBRL, dataBase } from "./relatoriosUtils";

export default function RelatorioAtendentes({ filtered, lancByEnrollment }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const semanaAtras = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const mesAtual = hoje.slice(0, 7);

  const grupos = {};
  filtered.forEach((e) => {
    const nome = e.atendente_nome || "Sem atendente";
    if (!grupos[nome]) grupos[nome] = { nome, dia: 0, semana: 0, mes: 0, confirmadas: 0, pagas: 0, vendido: 0, recebido: 0, cursos: {}, pacotes: {}, origens: {} };
    const g = grupos[nome];
    const d = dataBase(e);
    if (d === hoje) g.dia += 1;
    if (d >= semanaAtras) g.semana += 1;
    if (d.startsWith(mesAtual)) g.mes += 1;
    if (e.status_matricula !== "Cancelado") g.confirmadas += 1;
    if (e.status_pagamento === "Pago") g.pagas += 1;
    const l = lancByEnrollment[e.id];
    g.vendido += l ? parseFloat(l.valor) || 0 : parseFloat(e.unit_value) || 0;
    g.recebido += l ? parseFloat(l.valor_pago) || 0 : e.status_pagamento === "Pago" ? parseFloat(e.unit_value) || 0 : 0;
    if (e.pacote_nome) g.pacotes[e.pacote_nome] = (g.pacotes[e.pacote_nome] || 0) + 1;
    else if (e.course_name) g.cursos[e.course_name] = (g.cursos[e.course_name] || 0) + 1;
    const orig = e.origem_inscricao || "Não informada";
    g.origens[orig] = (g.origens[orig] || 0) + 1;
  });

  const top = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  const rows = Object.values(grupos).sort((a, b) => b.vendido - a.vendido);

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Relatório de Atendentes
          <span className="text-[10px] font-normal text-gray-400">(base para análise do gestor — sem bônus automático)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Nenhuma inscrição no período/filtro selecionado</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500">
                {["Atendente", "Dia", "Semana", "Mês", "Confirmadas", "Pagas", "Vendido", "Recebido", "Pendente", "Curso + vendido", "Pacote + vendido", "Origens"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.nome} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-900">{r.nome}</td>
                  <td className="px-3 py-2">{r.dia}</td>
                  <td className="px-3 py-2">{r.semana}</td>
                  <td className="px-3 py-2">{r.mes}</td>
                  <td className="px-3 py-2">{r.confirmadas}</td>
                  <td className="px-3 py-2 text-emerald-700">{r.pagas}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtBRL(r.vendido)}</td>
                  <td className="px-3 py-2 text-emerald-700 whitespace-nowrap">{fmtBRL(r.recebido)}</td>
                  <td className="px-3 py-2 text-amber-700 whitespace-nowrap">{fmtBRL(Math.max(r.vendido - r.recebido, 0))}</td>
                  <td className="px-3 py-2 max-w-40 truncate">{top(r.cursos)}</td>
                  <td className="px-3 py-2 max-w-40 truncate">{top(r.pacotes)}</td>
                  <td className="px-3 py-2 max-w-48 truncate">
                    {Object.entries(r.origens).map(([o, n]) => `${o} (${n})`).join(", ")}
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