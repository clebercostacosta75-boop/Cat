import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, BookOpen, Calendar, Building2 } from "lucide-react";
import EmpresasResumoTab from "@/components/empresas/EmpresasResumoTab";
import MatriculasEmpresariaisTab from "@/components/empresas/MatriculasEmpresariaisTab";
import TurmasCorporativasTab from "@/components/empresas/TurmasCorporativasTab";
import DashboardOperacionalEmpresas from "@/components/empresas/dashboard/DashboardOperacionalEmpresas";

export default function GestaoAcademicaEmpresas() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">Gestão Acadêmica Empresas</h1>
          <p className="text-gray-600 text-sm mt-1">
            Painel de comando da operação acadêmica empresarial — cronograma, agenda, turmas, instrutores, cursos, empresas e pendências
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-gray-100 p-1 h-auto">
            <TabsTrigger value="dashboard" className="flex items-center gap-2 data-[state=active]:bg-blue-700 data-[state=active]:text-white py-3">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard Operacional</span>
            </TabsTrigger>
            <TabsTrigger value="resumo" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Resumo</span>
            </TabsTrigger>
            <TabsTrigger value="matriculas" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Matrículas Empresariais</span>
            </TabsTrigger>
            <TabsTrigger value="turmas" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Turmas Corporativas</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><DashboardOperacionalEmpresas onOpenTab={setTab} /></TabsContent>
          <TabsContent value="resumo"><EmpresasResumoTab /></TabsContent>
          <TabsContent value="matriculas"><MatriculasEmpresariaisTab /></TabsContent>
          <TabsContent value="turmas"><TurmasCorporativasTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}