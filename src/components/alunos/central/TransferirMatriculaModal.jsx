import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowRight, AlertTriangle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { registrarEventoMatricula, buscarAlunosPorCpf, normalizarCpf } from "@/lib/centralMatricula";

const EMPTY_STUDENT = {
  full_name: "", cpf: "", email: "", whatsapp: "",
  data_nascimento: "", rg: "", rg_orgao_emissor: "",
};

export default function TransferirMatriculaModal({ enrollment, onClose, onDone }) {
  const [step, setStep] = useState("busca"); // busca | confirmar | cadastrar
  const [cpfBusca, setCpfBusca] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [alunoDestino, setAlunoDestino] = useState(null);
  const [novoAluno, setNovoAluno] = useState(EMPTY_STUDENT);
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  if (!enrollment) return null;

  const handleBuscar = async () => {
    const d = normalizarCpf(cpfBusca);
    if (d.length !== 11) { toast.error("CPF inválido (11 dígitos)."); return; }
    if (d === normalizarCpf(enrollment.student_cpf)) { toast.error("O CPF é do mesmo aluno."); return; }
    setBuscando(true);
    const result = await buscarAlunosPorCpf(cpfBusca);
    setBuscando(false);
    if (result.status === "existente") {
      setAlunoDestino(result.alunos[0]);
      setStep("confirmar");
    } else if (result.status === "novo") {
      setNovoAluno({ ...EMPTY_STUDENT, cpf: cpfBusca });
      setStep("cadastrar");
    } else if (result.status === "duplicidade") {
      toast.error("CPF com duplicidade na base. Resolva antes de transferir.");
    } else {
      toast.error("CPF inválido.");
    }
  };

  const handleCadastrar = async () => {
    if (!novoAluno.full_name.trim() || !novoAluno.cpf.trim()) { toast.error("Nome e CPF são obrigatórios."); return; }
    setSaving(true);
    try {
      const criado = await base44.entities.Student.create({
        ...novoAluno,
        status: "Ativo",
        origem: "CAT App",
      });
      setAlunoDestino(criado);
      setStep("confirmar");
      toast.success("Aluno cadastrado.");
    } catch (e) {
      toast.error("Erro ao cadastrar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTransferir = async () => {
    if (!motivo.trim()) { toast.error("O motivo é obrigatório."); return; }
    if (!alunoDestino) { toast.error("Selecione o aluno de destino."); return; }
    if (enrollment.transfer_to_enrollment_id) { toast.error("Esta matrícula já foi transferida."); return; }
    setSaving(true);
    try {
      const agora = new Date().toISOString();

      // Pendências de validação (contrato / financeiro) — a transferência fica pendente de análise
      const pendencias = [
        enrollment.contract_id ? "Contrato da matrícula de origem requer nova validação/geração." : "",
        ["Pago", "Parcialmente Pago"].includes(enrollment.status_pagamento) ? "Situação financeira da origem requer validação do Financeiro." : "",
      ].filter(Boolean);

      // 1. Criar nova matrícula para aluno de destino
      const novaData = {
        student_id: alunoDestino.id,
        student_name: alunoDestino.full_name,
        student_cpf: alunoDestino.cpf,
        student_email: alunoDestino.email || "",
        student_phone: alunoDestino.whatsapp || "",
        course_id: enrollment.course_id,
        course_name: enrollment.course_name,
        course_duration: enrollment.course_duration,
        company_id: enrollment.company_id,
        company_name: enrollment.company_name,
        start_date: enrollment.start_date,
        end_date: enrollment.end_date,
        status: "Aguardando Autorização",
        status_matricula: "Matriculado",
        workflow_stage: "Confirmed",
        transfer_from_enrollment_id: enrollment.id,
        transfer_reason: motivo.trim(),
        course_offer_id: enrollment.course_offer_id || enrollment.oferta_id || "",
        oferta_id: enrollment.oferta_id || "",
        oferta_nome: enrollment.oferta_nome || "",
        class_schedule_id: enrollment.class_schedule_id || "",
        seat_reservation_id: enrollment.seat_reservation_id || "",
        unit_value: enrollment.unit_value,
        forma_pagamento: enrollment.forma_pagamento,
        status_pagamento: "Pendente",
        data_inscricao: agora,
        origem_inscricao: "Outro",
        ...(pendencias.length > 0 ? { last_pending_reason: pendencias.join(" | "), last_pending_at: agora } : {}),
      };
      const novaMatricula = await base44.entities.StudentCourseEnrollment.create(novaData);

      // 2. Marcar matrícula original como Transferida
      await base44.entities.StudentCourseEnrollment.update(enrollment.id, {
        workflow_stage: "Transferred",
        status_matricula: "Cancelado",
        transfer_to_enrollment_id: novaMatricula.id,
        transfer_reason: motivo.trim(),
        cancellation_reason: `Transferida para ${alunoDestino.full_name} (CPF: ${alunoDestino.cpf}). Motivo: ${motivo.trim()}`,
      });

      // 3. Timeline do aluno de origem
      await registrarEventoMatricula({
        enrollment,
        eventType: "matricula_transferida",
        title: "Matrícula transferida (origem)",
        description: `Transferida para ${alunoDestino.full_name} (${alunoDestino.cpf}). Motivo: ${motivo.trim()}`,
        metadata: { nova_matricula_id: novaMatricula.id, aluno_destino_id: alunoDestino.id },
      });

      // 4. Timeline do aluno de destino
      await registrarEventoMatricula({
        enrollment: novaMatricula,
        eventType: "matricula_transferida",
        title: "Matrícula recebida por transferência",
        description: `Recebida de ${enrollment.student_name} (${enrollment.student_cpf}). Motivo: ${motivo.trim()}`,
        metadata: { matricula_origem_id: enrollment.id, aluno_origem_id: enrollment.student_id },
      });

      toast.success("Transferência concluída com sucesso.");
      onDone();
      onClose();
    } catch (e) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (f, v) => setNovoAluno(p => ({ ...p, [f]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5" /> Transferir Matrícula para Outro Aluno
          </DialogTitle>
        </DialogHeader>

        <div className="bg-gray-50 border rounded-md p-3 text-sm space-y-1">
          <p><span className="text-gray-500">Aluno atual:</span> <strong>{enrollment.student_name}</strong> ({enrollment.student_cpf})</p>
          <p><span className="text-gray-500">Curso:</span> {enrollment.course_name}</p>
          <p><span className="text-gray-500">Período:</span> {enrollment.start_date} → {enrollment.end_date}</p>
        </div>

        {step === "busca" && (
          <div className="space-y-3">
            <div>
              <Label>CPF do aluno de destino *</Label>
              <div className="flex gap-2 mt-1">
                <Input value={cpfBusca} onChange={e => setCpfBusca(e.target.value)} placeholder="000.000.000-00" />
                <Button onClick={handleBuscar} disabled={buscando}>{buscando ? "Buscando..." : "Buscar"}</Button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Se o CPF não existir, será possível cadastrar o novo aluno.</p>
            </div>
          </div>
        )}

        {step === "cadastrar" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <UserPlus className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <p className="text-xs text-blue-800">CPF não encontrado. Cadastre o novo aluno abaixo.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Nome completo *</Label><Input value={novoAluno.full_name} onChange={e => set("full_name", e.target.value)} /></div>
              <div><Label>CPF *</Label><Input value={novoAluno.cpf} onChange={e => set("cpf", e.target.value)} /></div>
              <div><Label>E-mail</Label><Input value={novoAluno.email} onChange={e => set("email", e.target.value)} /></div>
              <div><Label>WhatsApp</Label><Input value={novoAluno.whatsapp} onChange={e => set("whatsapp", e.target.value)} /></div>
              <div><Label>Data de nascimento</Label><Input type="date" value={novoAluno.data_nascimento} onChange={e => set("data_nascimento", e.target.value)} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("busca")}>Voltar</Button>
              <Button onClick={handleCadastrar} disabled={saving}>{saving ? "Cadastrando..." : "Cadastrar e continuar"}</Button>
            </div>
          </div>
        )}

        {step === "confirmar" && alunoDestino && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="border rounded-md p-3 space-y-1">
                <p className="text-xs text-gray-400 uppercase font-semibold">Origem</p>
                <p className="font-semibold">{enrollment.student_name}</p>
                <p className="text-xs text-gray-500">{enrollment.student_cpf}</p>
              </div>
              <div className="border rounded-md p-3 space-y-1 bg-blue-50 border-blue-200">
                <p className="text-xs text-blue-600 uppercase font-semibold">Destino</p>
                <p className="font-semibold">{alunoDestino.full_name}</p>
                <p className="text-xs text-gray-500">{alunoDestino.cpf}</p>
              </div>
            </div>

            <div className="bg-gray-50 border rounded-md p-3 text-xs text-gray-600 space-y-1">
              <p>📄 Contrato: {enrollment.contract_id ? "vinculado — exigirá nova validação" : "não gerado"}</p>
              <p>💰 Financeiro: {enrollment.status_pagamento || "Pendente"} ({enrollment.forma_pagamento || "—"})</p>
              <p>🎟️ Turma/Vaga: {enrollment.class_schedule_id ? "turma vinculada" : "sem turma"}{enrollment.seat_reservation_id ? " · reserva mantida (sem dupla contagem)" : ""}</p>
            </div>

            <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                A matrícula original será marcada como <strong>Transferida</strong>. Uma nova matrícula será criada para o aluno de destino.
              </p>
            </div>

            <div>
              <Label>Motivo da transferência *</Label>
              <Textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} placeholder="Descreva o motivo..." className="mt-1" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setStep("busca"); setAlunoDestino(null); }}>Voltar</Button>
              <Button onClick={handleTransferir} disabled={saving || !motivo.trim()}>
                {saving ? "Transferindo..." : "Confirmar transferência"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}