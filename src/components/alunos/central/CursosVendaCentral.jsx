import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, QrCode } from "lucide-react";
import CursosPacotesTab from "@/components/vendas/CursosPacotesTab";
import ReservasVagasPanel from "@/components/alunos/central/ReservasVagasPanel";
import CadastroInteligenteDialog from "@/components/alunos/central/CadastroInteligenteDialog";
import MatriculaRapidaModal from "@/components/vendas/MatriculaRapidaModal";
import QRCodeInscricaoModal from "@/components/vendas/QRCodeInscricaoModal";

export default function CursosVendaCentral() {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState("catalogo");
  const [inteligenteOpen, setInteligenteOpen] = useState(false);
  const [rapidaOpen, setRapidaOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  return (
    <div className="space-y-4">
      <CadastroInteligenteDialog open={inteligenteOpen} onClose={() => setInteligenteOpen(false)} />
      <MatriculaRapidaModal
        open={rapidaOpen}
        onClose={() => setRapidaOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] })}
      />
      <QRCodeInscricaoModal open={qrOpen} onClose={() => setQrOpen(false)} />

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
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="border-gray-400" onClick={() => setQrOpen(true)}>
            <QrCode className="w-4 h-4 mr-2" /> QR Code de Inscrição
          </Button>
          <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setRapidaOpen(true)}>
            <Zap className="w-4 h-4 mr-2" /> Matrícula Rápida
          </Button>
          <Button className="bg-violet-700 hover:bg-violet-800" onClick={() => setInteligenteOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2" /> Cadastro Inteligente
          </Button>
        </div>
      </div>

      {subTab === "catalogo" && <CursosPacotesTab />}
      {subTab === "reservas" && <ReservasVagasPanel />}
    </div>
  );
}