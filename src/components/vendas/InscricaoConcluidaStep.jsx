import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, Copy, ExternalLink, Send, FileText } from "lucide-react";
import { toast } from "sonner";
import { logVenda } from "@/lib/auditVendas";

export default function InscricaoConcluidaStep({ resultado, onClose }) {
  const { aluno, matriculas = [], valorFinal, contrato, contratoPendencia, signUrl, whatsapp } = resultado || {};

  const copiar = (texto, msg) => { navigator.clipboard.writeText(texto); toast.success(msg); };

  const abrirWhatsApp = async () => {
    window.open(whatsapp.waLink, "_blank");
    await logVenda("send_whatsapp", { entity_type: "Contract", entity_id: contrato?.contract_id, entity_name: contrato?.contract_number, details: "FASE 4 Inscrição: WhatsApp aberto pelo operador com mensagem e link de assinatura prontos" });
  };

  return (
    <div className="space-y-3">
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
        <p className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
          <CheckCircle className="w-4 h-4" /> Inscrição confirmada — matrícula criada com automação completa
        </p>
        <p className="text-sm text-emerald-700 mt-1"><strong>{aluno?.full_name}</strong> — CPF {aluno?.cpf}</p>
      </div>

      <div className="border rounded-md p-3 space-y-1.5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Matrícula(s) criada(s)</p>
        {matriculas.map(m => (
          <div key={m.id} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
            <span className="font-medium text-gray-800">{m.course_name}</span>
            <span className="text-xs text-gray-500">{m.start_date} → {m.end_date}</span>
          </div>
        ))}
        <p className="text-xs text-gray-500">
          💰 Financeiro criado: <strong className="text-emerald-700">R$ {(valorFinal || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> — vinculado à matrícula (sem duplicidade)
        </p>
      </div>

      {contrato ? (
        <div className="border border-blue-200 rounded-md p-3 space-y-2 bg-blue-50/50">
          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> Contrato {contrato.contract_number} gerado automaticamente
          </p>
          <p className="text-xs text-blue-700 font-mono break-all">Token: {contrato.auth_code}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button size="sm" variant="outline" className="justify-start text-xs" onClick={() => copiar(signUrl, "Link de assinatura copiado!")}>
              <Copy className="w-3.5 h-3.5 mr-1 text-blue-600" /> Copiar Link de Assinatura
            </Button>
            <Button size="sm" variant="outline" className="justify-start text-xs" onClick={() => window.open(signUrl, "_blank")}>
              <ExternalLink className="w-3.5 h-3.5 mr-1 text-blue-600" /> Abrir Portal de Assinatura
            </Button>
            {whatsapp?.waLink && (
              <Button size="sm" className="justify-start text-xs bg-green-600 hover:bg-green-700" onClick={abrirWhatsApp}>
                <Send className="w-3.5 h-3.5 mr-1" /> Enviar por WhatsApp
              </Button>
            )}
            {whatsapp?.message && (
              <Button size="sm" variant="outline" className="justify-start text-xs" onClick={() => copiar(whatsapp.message, "Mensagem copiada!")}>
                <Copy className="w-3.5 h-3.5 mr-1 text-green-600" /> Copiar Mensagem Pronta
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-500">
            O contrato foi salvo no cadastro do aluno, na matrícula e no prontuário. Após a assinatura eletrônica pelo link, o retorno é automático — sem importação manual.
          </p>
        </div>
      ) : (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Matrícula criada, mas o contrato não foi gerado porque existem dados obrigatórios pendentes.</p>
            <p className="text-xs text-amber-700 mt-1">{contratoPendencia}</p>
            <p className="text-xs text-amber-700 mt-1">Regularize os dados e gere o contrato na aba Contratos. A pendência foi registrada na auditoria.</p>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t">
        <Button className="bg-gray-900 hover:bg-gray-800" onClick={onClose}>Concluir</Button>
      </div>
    </div>
  );
}