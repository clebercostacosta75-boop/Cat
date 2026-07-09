import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { verificarAptidao } from "@/lib/aptidaoCertificacao";

const OPCOES = [
  { value: "Aprovado", label: "🟢 Aprovado", cls: "border-green-400 bg-green-50 text-green-800" },
  { value: "Reprovado", label: "🔴 Reprovado", cls: "border-red-400 bg-red-50 text-red-800" },
  { value: "Não Concluiu", label: "🟡 Não Concluiu", cls: "border-yellow-400 bg-yellow-50 text-yellow-800" },
  { value: "Pendente", label: "⚪ Pendente", cls: "border-gray-400 bg-gray-100 text-gray-700" },
];

export default function ResultadoAcademicoModal({ enrollment, onClose, onSaved }) {
  const [resultado, setResultado] = useState(enrollment?.resultado_academico || "Pendente");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: certModels = [] } = useQuery({
    queryKey: ["cert-models-resultado"],
    queryFn: () => base44.entities.CertificateModel.list(),
  });
  const { data: certificates = [] } = useQuery({
    queryKey: ["certs-resultado", enrollment?.id],
    queryFn: () => base44.entities.Certificate.filter({ enrollment_id: enrollment.id }),
    enabled: !!enrollment?.id,
  });

  if (!enrollment) return null;

  const aval = verificarAptidao({ ...enrollment, resultado_academico: resultado }, { certModels, certificates });
  const apto = resultado === "Aprovado" && aval.grupo === "aguardando";

  const handleSave = async () => {
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      const agora = new Date().toISOString();
      const anterior = enrollment.resultado_academico || "—";
      const responsavel = user?.full_name || user?.email || "desconhecido";

      const updateData = {
        resultado_academico: resultado,
        data_resultado: agora,
        responsavel_resultado: responsavel,
        observacao_resultado: observacao,
        status_matricula: ["Aprovado", "Reprovado"].includes(resultado)
          ? "Concluído"
          : enrollment.status_matricula || "Em Andamento",
        apto_certificacao: apto,
        ...(apto ? { data_apto_certificacao: agora } : {}),
      };
      // Aprovado entra automaticamente na área de certificação
      if (resultado === "Aprovado" && enrollment.status === "Aguardando Autorização") {
        updateData.status = "Autorizado";
        updateData.authorized_by = user?.email || "";
        updateData.authorized_at = agora;
      }

      await base44.entities.StudentCourseEnrollment.update(enrollment.id, updateData);

      await base44.entities.AuditLog.create({
        user_email: user?.email || "desconhecido",
        user_name: responsavel,
        action: "update",
        entity_type: "StudentCourseEnrollment",
        entity_id: enrollment.id,
        entity_name: `${enrollment.student_name} — ${enrollment.course_name}`,
        details: `Resultado acadêmico alterado: "${anterior}" → "${resultado}" em ${new Date().toLocaleString("pt-BR")}.${observacao ? ` Justificativa: ${observacao}.` : ""} ${
          apto
            ? "Aluno APTO para certificação."
            : resultado === "Aprovado"
              ? `Aprovado com pendências bloqueantes: ${aval.bloqueios.join("; ")}.`
              : "Aluno BLOQUEADO para certificação."
        }`,
      }).catch(() => {});

      toast.success("Resultado acadêmico registrado!");
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error("Erro ao salvar resultado: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-800">
            <GraduationCap className="w-5 h-5" /> Resultado Acadêmico
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-gray-50 border rounded-md p-3 text-sm space-y-0.5">
            <p><span className="text-gray-500">Aluno:</span> <strong>{enrollment.student_name}</strong></p>
            <p><span className="text-gray-500">Curso:</span> {enrollment.course_name}</p>
            {enrollment.resultado_academico && (
              <p><span className="text-gray-500">Resultado atual:</span> <strong>{enrollment.resultado_academico}</strong>
                {enrollment.responsavel_resultado ? ` (por ${enrollment.responsavel_resultado})` : ""}</p>
            )}
          </div>

          <div>
            <Label>Resultado *</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {OPCOES.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setResultado(o.value)}
                  className={`border-2 rounded-lg px-2 py-2 text-xs font-medium transition-all ${
                    resultado === o.value ? o.cls : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Observação / Justificativa</Label>
            <Textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Aprovado na avaliação prática com 90% de presença" className="mt-1" />
          </div>

          {/* Prévia de aptidão */}
          {resultado === "Aprovado" ? (
            apto ? (
              <div className="flex items-start gap-2 p-2.5 bg-green-50 border border-green-200 rounded-md text-xs text-green-800">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Ao salvar, o aluno ficará <strong>APTO</strong> e entrará na <strong>Fila de Certificação — Aguardando Emissão</strong>.
                  {aval.alertas.length > 0 && <> Alertas: {aval.alertas.join("; ")}.</>}</span>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-300 rounded-md text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Aprovado, mas com <strong>pendências bloqueantes</strong>: {aval.bloqueios.join("; ")}. O aluno aparecerá em <strong>Pendências</strong> na fila.</span>
              </div>
            )
          ) : (
            <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Com este resultado o aluno fica <strong>bloqueado para emissão de certificado</strong>.</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button className="bg-indigo-700 hover:bg-indigo-800" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Resultado"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}