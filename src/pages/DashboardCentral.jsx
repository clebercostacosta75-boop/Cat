import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, DollarSign, Award, Target, Settings } from "lucide-react";
import DashboardMaster from "./DashboardMaster";
import DashboardFinanceiro from "./DashboardFinanceiro";
import DashboardCertificacao from "./DashboardCertificacao";
import DashboardComercial from "./DashboardComercial";
import AdminDashboard from "./AdminDashboard";

export default function DashboardCentral() {
  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Visão consolidada de todas as áreas do sistema</p>
        </div>

        <Tabs defaultValue="geral">
          <TabsList className="flex flex-wrap gap-1 h-auto bg-gray-100 p-1 mb-6">
            <TabsTrigger
              value="geral"
              className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-2 px-4 text-sm"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Geral</span>
            </TabsTrigger>
            <TabsTrigger
              value="financeiro"
              className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-2 px-4 text-sm"
            >
              <DollarSign className="w-4 h-4" />
              <span>Financeiro</span>
            </TabsTrigger>
            <TabsTrigger
              value="certificacao"
              className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-2 px-4 text-sm"
            >
              <Award className="w-4 h-4" />
              <span>Certificação</span>
            </TabsTrigger>
            <TabsTrigger
              value="comercial"
              className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-2 px-4 text-sm"
            >
              <Target className="w-4 h-4" />
              <span>Comercial</span>
            </TabsTrigger>
            <TabsTrigger
              value="administrativo"
              className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-2 px-4 text-sm"
            >
              <Settings className="w-4 h-4" />
              <span>Administrativo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="mt-0">
            <DashboardMaster />
          </TabsContent>
          <TabsContent value="financeiro" className="mt-0 -mx-4 md:-mx-6">
            <DashboardFinanceiro />
          </TabsContent>
          <TabsContent value="certificacao" className="mt-0">
            <DashboardCertificacao />
          </TabsContent>
          <TabsContent value="comercial" className="mt-0">
            <DashboardComercial />
          </TabsContent>
          <TabsContent value="administrativo" className="mt-0">
            <AdminDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}