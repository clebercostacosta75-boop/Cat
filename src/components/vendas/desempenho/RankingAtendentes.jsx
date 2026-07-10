import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { fmtBRL, isCancelada, isPaga, valorDe } from "./desempenhoUtils";

const MEDALHAS = ["🥇", "🥈", "🥉"];

export default function RankingAtendentes({ filtradas, preCadastros }) {
  const porAtendente = {};
  filtradas.forEach(e => {
    const a = e.atendente_nome;
    if (!a) return;
    if (!porAtendente[a]) porAtendente[a] = { inscricoes: 0, pagas: 0, valorVendido: 0, valorRecebido: 0, cursos: 0, pacotes: 0, canceladas: 0 };
    const d = porAtendente[a];
    if (isCancelada(e)) { d.canceladas++; return; }
    d.inscricoes++;
    d.valorVendido += valorDe(e);
    if (isPaga(e)) { d.pagas++; d.valorRecebido += valorDe(e); }
    if (e.pacote_id) d.pacotes++; else d.cursos++;
  });

  // Conversão de pré-cadastro → matrícula por atendente
  const conv = {};
  (preCadastros || []).forEach(pc => {
    const a = pc.atendente_nome;
    if (!a) return;
    if (!conv[a]) conv[a] = { total: 0, convertidos: 0 };
    conv[a].total++;
    if (pc.status === "Convertido em matrícula") conv[a].convertidos++;
  });

  const ranking = Object.entries(porAtendente).sort((a, b) =>
    b[1].inscricoes - a[1].inscricoes || b[1].valorVendido - a[1].valorVendido);

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> Ranking de Atendentes</CardTitle></CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {ranking.length === 0 ? (
          <p className="text-center py-10 text-gray-400 text-sm">Nenhuma inscrição com atendente no período/filtros.</p>
        ) : (
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-gray-50 border-y text-xs">
              <tr>
                {["Pos.", "Atendente", "Inscrições", "Pagas", "Valor vendido", "Valor recebido", "Conversão pré-cad.", "Cursos", "Pacotes", "Canceladas"].map((h, i) => (
                  <th key={h} className={`px-3 py-2 font-medium text-gray-500 ${i < 2 ? "text-left" : "text-right"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranking.map(([nome, d], i) => {
                const c = conv[nome];
                const pctConv = c && c.total > 0 ? Math.round((c.convertidos / c.total) * 100) : null;
                return (
                  <tr key={nome} className={`border-b last:border-b-0 hover:bg-gray-50 ${i === 0 ? "bg-amber-50/50" : ""}`}>
                    <td className="px-3 py-2.5 font-bold">{MEDALHAS[i] || `${i + 1}º`}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-800">{nome}</td>
                    <td className="px-3 py-2.5 text-right font-semibold">{d.inscricoes}</td>
                    <td className="px-3 py-2.5 text-right text-green-700">{d.pagas}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">{fmtBRL(d.valorVendido)}</td>
                    <td className="px-3 py-2.5 text-right text-green-800">{fmtBRL(d.valorRecebido)}</td>
                    <td className="px-3 py-2.5 text-right">{pctConv === null ? "—" : `${c.convertidos}/${c.total} (${pctConv}%)`}</td>
                    <td className="px-3 py-2.5 text-right">{d.cursos}</td>
                    <td className="px-3 py-2.5 text-right">{d.pacotes}</td>
                    <td className="px-3 py-2.5 text-right text-red-600">{d.canceladas}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}