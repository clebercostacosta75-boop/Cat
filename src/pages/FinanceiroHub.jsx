import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, TrendingDown, BarChart3, Building2, Settings, CreditCard, Unlock, QrCode } from "lucide-react";
import CentralConciliacao from "@/components/financeiro/conciliacao/CentralConciliacao";
import PixConfigPanel from "@/components/financeiro/PixConfigPanel";
import LiberacoesCertificacaoTab from "@/components/financeiro/LiberacoesCertificacaoTab";
import DashboardFinanceiroExecutivo from "@/components/financeiro/DashboardFinanceiroExecutivo";
import ContasReceberTab from "@/components/financeiro/ContasReceberTab";
import ContasPagarTab from "@/components/financeiro/ContasPagarTab";
import FluxoCaixaTab from "@/components/financeiro/FluxoCaixaTab";
import ContasBancariasTab from "@/components/financeiro/ContasBancariasTab";
import ConfiguracoesFinanceiras from "@/components/financeiro/ConfiguracoesFinanceiras";

export default function FinanceiroHub() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <p className="text-sm text-gray-500 mt-1">Gestão financeira integrada — visão completa de receitas, despesas e fluxo de caixa</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="dashboard" className="flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="receber" className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" /> Contas a Receber
          </TabsTrigger>
          <TabsTrigger value="pagar" className="flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4" /> Contas a Pagar
          </TabsTrigger>
          <TabsTrigger value="fluxo" className="flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" /> Fluxo de Caixa
          </TabsTrigger>
          <TabsTrigger value="bancos" className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4" /> Contas Bancárias
          </TabsTrigger>
          <TabsTrigger value="liberacoes" className="flex items-center gap-1.5">
            <Unlock className="w-4 h-4" /> Liberações p/ Certificação
          </TabsTrigger>
          <TabsTrigger value="conciliacao" className="flex items-center gap-1.5">
            <CreditCard className="w-4 h-4" /> Central de Conciliação
          </TabsTrigger>
          <TabsTrigger value="pix" className="flex items-center gap-1.5">
            <QrCode className="w-4 h-4" /> Pix
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-1.5">
            <Settings className="w-4 h-4" /> Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardFinanceiroExecutivo /></TabsContent>
        <TabsContent value="receber"><ContasReceberTab /></TabsContent>
        <TabsContent value="pagar"><ContasPagarTab /></TabsContent>
        <TabsContent value="fluxo"><FluxoCaixaTab /></TabsContent>
        <TabsContent value="bancos"><ContasBancariasTab /></TabsContent>
        <TabsContent value="liberacoes"><LiberacoesCertificacaoTab /></TabsContent>
        <TabsContent value="conciliacao"><CentralConciliacao /></TabsContent>
        <TabsContent value="pix"><PixConfigPanel /></TabsContent>
        <TabsContent value="config"><ConfiguracoesFinanceiras /></TabsContent>
      </Tabs>
    </div>
  );
}