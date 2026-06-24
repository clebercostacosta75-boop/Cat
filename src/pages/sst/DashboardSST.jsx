import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Users, CheckCircle, XCircle, FileText, AlertTriangle } from "lucide-react";

export default function DashboardSST() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().split("T")[0];
      const [empresas, colaboradores, asos, pgrs, pcmsos, ltcats] = await Promise.all([
        base44.entities.EmpresaMestre.list("-created_date", 500),
        base44.entities.ColaboradorSST.list("-created_date", 500),
        base44.entities.ASORegistro.list("-created_date", 500),
        base44.entities.DocumentoPGR.list("-created_date", 200),
        base44.entities.DocumentoPCMSO.list("-created_date", 200),
        base44.entities.DocumentoLTCAT.list("-created_date", 200),
      ]);

      const aptos = asos.filter(a => a.resultado === "Apto").length;
      const inaptos = asos.filter(a => a.resultado === "Inapto").length;
      const examesVencidos = asos.filter(a => a.data_vencimento && new Date(a.data_vencimento + "T00:00:00") < new Date()).length;
      const pgrsVencidos = pgrs.filter(p => p.vigencia_fim && new Date(p.vigencia_fim + "T00:00:00") < new Date()).length;
      const pcmsosVencidos = pcmsos.filter(p => p.vigencia_fim && new Date(p.vigencia_fim + "T00:00:00") < new Date()).length;
      const ltcatsVencidos = ltcats.filter(l => l.vigencia_fim && new Date(l.vigencia_fim + "T00:00:00") < new Date()).length;

      setStats({ empresas: empresas.length, colaboradores: colaboradores.length, aptos, inaptos, examesVencidos, pgrsVencidos, pcmsosVencidos, ltcatsVencidos, totalAsos: asos.length });
      setLoading(false);
    };
    load();
  }, []);

  const cards = stats ? [
    { label: "Total Empresas", value: stats.empresas, icon: Building2, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    { label: "Colaboradores", value: stats.colaboradores, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
    { label: "Aptos (ASO)", value: stats.aptos, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
    { label: "Inaptos (ASO)", value: stats.inaptos, icon: XCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
    { label: "Exames Vencidos", value: stats.examesVencidos, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", alert: stats.examesVencidos > 0 },
    { label: "PGRs Vencidos", value: stats.pgrsVencidos, icon: FileText, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", alert: stats.pgrsVencidos > 0 },
    { label: "PCMSOs Vencidos", value: stats.pcmsosVencidos, icon: FileText, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", alert: stats.pcmsosVencidos > 0 },
    { label: "LTCATs Vencidos", value: stats.ltcatsVencidos, icon: FileText, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", alert: stats.ltcatsVencidos > 0 },
  ] : [];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard SST</h1>
        <p className="text-gray-500 text-sm">Visão geral da saúde e segurança do trabalho</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando indicadores...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {cards.map(card => (
            <div key={card.label} className={`${card.bg} ${card.border} border rounded-xl p-5 ${card.alert ? "ring-2 ring-red-300" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <card.icon className={`w-5 h-5 ${card.color}`} />
                {card.alert && <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />}
              </div>
              <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-xs text-gray-600 mt-1">{card.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}