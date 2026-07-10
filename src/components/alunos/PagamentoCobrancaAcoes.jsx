import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Copy, ExternalLink, QrCode, XCircle, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { prepararMensagem, montarVariaveis, preencherTemplate, templateEvento } from "@/lib/comunicacao";

// FASE 5 — Ações da cobrança Asaas (Pix / Boleto / Cartão) de um lançamento
export default function PagamentoCobrancaAcoes({ lancamento, enrollment, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const formaOnline = ["PIX", "Boleto", "Cartão de Crédito"].includes(lancamento.forma_pagamento);
  const cobrancaAtiva = lancamento.asaas_payment_id && lancamento.situacao_cobranca !== "Cancelado";
  const pago = lancamento.status === "Recebido" || lancamento.status === "Pago" || lancamento.situacao_cobranca === "Pago";

  const copiar = (texto, label) => {
    navigator.clipboard.writeText(texto);
    toast.success(`${label} copiado!`);
  };

  const gerarCobranca = async () => {
    if (!window.confirm("Isso criará uma cobrança REAL no Asaas para este aluno. Confirmar geração da cobrança?")) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("pagamentoInscricao", { action: "prepararCobranca", lancamento_id: lancamento.id });
      if (res.data?.error) toast.error(res.data.error);
      else {
        toast.success(res.data.ja_existia ? "Cobrança já existia — reutilizada (sem duplicidade)." : "Cobrança gerada com sucesso!");
        // FASE 6: prepara automaticamente a mensagem com o link de pagamento
        if (enrollment) {
          const lancAtual = { ...lancamento, ...(res.data?.lancamento || {}), link_pagamento: res.data?.lancamento?.link_pagamento || res.data?.link_pagamento || lancamento.link_pagamento || "" };
          await prepararMensagem({
            enrollment, evento: "link_pagamento", canal: "WhatsApp",
            mensagem: preencherTemplate(templateEvento("link_pagamento"), montarVariaveis({ enrollment, lancamento: lancAtual })),
            origem: "automática",
          }).catch(() => {});
        }
      }
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    }
    setLoading(false);
  };

  const cancelarCobranca = async () => {
    const justificativa = window.prompt("Justificativa OBRIGATÓRIA para cancelar a cobrança:");
    if (!justificativa || justificativa.trim().length < 5) {
      if (justificativa !== null) toast.error("Justificativa obrigatória (mínimo 5 caracteres).");
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("pagamentoInscricao", { action: "cancelarCobranca", lancamento_id: lancamento.id, justificativa });
      if (res.data?.error) toast.error(res.data.error);
      else toast.success("Cobrança cancelada e auditada.");
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    }
    setLoading(false);
  };

  if (pago) return null;
  if (!formaOnline) return null;

  return (
    <div className="border rounded-lg p-3 bg-blue-50 border-blue-200 space-y-2">
      <p className="text-xs font-semibold text-blue-900">Cobrança Online (Asaas) — {lancamento.forma_pagamento}</p>

      {!cobrancaAtiva ? (
        <Button size="sm" onClick={gerarCobranca} disabled={loading} className="bg-blue-700 hover:bg-blue-800">
          {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CreditCard className="w-4 h-4 mr-1" />}
          Gerar Cobrança {lancamento.forma_pagamento}
        </Button>
      ) : (
        <div className="flex flex-wrap gap-2">
          {lancamento.link_pagamento && (
            <>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => copiar(lancamento.link_pagamento, "Link de pagamento")}>
                <Copy className="w-3 h-3 mr-1" /> Copiar Link
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => window.open(lancamento.link_pagamento, "_blank")}>
                <ExternalLink className="w-3 h-3 mr-1" /> Abrir {lancamento.forma_pagamento === "Boleto" ? "Boleto" : "Fatura"}
              </Button>
            </>
          )}
          {lancamento.pix_payload && (
            <>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => copiar(lancamento.pix_payload, "Pix copia-e-cola")}>
                <Copy className="w-3 h-3 mr-1" /> Copiar Pix
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowQR(!showQR)}>
                <QrCode className="w-3 h-3 mr-1" /> {showQR ? "Ocultar" : "Ver"} QR Code
              </Button>
            </>
          )}
          {lancamento.boleto_linha_digitavel && (
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => copiar(lancamento.boleto_linha_digitavel, "Linha digitável")}>
              <Copy className="w-3 h-3 mr-1" /> Copiar Linha Digitável
            </Button>
          )}
          <Button size="sm" variant="outline" className="text-xs h-7 border-red-300 text-red-700 hover:bg-red-50" onClick={cancelarCobranca} disabled={loading}>
            <XCircle className="w-3 h-3 mr-1" /> Cancelar Cobrança
          </Button>
        </div>
      )}

      {showQR && lancamento.pix_payload && (
        <div className="flex justify-center p-3 bg-white rounded border">
          <QRCodeSVG value={lancamento.pix_payload} size={180} />
        </div>
      )}
    </div>
  );
}