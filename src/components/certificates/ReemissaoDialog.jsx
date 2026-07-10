/**
 * SPR-2D (encerramento) — Reemissão de certificado com justificativa obrigatória.
 * Não altera o certificado original: cria nova versão (version + 1, reissued_from_id).
 */
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RefreshCw } from "lucide-react";

export default function ReemissaoDialog({ cert, onConfirm, onCancel, saving = false }) {
  const [justificativa, setJustificativa] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!justificativa.trim()) {
      setError("A justificativa da reemissão é obrigatória.");
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
          <DialogTitle className="flex items-center gap-2 text-blue-700">
            <RefreshCw className="w-5 h-5" /> Reemitir Certificado
          </DialogTitle>
        </DialogHeader>

        {cert && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-blue-800">Você está prestes a reemitir:</p>
              <p className="text-blue-700 mt-1"><strong>{cert.student_name}</strong> — {cert.course_name}</p>
              <p className="text-blue-600 font-mono text-xs mt-1">{cert.certificate_code} (versão {cert.version || 1})</p>
            </div>

            <ul className="text-xs text-gray-600 space-y-1 bg-gray-50 border rounded-md px-3 py-2">
              <li>• Será criado um <strong>novo certificado</strong> (versão {(cert?.version || 1) + 1}) com novo código público e novo código interno.</li>
              <li>• O certificado atual <strong>não será alterado</strong> — ficará preservado como <strong>Substituído</strong> (histórico).</li>
              <li>• A assinatura anterior <strong>não será copiada</strong>: o novo certificado segue o fluxo normal de assinatura.</li>
              <li>• Os dados oficiais atuais do aluno/matrícula serão usados na nova versão.</li>
            </ul>

            {(cert?.status === "signed" || cert?.status === "active") && (
              <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                ⚠️ Este certificado já está ASSINADO. A reemissão invalida a versão atual e exige nova assinatura do aluno.
              </p>
            )}

            <div>
              <Label className="text-sm font-medium">
                Justificativa da Reemissão <span className="text-red-500">*</span>
              </Label>
              <textarea
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                rows={3}
                placeholder="Descreva obrigatoriamente o motivo da reemissão..."
                value={justificativa}
                onChange={e => { setJustificativa(e.target.value); setError(""); }}
              />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>

            <p className="text-xs text-gray-500 bg-gray-50 border rounded-md px-3 py-2">
              Esta reemissão será registrada em auditoria com versão anterior, nova versão, códigos, usuário, data/hora e justificativa.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={saving}>Cancelar</Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleConfirm} disabled={saving}>
            {saving ? "Reemitindo..." : "Confirmar Reemissão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}