import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CursosPacotesTab from "@/components/vendas/CursosPacotesTab";
import ReservasVagasPanel from "@/components/alunos/central/ReservasVagasPanel";

export default function CursosVendaCentral() {
  const [subTab, setSubTab] = useState("catalogo");

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="catalogo" className="text-xs data-[state=active]:bg-gray-900 data-[state=active]:text-white">
            📚 Cursos-base, Ofertas e Pacotes
          </TabsTrigger>
          <TabsTrigger value="reservas" className="text-xs data-[state=active]:bg-gray-900 data-[state=active]:text-white">
            🎟️ Reservas de Vagas
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {subTab === "catalogo" && <CursosPacotesTab />}
      {subTab === "reservas" && <ReservasVagasPanel />}
    </div>
  );
}