import React from "react";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Info } from "lucide-react";
import { matriculasComunidade, formatDate } from "@/lib/portalAluno";

const PAGAMENTO_CLS = {
  "Pago": "bg-green-100 text-green-800",
  "Pendente": "bg-yellow-100 text-yellow-800",
  "Parcialmente Pago": "bg-blue-100 text-blue-800",
  "Inadimplente": "bg-red-100 text-red-800",
};

// Financeiro do Portal: considera APENAS matrículas de origem Comunidade.
// Matrículas de origem Empresa nunca exibem cobrança ao aluno.
export default function PortalFinanceiro({ enrollments }) {
  const comunidade = matriculasComunidade(enrollments);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">
          As informações financeiras referem-se apenas às suas matrículas individuais (Comunidade).
          Cursos realizados pela sua empresa não geram cobrança para você.
        </p>
      </div>

      {comunidade.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>Nenhuma matrícula individual com informações financeiras.</p>
        </div>
      ) : (
        comunidade.map((e) => (
          <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{e.course_name}</p>
                <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                  {e.forma_pagamento && <span>Forma: {e.forma_pagamento}</span>}
                  {e.data_vencimento_pagamento && <span>Vencimento: {formatDate(e.data_vencimento_pagamento)}</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <p className="font-bold text-emerald-700 text-sm">
                  {e.unit_value
                    ? `R$ ${parseFloat(e.unit_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                    : "—"}
                </p>
                <Badge className={`text-xs ${PAGAMENTO_CLS[e.status_pagamento] || "bg-gray-100 text-gray-700"}`}>
                  {e.status_pagamento || "—"}
                </Badge>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}