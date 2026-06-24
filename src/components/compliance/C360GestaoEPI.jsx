import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, parseISO, format } from "date-fns";
import { AlertTriangle, Package } from "lucide-react";

export default function C360GestaoEPI({ empresa, epis, entregas, estoques }) {
  const [matrizes, setMatrizes] = useState([]);

  useEffect(() => {
    if (empresa?.id) {
      base44.entities.EPIFuncaoMatriz.filter({ empresa_mestre_id: empresa.id }).then(setMatrizes);
    }
  }, [empresa?.id]);

  const abaixoMinimo = (estoques || []).filter(e => e.quantidade_minima > 0 && e.quantidade_disponivel < e.quantidade_minima);
  const zerado = (estoques || []).filter(e => !e.quantidade_disponivel || e.quantidade_disponivel <= 0);

  const casVencendo = (epis || []).filter(e => {
    if (!e.data_validade_ca) return false;
    const d = differenceInDays(parseISO(e.data_validade_ca), new Date());
    return d >= 0 && d <= 90;
  });
  const casVencidos = (epis || []).filter(e => {
    if (!e.data_validade_ca) return false;
    return differenceInDays(parseISO(e.data_validade_ca), new Date()) < 0;
  });

  return (
    <div className="space-y-5">
      {/* Resumo estoque */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-700">{estoques?.length || 0}</p>
          <p className="text-xs text-gray-500">Total EPIs em Estoque</p>
        </div>
        <div className={`border rounded-xl p-4 text-center ${abaixoMinimo.length > 0 ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-gray-200"}`}>
          <p className={`text-3xl font-bold ${abaixoMinimo.length > 0 ? "text-orange-600" : "text-gray-500"}`}>{abaixoMinimo.length}</p>
          <p className="text-xs text-gray-500">Abaixo do Mínimo</p>
        </div>
        <div className={`border rounded-xl p-4 text-center ${zerado.length > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
          <p className={`text-3xl font-bold ${zerado.length > 0 ? "text-red-600" : "text-gray-500"}`}>{zerado.length}</p>
          <p className="text-xs text-gray-500">Estoque Zerado</p>
        </div>
        <div className={`border rounded-xl p-4 text-center ${casVencidos.length > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
          <p className={`text-3xl font-bold ${casVencidos.length > 0 ? "text-red-600" : "text-gray-500"}`}>{casVencidos.length}</p>
          <p className="text-xs text-gray-500">CAs Vencidos</p>
        </div>
      </div>

      {/* Alertas CAs */}
      {casVencendo.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2 text-yellow-700 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4" /> CAs Vencendo nos próximos 90 dias
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {casVencendo.map(e => {
              const d = differenceInDays(parseISO(e.data_validade_ca), new Date());
              return (
                <div key={e.id} className="bg-white rounded-lg p-2 text-sm flex items-center justify-between">
                  <span className="font-medium">{e.nome_epi}</span>
                  <span className="text-yellow-700 font-bold text-xs">{d}d · CA {e.numero_ca}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Matriz por Função */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">EPI por Função</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
            <thead><tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Função</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Setor</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">EPI Obrigatório</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">CA</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Periodicidade</th>
            </tr></thead>
            <tbody>
              {matrizes.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhuma matriz de EPI para esta empresa</td></tr> :
                matrizes.map(m => (
                  <tr key={m.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{m.funcao}</td>
                    <td className="px-4 py-3 text-gray-600">{m.setor || "—"}</td>
                    <td className="px-4 py-3">{m.epi_nome || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{m.epi_ca || "—"}</td>
                    <td className="px-4 py-3">{m.periodicidade_troca_meses ? `${m.periodicidade_troca_meses}m` : "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entregas */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">Histórico de Entregas ({entregas?.length || 0})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
            <thead><tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Colaborador</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">EPI</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Data Entrega</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Próxima Troca</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Assinatura</th>
            </tr></thead>
            <tbody>
              {(entregas || []).slice(0, 30).map(e => (
                <tr key={e.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{e.nome_colaborador || "—"}</td>
                  <td className="px-4 py-3">{e.epi_nome || "—"}</td>
                  <td className="px-4 py-3">{e.data_entrega ? format(parseISO(e.data_entrega), "dd/MM/yyyy") : "—"}</td>
                  <td className="px-4 py-3">{e.data_proxima_troca ? format(parseISO(e.data_proxima_troca), "dd/MM/yyyy") : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${{ "Pendente": "bg-amber-100 text-amber-700", "Assinado": "bg-green-100 text-green-700", "Recusado": "bg-red-100 text-red-700" }[e.status_assinatura] || ""}`}>{e.status_assinatura}</Badge>
                  </td>
                </tr>
              ))}
              {(entregas || []).length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhuma entrega</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}