import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, Loader2 } from "lucide-react";
import PagamentoCobrancaAcoes from "./PagamentoCobrancaAcoes";
import PagamentoConfirmacaoManual from "./PagamentoConfirmacaoManual";

const STATUS_STYLE = {
  "Pago": "bg-green-100 text-green-800", "Recebido": "bg-green-100 text-green-800",
  "Aguardando Pagamento": "bg-blue-100 text-blue-800", "Aguardando Confirmação": "bg-amber-100 text-amber-800",
  "Pendente": "bg-gray-100 text-gray-700", "Vencido": "bg-red-100 text-red-800",
  "Cancelado": "bg-red-50 text-red-600", "Cortesia": "bg-purple-100 text-purple-800",
  "Reembolsado": "bg-orange-100 text-orange-800",
};
const fmt = (v) => `R$ ${(parseFloat(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// FASE 5 — Bloco financeiro da matrícula individual (pagamento, cobrança, comprovante, recibo)
export default function PagamentoMatriculaModal({ enrollment, onClose }) {
  const queryClient = useQueryClient();
  const [showHistorico, setShowHistorico] = useState(false);

  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ["lancamentos-matricula", enrollment.id],
    queryFn: () => base44.entities.LancamentoFinanceiro.filter({ origem_id: enrollment.id }),
  });
  const lanc = lancamentos[0];

  const { data: historico = [] } = useQuery({
    queryKey: ["historico-financeiro", lanc?.id],
    queryFn: () => base44.entities.AuditLog.filter({ entity_type: "LancamentoFinanceiro", entity_id: lanc.id }, "-created_date", 30),
    enabled: !!lanc && showHistorico,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["lancamentos-matricula", enrollment.id] });
    queryClient.invalidateQueries({ queryKey: ["historico-financeiro"] });
    queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] });
  };

  const situacao = lanc?.situacao_cobranca || lanc?.status || "Pendente";
  const pago = lanc && (lanc.status === "Recebido" || lanc.status === "Pago" || lanc.situacao_cobranca === "Pago");
  const isCortesia = enrollment.status_pagamento === "Cortesia" || enrollment.forma_pagamento === "Cortesia";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">💳 Pagamento da Matrícula</DialogTitle>
        </DialogHeader>

        <div className="text-xs text-gray-600 -mt-2">
          <p className="font-semibold text-gray-900">{enrollment.student_name}</p>
          <p>{enrollment.pacote_nome ? `Pacote: ${enrollment.pacote_nome} — ` : ""}{enrollment.course_name}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : !lanc ? (
          <div className="text-sm text-gray-500 py-4 text-center">
            {isCortesia ? "Matrícula em cortesia — sem cobrança financeira." : "Nenhum lançamento financeiro vinculado a esta matrícula."}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Resumo financeiro */}
            <div className="border rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div><span className="text-gray-500">Valor original:</span> <strong>{fmt(enrollment.valor_original || lanc.valor)}</strong></div>
              <div><span className="text-gray-500">Desconto:</span> <strong>{fmt(lanc.valor_desconto)}</strong></div>
              <div><span className="text-gray-500">Valor final:</span> <strong className="text-green-800">{fmt(lanc.valor)}</strong></div>
              <div><span className="text-gray-500">Forma:</span> <strong>{lanc.forma_pagamento}</strong></div>
              <div><span className="text-gray-500">Parcelas:</span> <strong>{lanc.total_parcelas || 1}x{(lanc.total_parcelas || 1) > 1 ? ` de ${fmt(lanc.valor / (lanc.total_parcelas || 1))}` : ""}</strong></div>
              <div><span className="text-gray-500">Vencimento:</span> <strong>{lanc.data_vencimento ? new Date(lanc.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</strong></div>
              <div><span className="text-gray-500">Valor pago:</span> <strong>{fmt(lanc.valor_pago)}</strong></div>
              <div><span className="text-gray-500">Saldo:</span> <strong>{fmt(Math.max(0, (lanc.valor || 0) - (lanc.valor_pago || 0)))}</strong></div>
              <div className="col-span-2 flex items-center gap-2 pt-1">
                <span className="text-gray-500">Status:</span>
                <Badge className={STATUS_STYLE[situacao] || "bg-gray-100 text-gray-700"}>{situacao}</Badge>
                {lanc.contrato_id && <Badge variant="outline" className="text-[10px]">Vinculado ao contrato</Badge>}
                {lanc.confirmado_por && <span className="text-[10px] text-gray-400">Confirmado por {lanc.confirmado_por}</span>}
              </div>
            </div>

            {pago ? (
              <div className="border rounded-lg p-3 bg-green-50 border-green-200 text-xs text-green-800">
                ✅ Pagamento confirmado{lanc.data_pagamento ? ` em ${new Date(lanc.data_pagamento + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}. Recibo de quitação liberado na aba <strong>Financeiro → Recibos</strong> da matrícula.
                {lanc.anexo_url && <a href={lanc.anexo_url} target="_blank" rel="noreferrer" className="block underline mt-1">📎 Ver comprovante</a>}
              </div>
            ) : (
              <>
                <PagamentoCobrancaAcoes lancamento={lanc} onRefresh={refresh} />
                {!isCortesia && <PagamentoConfirmacaoManual lancamento={lanc} onRefresh={refresh} />}
                <p className="text-[11px] text-gray-500 italic">Recibo de quitação disponível somente após confirmação do pagamento.</p>
              </>
            )}

            {/* Histórico financeiro */}
            <Button size="sm" variant="ghost" className="text-xs h-7 text-gray-600" onClick={() => setShowHistorico(!showHistorico)}>
              <History className="w-3 h-3 mr-1" /> {showHistorico ? "Ocultar" : "Ver"} histórico financeiro
            </Button>
            {showHistorico && (
              <div className="border rounded-lg p-2 max-h-48 overflow-y-auto space-y-1.5">
                {historico.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">Sem registros de auditoria.</p>
                ) : historico.map((h) => (
                  <div key={h.id} className="text-[10px] border-b pb-1.5 last:border-0">
                    <span className="text-gray-400">{new Date(h.created_date).toLocaleString("pt-BR")} — {h.user_email}</span>
                    <p className="text-gray-700">{h.details}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}