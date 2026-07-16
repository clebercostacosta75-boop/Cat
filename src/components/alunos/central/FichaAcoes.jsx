import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { registrarEventoMatricula, derivarEtapa } from "@/lib/centralMatricula";
import AcoesMatriculaModal from "@/components/alunos/AcoesMatriculaModal";

const ACOES_INTERNAS = {
  suspender: {
    label: "⏸️ Suspender Matrícula",
    titulo: "Suspender Matrícula",
    evento: "matricula_suspensa",
    update: (j) => ({ workflow_stage: "Suspended", suspended_at: new Date().toISOString(), last_pending_reason: `Suspensa: ${j}`, last_pending_at: new Date().toISOString() }),
  },
  reativar: {
    label: "▶️ Reativar Matrícula",
    titulo: "Reativar Matrícula",
    evento: "matricula_reativada",
    update: () => ({ workflow_stage: "InProgress", reactivated_at: new Date().toISOString(), last_pending_reason: "" }),
  },
  renegociar: {
    label: "🤝 Renegociar (registro)",
    titulo: "Registrar Renegociação",
    evento: "renegociacao",
    update: (j, e) => ({ notes: [e.notes, `Renegociação: ${j} (${new Date().toLocaleString("pt-BR")})`].filter(Boolean).join(" | ") }),
  },
};

export default function FichaAcoes({ enrollment, onChanged }) {
  const [acaoAtiva, setAcaoAtiva] = useState(null); // chave de ACOES_INTERNAS
  const [justificativa, setJustificativa] = useState("");
  const [saving, setSaving] = useState(false);
  const [acoesLegadasOpen, setAcoesLegadasOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const etapa = derivarEtapa(enrollment);

  const executar = async () => {
    const acao = ACOES_INTERNAS[acaoAtiva];
    if (!justificativa.trim()) { toast.error("A justificativa é obrigatória."); return; }
    setSaving(true);
    try {
      await base44.entities.StudentCourseEnrollment.update(enrollment.id, acao.update(justificativa.trim(), enrollment));
      await registrarEventoMatricula({
        enrollment,
        eventType: acao.evento,
        title: acao.titulo,
        description: `Justificativa: ${justificativa.trim()}`,
      });
      toast.success(`${acao.titulo} registrada com sucesso.`);
      setAcaoAtiva(null);
      setJustificativa("");
      onChanged && onChanged();
    } catch (err) {
      toast.error("Erro: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const anexarDocumento = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      let user = null;
      try { user = await base44.auth.me(); } catch { /* ignore */ }
      await base44.entities.StudentDocument.create({
        student_id: enrollment.student_id,
        student_name: enrollment.student_name,
        student_cpf: enrollment.student_cpf,
        document_type: "Outros",
        file_uri,
        file_name: file.name,
        status: "Pendente_Revisao",
        uploaded_by_email: user?.email || "",
      });
      await registrarEventoMatricula({
        enrollment,
        eventType: "documento_enviado",
        title: "Documento anexado à matrícula",
        description: `Arquivo: ${file.name}`,
      });
      toast.success("Documento anexado (pendente de revisão).");
      onChanged && onChanged();
    } catch (err) {
      toast.error("Erro ao anexar: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const AcaoDesativada = ({ label }) => (
    <div className="flex items-center justify-between border border-dashed border-gray-300 rounded-md px-3 py-2 bg-gray-50">
      <span className="text-sm text-gray-400">{label}</span>
      <Badge className="bg-gray-200 text-gray-500 text-xs">Aguardando configuração</Badge>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Diálogo de confirmação com justificativa obrigatória */}
      {acaoAtiva && (
        <Dialog open onOpenChange={() => setAcaoAtiva(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{ACOES_INTERNAS[acaoAtiva].titulo}</DialogTitle></DialogHeader>
            <p className="text-sm text-gray-600">
              {enrollment.student_name} — {enrollment.course_name}
            </p>
            <div>
              <Label>Justificativa (obrigatória) *</Label>
              <Textarea value={justificativa} onChange={(e) => setJustificativa(e.target.value)} rows={3} className="mt-1" placeholder="Descreva o motivo desta ação..." />
            </div>
            <p className="text-xs text-gray-400">Esta ação será registrada na linha do tempo do aluno e no log de auditoria.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAcaoAtiva(null)} disabled={saving}>Cancelar</Button>
              <Button className="bg-gray-900 hover:bg-gray-800" onClick={executar} disabled={saving}>{saving ? "Registrando..." : "Confirmar"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Ações legadas controladas (trocar curso/oferta, trocar turma, cancelar, transferir) */}
      {acoesLegadasOpen && (
        <AcoesMatriculaModal
          enrollment={enrollment}
          onClose={() => setAcoesLegadasOpen(false)}
          onDone={() => { setAcoesLegadasOpen(false); onChanged && onChanged(); }}
        />
      )}

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ações disponíveis</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {etapa !== "Suspended" && (
            <Button variant="outline" className="justify-start border-amber-300 text-amber-800 hover:bg-amber-50" onClick={() => setAcaoAtiva("suspender")}>
              {ACOES_INTERNAS.suspender.label}
            </Button>
          )}
          {etapa === "Suspended" && (
            <Button variant="outline" className="justify-start border-green-300 text-green-700 hover:bg-green-50" onClick={() => setAcaoAtiva("reativar")}>
              {ACOES_INTERNAS.reativar.label}
            </Button>
          )}
          <Button variant="outline" className="justify-start border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => setAcaoAtiva("renegociar")}>
            {ACOES_INTERNAS.renegociar.label}
          </Button>
          <Button variant="outline" className="justify-start border-gray-300" onClick={() => setAcoesLegadasOpen(true)}>
            🔁 Trocar curso/turma • Cancelar • Transferir
          </Button>
          <label className="cursor-pointer">
            <input type="file" className="hidden" onChange={(e) => anexarDocumento(e.target.files?.[0])} disabled={uploading} />
            <span className="inline-flex items-center justify-start w-full h-9 px-4 py-2 border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-md text-sm font-medium">
              {uploading ? "Enviando..." : "📎 Anexar Documento"}
            </span>
          </label>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Dependem de integração externa (Etapa 2)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <AcaoDesativada label="📄 Reenviar contrato (WhatsApp/E-mail)" />
          <AcaoDesativada label="🔑 Reenviar acesso ao portal" />
          <AcaoDesativada label="💳 Gerar cobrança (Asaas)" />
          <AcaoDesativada label="💸 Reembolsar" />
        </div>
      </div>
    </div>
  );
}