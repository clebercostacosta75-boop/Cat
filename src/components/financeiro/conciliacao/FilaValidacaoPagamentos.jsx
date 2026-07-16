import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/lib/PermissionsContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { logAction } from "@/components/audit/AuditLogger";

const VALIDADORES = ["admin", "gestor_master", "financeiro"];
const fmt = (v) => `R$ ${(parseFloat(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// Fila de validação financeira (Pix / Cartão fora do Asaas) — somente Financeiro confirma ou rejeita
export default function FilaValidacaoPagamentos({ tipo }) {
  const { role, profile } = usePermissions();
  const queryClient = useQueryClient();
  const [processando, setProcessando] = useState(null);
  const podeValidar = VALIDADORES.includes(role);

  const { data: pendentes = [], isLoading } = useQuery({
    queryKey: ["conciliacao-pendentes", tipo],
    queryFn: () => base44.entities.PagamentoConciliacao.filter({ tipo, status: "Aguardando validação financeira" }, "-created_date", 200),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["conciliacao-pendentes", tipo] });
    queryClient.invalidateQueries({ queryKey: ["lancamentos-matricula"] });
  };

  const confirmar = async (p) => {
    setProcessando(p.id);
    try {
      const agora = new Date().toISOString();
      const email = profile?.user_email || "";
      await base44.entities.PagamentoConciliacao.update(p.id, { status: "Confirmado", validado_por: email, validado_em: agora });
      if (p.lancamento_id) {
        const forma = p.tipo === "Pix" ? "PIX" : (p.modalidade_cartao === "Débito" ? "Cartão de Débito" : "Cartão de Crédito");
        await base44.entities.LancamentoFinanceiro.update(p.lancamento_id, {
          status: "Recebido", natureza: "Realizado", situacao_cobranca: "Pago",
          valor_pago: p.valor, data_pagamento: agora.slice(0, 10), forma_pagamento: forma,
          confirmado_por: email, confirmado_em: agora,
          ...(p.comprovante_url ? { anexo_url: p.comprovante_url } : {}),
        });
      }
      logAction("update", "PagamentoConciliacao", p.id, p.student_name, {
        descricao: `Pagamento ${p.tipo} de ${fmt(p.valor)} (${p.student_name}) CONFIRMADO na conciliação por ${email}`,
      });
      toast.success("Pagamento confirmado.");
      refresh();
    } catch (e) {
      toast.error("Erro ao confirmar: " + (e?.response?.data?.detail || e.message));
    }
    setProcessando(null);
  };

  const rejeitar = async (p) => {
    const motivo = prompt("Motivo da rejeição:");
    if (!motivo) return;
    setProcessando(p.id);
    try {
      const email = profile?.user_email || "";
      await base44.entities.PagamentoConciliacao.update(p.id, {
        status: "Rejeitado", motivo_rejeicao: motivo, validado_por: email, validado_em: new Date().toISOString(),
      });
      logAction("update", "PagamentoConciliacao", p.id, p.student_name, {
        descricao: `Pagamento ${p.tipo} de ${fmt(p.valor)} (${p.student_name}) REJEITADO por ${email}. Motivo: ${motivo}`,
      });
      toast.success("Pagamento rejeitado.");
      refresh();
    } catch (e) {
      toast.error("Erro ao rejeitar: " + (e?.response?.data?.detail || e.message));
    }
    setProcessando(null);
  };

  return (
    <div className="space-y-2">
      {!podeValidar && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
          Visualização somente leitura — apenas o Financeiro confirma ou rejeita pagamentos.
        </p>
      )}
      {isLoading ? (
        <p className="text-sm text-gray-400 py-4">Carregando...</p>
      ) : pendentes.length === 0 ? (
        <p className="text-sm text-gray-400 border rounded-lg p-6 text-center">Nenhum pagamento {tipo} aguardando validação.</p>
      ) : (
        <div className="border rounded-lg divide-y">
          {pendentes.map((p) => (
            <div key={p.id} className="p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-semibold text-gray-900">{p.student_name || "—"} — {fmt(p.valor)}</p>
                  <p className="text-gray-500">{p.course_name || ""} · Registrado por {p.registrado_por || "—"} em {p.created_date ? new Date(p.created_date).toLocaleString("pt-BR") : "—"}</p>
                </div>
                <Badge className="bg-amber-100 text-amber-800">Aguardando validação</Badge>
              </div>
              {p.tipo === "Cartão" && (
                <p className="text-gray-600">
                  {p.modalidade_cartao || "—"} · {p.adquirente || "—"} · {p.bandeira || "—"} · {p.parcelas || 1}x ·
                  NSU: <strong>{p.nsu || "—"}</strong> · Aut.: {p.codigo_autorizacao || "—"} · Final {p.ultimos_digitos || "—"}
                </p>
              )}
              {p.tipo === "Pix" && (
                <p className="text-gray-600">Chave: {p.pix_chave_snapshot || "—"} · Favorecido: {p.pix_favorecido_snapshot || "—"}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {p.comprovante_url && (
                  <a href={p.comprovante_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5">
                    <Paperclip className="w-3 h-3" /> Comprovante (evidência)
                  </a>
                )}
                {podeValidar && (
                  <>
                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" disabled={processando === p.id} onClick={() => confirmar(p)}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Confirmar
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50" disabled={processando === p.id} onClick={() => rejeitar(p)}>
                      <XCircle className="w-3 h-3 mr-1" /> Rejeitar
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}