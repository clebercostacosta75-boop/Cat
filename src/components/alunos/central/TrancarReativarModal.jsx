import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function TrancarReativarModal({ enrollment, onClose, onDone }) {
  const isReativar = enrollment.workflow_stage === "Suspended";
  const [motivo, setMotivo] = useState("");
  const [previsaoRetorno, setPrevisaoRetorno] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSalvar = async () => {
    if (!isReativar && !motivo.trim()) { toast.error("Informe o motivo do trancamento."); return; }
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      const quem = user?.full_name || user?.email || "Usuário";
      const agora = new Date().toISOString();
      const agoraBR = new Date().toLocaleString("pt-BR");

      const nota = isReativar
        ? `Matrícula reativada em ${agoraBR} por ${quem}.${motivo ? ` Obs: ${motivo}` : ""}`
        : `Matrícula trancada em ${agoraBR} por ${quem}. Motivo: ${motivo}.${previsaoRetorno ? ` Previsão de retorno: ${previsaoRetorno}.` : ""}`;

      await base44.entities.StudentCourseEnrollment.update(enrollment.id, {
        ...(isReativar
          ? { workflow_stage: "InProgress", reactivated_at: agora }
          : { workflow_stage: "Suspended", suspended_at: agora }),
        notes: [enrollment.notes, nota].filter(Boolean).join(" | "),
      });

      await base44.entities.StudentTimeline.create({
        student_id: enrollment.student_id,
        student_name: enrollment.student_name,
        event_type: isReativar ? "matricula_reativada" : "matricula_suspensa",
        title: `${isReativar ? "Matrícula reativada" : "Matrícula trancada"} — ${enrollment.course_name}`,
        description: nota,
        performed_by: user?.email || "",
        metadata: { enrollment_id: enrollment.id },
      });

      await base44.entities.AuditLog.create({
        user_email: user?.email || "desconhecido",
        user_name: quem,
        action: "update",
        entity_type: "StudentCourseEnrollment",
        entity_id: enrollment.id,
        entity_name: `${enrollment.student_name} — ${enrollment.course_name}`,
        details: nota,
      });

      toast.success(isReativar ? "Matrícula reativada!" : "Matrícula trancada!");
      onDone && onDone();
      onClose();
    } catch (err) {
      toast.error("Erro: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isReativar ? "▶️ Reativar Matrícula" : "⏸️ Trancar Matrícula"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="bg-gray-50 border rounded-md p-3 text-sm space-y-1">
            <p><span className="text-gray-500">Aluno:</span> <strong>{enrollment.student_name}</strong></p>
            <p><span className="text-gray-500">Curso:</span> {enrollment.course_name}</p>
          </div>
          <div>
            <Label>{isReativar ? "Observação (opcional)" : "Motivo do trancamento *"}</Label>
            <Textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder={isReativar ? "Ex: aluno retornou às atividades" : "Ex: solicitação do aluno por motivo de saúde"}
              className="mt-1"
              rows={3}
            />
          </div>
          {!isReativar && (
            <div>
              <Label>Previsão de retorno <span className="text-gray-400 font-normal">(opcional)</span></Label>
              <Input type="date" value={previsaoRetorno} onChange={e => setPrevisaoRetorno(e.target.value)} className="mt-1" />
            </div>
          )}
          <p className="text-xs text-gray-500">
            {isReativar
              ? "A matrícula voltará ao andamento normal. Nenhum registro será excluído."
              : "A matrícula ficará suspensa, sem excluir registros acadêmicos ou financeiros."}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button
              className={isReativar ? "bg-green-600 hover:bg-green-700" : "bg-amber-600 hover:bg-amber-700"}
              onClick={handleSalvar}
              disabled={saving}
            >
              {saving ? "Salvando..." : isReativar ? "Reativar" : "Trancar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}