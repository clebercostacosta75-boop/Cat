import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, QrCode, CreditCard } from "lucide-react";
import FilaBoletosAsaas from "./FilaBoletosAsaas";
import FilaValidacaoPagamentos from "./FilaValidacaoPagamentos";

// Central de Conciliação — filas separadas: Boletos Asaas, Pix e Cartões aguardando validação
export default function CentralConciliacao() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          Central de Conciliação
          <Badge className="bg-amber-100 text-amber-800 text-[10px]">Homologação</Badge>
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Exclusiva da Gestão Acadêmica Individual (alunos PF). Cada confirmação/rejeição registra o responsável,
          a data/hora e fica gravada na auditoria. Boletos Asaas são baixados somente via webhook.
        </p>
      </div>

      <Tabs defaultValue="boletos">
        <TabsList>
          <TabsTrigger value="boletos" className="flex items-center gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" /> Boletos Asaas
          </TabsTrigger>
          <TabsTrigger value="pix" className="flex items-center gap-1.5 text-xs">
            <QrCode className="w-3.5 h-3.5" /> Pix aguardando validação
          </TabsTrigger>
          <TabsTrigger value="cartoes" className="flex items-center gap-1.5 text-xs">
            <CreditCard className="w-3.5 h-3.5" /> Cartões aguardando validação
          </TabsTrigger>
        </TabsList>
        <TabsContent value="boletos"><FilaBoletosAsaas /></TabsContent>
        <TabsContent value="pix"><FilaValidacaoPagamentos tipo="Pix" /></TabsContent>
        <TabsContent value="cartoes"><FilaValidacaoPagamentos tipo="Cartão" /></TabsContent>
      </Tabs>
    </div>
  );
}