import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Loader2 } from "lucide-react";
import NovaMensagemForm from "./NovaMensagemForm";
import MensagemItem from "./MensagemItem";

// FASE 6 — Painel de Comunicações da matrícula individual (histórico + nova mensagem)
export default function ComunicacoesMatricula({ enrollment, onClose }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: mensagens = [], isLoading } = useQuery({
    queryKey: ["comunicacoes-matricula", enrollment.id],
    queryFn: () => base44.entities.MensagemComunicacao.filter({ enrollment_id: enrollment.id }, "-created_date", 100),
  });
  const { data: contratos = [] } = useQuery({
    queryKey: ["contrato-comm", enrollment.id],
    queryFn: () => base44.entities.Contract.filter({ enrollment_id: enrollment.id }, "-created_date", 5),
  });
  const { data: lancamentos = [] } = useQuery({
    queryKey: ["lanc-comm", enrollment.id],
    queryFn: () => base44.entities.LancamentoFinanceiro.filter({ origem_id: enrollment.id }),
  });
  const { data: modelos = [] } = useQuery({
    queryKey: ["modelos-mensagem"],
    queryFn: () => base44.entities.ModeloMensagem.filter({ ativo: true }),
  });

  const contrato = contratos.find((c) => !["Cancelado", "Substituido_Aditivo"].includes(c.status)) || contratos[0];
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["comunicacoes-matricula", enrollment.id] });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="w-4 h-4 text-indigo-700" /> Comunicações da Matrícula
          </DialogTitle>
        </DialogHeader>

        <div className="text-xs text-gray-600 -mt-2">
          <p className="font-semibold text-gray-900">{enrollment.student_name}</p>
          <p>{enrollment.pacote_nome ? `Pacote: ${enrollment.pacote_nome} — ` : ""}{enrollment.course_name}</p>
        </div>

        <Button size="sm" variant={showForm ? "secondary" : "default"}
          className={showForm ? "" : "bg-indigo-700 hover:bg-indigo-800 w-fit"}
          onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> {showForm ? "Fechar formulário" : "Nova Mensagem"}
        </Button>

        {showForm && (
          <NovaMensagemForm
            enrollment={enrollment} contrato={contrato} lancamento={lancamentos[0]}
            modelos={modelos} user={user}
            onCreated={() => { refresh(); }}
          />
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Histórico ({mensagens.length})</p>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : mensagens.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Nenhuma comunicação registrada para esta matrícula.</p>
          ) : (
            mensagens.map((m) => <MensagemItem key={m.id} msg={m} user={user} onRefresh={refresh} />)
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}