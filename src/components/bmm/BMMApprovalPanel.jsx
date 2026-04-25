import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, History, ChevronDown, ChevronUp, PenLine, Download } from "lucide-react";
import { toast } from "sonner";
import BMMSignatureModal from "@/components/bmm/BMMSignatureModal";
import { exportBMMPDF } from "@/components/bmm/BMMExporter";

const STATUS_CONFIG = {
  Rascunho: { color: "bg-gray-100 text-gray-700", label: "Rascunho" },
  Pendente:  { color: "bg-yellow-100 text-yellow-800", label: "Pendente" },
  Aprovado:  { color: "bg-emerald-100 text-emerald-800", label: "Aprovado" },
  Rejeitado: { color: "bg-red-100 text-red-800", label: "Rejeitado" },
  Gerado:    { color: "bg-blue-100 text-blue-800", label: "Gerado" },
  Enviado:   { color: "bg-purple-100 text-purple-800", label: "Enviado" },
  Confirmado:{ color: "bg-green-100 text-green-800", label: "Confirmado" },
};

export default function BMMApprovalPanel({ record, userRole }) {
  const queryClient = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signerName, setSignerName] = useState("");

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BMMRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bmmRecords"] });
    },
  });

  const addHistoryEvent = async (status, details, extra = {}) => {
    const user = await base44.auth.me();
    const newEvent = {
      action: status,
      timestamp: new Date().toISOString(),
      user_email: user?.email || "Sistema",
      details,
    };
    const updatedHistory = [...(record.history || []), newEvent];
    updateMutation.mutate({
      id: record.id,
      data: { status, history: updatedHistory, ...extra },
    });
  };

  const handleApprove = async () => {
    const user = await base44.auth.me();
    await addHistoryEvent("Aprovado", "BMM aprovado pelo gestor.", {
      approved_by: user?.email,
      approved_at: new Date().toISOString(),
    });
    toast.success("BMM aprovado com sucesso!");
  };

  const handleOpenSignature = async () => {
    const user = await base44.auth.me();
    setSignerName(user?.full_name || user?.email || "Gestor");
    setShowSignatureModal(true);
  };

  const handleSignatureConfirm = async (signatureDataUrl) => {
    setShowSignatureModal(false);
    const user = await base44.auth.me();
    await addHistoryEvent("Confirmado", "BMM assinado e confirmado pelo gestor.", {
      signature_url: signatureDataUrl,
      approved_by: user?.email,
      approved_at: new Date().toISOString(),
    });
    toast.success("BMM assinado e confirmado com sucesso!");
  };

  const handleSubmitForApproval = async () => {
    await addHistoryEvent("Pendente", "BMM enviado para aprovação.");
    toast.success("BMM enviado para aprovação!");
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Informe o motivo da rejeição.");
      return;
    }
    await addHistoryEvent("Rejeitado", `Motivo: ${rejectionReason}`, {
      rejection_reason: rejectionReason,
    });
    setShowRejectModal(false);
    setRejectionReason("");
    toast.success("BMM rejeitado.");
  };

  const statusCfg = STATUS_CONFIG[record.status] || STATUS_CONFIG["Rascunho"];
  const isManager = userRole === "admin" || userRole === "Administrador Master";

  const formatDateTime = (dt) => {
    if (!dt) return "-";
    try { return new Date(dt).toLocaleString("pt-BR"); } catch { return dt; }
  };

  return (
    <div className="space-y-3">
      {/* Badge de status */}
      <div className="flex items-center gap-2">
        <Badge className={`${statusCfg.color} border-0 text-xs px-2 py-0.5`}>
          {statusCfg.label}
        </Badge>
      </div>

      {/* Ações por papel */}
      <div className="flex flex-wrap gap-2">
        {/* Qualquer usuário pode enviar para aprovação se estiver em Rascunho ou Gerado */}
        {(record.status === "Rascunho" || record.status === "Gerado") && (
          <Button
            size="sm"
            variant="outline"
            className="text-yellow-700 border-yellow-400 hover:bg-yellow-50"
            onClick={handleSubmitForApproval}
            disabled={updateMutation.isPending}
          >
            <Clock className="w-3 h-3 mr-1" />
            Enviar para Aprovação
          </Button>
        )}

        {/* Apenas gestores podem Aprovar / Rejeitar */}
        {isManager && record.status === "Pendente" && (
          <>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleApprove}
              disabled={updateMutation.isPending}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Aprovar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-400 hover:bg-red-50"
              onClick={() => setShowRejectModal(true)}
            >
              <XCircle className="w-3 h-3 mr-1" />
              Rejeitar
            </Button>
          </>
        )}

        {/* Exportar PDF com Assinatura — quando já confirmado */}
        {record.status === "Confirmado" && record.content_snapshot && (
          <Button
            size="sm"
            variant="outline"
            className="text-blue-700 border-blue-400 hover:bg-blue-50"
            onClick={() => {
              try {
                const content = JSON.parse(record.content_snapshot);
                exportBMMPDF(content, record.signature_url || null);
              } catch {
                toast.error("Snapshot do conteúdo não disponível.");
              }
            }}
          >
            <Download className="w-3 h-3 mr-1" />
            PDF Assinado
          </Button>
        )}

        {/* Assinar e Confirmar — disponível para gestores após aprovação */}
        {isManager && record.status === "Aprovado" && (
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleOpenSignature}
            disabled={updateMutation.isPending}
          >
            <PenLine className="w-3 h-3 mr-1" />
            Assinar e Confirmar
          </Button>
        )}

        {/* Reabrir se rejeitado */}
        {record.status === "Rejeitado" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => addHistoryEvent("Rascunho", "BMM reaberto para edição.")}
            disabled={updateMutation.isPending}
          >
            Reabrir como Rascunho
          </Button>
        )}
      </div>

      {/* Motivo de rejeição */}
      {record.status === "Rejeitado" && record.rejection_reason && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
          Motivo: {record.rejection_reason}
        </p>
      )}

      {/* Histórico */}
      {record.history && record.history.length > 0 && (
        <div>
          <button
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
            onClick={() => setShowHistory(v => !v)}
          >
            <History className="w-3 h-3" />
            Histórico ({record.history.length})
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1 border-l-2 border-gray-200 pl-3">
              {record.history.map((evt, i) => (
                <div key={i} className="text-xs text-gray-600">
                  <span className="font-medium">{evt.action}</span>
                  {" — "}
                  <span className="text-gray-400">{formatDateTime(evt.timestamp)}</span>
                  {evt.user_email && <span className="text-gray-400"> ({evt.user_email})</span>}
                  {evt.details && <div className="text-gray-500 pl-2">{evt.details}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assinatura registrada */}
      {record.status === "Confirmado" && record.signature_url && (
        <div className="mt-1">
          <p className="text-xs text-gray-500 mb-1">Assinatura do gestor:</p>
          <img
            src={record.signature_url}
            alt="Assinatura"
            className="h-10 border border-gray-200 rounded bg-white"
          />
        </div>
      )}

      {/* Modal de Assinatura */}
      <BMMSignatureModal
        open={showSignatureModal}
        onOpenChange={setShowSignatureModal}
        onConfirm={handleSignatureConfirm}
        signerName={signerName}
      />

      {/* Modal de Rejeição */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar BMM</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Informe o motivo da rejeição para que a equipe possa corrigir o documento.</p>
            <Textarea
              placeholder="Descreva o motivo da rejeição..."
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancelar</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleReject}
                disabled={updateMutation.isPending}
              >
                Confirmar Rejeição
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}