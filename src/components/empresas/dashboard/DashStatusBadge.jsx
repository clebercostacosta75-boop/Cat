import React from "react";

const CORES = {
  "Agendado": "bg-blue-50 text-blue-700 border-blue-200",
  "Confirmado": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Em Andamento": "bg-amber-50 text-amber-700 border-amber-200",
  "Concluído": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Cancelado": "bg-red-50 text-red-700 border-red-200",
  "Pendente": "bg-amber-50 text-amber-700 border-amber-200",
  "Aguardando": "bg-gray-50 text-gray-600 border-gray-200",
  "Atrasada": "bg-red-50 text-red-700 border-red-200",
  "Aprovado": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Reprovado": "bg-red-50 text-red-700 border-red-200",
  "Não Concluiu": "bg-orange-50 text-orange-700 border-orange-200",
  "Apto": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Bloqueado": "bg-red-50 text-red-700 border-red-200",
};

export default function DashStatusBadge({ status, children }) {
  const cls = CORES[status] || "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full border whitespace-nowrap ${cls}`}>
      {children || status}
    </span>
  );
}