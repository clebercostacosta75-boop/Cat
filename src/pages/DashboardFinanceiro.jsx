import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, BarChart3, DollarSign, FileText } from "lucide-react";
import FinancialDashboard from "./FinancialDashboard";
import ProfitabilityAnalysis from "./ProfitabilityAnalysis";
import InstructorFinancialControl from "./InstructorFinancialControl";
import PaymentAutomation from "./PaymentAutomation";
import ReportsPage from "./Reports";

export default function DashboardFinanceiro() {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">Dashboard Financeiro</h1>
          <p className="text-gray-600 text-sm mt-1">
            Visão financeira completa — Receita, Lucratividade, Instrutores e Relatórios
          </p>
        </div>

        <Tabs defaultValue="visao">
          <TabsList className="grid w-full grid-cols-5 mb-6 bg-gray-100 p-1 h-auto">
            <TabsTrigger value="visao" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3 text-xs sm:text-sm">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="lucratividade" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3 text-xs sm:text-sm">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Lucratividade</span>
            </TabsTrigger>
            <TabsTrigger value="instrutores" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3 text-xs sm:text-sm">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Instrutores</span>
            </TabsTrigger>
            <TabsTrigger value="pagamentos" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3 text-xs sm:text-sm">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Pagamentos</span>
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3 text-xs sm:text-sm">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Relatórios</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visao"><FinancialDashboard /></TabsContent>
          <TabsContent value="lucratividade"><ProfitabilityAnalysis /></TabsContent>
          <TabsContent value="instrutores"><InstructorFinancialControl /></TabsContent>
          <TabsContent value="pagamentos"><PaymentAutomation /></TabsContent>
          <TabsContent value="relatorios"><ReportsPage /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}