/**
 * SPR-2D-1 — Modal padrão de Correção Operacional.
 * Exibe campo, valor atual → novo valor, exige justificativa e avisa sobre certificados emitidos.
 */
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, FileWarning } from "lucide-react";

export default function CorrecaoDadosDialog({ open, alteracoes = [], certificadosRelacionados = [], onConfirm, onCancel, saving = false }) {
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (open) { setJustificativa(""); setErro(""); }
  }, [open]);

  const handleConfirm = () => {
    if (!justificativa.trim()) {
      setErro("Justificativa obrigatória. Descreva o motivo da correção.");
      return;
    }
    onConfirm(justificativa.trim());
  };

  return (
    <Dialog open={open} onOpenChange={() => !saving && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <ShieldAlert className="w-5 h-5" /> Correção de Dados Sensíveis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="border rounded-lg divide-y text-sm">
            {alteracoes.map((a, i) => (
              <div key={i} className="px-3 py-2">
                <p className="text-xs font-semibold text-gray-500 uppercase">{a.rotulo || a.campo}</p>
                <p className="text-gray-700">
                  <span className="line-through text-red-600">{String(a.valor_anterior ?? "—") || "—"}</span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className="font-medium text-green-700">{String(a.valor_novo ?? "—") || "—"}</span>
                </p>
              </div>
            ))}
          </div>

          {certificadosRelacionados.length > 0 && (
            <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-md p-3 text-xs text-orange-800">
              <FileWarning className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Esta matrícula possui certificado emitido ({certificadosRelacionados.map(c => c.certificate_code).join(", ")}).
                A correção será registrada no cadastro/matrícula, mas o <strong>certificado já emitido não será alterado
                diretamente</strong>. Caso necessário, utilize o fluxo de reemissão.
              </span>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium">Justificativa <span className="text-red-500">*</span></Label>
            <Textarea
              rows={3}
              className="mt-1"
              placeholder="Descreva obrigatoriamente o motivo desta correção..."
              value={justificativa}
              onChange={(e) => { setJustificativa(e.target.value); setErro(""); }}
            />
            {erro && <p className="text-xs text-red-500 mt-1">{erro}</p>}
          </div>

          <p className="text-xs text-gray-500 bg-gray-50 border rounded-md px-3 py-2">
            Esta correção será registrada em auditoria com valor anterior, valor novo, usuário, data/hora e justificativa.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleConfirm} disabled={saving}>
            {saving ? "Registrando..." : "Confirmar correção"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}