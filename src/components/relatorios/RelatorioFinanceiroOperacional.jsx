import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";
import { fmtBRL, fmtData, contratoAssinado, contratoAguardando } from "./relatoriosUtils";

const STATUS_CLS = {
  Pago: "bg-green-100 text-green-800",
  Recebido: "bg-green-100 text-green-800",
  Pendente: "bg-yellow-100 text-yellow-800",
  Vencido: "bg-red-100 text-red-700",
  Cancelado: "bg-gray-100 text-gray-600",
  Parcial: "bg-blue-100 text-blue-800",
};

export default function RelatorioFinanceiroOperacional({ filtered, lancByEnrollment, contractByEnrollment, receiptsByEnrollment }) {
  const rows = filtered.map((e) => {
    const l = lancByEnrollment[e.id];
    const c = contractByEnrollment[e.id];
    const r = receiptsByEnrollment[e.id];
    return {
      id: e.id,
      aluno: e.student_name,
      curso: e.pacote_nome ? `${e.course_name} (Pacote: ${e.pacote_nome})` : e.course_name,
      valor: l ? l.valor : e.unit_value,
      forma: l?.forma_pagamento || e.forma_pagamento || "—",
      vencimento: l?.data_vencimento || e.data_vencimento_pagamento,
      status: l?.status || e.status_pagamento || "—",
      situacao: l?.situacao_cobranca,
      recibo: r ? r.receipt_number : null,
      contrato: c ? (contratoAssinado(c) ? "Assinado" : contratoAguardando(c) ? "Aguardando" : c.status?.replace(/_/g, " ")) : "Sem contrato",
      comprovante: !!(l?.anexo_url || l?.comprovante_observacao),
    };
  });

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <DollarSign className="w-4 h-4" /> Financeiro Operacional das Matrículas
          <span className="text-[10px] font-normal text-gray-400">(visão operacional — a gestão financeira completa fica no módulo Financeiro)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Nenhuma matrícula no período/filtro selecionado</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500">
                {["Aluno", "Curso / Pacote", "Valor", "Forma", "Vencimento", "Status", "Recibo", "Contrato", "Comprovante"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-900 max-w-44 truncate">{r.aluno}</td>
                  <td className="px-3 py-2 max-w-56 truncate">{r.curso}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtBRL(r.valor)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.forma}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtData(r.vencimento)}</td>
                  <td className="px-3 py-2">
                    <Badge className={STATUS_CLS[r.status] || "bg-gray-100 text-gray-600"}>{r.situacao || r.status}</Badge>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.recibo || <span className="text-gray-400">—</span>}</td>
                  <td className="px-3 py-2">
                    <Badge className={r.contrato === "Assinado" ? "bg-emerald-100 text-emerald-800" : r.contrato === "Sem contrato" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-800"}>{r.contrato}</Badge>
                  </td>
                  <td className="px-3 py-2">{r.comprovante ? "📎 Sim" : <span className="text-gray-400">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}