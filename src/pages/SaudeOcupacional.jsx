import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, FileText, Microscope, ClipboardList, Activity } from "lucide-react";
import PGRTab from "@/components/saude/PGRTab";
import PCMSOTab from "@/components/saude/PCMSOTab";
import LTCATTab from "@/components/saude/LTCATTab";
import ASOTab from "@/components/saude/ASOTab";
import ExamesTab from "@/components/saude/ExamesTab";

export default function SaudeOcupacional() {
  const [activeTab, setActiveTab] = useState("pgr");

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Heart className="w-6 h-6 text-rose-600" />
          Saúde Ocupacional
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Gestão integrada de PGR, PCMSO, LTCAT, ASOs e Exames Ocupacionais
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto bg-gray-100 p-1 mb-6">
          <TabsTrigger value="pgr" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 py-2 px-3 text-sm">
            <FileText className="w-4 h-4" />PGR
          </TabsTrigger>
          <TabsTrigger value="pcmso" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 py-2 px-3 text-sm">
            <Activity className="w-4 h-4" />PCMSO
          </TabsTrigger>
          <TabsTrigger value="ltcat" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 py-2 px-3 text-sm">
            <ClipboardList className="w-4 h-4" />LTCAT
          </TabsTrigger>
          <TabsTrigger value="aso" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 py-2 px-3 text-sm">
            <Heart className="w-4 h-4" />ASO
          </TabsTrigger>
          <TabsTrigger value="exames" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 py-2 px-3 text-sm">
            <Microscope className="w-4 h-4" />Exames
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pgr"><PGRTab /></TabsContent>
        <TabsContent value="pcmso"><PCMSOTab /></TabsContent>
        <TabsContent value="ltcat"><LTCATTab /></TabsContent>
        <TabsContent value="aso"><ASOTab /></TabsContent>
        <TabsContent value="exames"><ExamesTab /></TabsContent>
      </Tabs>
    </div>
  );
}