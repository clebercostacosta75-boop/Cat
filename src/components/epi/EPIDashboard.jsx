import React from "react";
import { differenceInDays, parseISO } from "date-fns";
import { AlertTriangle, Package, Users, CheckCircle, XCircle, Clock, ShieldAlert } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function EPIDashboard({ epis, entregas, estoques, colaboradores, loading }) {
  if (loading) return <div className="text-center py-12 text-gray-400">Carregando indicadores...</div>;

  const today = new Date();

  const getDias = (d) => d ? differenceInDays(parseISO(d), today) : null;

  const totalEpis = epis.length;
  const totalEstoque = estoques.reduce((s, e) => s + (e.quantidade_disponivel || 0), 0);
  const totalEntregas = entregas.length;

  const assinaturasPendentes = entregas.filter(e => e.status_assinatura === "Pendente").length;

  const casVencidos = epis.filter(e => {
    if (!e.data_validade_ca) return false;
    return getDias(e.data_validade_ca) < 0;
  }).length;

  const casVencendo = epis.filter(e => {
    if (!e.data_validade_ca) return false;
    const d = getDias(e.data_validade_ca);
    return d >= 0 && d <= 90;
  }).length;

  const estoquesAbaixoMinimo = estoques.filter(e =>
    e.quantidade_minima > 0 && e.quantidade_disponivel < e.quantidade_minima
  ).length;

  const colaboradoresEmDia = new Set(
    entregas.filter(e => {
      const d = getDias(e.data_proxima_troca);
      return d === null || d > 0;
    }).map(e => e.colaborador_sst_id).filter(Boolean)
  ).size;

  const colaboradoresVencidos = new Set(
    entregas.filter(e => {
      const d = getDias(e.data_proxima_troca);
      return d !== null && d < 0;
    }).map(e => e.colaborador_sst_id).filter(Boolean)
  ).size;

  // Gráfico de entregas por função
  const porFuncao = {};
  entregas.forEach(e => {
    if (e.funcao) porFuncao[e.funcao] = (porFuncao[e.funcao] || 0) + 1;
  });
  const chartData = Object.entries(porFuncao).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));

  const cards = [
    { label: "EPIs Cadastrados", value: totalEpis, icon: ShieldAlert, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    { label: "Total em Estoque", value: totalEstoque, icon: Package, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
    { label: "Total Entregues", value: totalEntregas, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
    { label: "Colabor. em Dia", value: colaboradoresEmDia, icon: Users, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
    { label: "Colabor. Vencidos", value: colaboradoresVencidos, icon: XCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", alert: colaboradoresVencidos > 0 },
    { label: "Assinatura Pendente", value: assinaturasPendentes, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", alert: assinaturasPendentes > 0 },
    { label: "CAs Vencidos", value: casVencidos, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", alert: casVencidos > 0 },
    { label: "CAs Vencendo", value: casVencendo, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", alert: casVencendo > 0 },
    { label: "Estoque Abaixo Mín.", value: estoquesAbaixoMinimo, icon: Package, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", alert: estoquesAbaixoMinimo > 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {cards.map(c => (
          <div key={c.label} className={`${c.bg} ${c.border} border rounded-xl p-4 ${c.alert ? "ring-2 ring-red-200" : ""}`}>
            <div className="flex items-center justify-between mb-1">
              <c.icon className={`w-5 h-5 ${c.color}`} />
              {c.alert && <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
            </div>
            <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold text-gray-700 mb-4">Entregas por Função</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#e11d48" radius={[4, 4, 0, 0]} name="Entregas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}