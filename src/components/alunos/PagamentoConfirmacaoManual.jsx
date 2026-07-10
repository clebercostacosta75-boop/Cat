import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Paperclip, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { prepararMensagem, montarVariaveis, preencherTemplate, templateEvento } from "@/lib/comunicacao";

// FASE 5 — Comprovante manual + confirmação de pagamento por usuário autorizado
export default function PagamentoConfirmacaoManual({ lancamento, enrollment, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [form, setForm] = useState({
    data_pagamento: new Date().toISOString().split("T")[0],
    valor_pago: lancamento.valor || 0,
    observacao: "",
  });

  const pago = lancamento.status === "Recebido" || lancamento.status === "Pago" || lancamento.situacao_cobranca === "Pago";
  if (pago) return null;

  const anexarComprovante = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke("pagamentoInscricao", {
        action: "anexarComprovante", lancamento_id: lancamento.id,
        comprovante_url: file_url, observacao: form.observacao,
      });
      if (res.data?.error) toast.error(res.data.error);
      else toast.success("Comprovante anexado — aguardando confirmação do Financeiro.");
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    }
    setUploading(false);
  };

  const confirmarPagamento = async () => {
    if (!window.confirm(`Confirmar pagamento de R$ ${parseFloat(form.valor_pago).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}? Esta ação exige permissão financeira e será auditada.`)) return;
    setConfirming(true);
    try {
      const res = await base44.functions.invoke("pagamentoInscricao", {
        action: "confirmarPagamentoManual", lancamento_id: lancamento.id,
        data_pagamento: form.data_pagamento, valor_pago: form.valor_pago, observacao: form.observacao,
      });
      if (res.data?.error) toast.error(res.data.error);
      else {
        toast.success("Pagamento confirmado! Recibo de quitação liberado.");
        // FASE 6: prepara automaticamente a mensagem de pagamento confirmado
        if (enrollment) {
          await prepararMensagem({
            enrollment, evento: "pagamento_confirmado", canal: "WhatsApp",
            mensagem: preencherTemplate(templateEvento("pagamento_confirmado"), montarVariaveis({ enrollment, lancamento })),
            origem: "automática",
          }).catch(() => {});
        }
      }
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    }
    setConfirming(false);
  };

  return (
    <div className="border rounded-lg p-3 bg-amber-50 border-amber-200 space-y-3">
      <p className="text-xs font-semibold text-amber-900">Comprovante e Confirmação Manual</p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Data do Pagamento</Label>
          <Input type="date" className="h-8 text-xs bg-white" value={form.data_pagamento}
            onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Valor Pago (R$)</Label>
          <Input type="number" step="0.01" className="h-8 text-xs bg-white" value={form.valor_pago}
            onChange={(e) => setForm({ ...form, valor_pago: e.target.value })} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Observação</Label>
        <Input className="h-8 text-xs bg-white" placeholder="Ex: Pix manual, transferência, pagamento em espécie..."
          value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
      </div>

      <div className="flex flex-wrap gap-2">
        <label>
          <input type="file" className="hidden" accept="image/*,.pdf"
            onChange={(e) => e.target.files?.[0] && anexarComprovante(e.target.files[0])} />
          <span className="inline-flex items-center h-8 px-3 text-xs border rounded-md cursor-pointer bg-white hover:bg-gray-50 border-gray-300">
            {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Paperclip className="w-3 h-3 mr-1" />}
            Anexar Comprovante
          </span>
        </label>
        <Button size="sm" className="h-8 text-xs bg-green-700 hover:bg-green-800" onClick={confirmarPagamento} disabled={confirming}>
          {confirming ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
          Confirmar Pagamento
        </Button>
      </div>
      <p className="text-[10px] text-amber-700">A confirmação manual exige usuário autorizado do Financeiro e é registrada em auditoria.</p>
      {lancamento.anexo_url && (
        <a href={lancamento.anexo_url} target="_blank" rel="noreferrer" className="text-xs text-blue-700 underline block">
          📎 Ver comprovante anexado
        </a>
      )}
    </div>
  );
}