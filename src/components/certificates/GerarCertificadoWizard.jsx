/**
 * GerarCertificadoWizard
 * Modal de 3 passos para geração manual de certificado por usuário autorizado.
 * NUNCA gera certificado automaticamente.
 */
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle2, ChevronRight, ChevronLeft, Eye, Award,
  User, BookOpen, Building2, Calendar, Clock, AlertTriangle
} from "lucide-react";
import CertificatePreview from "./CertificatePreview";

function generateCertCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `CAT-${new Date().getFullYear()}-${code}`;
}

const STEPS = ["Verificar Dados", "Escolher Modelo", "Pré-visualizar e Confirmar"];

export default function GerarCertificadoWizard({ enrollment, onConfirm, onCancel, isLoading }) {
  const [step, setStep] = useState(0);
  const [selectedModelId, setSelectedModelId] = useState(enrollment?.certificate_model_id || "");
  const [resultado, setResultado] = useState(enrollment?.resultado_academico || "Aprovado");
  const [observacoes, setObservacoes] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const { data: certModels = [] } = useQuery({
    queryKey: ["cert-models-wizard"],
    queryFn: () => base44.entities.CertificateModel.list(),
  });

  const selectedModel = certModels.find(m => m.id === selectedModelId) || null;

  const diasAguardando = enrollment?.end_date
    ? differenceInDays(new Date(), parseISO(enrollment.end_date))
    : null;

  const certPreviewData = {
    student_name: enrollment?.student_name || "",
    student_cpf: enrollment?.student_cpf || "",
    course_name: enrollment?.course_name || "",
    course_duration: enrollment?.course_duration || "",
    start_date: enrollment?.start_date || "",
    end_date: enrollment?.end_date || "",
    valid_until: enrollment?.valid_until || "",
    client_name: enrollment?.company_name || "",
    instructor_name: enrollment?.instructor_name || "",
    certificate_code: generateCertCode(),
  };

  const handleConfirm = () => {
    onConfirm({
      enrollment,
      modelId: selectedModelId,
      model: selectedModel,
      resultado,
      observacoes,
    });
  };

  const canGoNext = () => {
    if (step === 1 && !selectedModelId) return false;
    return true;
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <Award className="w-5 h-5" />
            Gerar Certificado Manualmente
          </DialogTitle>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center gap-0 mb-4">
          {STEPS.map((s, i) => (
            <React.Fragment key={i}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === step ? "bg-emerald-600 text-white" :
                i < step ? "bg-emerald-100 text-emerald-700" :
                "bg-gray-100 text-gray-400"
              }`}>
                {i < step ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-4 h-4 flex items-center justify-center rounded-full border border-current text-[10px]">{i+1}</span>}
                {s}
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        {/* PASSO 1: Verificar dados */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-800">
                Verifique os dados do aluno e do curso antes de prosseguir. O certificado <strong>somente será gerado após sua confirmação</strong> no passo 3.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Aluno */}
              <div className="border rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-gray-800 flex items-center gap-1.5 text-sm">
                  <User className="w-4 h-4 text-blue-500" /> Dados do Aluno
                </h3>
                <div className="space-y-1 text-sm">
                  <div><span className="text-gray-500">Nome:</span> <span className="font-medium">{enrollment?.student_name}</span></div>
                  <div><span className="text-gray-500">CPF:</span> <span className="font-mono">{enrollment?.student_cpf}</span></div>
                  {enrollment?.student_email && <div><span className="text-gray-500">E-mail:</span> {enrollment.student_email}</div>}
                  {enrollment?.student_phone && <div><span className="text-gray-500">WhatsApp:</span> {enrollment.student_phone}</div>}
                </div>
              </div>

              {/* Curso */}
              <div className="border rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-gray-800 flex items-center gap-1.5 text-sm">
                  <BookOpen className="w-4 h-4 text-purple-500" /> Dados do Curso
                </h3>
                <div className="space-y-1 text-sm">
                  <div><span className="text-gray-500">Curso:</span> <span className="font-medium">{enrollment?.course_name}</span></div>
                  {enrollment?.course_duration && <div><span className="text-gray-500">Carga Horária:</span> {enrollment.course_duration}</div>}
                  {enrollment?.start_date && <div><span className="text-gray-500">Início:</span> {format(parseISO(enrollment.start_date), "dd/MM/yyyy")}</div>}
                  {enrollment?.end_date && <div><span className="text-gray-500">Conclusão:</span> {format(parseISO(enrollment.end_date), "dd/MM/yyyy")}</div>}
                  {enrollment?.valid_until && <div><span className="text-gray-500">Válido até:</span> <span className="text-emerald-700 font-medium">{format(parseISO(enrollment.valid_until), "dd/MM/yyyy")}</span></div>}
                </div>
              </div>

              {/* Empresa */}
              {enrollment?.company_name && (
                <div className="border rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-1.5 text-sm">
                    <Building2 className="w-4 h-4 text-orange-500" /> Empresa
                  </h3>
                  <p className="text-sm font-medium">{enrollment.company_name}</p>
                </div>
              )}

              {/* Instrutor */}
              {enrollment?.instructor_name && (
                <div className="border rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-1.5 text-sm">
                    <User className="w-4 h-4 text-teal-500" /> Instrutor
                  </h3>
                  <p className="text-sm font-medium">{enrollment.instructor_name}</p>
                </div>
              )}
            </div>

            {diasAguardando !== null && diasAguardando > 0 && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${diasAguardando > 30 ? "bg-red-50 border border-red-200 text-red-700" : "bg-blue-50 border border-blue-200 text-blue-700"}`}>
                <Clock className="w-4 h-4" />
                Aluno aguarda certificado há <strong>{diasAguardando} dia{diasAguardando !== 1 ? "s" : ""}</strong>
                {diasAguardando > 30 && " — prioridade alta!"}
              </div>
            )}
          </div>
        )}

        {/* PASSO 2: Escolher modelo */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Escolha o modelo de certificado a ser usado. Os dados do aluno preencherão automaticamente o modelo selecionado.</p>

            {certModels.length === 0 && (
              <div className="text-center py-8 text-gray-400 border rounded-lg">
                <Award className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>Nenhum modelo de certificado encontrado.</p>
                <p className="text-xs mt-1">Crie modelos no Designer de Modelos antes de gerar certificados.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
              {certModels.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModelId(m.id)}
                  className={`text-left border-2 rounded-lg p-3 transition-all ${
                    selectedModelId === m.id
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{m.name}</p>
                      {m.modality && <p className="text-xs text-gray-500 mt-0.5">{m.modality}</p>}
                      {m.duration && <p className="text-xs text-gray-400">{m.duration}</p>}
                      {m.validity_period_months && (
                        <p className="text-xs text-emerald-600 mt-1">Validade: {m.validity_period_months} meses</p>
                      )}
                    </div>
                    {selectedModelId === m.id && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                  </div>
                </button>
              ))}
            </div>

            {/* Resultado e observações */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm text-gray-700">Resultado do Treinamento</h4>
              {enrollment?.resultado_academico ? (
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800">{enrollment.resultado_academico}</Badge>
                  <span className="text-xs text-gray-500">
                    Definido na Gestão Acadêmica{enrollment.responsavel_resultado ? ` por ${enrollment.responsavel_resultado}` : ""} — somente leitura
                  </span>
                </div>
              ) : (
              <div className="flex gap-2">
                {[
                  { value: "Aprovado", label: "🟢 Aprovado", cls: "border-green-300 text-green-700 bg-green-50" },
                  { value: "Reprovado", label: "🔴 Reprovado", cls: "border-red-300 text-red-700 bg-red-50" },
                  { value: "Não Concluiu", label: "🟡 Não Concluiu", cls: "border-yellow-300 text-yellow-700 bg-yellow-50" },
                ].map(r => (
                  <button
                    key={r.value}
                    onClick={() => setResultado(r.value)}
                    className={`flex-1 border-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${
                      resultado === r.value ? `${r.cls} border-opacity-100` : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observações (opcional)</label>
                <textarea
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                  rows={2}
                  placeholder="Observações que aparecerão no certificado..."
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* PASSO 3: Pré-visualizar e confirmar */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-emerald-800">
                <p className="font-semibold mb-0.5">Confirme antes de gerar</p>
                <p>O certificado será gerado com o modelo <strong>{selectedModel?.name || "—"}</strong> para <strong>{enrollment?.student_name}</strong>.</p>
                <p className="mt-0.5">Resultado: <strong>{resultado}</strong>{observacoes ? ` · Obs: ${observacoes}` : ""}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-gray-700">Pré-visualização do Certificado</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(v => !v)}
                className="text-xs gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                {showPreview ? "Ocultar" : "Pré-visualizar"}
              </Button>
            </div>

            {showPreview && (
              <div className="border rounded-lg overflow-hidden">
                <CertificatePreview model={selectedModel} cert={certPreviewData} scale={0.38} />
              </div>
            )}

            <div className="bg-gray-50 border rounded-lg p-3 text-xs text-gray-500">
              <p>⚠️ Após confirmar, o certificado será registrado com <strong>data, hora e seu nome</strong> no log de auditoria.</p>
            </div>
          </div>
        )}

        {/* Botões de navegação */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={step === 0 ? onCancel : () => setStep(s => s - 1)}>
            {step === 0 ? "Cancelar" : <><ChevronLeft className="w-4 h-4 mr-1" /> Voltar</>}
          </Button>

          {step < 2 ? (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setStep(s => s + 1)}
              disabled={!canGoNext()}
            >
              Próximo <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? "Gerando..." : <><Award className="w-4 h-4 mr-1" /> Confirmar e Gerar Certificado</>}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}