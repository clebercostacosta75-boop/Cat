import React from "react";
import { differenceInDays, parseISO, format } from "date-fns";
import { AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function semaforo(pct) {
  if (pct >= 80) return { color: "#22c55e", bg: "bg-green-50", border: "border-green-200", text: "text-green-700" };
  if (pct >= 50) return { color: "#eab308", bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700" };
  return { color: "#ef4444", bg: "bg-red-50", border: "border-red-200", text: "text-red-700" };
}

const PRIORIDADE_STYLE = {
  "Crítico": "bg-red-100 text-red-700 border-red-200",
  "Alto": "bg-orange-100 text-orange-700 border-orange-200",
  "Médio": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Baixo": "bg-blue-50 text-blue-600 border-blue-100",
};

export default function C360Dashboard({ pgrs, pcmsos, ltcats, colaboradores, asos, epis, entregas, estoques, alertas, certificados }) {
  const today = new Date();
  const isValid = (d) => d && differenceInDays(parseISO(d), today) >= 0;

  // Documentos SST
  const docsTotal = (pgrs?.length || 0) + (pcmsos?.length || 0) + (ltcats?.length || 0);
  const docsVigentes = [
    ...(pgrs || []), ...(pcmsos || []), ...(ltcats || [])
  ].filter(d => d.vigencia_fim && isValid(d.vigencia_fim)).length;
  const docsPct = docsTotal > 0 ? Math.round((docsVigentes / docsTotal) * 100) : 0;

  // ASOs
  const asosValidos = (asos || []).filter(a => a.data_vencimento && isValid(a.data_vencimento)).length;
  const asosPct = asos?.length > 0 ? Math.round((asosValidos / asos.length) * 100) : 0;

  // EPIs
  const episOk = (entregas || []).filter(e => !e.data_proxima_troca || isValid(e.data_proxima_troca)).length;
  const episPct = entregas?.length > 0 ? Math.round((episOk / entregas.length) * 100) : 0;

  // Certificados
  const certsAtivos = (certificados || []).filter(c => c.valid_until && isValid(c.valid_until)).length;
  const certsPct = certificados?.length > 0 ? Math.round((certsAtivos / certificados.length) * 100) : 0;

  // Índice Geral
  const scores = [docsPct, asosPct, episPct, certsPct].filter((_, i) => [docsTotal, asos?.length, entregas?.length, certificados?.length][i] > 0);
  const indiceGeral = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const indicadores = [
    { label: "Índice de Conformidade", value: `${indiceGeral}%`, pct: indiceGeral, sub: "Geral" },
    { label: "Documentos SST", value: `${docsVigentes}/${docsTotal}`, pct: docsPct, sub: "Vigentes" },
    { label: "Colaboradores", value: `${asosValidos}/${asos?.length || 0}`, pct: asosPct, sub: "ASO Válido" },
    { label: "EPIs sob Controle", value: `${episOk}/${entregas?.length || 0}`, pct: episPct, sub: "Dentro do prazo" },
    { label: "Certificados Ativos", value: `${certsAtivos}`, pct: certsPct, sub: `de ${certificados?.length || 0}` },
  ];

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

  return (
    <div className="space-y-6">
      {/* Indicadores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {indicadores.map(ind => {
          const s = semaforo(ind.pct);
          return (
            <div key={ind.label} className={`${s.bg} ${s.border} border rounded-xl p-4 text-center`}>
              <p className={`text-3xl font-bold ${s.text}`}>{ind.value}</p>
              <p className="text-xs font-medium text-gray-700 mt-1">{ind.label}</p>
              <p className="text-xs text-gray-500">{ind.sub}</p>
            </div>
          );
        })}
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
                  <p className="text-xs mt-1 opacity-70">{a.tipo_alerta} {a.dias_para_vencer !== undefined ? `· ${a.dias_para_vencer}d` : ""}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximos 90 dias */}
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" /> Próximos Vencimentos (90 dias)
          </h3>
          {eventos90.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nenhum vencimento nos próximos 90 dias</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {eventos90.slice(0, 15).map((ev, i) => {
                const s = ev.dias <= 15 ? "text-red-600" : ev.dias <= 30 ? "text-orange-500" : ev.dias <= 60 ? "text-yellow-600" : "text-gray-600";
                return (
                  <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{ev.desc}</p>
                      <p className="text-xs text-gray-500">{ev.tipo} · {format(parseISO(ev.data), "dd/MM/yyyy")}</p>
                    </div>
                    <span className={`text-sm font-bold ${s}`}>{ev.dias}d</span>
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