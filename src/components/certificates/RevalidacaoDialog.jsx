/**
 * SPR-2D-2 — Revalidação de certificado com justificativa obrigatória.
 */
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RotateCcw } from "lucide-react";

export default function RevalidacaoDialog({ cert, onConfirm, onCancel, saving = false }) {
  const [justificativa, setJustificativa] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!justificativa.trim()) {
      setError("A justificativa da revalidação é obrigatória.");
      return;
    }
    onConfirm({ cert, justificativa: justificativa.trim() });
    setJustificativa("");
    setError("");
  };

  const handleCancel = () => {
    setJustificativa("");
    setError("");
    onCancel();
  };

  return (
    <Dialog open={!!cert} onOpenChange={() => !saving && handleCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <RotateCcw className="w-5 h-5" /> Revalidar Certificado
          </DialogTitle>
        </DialogHeader>

        {cert && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-emerald-800">Você está prestes a revalidar:</p>
              <p className="text-emerald-700 mt-1"><strong>{cert.student_name}</strong> — {cert.course_name}</p>
              <p className="text-emerald-600 font-mono text-xs mt-1">{cert.certificate_code}</p>
              <p className="text-xs text-gray-600 mt-2">
                Status: <span className="line-through text-red-600">revogado</span>
                <span className="mx-1 text-gray-400">→</span>
                <span className="font-medium text-emerald-700">aguardando assinatura</span>
              </p>
              {cert.revocation_reason && (
                <p className="text-xs text-gray-500 mt-1">Motivo da revogação anterior: {cert.revocation_reason}</p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">
                Justificativa da Revalidação <span className="text-red-500">*</span>
              </Label>
              <textarea
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-emerald-400"
                rows={3}
                placeholder="Descreva obrigatoriamente o motivo da revalidação..."
                value={justificativa}
                onChange={e => { setJustificativa(e.target.value); setError(""); }}
              />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>

            <p className="text-xs text-gray-500 bg-gray-50 border rounded-md px-3 py-2">
              Esta revalidação será registrada em auditoria com status anterior, status novo, usuário, data/hora e justificativa.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={saving}>Cancelar</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleConfirm} disabled={saving}>
            {saving ? "Revalidando..." : "Confirmar Revalidação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}