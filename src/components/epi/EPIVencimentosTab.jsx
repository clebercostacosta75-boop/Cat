import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, parseISO, format } from "date-fns";

function getVencimentoStyle(dias) {
  if (dias === null) return { badge: "bg-gray-100 text-gray-500", row: "" };
  if (dias < 0) return { badge: "bg-red-100 text-red-700", row: "bg-red-50/60", label: "Vencido" };
  if (dias <= 15) return { badge: "bg-orange-200 text-orange-800", row: "bg-orange-50/40", label: `${dias}d` };
  if (dias <= 30) return { badge: "bg-orange-100 text-orange-700", row: "bg-orange-50/20", label: `${dias}d` };
  if (dias <= 60) return { badge: "bg-yellow-100 text-yellow-700", row: "bg-yellow-50/20", label: `${dias}d` };
  if (dias <= 90) return { badge: "bg-yellow-50 text-yellow-600", row: "", label: `${dias}d` };
  return { badge: "bg-green-100 text-green-700", row: "", label: "OK" };
}

export default function EPIVencimentosTab({ entregas, epis }) {
  const [filtro, setFiltro] = useState("todos");

  const today = new Date();

  const rows = entregas.map(e => {
    const diasTroca = e.data_proxima_troca ? differenceInDays(parseISO(e.data_proxima_troca), today) : null;
    const epiObj = epis.find(ep => ep.id === e.epi_cadastro_id);
    const diasCa = epiObj?.data_validade_ca ? differenceInDays(parseISO(epiObj.data_validade_ca), today) : null;
    return { ...e, diasTroca, diasCa, epiObj };
  });

  const filtered = rows.filter(r => {
    if (filtro === "vencidos") return r.diasTroca !== null && r.diasTroca < 0;
    if (filtro === "30d") return r.diasTroca !== null && r.diasTroca >= 0 && r.diasTroca <= 30;
    if (filtro === "60d") return r.diasTroca !== null && r.diasTroca > 30 && r.diasTroca <= 60;
    if (filtro === "90d") return r.diasTroca !== null && r.diasTroca > 60 && r.diasTroca <= 90;
    if (filtro === "ca_vencidos") return r.diasCa !== null && r.diasCa < 0;
    return r.diasTroca !== null && r.diasTroca <= 90;
  }).sort((a, b) => (a.diasTroca ?? 999) - (b.diasTroca ?? 999));

  const counts = {
    vencidos: rows.filter(r => r.diasTroca !== null && r.diasTroca < 0).length,
    "30d": rows.filter(r => r.diasTroca !== null && r.diasTroca >= 0 && r.diasTroca <= 30).length,
    "60d": rows.filter(r => r.diasTroca !== null && r.diasTroca > 30 && r.diasTroca <= 60).length,
    "90d": rows.filter(r => r.diasTroca !== null && r.diasTroca > 60 && r.diasTroca <= 90).length,
    ca_vencidos: rows.filter(r => r.diasCa !== null && r.diasCa < 0).length,
  };

  const FILTROS = [
    { key: "todos", label: "≤ 90 dias" },
    { key: "vencidos", label: `Vencidos (${counts.vencidos})`, color: "text-red-600" },
    { key: "30d", label: `≤ 30d (${counts["30d"]})`, color: "text-orange-600" },
    { key: "60d", label: `≤ 60d (${counts["60d"]})`, color: "text-yellow-600" },
    { key: "90d", label: `≤ 90d (${counts["90d"]})`, color: "text-yellow-500" },
    { key: "ca_vencidos", label: `CAs Vencidos (${counts.ca_vencidos})`, color: "text-red-600" },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTROS.map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filtro === f.key ? "bg-gray-900 text-white border-gray-900" : `border-gray-300 ${f.color || "text-gray-700"} hover:bg-gray-50`}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
          <thead><tr className="bg-gray-50 border-b">
            <th className="text-left px-4 py-3 font-medium text-gray-600">Colaborador</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">EPI</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">CA</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Data Entrega</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Próxima Troca</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Situação</th>
            {filtro === "ca_vencidos" && <th className="text-left px-4 py-3 font-medium text-gray-600">Validade CA</th>}
          </tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Nenhum registro neste filtro</td></tr>
            ) : filtered.map(r => {
              const style = getVencimentoStyle(r.diasTroca);
              return (
                <tr key={r.id} className={`border-b hover:bg-gray-50 ${style.row}`}>
                  <td className="px-4 py-3 font-medium">{r.nome_colaborador}</td>
                  <td className="px-4 py-3">{r.epi_nome || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.numero_ca || "—"}</td>
                  <td className="px-4 py-3">{r.data_entrega ? format(parseISO(r.data_entrega), "dd/MM/yyyy") : "—"}</td>
                  <td className="px-4 py-3 font-medium">
                    {r.data_proxima_troca ? format(parseISO(r.data_proxima_troca), "dd/MM/yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3"><Badge className={`text-xs ${style.badge}`}>{style.label || "OK"}</Badge></td>
                  {filtro === "ca_vencidos" && (
                    <td className="px-4 py-3 text-red-600 font-medium">
                      {r.epiObj?.data_validade_ca ? format(parseISO(r.epiObj.data_validade_ca), "dd/MM/yyyy") : "—"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}