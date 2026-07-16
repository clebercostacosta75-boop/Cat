import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import CursosPacotesTab from "@/components/vendas/CursosPacotesTab";
import ReservasVagasPanel from "@/components/alunos/central/ReservasVagasPanel";
import CadastroInteligenteDialog from "@/components/alunos/central/CadastroInteligenteDialog";

export default function CursosVendaCentral() {
  const [subTab, setSubTab] = useState("catalogo");
  const [inteligenteOpen, setInteligenteOpen] = useState(false);

  return (
    <div className="space-y-4">
      <CadastroInteligenteDialog open={inteligenteOpen} onClose={() => setInteligenteOpen(false)} />

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
        <Button className="bg-violet-700 hover:bg-violet-800" onClick={() => setInteligenteOpen(true)}>
          <Sparkles className="w-4 h-4 mr-2" /> Cadastro Inteligente
        </Button>
      </div>

      {subTab === "catalogo" && <CursosPacotesTab />}
      {subTab === "reservas" && <ReservasVagasPanel />}
    </div>
  );
}