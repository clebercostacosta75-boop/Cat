import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle, ExternalLink, MessageSquare, Webhook } from "lucide-react";
import { toast } from "sonner";

const VERIFY_TOKEN = "cat_cursos_webhook_2025";

export default function WebhookConfigInstrucoes() {
  const [copiedField, setCopiedField] = useState(null);

  const appId = import.meta.env.VITE_APP_ID || window.__BASE44_APP_ID__ || "";
  const webhookUrl = appId
    ? `https://api.base44.com/api/apps/${appId}/functions/whatsappWebhook`
    : "(carregando URL... recarregue a página)";
  const whatsappNumber = "+55 91 98864-8079";

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copiado!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyField = ({ label, value, field }) => (
    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-3 border">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm font-mono text-gray-900 truncate">{value}</p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="shrink-0"
        onClick={() => copyToClipboard(value, field)}
      >
        {copiedField === field ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <Copy className="w-4 h-4 text-gray-400" />
        )}
      </Button>
    </div>
  );

  const steps = [
    {
      num: 1,
      title: "Acesse o Meta for Developers",
      desc: "Vá para developers.facebook.com → seu app → WhatsApp → Configuração",
      link: "https://developers.facebook.com",
    },
    {
      num: 2,
      title: "Configure o Webhook",
      desc: "Na seção 'Webhook', clique em 'Editar' e preencha a URL do Callback e o Token de Verificação abaixo.",
    },
    {
      num: 3,
      title: "Assine os eventos",
      desc: "Após verificar, selecione o campo 'messages' para receber as mensagens no aplicativo.",
    },
    {
      num: 4,
      title: "Pronto!",
      desc: "A partir de agora, todas as mensagens recebidas no WhatsApp Business aparecerão automaticamente na Caixa de Entrada.",
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-green-800">
            <Webhook className="w-5 h-5" />
            Webhook WhatsApp Business — Dados de Configuração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <CopyField
            label="Número WhatsApp Business"
            value={whatsappNumber}
            field="number"
          />
          <CopyField
            label="URL do Callback (Webhook URL)"
            value={webhookUrl}
            field="url"
          />
          <CopyField
            label="Token de Verificação"
            value={VERIFY_TOKEN}
            field="token"
          />
          <p className="text-xs text-green-700 mt-1">
            ✅ Cole esses dois valores exatamente nas configurações do seu app no <strong>Meta for Developers</strong>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
            <MessageSquare className="w-4 h-4" />
            Passo a passo de configuração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {steps.map((step) => (
              <li key={step.num} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center font-bold">
                  {step.num}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{step.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                  {step.link && (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                    >
                      <ExternalLink className="w-3 h-3" /> {step.link}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        <span>⚠️</span>
        <span>
          Certifique-se de que o seu <strong>WHATSAPP_ACCESS_TOKEN</strong> e <strong>WHATSAPP_PHONE_NUMBER_ID</strong> estão configurados nas variáveis de ambiente do sistema.
        </span>
        <Badge variant="outline" className="text-xs text-green-700 border-green-300 bg-green-50 shrink-0">Já configurados ✓</Badge>
      </div>
    </div>
  );
}