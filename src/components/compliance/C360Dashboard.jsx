import React from "react";
import { differenceInDays, parseISO, format } from "date-fns";
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import C360ScoreModulos from "./C360ScoreModulos";

const PRIORIDADE_STYLE = {
  "Crítico": "bg-red-100 text-red-700 border-red-200",
  "Alto": "bg-orange-100 text-orange-700 border-orange-200",
  "Médio": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Baixo": "bg-blue-50 text-blue-600 border-blue-100",
};

export default function C360Dashboard({ empresa, pgrs, pcmsos, ltcats, colaboradores, asos, epis, entregas, estoques, alertas, certificados }) {
  const today = new Date();
  const isValid = (d) => d && differenceInDays(parseISO(d), today) >= 0;

  const alertasAtivos = (alertas || []).filter(a => a.status === "Ativo" && (a.prioridade === "Crítico" || a.prioridade === "Alto"));

  // Próximos 90 dias de vencimentos
  const eventos90 = [];
  [...(pgrs || []), ...(pcmsos || []), ...(ltcats || [])].forEach(d => {
    if (d.vigencia_fim) {
      const dias = differenceInDays(parseISO(d.vigencia_fim), today);
      if (dias >= 0 && dias <= 90) eventos90.push({ tipo: "Documento", desc: d.empresa_nome || "Documento SST", data: d.vigencia_fim, dias });
    }
  });
  (asos || []).forEach(a => {
    if (a.data_vencimento) {
      const dias = differenceInDays(parseISO(a.data_vencimento), today);
      if (dias >= 0 && dias <= 90) eventos90.push({ tipo: "ASO", desc: a.nome_colaborador || "ASO", data: a.data_vencimento, dias });
    }
  });
  (certificados || []).forEach(c => {
    if (c.valid_until) {
      const dias = differenceInDays(parseISO(c.valid_until), today);
      if (dias >= 0 && dias <= 90) eventos90.push({ tipo: "Certificado", desc: c.student_name || "Certificado", data: c.valid_until, dias });
    }
  });
  eventos90.sort((a, b) => a.dias - b.dias);

  // Contadores rápidos
  const asosVencidos = (asos || []).filter(a => a.data_vencimento && !isValid(a.data_vencimento)).length;
  const inaptos = (asos || []).filter(a => a.resultado === "Inapto").length;
  const certsVencidos = (certificados || []).filter(c => c.valid_until && !isValid(c.valid_until)).length;

  return (
    <div className="space-y-5">
      {/* Score por módulo */}
      <C360ScoreModulos
        pgrs={pgrs} pcmsos={pcmsos} ltcats={ltcats}
        colaboradores={colaboradores} asos={asos}
        epis={epis} entregas={entregas} certificados={certificados}
        empresa={empresa}
      />

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{colaboradores?.length || 0}</p>
          <p className="text-xs text-gray-500">Colaboradores</p>
        </div>
        <div className={`border rounded-xl p-3 text-center ${asosVencidos > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-100"}`}>
          <p className={`text-2xl font-bold ${asosVencidos > 0 ? "text-red-600" : "text-green-600"}`}>{asosVencidos}</p>
          <p className="text-xs text-gray-500">ASOs Vencidos</p>
        </div>
        <div className={`border rounded-xl p-3 text-center ${inaptos > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-100"}`}>
          <p className={`text-2xl font-bold ${inaptos > 0 ? "text-red-700" : "text-green-600"}`}>{inaptos}</p>
          <p className="text-xs text-gray-500">ASOs Inaptos</p>
        </div>
        <div className={`border rounded-xl p-3 text-center ${certsVencidos > 0 ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-gray-100"}`}>
          <p className={`text-2xl font-bold ${certsVencidos > 0 ? "text-orange-600" : "text-gray-500"}`}>{certsVencidos}</p>
          <p className="text-xs text-gray-500">Certs. Vencidos</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Alertas Críticos e Altos */}
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Alertas Ativos ({alertasAtivos.length})
          </h3>
          {alertasAtivos.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600 py-4">
              <CheckCircle className="w-5 h-5" /><span className="text-sm">Nenhum alerta crítico ou alto</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {alertasAtivos.map(a => (
                <div key={a.id} className={`border rounded-lg p-3 ${PRIORIDADE_STYLE[a.prioridade] || ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{a.descricao}</p>
                    <Badge className={`text-xs ${PRIORIDADE_STYLE[a.prioridade] || ""}`}>{a.prioridade}</Badge>
                  </div>
                  <p className="text-xs mt-1 opacity-70">{a.tipo_alerta}{a.dias_para_vencer !== undefined ? ` · ${a.dias_para_vencer}d` : ""}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximos 90 dias */}
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" /> Próximos Vencimentos — 90 dias ({eventos90.length})
          </h3>
          {eventos90.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nenhum vencimento nos próximos 90 dias</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {eventos90.slice(0, 15).map((ev, i) => {
                const s = ev.dias <= 15 ? "text-red-600 font-bold" : ev.dias <= 30 ? "text-orange-500 font-semibold" : ev.dias <= 60 ? "text-yellow-600" : "text-gray-500";
                const tipoColor = ev.tipo === "ASO" ? "bg-blue-100 text-blue-600" : ev.tipo === "Documento" ? "bg-purple-100 text-purple-600" : "bg-green-100 text-green-600";
                return (
                  <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge className={`text-xs shrink-0 ${tipoColor}`}>{ev.tipo}</Badge>
                      <p className="text-sm text-gray-800 truncate">{ev.desc}</p>
                    </div>
                    <span className={`text-sm shrink-0 ${s}`}>{ev.dias}d</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}