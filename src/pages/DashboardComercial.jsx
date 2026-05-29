import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Users, BookOpen } from "lucide-react";
import ComercialOverview from "@/components/comercial/ComercialOverview";
import GestaoLeads from "./GestaoLeads";
import BaseConhecimento from "./BaseConhecimento";

export default function DashboardComercial() {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Target className="w-7 h-7 text-indigo-600" />
          Comercial
        </h1>
        <p className="text-gray-500 text-sm mt-1">Funil de vendas, leads e base de conhecimento da IA</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap gap-1 h-auto bg-gray-100 p-1 mb-6">
          <TabsTrigger
            value="overview"
            className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-2 px-4 text-sm"
          >
            <Target className="w-4 h-4" />
            <span>Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger
            value="leads"
            className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-2 px-4 text-sm"
          >
            <Users className="w-4 h-4" />
            <span>Gestão de Leads</span>
          </TabsTrigger>
          <TabsTrigger
            value="knowledge"
            className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-2 px-4 text-sm"
          >
            <BookOpen className="w-4 h-4" />
            <span>Base de Conhecimento</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <ComercialOverview />
        </TabsContent>
        <TabsContent value="leads" className="mt-0">
          <GestaoLeads />
        </TabsContent>
        <TabsContent value="knowledge" className="mt-0">
          <BaseConhecimento />
        </TabsContent>
      </Tabs>
    </div>
  );
}