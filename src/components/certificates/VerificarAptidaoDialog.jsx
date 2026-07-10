import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, CheckCircle2, Ban, ShieldCheck } from "lucide-react";
import { verificarAptidao } from "@/lib/aptidaoCertificacao";
import { carregarContextoAptidao } from "@/lib/validarEmissao";

/**
 * SPR-2B-1: substitui o antigo botão "Gerar" do Cadastro de Alunos.
 * Apenas VERIFICA a aptidão pelo motor central — não emite certificado.
 */
export default function VerificarAptidaoDialog({ student, enrollments = [], onClose }) {
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    carregarContextoAptidao().then(setCtx).catch(() => setCtx({ certModels: [], certificates: [], companies: [], solicitacoes: [] }));
  }, []);

  const minhas = enrollments.filter(
    (e) => e.student_id === student.id || (student.cpf && e.student_cpf === student.cpf)
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Verificação de Aptidão — {student.full_name}
          </DialogTitle>
        </DialogHeader>

        {!ctx ? (
          <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Consultando motor de aptidão...
          </div>
        ) : minhas.length === 0 ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            <Ban className="w-4 h-4 inline mr-1" />
            Este aluno não possui nenhuma matrícula cadastrada — <strong>não é possível certificar</strong>.
            Crie a matrícula na Gestão Acadêmica antes.
          </div>
        ) : (
          <div className="space-y-3">
            {minhas.map((e) => {
              const aval = verificarAptidao(e, ctx);
              const apto = aval.grupo === "aguardando";
              const emitido = aval.grupo === "emitido";
              return (
                <div key={e.id} className={`border rounded-lg p-3 ${apto ? "border-emerald-300 bg-emerald-50" : emitido ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{e.course_name}</p>
                      <p className="text-xs text-gray-500">{e.company_name || "Individual (PF)"} · Resultado: {e.resultado_academico || "—"}</p>
                    </div>
                    {apto ? (
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4" /> APTO
                      </span>
                    ) : emitido ? (
                      <span className="text-xs font-semibold text-blue-700 flex-shrink-0">JÁ EMITIDO</span>
                    ) : (
                      <span className="text-xs font-semibold text-red-700 flex items-center gap-1 flex-shrink-0">
                        <Ban className="w-4 h-4" /> NÃO APTO
                      </span>
                    )}
                  </div>
                  {!apto && !emitido && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(aval.bloqueios || []).map((b, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">{b}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-500 bg-gray-50 border rounded-md px-3 py-2 mt-2">
          🔒 A emissão de certificados é feita exclusivamente pela <strong>Fila de Certificação</strong> (aba Controle de Certificados), somente para matrículas aptas pelo motor central.
        </p>
      </DialogContent>
    </Dialog>
  );
}