import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import CursosPacotesTab from "@/components/vendas/CursosPacotesTab";
import ReservasVagasPanel from "@/components/alunos/central/ReservasVagasPanel";
import MatriculaRapidaModal from "@/components/vendas/MatriculaRapidaModal";

export default function CursosVendaCentral() {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState("catalogo");
  const [rapidaOpen, setRapidaOpen] = useState(false);

  return (
    <div className="space-y-4">
      <MatriculaRapidaModal
        open={rapidaOpen}
        onClose={() => setRapidaOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] })}
      />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <Tabs value={subTab} onValueChange={setSubTab} className="flex-1">
          <TabsList>
            <TabsTrigger value="catalogo" className="text-xs data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              📚 Cursos-base, Ofertas e Pacotes
            </TabsTrigger>
            <TabsTrigger value="reservas" className="text-xs data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              🎟️ Reservas de Vagas
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" onClick={() => setRapidaOpen(true)}>
          <Zap className="w-4 h-4 mr-2" /> Matrícula Rápida
        </Button>
      </div>

      {subTab === "catalogo" && <CursosPacotesTab />}
      {subTab === "reservas" && <ReservasVagasPanel />}
    </div>
  );
}