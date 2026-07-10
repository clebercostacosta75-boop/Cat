import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Package, Share2, Trophy } from "lucide-react";
import { fmtBRL, resumir, dataDe, inicioSemana, valorDe, isCancelada } from "./desempenhoUtils";

export default function DesempenhoKPIs({ filtradas, basePeriodos }) {
  const r = resumir(filtradas);
  const hoje = new Date().toISOString().slice(0, 10);
  const semana = inicioSemana();
  const mes = hoje.slice(0, 7);

  const validasBase = basePeriodos.filter(e => !isCancelada(e));
  const janela = {
    hoje: validasBase.filter(e => dataDe(e) === hoje).length,
    semana: validasBase.filter(e => dataDe(e) >= semana).length,
    mes: validasBase.filter(e => dataDe(e).slice(0, 7) === mes).length,
  };

  const agrupar = (campo) => {
    const g = {};
    filtradas.filter(e => !isCancelada(e)).forEach(e => {
      const k = e[campo];
      if (k) { g[k] = g[k] || { qtd: 0, valor: 0 }; g[k].qtd++; g[k].valor += valorDe(e); }
    });
    return Object.entries(g).sort((a, b) => b[1].qtd - a[1].qtd);
  };
  const porCurso = agrupar("course_name");
  const porPacote = agrupar("pacote_nome");
  const porOrigem = agrupar("origem_inscricao");
  const porAtendente = agrupar("atendente_nome");
  const melhor = porAtendente[0];

  const cards = [
    { label: "Inscrições hoje", value: janela.hoje, cls: "bg-blue-50 text-blue-700 border-blue-100" },
    { label: "Na semana", value: janela.semana, cls: "bg-indigo-50 text-indigo-700 border-indigo-100" },
    { label: "No mês", value: janela.mes, cls: "bg-purple-50 text-purple-700 border-purple-100" },
    { label: "Inscrições (período)", value: r.inscricoes, cls: "bg-slate-50 text-slate-700 border-slate-200" },
    { label: "Confirmadas", value: r.confirmadas, cls: "bg-teal-50 text-teal-700 border-teal-100" },
    { label: "Pagas", value: r.pagas, cls: "bg-green-50 text-green-700 border-green-100" },
    { label: "Pendentes", value: r.pendentes, cls: "bg-yellow-50 text-yellow-700 border-yellow-100" },
    { label: "Canceladas", value: r.canceladas, cls: "bg-red-50 text-red-700 border-red-100" },
    { label: "Valor vendido", value: fmtBRL(r.valorVendido), cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    { label: "Valor recebido", value: fmtBRL(r.valorRecebido), cls: "bg-green-50 text-green-800 border-green-200" },
    { label: "Valor pendente", value: fmtBRL(r.valorPendente), cls: "bg-orange-50 text-orange-700 border-orange-100" },
    { label: "Melhor atendente", value: melhor ? melhor[0] : "—", cls: "bg-amber-50 text-amber-800 border-amber-200", icon: Trophy },
  ];

  const Lista = ({ titulo, icone: Icon, dados, vazio }) => (
    <Card className="border border-gray-200">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Icon className="w-4 h-4" /> {titulo}</CardTitle></CardHeader>
      <CardContent className="space-y-1.5">
        {dados.length === 0 ? (
          <p className="text-xs text-gray-400 py-3 text-center">{vazio}</p>
        ) : dados.slice(0, 8).map(([nome, d], i) => (
          <div key={nome} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-1.5">
            <span className="text-gray-700 truncate">{i === 0 && "🥇 "}{nome}</span>
            <span className="font-semibold text-gray-900 flex-shrink-0 ml-2">{d.qtd} <span className="text-xs text-gray-400 font-normal">({fmtBRL(d.valor)})</span></span>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {cards.map(k => (
          <div key={k.label} className={`rounded-xl border p-3 ${k.cls}`}>
            <div className="text-lg font-bold truncate" title={String(k.value)}>{k.value}</div>
            <div className="text-xs">{k.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Lista titulo="Cursos mais vendidos" icone={BookOpen} dados={porCurso} vazio="Nenhum curso no período." />
        <Lista titulo="Pacotes mais vendidos" icone={Package} dados={porPacote} vazio="Nenhum pacote no período." />
        <Lista titulo="Origem das inscrições" icone={Share2} dados={porOrigem} vazio="Nenhuma origem registrada." />
      </div>
    </div>
  );
}