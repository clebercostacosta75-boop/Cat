import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

const STATUS_STYLE = {
  "Pago": "bg-green-100 text-green-800",
  "Aguardando Pagamento": "bg-blue-100 text-blue-800",
  "Aguardando Confirmação": "bg-amber-100 text-amber-800",
  "Vencido": "bg-red-100 text-red-800",
  "Cancelado": "bg-red-50 text-red-600",
};
const fmt = (v) => `R$ ${(parseFloat(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// Fila de boletos Asaas (alunos individuais) — status atualizado SOMENTE via webhook
export default function FilaBoletosAsaas() {
  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ["conciliacao-boletos-asaas"],
    queryFn: () => base44.entities.LancamentoFinanceiro.filter({ asaas_payment_id: { $exists: true } }, "-created_date", 200),
  });

  // Separação PF x PJ: financeiro individual não exibe receitas de origem Empresa
  const boletos = lancamentos.filter(l => l.origem_receita !== "Empresa" && l.asaas_payment_id);

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-gray-500 bg-blue-50 border border-blue-200 rounded-md p-2">
        ℹ️ A baixa dos boletos Asaas é automática via webhook — não há confirmação manual nesta fila.
      </p>
      {isLoading ? (
        <p className="text-sm text-gray-400 py-4">Carregando...</p>
      ) : boletos.length === 0 ? (
        <p className="text-sm text-gray-400 border rounded-lg p-6 text-center">Nenhum boleto Asaas de aluno individual.</p>
      ) : (
        <div className="border rounded-lg divide-y">
          {boletos.map((l) => (
            <div key={l.id} className="p-3 flex items-center justify-between gap-3 text-xs flex-wrap">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{l.cliente_nome || l.descricao}</p>
                <p className="text-gray-500 truncate">{l.curso_nome || ""} · Venc.: {l.data_vencimento ? new Date(l.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR") : "—"} · Asaas: {l.asaas_payment_id}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <strong>{fmt(l.valor)}</strong>
                <Badge className={STATUS_STYLE[l.situacao_cobranca] || "bg-gray-100 text-gray-700"}>{l.situacao_cobranca || l.status}</Badge>
                {l.link_pagamento && (
                  <a href={l.link_pagamento} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5">
                    <ExternalLink className="w-3 h-3" /> Fatura
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}