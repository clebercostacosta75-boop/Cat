import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { registrarEventoMatricula } from "@/lib/centralMatricula";

export default function CancelarMatriculaModal({ enrollment, onClose, onDone }) {
  const [motivo, setMotivo] = useState("");
  const [dataCancelamento, setDataCancelamento] = useState(new Date().toISOString().split("T")[0]);
  const [observacao, setObservacao] = useState("");
  const [tratamentoFinanceiro, setTratamentoFinanceiro] = useState("sem_devolucao");
  const [confirmar, setConfirmar] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!enrollment) return null;

  const handleCancelar = async () => {
    if (!motivo.trim()) { toast.error("O motivo é obrigatório."); return; }
    setSaving(true);
    try {
      const agora = new Date().toISOString();

      // Liberar vaga se existir reserva
      if (enrollment.seat_reservation_id) {
        try {
          await base44.entities.SeatReservation.update(enrollment.seat_reservation_id, {
            status: "Cancelled",
            released_at: agora,
          });
        } catch { /* reserva pode já ter sido liberada */ }
      }

      // Atualizar matrícula
      await base44.entities.StudentCourseEnrollment.update(enrollment.id, {
        workflow_stage: "Cancelled",
        status_matricula: "Cancelado",
        cancellation_reason: `${motivo.trim()}${observacao ? `. Obs: ${observacao}` : ""}. Tratamento financeiro: ${tratamentoFinanceiro}. Data: ${dataCancelamento}.`,
        last_pending_reason: tratamentoFinanceiro !== "sem_devolucao" ? `Cancelamento com pendência financeira: ${tratamentoFinanceiro}` : "",
        last_pending_at: tratamentoFinanceiro !== "sem_devolucao" ? agora : undefined,
      });

      // Timeline
      await registrarEventoMatricula({
        enrollment,
        eventType: "matricula_cancelada",
        title: "Matrícula cancelada",
        description: `Motivo: ${motivo.trim()}. Tratamento financeiro: ${tratamentoFinanceiro}.${observacao ? ` Obs: ${observacao}` : ""}`,
        metadata: { data_cancelamento: dataCancelamento, tratamento_financeiro: tratamentoFinanceiro },
      });

      toast.success("Matrícula cancelada com sucesso.");
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <XCircle className="w-5 h-5" /> Cancelar Matrícula
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="bg-gray-50 border rounded-md p-3 text-sm space-y-1">
            <p><span className="text-gray-500">Aluno:</span> <strong>{enrollment.student_name}</strong></p>
            <p><span className="text-gray-500">Curso:</span> {enrollment.course_name}</p>
            <p><span className="text-gray-500">Pagamento:</span> {enrollment.status_pagamento || "Pendente"} — {enrollment.forma_pagamento || "Não informada"}</p>
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-md">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-xs text-red-800">
              Esta ação cancela <strong>somente esta matrícula</strong>. O curso e outras matrículas não serão afetados. Documentos, contrato e histórico serão preservados.
            </p>
          </div>

          <div>
            <Label>Motivo do cancelamento *</Label>
            <Textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} placeholder="Descreva o motivo..." className="mt-1" />
          </div>

          <div>
            <Label>Data do cancelamento</Label>
            <Input type="date" value={dataCancelamento} onChange={e => setDataCancelamento(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label>Tratamento financeiro</Label>
            <Select value={tratamentoFinanceiro} onValueChange={setTratamentoFinanceiro}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sem_devolucao">Sem devolução</SelectItem>
                <SelectItem value="gerar_credito">Gerar crédito para uso futuro</SelectItem>
                <SelectItem value="solicitar_estorno">Solicitar estorno</SelectItem>
                <SelectItem value="analise_financeira">Encaminhar para análise financeira</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Observação <span className="text-gray-400 font-normal">(opcional)</span></Label>
            <Textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={2} placeholder="Observações adicionais..." className="mt-1" />
          </div>

          {!confirmar ? (
            <Button variant="destructive" className="w-full" onClick={() => setConfirmar(true)} disabled={!motivo.trim()}>
              Prosseguir para confirmação
            </Button>
          ) : (
            <div className="border-2 border-red-300 rounded-md p-3 bg-red-50 space-y-2">
              <p className="text-sm font-semibold text-red-800">⚠️ Confirma o cancelamento desta matrícula?</p>
              <p className="text-xs text-red-700">
                {enrollment.student_name} — {enrollment.course_name}
                <br />Motivo: {motivo}
                <br />Tratamento financeiro: {tratamentoFinanceiro}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmar(false)} disabled={saving}>Voltar</Button>
                <Button variant="destructive" onClick={handleCancelar} disabled={saving}>
                  {saving ? "Cancelando..." : "Confirmar cancelamento"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}