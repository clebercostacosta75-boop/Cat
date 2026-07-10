import React from "react";

/** Container padrão dos blocos da Dashboard Operacional Empresas. */
export default function DashBloco({ titulo, icone: Icon, acoes, children }) {
  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-2 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-gray-500" />} {titulo}
        </h3>
        {acoes}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export const VazioBloco = ({ msg = "Nenhum registro com os filtros atuais." }) => (
  <p className="text-center text-xs text-gray-400 py-6">{msg}</p>
);