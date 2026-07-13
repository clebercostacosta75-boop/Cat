import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

const ITENS = [
  { titulo: "CPF mascarado", texto: "Nenhuma mensagem envia CPF completo. O sistema aplica máscara automática (ex: 123.***.***-45) em todos os templates e registros de auditoria." },
  { titulo: "Consentimento", texto: "Usuários do portal registram aceite do termo LGPD (data/hora, IP e versão do termo). Pré-cadastros públicos exigem aceite explícito antes do envio de dados." },
  { titulo: "Auditoria completa", texto: "Toda comunicação (preparada, enviada ou com falha) é registrada em MensagemComunicacao e no Log de Auditoria, incluindo operador, canal, destinatário e status." },
  { titulo: "Segurança de credenciais", texto: "Tokens e senhas (SMTP UOL, WhatsApp Meta) ficam em variáveis de ambiente seguras no servidor — nunca aparecem na interface, no código do navegador ou em logs." },
  { titulo: "Webhook autenticado", texto: "O webhook do WhatsApp valida a assinatura X-Hub-Signature-256 do Meta. Requisições inválidas são rejeitadas e registradas no Log de Auditoria." },
  { titulo: "Envio oficial gradual", texto: "Os fluxos semiautomáticos (wa.me) serão substituídos por envio oficial Meta conforme templates aprovados e consentimento do destinatário." },
];

export default function AbaLGPD() {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-600" /> Conformidade LGPD do módulo de comunicação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {ITENS.map((i) => (
          <div key={i.titulo} className="border rounded-md p-3">
            <p className="text-sm font-semibold text-gray-800">{i.titulo}</p>
            <p className="text-sm text-gray-600 mt-1">{i.texto}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}