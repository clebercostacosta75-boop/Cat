import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export default function AbaEmailSMTP({ status }) {
  const [loading, setLoading] = useState("");

  const executar = async (action) => {
    setLoading(action);
    try {
      const res = await base44.functions.invoke("testeComunicacao", { action });
      if (res.data?.success) toast.success(res.data.message);
      else toast.error(res.data?.error || "Falha no teste");
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    }
    setLoading("");
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Status do canal de E-mail</CardTitle></CardHeader>
        <CardContent>
          <LinhaStatus ok={status?.smtp_uol_configurado} label="SMTP UOL — canal principal" />
          <LinhaStatus ok={status?.resend_configurada} label="Resend — configuração OCIOSA (não utilizada; mantida até decisão administrativa)" />
          <div className="flex flex-wrap gap-2 mt-4">
            <Button variant="outline" disabled={loading !== ""} onClick={() => executar("test_smtp")}>
              {loading === "test_smtp" && <Loader2 className="w-4 h-4 animate-spin" />} Testar conexão SMTP
            </Button>
            <Button disabled={loading !== ""} onClick={() => executar("test_email")}>
              {loading === "test_email" && <Loader2 className="w-4 h-4 animate-spin" />} Enviar e-mail de teste (para mim)
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            As credenciais ficam em variáveis de ambiente seguras e nunca são exibidas nesta tela.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}