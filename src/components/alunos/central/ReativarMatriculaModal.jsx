import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { registrarEventoMatricula } from "@/lib/centralMatricula";

export default function ReativarMatriculaModal({ enrollment, onClose, onDone }) {
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  if (!enrollment) return null;

  const handleReativar = async () => {
    if (!motivo.trim()) { toast.error("A justificativa é obrigatória."); return; }
    setSaving(true);
    try {
      await base44.entities.StudentCourseEnrollment.update(enrollment.id, {
        workflow_stage: "InProgress",
        status_matricula: "Em Andamento",
        reactivated_at: new Date().toISOString(),
        last_pending_reason: "",
      });

      await registrarEventoMatricula({
        enrollment,
        eventType: "matricula_reativada",
        title: "Matrícula reativada",
        description: `Justificativa: ${motivo.trim()}`,
      });

      toast.success("Matrícula reativada com sucesso.");
      onDone();
      onClose();
    } catch (e) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5" /> Reativar Matrícula
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-gray-50 border rounded-md p-3 text-sm space-y-1">
            <p><span className="text-gray-500">Aluno:</span> <strong>{enrollment.student_name}</strong></p>
            <p><span className="text-gray-500">Curso:</span> {enrollment.course_name}</p>
            <p><span className="text-gray-500">Trancada em:</span> {enrollment.suspended_at ? new Date(enrollment.suspended_at).toLocaleString("pt-BR") : "—"}</p>
          </div>

          <div>
            <Label>Justificativa da reativação *</Label>
            <Textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} placeholder="Descreva o motivo da reativação..." className="mt-1" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button onClick={handleReativar} disabled={saving || !motivo.trim()}>
              {saving ? "Processando..." : "Confirmar reativação"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}