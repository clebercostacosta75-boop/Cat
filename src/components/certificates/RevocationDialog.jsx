import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

export default function RevocationDialog({ cert, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError("O motivo da revogação é obrigatório.");
      return;
    }
    onConfirm({ cert, reason: reason.trim() });
    setReason("");
    setError("");
  };

  const handleCancel = () => {
    setReason("");
    setError("");
    onCancel();
  };

  return (
    <Dialog open={!!cert} onOpenChange={handleCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Revogar Certificado
          </DialogTitle>
        </DialogHeader>

        {cert && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-red-800">Você está prestes a revogar:</p>
              <p className="text-red-700 mt-1">
                <strong>{cert.student_name}</strong> — {cert.course_name}
              </p>
              <p className="text-red-600 font-mono text-xs mt-1">{cert.certificate_code}</p>
            </div>

            <div>
              <Label className="text-sm font-medium">
                Motivo da Revogação <span className="text-red-500">*</span>
              </Label>
              <textarea
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-red-400"
                rows={3}
                placeholder="Descreva o motivo obrigatoriamente..."
                value={reason}
                onChange={e => { setReason(e.target.value); setError(""); }}
              />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>

            <p className="text-xs text-gray-500">
              Esta ação ficará registrada no log de auditoria. O certificado poderá ser revalidado posteriormente.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirm}>
            Confirmar Revogação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}