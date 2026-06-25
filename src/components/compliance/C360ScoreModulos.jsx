import React from "react";
import { differenceInDays, parseISO } from "date-fns";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

function ScoreBar({ pct }) {
  const color = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-400" : "bg-red-500";
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ModuloCard({ label, pct, icon, detail }) {
  const color = pct >= 80 ? "text-green-600 bg-green-50 border-green-200"
               : pct >= 50 ? "text-yellow-600 bg-yellow-50 border-yellow-200"
               : "text-red-600 bg-red-50 border-red-200";
  const Icon = pct >= 80 ? CheckCircle : pct >= 50 ? AlertTriangle : XCircle;

  return (
    <div className={`border rounded-xl p-4 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-semibold text-sm text-gray-800">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Icon className="w-4 h-4" />
          <span className="text-xl font-bold">{pct}%</span>
        </div>
      </div>
      <ScoreBar pct={pct} />
      {detail && <p className="text-xs mt-2 opacity-70">{detail}</p>}
    </div>
  );
}

export default function C360ScoreModulos({ empresa, pgrs, pcmsos, ltcats, colaboradores, asos, epis, entregas, certificados }) {
  const today = new Date();
  const isValid = (d) => d && differenceInDays(parseISO(d), today) >= 0;

  // Documentos SST
  const totalDocs = (pgrs?.length || 0) + (pcmsos?.length || 0) + (ltcats?.length || 0);
  const validDocs = [...(pgrs || []), ...(pcmsos || []), ...(ltcats || [])].filter(d => isValid(d.vigencia_fim)).length;
  const docPct = totalDocs > 0 ? Math.round((validDocs / totalDocs) * 100) : 0;

  // ASOs
  const colabsComASO = (colaboradores || []).filter(c => {
    const aso = (asos || []).find(a => a.colaborador_sst_id === c.id);
    return aso && isValid(aso.data_vencimento);
  });
  const asoPct = (colaboradores || []).length > 0 ? Math.round((colabsComASO.length / colaboradores.length) * 100) : 0;

  // EPI
  const colabsComEPI = (colaboradores || []).filter(c => (entregas || []).some(e => e.colaborador_sst_id === c.id));
  const epiPct = (colaboradores || []).length > 0 ? Math.round((colabsComEPI.length / colaboradores.length) * 100) : 0;

  // Treinamentos
  const certsValidos = (certificados || []).filter(c => isValid(c.valid_until)).length;
  const certPct = (certificados || []).length > 0 ? Math.round((certsValidos / certificados.length) * 100) : 0;

  // Score Geral
  const scores = [docPct, asoPct, epiPct, certPct];
  const geral = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  const geralColor = geral >= 80 ? "from-green-500 to-emerald-600"
                    : geral >= 50 ? "from-yellow-400 to-amber-500"
                    : "from-red-500 to-rose-600";

  return (
    <div className="space-y-4">
      {/* Score Geral em destaque */}
      <div className={`bg-gradient-to-r ${geralColor} rounded-2xl p-6 text-white flex items-center justify-between`}>
        <div>
          <p className="text-sm font-medium opacity-80">Índice de Conformidade Geral</p>
          <p className="text-6xl font-black mt-1">{geral}%</p>
          <p className="text-sm opacity-70 mt-1">{empresa?.razao_social || "Empresa"}</p>
        </div>
        <div className="text-right">
          <p className="text-sm opacity-80">Módulos avaliados</p>
          <p className="text-3xl font-bold mt-1">4</p>
          <p className="text-xs opacity-70">Documentos · ASO · EPI · Treinamentos</p>
        </div>
      </div>

      {/* Cards por módulo */}
      <div className="grid sm:grid-cols-2 gap-3">
        <ModuloCard label="Documentos SST" icon="📄" pct={docPct} detail={`${validDocs} de ${totalDocs} vigentes (PGR, PCMSO, LTCAT)`} />
        <ModuloCard label="ASO dos Colaboradores" icon="🩺" pct={asoPct} detail={`${colabsComASO.length} de ${colaboradores?.length || 0} com ASO válido`} />
        <ModuloCard label="Gestão de EPIs" icon="🦺" pct={epiPct} detail={`${colabsComEPI.length} de ${colaboradores?.length || 0} com EPI entregue`} />
        <ModuloCard label="Treinamentos / Certificados" icon="🎓" pct={certPct} detail={`${certsValidos} de ${certificados?.length || 0} certificados válidos`} />
      </div>
    </div>
  );
}