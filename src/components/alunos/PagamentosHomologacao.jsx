import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, QrCode, CreditCard, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import PixQRPagamento from "./PixQRPagamento";
import CartaoRegistroPagamento from "./CartaoRegistroPagamento";

// Novos meios de pagamento (aditivo, em homologação) — exclusivo da matrícula individual (PF).
// Não altera os fluxos legados; apenas acrescenta opções abaixo deles.
export default function PagamentosHomologacao({ enrollment, lancamento, onRefresh }) {
  const [aberto, setAberto] = useState(null);
  const [gerandoBoleto, setGerandoBoleto] = useState(false);
  const [boleto, setBoleto] = useState(null);

  const gerarBoleto = async () => {
    setGerandoBoleto(true);
    try {
      const res = await base44.functions.invoke("asaasBoletoIndividual", { enrollment_id: enrollment.id });
      setBoleto(res.data);
      toast.success(res.data.duplicado ? "Cobrança já existente no Asaas (anti-duplicidade)." : "Boleto Asaas gerado e vinculado à matrícula.");
      onRefresh?.();
    } catch (e) {
      toast.error("Boleto Asaas: " + (e?.response?.data?.error || e.message));
    }
    setGerandoBoleto(false);
  };

  const toggle = (secao) => setAberto(aberto === secao ? null : secao);

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-gray-50/60">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold text-gray-700">Novos meios de pagamento</p>
        <Badge className="bg-amber-100 text-amber-800 text-[10px]">Homologação</Badge>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant={aberto === "boleto" ? "default" : "outline"} className="h-7 text-xs" onClick={() => toggle("boleto")}>
          <FileText className="w-3 h-3 mr-1" /> Boleto Asaas
        </Button>
        <Button size="sm" variant={aberto === "pix" ? "default" : "outline"} className="h-7 text-xs" onClick={() => toggle("pix")}>
          <QrCode className="w-3 h-3 mr-1" /> Pix (fora do Asaas)
        </Button>
        <Button size="sm" variant={aberto === "cartao" ? "default" : "outline"} className="h-7 text-xs" onClick={() => toggle("cartao")}>
          <CreditCard className="w-3 h-3 mr-1" /> Cartão (maquininha)
        </Button>
      </div>

      {aberto === "boleto" && (
        <div className="border rounded-lg p-3 space-y-2 text-xs bg-white">
          <p className="text-gray-600">
            Gera boleto no Asaas vinculado a esta matrícula — cliente localizado por CPF/referência (sem duplicidade)
            e organizado pelo grupo da oferta/turma. A baixa do pagamento ocorre <strong>somente via webhook</strong>.
          </p>
          {lancamento?.asaas_payment_id || boleto ? (
            <div className="space-y-1">
              <p className="text-emerald-700">✅ Cobrança vinculada: {boleto?.asaas_payment_id || lancamento?.asaas_payment_id}</p>
              {(boleto?.link_pagamento || lancamento?.link_pagamento) && (
                <a href={boleto?.link_pagamento || lancamento?.link_pagamento} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> Abrir fatura/boleto
                </a>
              )}
              {(boleto?.boleto_linha_digitavel || lancamento?.boleto_linha_digitavel) && (
                <p className="break-all"><span className="text-gray-500">Linha digitável:</span> {boleto?.boleto_linha_digitavel || lancamento?.boleto_linha_digitavel}</p>
              )}
            </div>
          ) : (
            <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={gerarBoleto} disabled={gerandoBoleto}>
              {gerandoBoleto ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <FileText className="w-3 h-3 mr-1" />}
              Gerar boleto Asaas
            </Button>
          )}
        </div>
      )}

      {aberto === "pix" && <PixQRPagamento enrollment={enrollment} lancamento={lancamento} onRefresh={onRefresh} />}
      {aberto === "cartao" && <CartaoRegistroPagamento enrollment={enrollment} lancamento={lancamento} onRefresh={onRefresh} />}
    </div>
  );
}