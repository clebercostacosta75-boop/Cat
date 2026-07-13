import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const LinhaStatus = ({ ok, label }) => (
  <div className="flex items-center justify-between py-2 border-b last:border-0">
    <span className="text-sm text-gray-700">{label}</span>
    <Badge className={ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
      {ok ? "Configurado" : "Não configurado"}
    </Badge>
  </div>
);

export default function AbaWhatsAppMeta({ status }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const testar = async () => {
    if (!phone.trim()) { toast.error("Informe um número com DDD para o teste"); return; }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("testeComunicacao", { action: "test_whatsapp", phone });
      if (res.data?.success) toast.success(res.data.message);
      else toast.error(res.data?.error || "Falha no envio de teste");
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Status WhatsApp Business (Meta Cloud API)</CardTitle></CardHeader>
        <CardContent>
          <LinhaStatus ok={status?.whatsapp_configurado} label="Token de acesso e Phone Number ID" />
          <LinhaStatus ok={status?.verify_token_configurado} label="Verify Token (verificação do webhook)" />
          <LinhaStatus ok={status?.webhook_token_configurado} label="App Secret (validação de assinatura X-Hub-Signature-256)" />
          <LinhaStatus ok={status?.numero_comercial_configurado} label="Número comercial (WHATSAPP_PHONE_NUMBER — opcional, sem hardcode)" />
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Input
              placeholder="Número para teste (ex: 91 99999-9999)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="max-w-xs"
            />
            <Button disabled={loading} onClick={testar}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Enviar mensagem de teste
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Tokens protegidos em variáveis de ambiente — nunca exibidos na interface nem gravados em logs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}