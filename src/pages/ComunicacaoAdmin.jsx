import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AbaEmailSMTP from "@/components/comunicacao/admin/AbaEmailSMTP";
import AbaWhatsAppMeta from "@/components/comunicacao/admin/AbaWhatsAppMeta";
import AbaTemplates from "@/components/comunicacao/admin/AbaTemplates";
import AbaFila from "@/components/comunicacao/admin/AbaFila";
import AbaLogsComunicacao from "@/components/comunicacao/admin/AbaLogsComunicacao";
import AbaLGPD from "@/components/comunicacao/admin/AbaLGPD";

export default function ComunicacaoAdmin() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    base44.functions.invoke("testeComunicacao", { action: "status" })
      .then((r) => setStatus(r.data))
      .catch(() => setStatus({}));
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Administração → Comunicação</h1>
      <p className="text-sm text-gray-500 mb-6">
        Configuração, testes, fila de envio, templates, logs e LGPD dos canais de E-mail e WhatsApp
      </p>
      <Tabs defaultValue="email">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="email">E-mail / SMTP UOL</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp Meta</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="fila">Fila</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="lgpd">LGPD</TabsTrigger>
        </TabsList>
        <TabsContent value="email"><AbaEmailSMTP status={status} /></TabsContent>
        <TabsContent value="whatsapp"><AbaWhatsAppMeta status={status} /></TabsContent>
        <TabsContent value="templates"><AbaTemplates /></TabsContent>
        <TabsContent value="fila"><AbaFila /></TabsContent>
        <TabsContent value="logs"><AbaLogsComunicacao /></TabsContent>
        <TabsContent value="lgpd"><AbaLGPD /></TabsContent>
      </Tabs>
    </div>
  );
}