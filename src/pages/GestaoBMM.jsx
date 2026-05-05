import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, History } from "lucide-react";
import BMMGenerator from "./BMMGenerator";
import BMMHistoryPage from "./BMMHistory";

export default function GestaoBMM() {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">Gestão de BMM</h1>
          <p className="text-gray-600 text-sm mt-1">
            Boletim Mensal de Medição — Geração e Histórico
          </p>
        </div>

        <Tabs defaultValue="gerar">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 p-1 h-auto">
            <TabsTrigger value="gerar" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3">
              <FileText className="w-4 h-4" />
              Gerar BMM
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3">
              <History className="w-4 h-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gerar">
            <BMMGenerator embedded />
          </TabsContent>

          <TabsContent value="historico">
            <BMMHistoryPage embedded />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}