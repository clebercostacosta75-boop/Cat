import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { usePermissions } from "@/lib/PermissionsContext";
import { Button } from "@/components/ui/button";
import { Copy, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

const fmt = (v) => `R$ ${(parseFloat(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// Pagamento Pix (fora do Asaas) — exibe a chave ativa configurada pelo Financeiro.
// A recepção anexa o comprovante; a confirmação é exclusiva do Financeiro (Central de Conciliação).
export default function PixQRPagamento({ enrollment, lancamento, onRefresh }) {
  const { profile } = usePermissions();
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["pix-config-ativa"],
    queryFn: () => base44.entities.PixConfiguracao.filter({ ativo: true }, "-updated_date", 1),
  });
  const cfg = configs[0];
  const saldo = Math.max(0, (lancamento?.valor || 0) - (lancamento?.valor_pago || 0));

  const copiar = () => {
    navigator.clipboard.writeText(cfg.chave);
    toast.success("Chave Pix copiada.");
  };

  const enviarComprovante = async (file) => {
    if (!file) return;
    setEnviando(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.PagamentoConciliacao.create({
        tipo: "Pix",
        enrollment_id: enrollment.id,
        lancamento_id: lancamento?.id || "",
        student_id: enrollment.student_id,
        student_name: enrollment.student_name,
        course_name: enrollment.course_name,
        valor: saldo || lancamento?.valor || 0,
        data_hora: new Date().toISOString(),
        comprovante_url: file_url,
        pix_chave_snapshot: cfg.chave,
        pix_favorecido_snapshot: cfg.favorecido,
        status: "Aguardando validação financeira",
        registrado_por: profile?.user_email || "",
      });
      setEnviado(true);
      toast.success("Comprovante registrado — aguardando validação do Financeiro.");
      onRefresh?.();
    } catch (e) {
      toast.error("Erro ao registrar comprovante: " + (e?.response?.data?.detail || e.message));
    }
    setEnviando(false);
  };

  if (isLoading) return <p className="text-xs text-gray-400 py-2">Carregando configuração Pix...</p>;
  if (!cfg) {
    return (
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
        ⚠️ Nenhuma chave Pix ativa — pendente de configuração pelo Financeiro (Financeiro → Pix).
      </p>
    );
  }

  return (
    <div className="border rounded-lg p-3 space-y-2 text-xs">
      <div className="flex gap-3">
        {cfg.qr_code_url && <img src={cfg.qr_code_url} alt="QR Code Pix" className="w-28 h-28 object-contain border rounded bg-white flex-shrink-0" />}
        <div className="space-y-1 min-w-0">
          <p><span className="text-gray-500">Favorecido:</span> <strong>{cfg.favorecido}</strong></p>
          <p><span className="text-gray-500">Banco:</span> {cfg.banco || "—"} · <span className="text-gray-500">CPF/CNPJ:</span> {cfg.cpf_cnpj || "—"}</p>
          <p className="break-all"><span className="text-gray-500">Chave ({cfg.tipo_chave}):</span> <strong>{cfg.chave}</strong></p>
          <p><span className="text-gray-500">Valor:</span> <strong className="text-green-800">{fmt(saldo || lancamento?.valor)}</strong></p>
          <p className="text-gray-500">Identificação: matrícula {enrollment.id} — {enrollment.student_name}</p>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={copiar}>
            <Copy className="w-3 h-3 mr-1" /> Copiar chave Pix
          </Button>
        </div>
      </div>
      {enviado ? (
        <p className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-2">
          ✅ Comprovante registrado — <strong>Aguardando validação financeira</strong>. A confirmação é exclusiva do Financeiro.
        </p>
      ) : (
        <label className="flex items-center gap-1.5 border rounded-md px-3 py-2 cursor-pointer hover:bg-gray-50 w-fit">
          {enviando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Anexar comprovante Pix
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => enviarComprovante(e.target.files?.[0])} disabled={enviando} />
        </label>
      )}
      <p className="text-[10px] text-gray-400 italic">O comprovante é evidência — não confirma o pagamento. A recepção não altera a chave nem confirma pagamentos.</p>
    </div>
  );
}