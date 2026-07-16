import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PauseCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { registrarEventoMatricula } from "@/lib/centralMatricula";

export default function TrancarMatriculaModal({ enrollment, onClose, onDone }) {
  const [motivo, setMotivo] = useState("");
  const [dataTranca, setDataTranca] = useState(new Date().toISOString().split("T")[0]);
  const [previsaoRetorno, setPrevisaoRetorno] = useState("");
  const [vagaDecisao, setVagaDecisao] = useState("manter"); // manter | liberar
  const [saving, setSaving] = useState(false);

  if (!enrollment) return null;

  const handleConfirmar = async () => {
    if (!motivo.trim()) { toast.error("O motivo é obrigatório."); return; }
    if (!dataTranca) { toast.error("Informe a data do trancamento."); return; }
    setSaving(true);
    try {
      const agora = new Date().toISOString();

      // Atualizar matrícula
      const updates = {
        workflow_stage: "Suspended",
        suspended_at: agora,
        last_pending_reason: `Trancada em ${dataTranca}: ${motivo.trim()}${previsaoRetorno ? `. Retorno previsto: ${previsaoRetorno}` : ""}`,
        last_pending_at: agora,
      };

      // Se liberar vaga e tiver reserva, marcar como Released
      if (vagaDecisao === "liberar" && enrollment.seat_reservation_id) {
        try {
          await base44.entities.SeatReservation.update(enrollment.seat_reservation_id, {
            status: "Released",
            released_at: agora,
          });
        } catch { /* reserva pode já ter sido liberada */ }
      }

      await base44.entities.StudentCourseEnrollment.update(enrollment.id, updates);

      // Timeline
      await registrarEventoMatricula({
        enrollment,
        eventType: "matricula_suspensa",
        title: "Matrícula trancada",
        description: `Motivo: ${motivo.trim()}. Data: ${dataTranca}.${previsaoRetorno ? ` Retorno previsto: ${previsaoRetorno}.` : ""} Vaga: ${vagaDecisao === "liberar" ? "liberada" : "mantida"}.`,
        metadata: { data_trancamento: dataTranca, previsao_retorno: previsaoRetorno, vaga: vagaDecisao },
      });

      toast.success("Matrícula trancada com sucesso.");
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
            <PauseCircle className="w-5 h-5" /> Trancar Matrícula
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="bg-gray-50 border rounded-md p-3 text-sm space-y-1">
            <p><span className="text-gray-500">Aluno:</span> <strong>{enrollment.student_name}</strong></p>
            <p><span className="text-gray-500">Curso:</span> {enrollment.course_name}</p>
            <p><span className="text-gray-500">Período:</span> {enrollment.start_date} → {enrollment.end_date}</p>
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-800">O acesso ao curso será pausado. A matrícula poderá ser reativada posteriormente.</p>
          </div>

          <div>
            <Label>Motivo do trancamento *</Label>
            <Textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} placeholder="Descreva o motivo..." className="mt-1" />
          </div>

          <div>
            <Label>Data do trancamento *</Label>
            <Input type="date" value={dataTranca} onChange={e => setDataTranca(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label>Previsão de retorno <span className="text-gray-400 font-normal">(opcional)</span></Label>
            <Input type="date" value={previsaoRetorno} onChange={e => setPrevisaoRetorno(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label>Vaga</Label>
            <Select value={vagaDecisao} onValueChange={setVagaDecisao}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manter">Manter vaga reservada para o aluno</SelectItem>
                <SelectItem value="liberar">Liberar vaga para outro aluno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button onClick={handleConfirmar} disabled={saving || !motivo.trim()}>
              {saving ? "Processando..." : "Confirmar trancamento"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}