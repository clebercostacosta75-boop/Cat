import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { fmtBRL } from "./relatoriosUtils";

export default function RelatoriosIndicadores({ ind }) {
  const cards = [
    { label: "Inscrições no período", value: ind.totalInscricoes, cls: "text-gray-900" },
    { label: "Matrículas confirmadas", value: ind.matriculasConfirmadas, cls: "text-gray-900" },
    { label: "Alunos ativos", value: ind.alunosAtivos, cls: "text-gray-900" },
    { label: "Cursos vendidos", value: ind.cursosVendidos, cls: "text-emerald-700" },
    { label: "Pacotes vendidos", value: ind.pacotesVendidos, cls: "text-emerald-700" },
    { label: "Vagas ocupadas", value: ind.vagasOcupadas, cls: "text-blue-700" },
    { label: "Vagas disponíveis", value: ind.vagasDisponiveis, cls: "text-blue-700" },
    { label: "Receita prevista", value: fmtBRL(ind.receitaPrevista), cls: "text-gray-900" },
    { label: "Receita recebida", value: fmtBRL(ind.receitaRecebida), cls: "text-emerald-700" },
    { label: "Receita pendente", value: fmtBRL(ind.receitaPendente), cls: "text-amber-700" },
    { label: "Contratos aguard. assinatura", value: ind.contratosAguardando, cls: "text-amber-700" },
    { label: "Pagamentos pendentes", value: ind.pagamentosPendentes, cls: "text-amber-700" },
    { label: "Documentos pendentes", value: ind.documentosPendentes, cls: "text-amber-700" },
    { label: "Aptos p/ certificação", value: ind.aptosCertificacao, cls: "text-emerald-700" },
    { label: "Bloqueados p/ certificação", value: ind.bloqueadosCertificacao, cls: "text-red-700" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="border border-gray-200">
          <CardContent className="p-3">
            <p className="text-[11px] text-gray-500 leading-tight">{c.label}</p>
            <p className={`text-lg font-bold mt-1 ${c.cls}`}>{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}