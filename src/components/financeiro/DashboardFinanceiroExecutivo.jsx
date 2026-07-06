import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, CheckCircle, Clock, BarChart2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function DashboardFinanceiroExecutivo() {
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.LancamentoFinanceiro.list("-data_vencimento", 500).then(d => {
      setLancamentos(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);

  const mesAtual = lancamentos.filter(l => {
    const d = new Date(l.data_vencimento);
    return d >= inicioMes && d <= fimMes;
  });

  const receitas = lancamentos.filter(l => l.tipo === "Receita");
  const despesas = lancamentos.filter(l => l.tipo === "Despesa");

  const totalReceber = receitas.filter(l => ["Pendente", "Aprovado", "Parcial"].includes(l.status)).reduce((s, l) => s + (l.valor - (l.valor_pago || 0)), 0);
  const totalPagar = despesas.filter(l => ["Pendente", "Aprovado", "Parcial"].includes(l.status)).reduce((s, l) => s + (l.valor - (l.valor_pago || 0)), 0);
  const receitasRealizadas = receitas.filter(l => l.status === "Recebido").reduce((s, l) => s + (l.valor_pago || l.valor), 0);
  const despesasRealizadas = despesas.filter(l => l.status === "Pago").reduce((s, l) => s + (l.valor_pago || l.valor), 0);
  const resultado = receitasRealizadas - despesasRealizadas;

  const vencidas = lancamentos.filter(l => {
    if (!["Pendente", "Parcial"].includes(l.status)) return false;
    return new Date(l.data_vencimento) < hoje;
  });

  const inadimplentes = receitas.filter(l => {
    if (!["Pendente", "Parcial"].includes(l.status)) return false;
    return new Date(l.data_vencimento) < hoje;
  });

  const taxaInadimplencia = receitas.length > 0
    ? ((inadimplentes.length / receitas.length) * 100).toFixed(1)
    : 0;

  // Dados dos últimos 6 meses para gráfico
  const ultimos6Meses = Array.from({ length: 6 }, (_, i) => {
    const mes = subMonths(hoje, 5 - i);
    const inicio = startOfMonth(mes);
    const fim = endOfMonth(mes);
    const rec = lancamentos.filter(l => l.tipo === "Receita" && l.status === "Recebido" && new Date(l.data_vencimento) >= inicio && new Date(l.data_vencimento) <= fim).reduce((s, l) => s + (l.valor_pago || l.valor), 0);
    const desp = lancamentos.filter(l => l.tipo === "Despesa" && l.status === "Pago" && new Date(l.data_vencimento) >= inicio && new Date(l.data_vencimento) <= fim).reduce((s, l) => s + (l.valor_pago || l.valor), 0);
    return { mes: format(mes, "MMM/yy", { locale: ptBR }), receitas: rec, despesas: desp, resultado: rec - desp };
  });

  // Por categoria
  const porCategoria = {};
  lancamentos.forEach(l => {
    if (!l.categoria_nome) return;
    if (!porCategoria[l.categoria_nome]) porCategoria[l.categoria_nome] = { nome: l.categoria_nome, tipo: l.tipo, valor: 0 };
    porCategoria[l.categoria_nome].valor += l.valor;
  });
  const topCategorias = Object.values(porCategoria).sort((a, b) => b.valor - a.valor).slice(0, 8);

  const cards = [
    { label: "A Receber", value: fmt(totalReceber), icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "A Pagar", value: fmt(totalPagar), icon: TrendingDown, color: "text-red-600", bg: "bg-red-50" },
    { label: "Receitas Realizadas", value: fmt(receitasRealizadas), icon: CheckCircle, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Despesas Realizadas", value: fmt(despesasRealizadas), icon: DollarSign, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Resultado (Lucro/Prejuízo)", value: fmt(resultado), icon: BarChart2, color: resultado >= 0 ? "text-green-700" : "text-red-700", bg: resultado >= 0 ? "bg-green-100" : "bg-red-100" },
    { label: "Contas Vencidas", value: vencidas.length, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Índice de Inadimplência", value: `${taxaInadimplencia}%`, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
  ];

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 pt-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {cards.map((c, i) => (
          <Card key={i} className="p-4">
            <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center mb-2`}>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <p className="text-xs text-gray-500 leading-tight">{c.label}</p>
            <p className={`text-lg font-bold mt-1 ${c.color}`}>{c.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico Receitas x Despesas */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Receitas × Despesas (6 meses)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ultimos6Meses}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmt(v)} />
              <Legend />
              <Bar dataKey="receitas" name="Receitas" fill="#22c55e" radius={[4,4,0,0]} />
              <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Resultado Mensal */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Resultado Financeiro (6 meses)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={ultimos6Meses}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmt(v)} />
              <Line type="monotone" dataKey="resultado" name="Resultado" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Por Categoria */}
      {topCategorias.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Por Categoria</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topCategorias} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <YAxis dataKey="nome" type="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip formatter={v => fmt(v)} />
              <Bar dataKey="valor" name="Valor" fill="#6366f1" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Contas vencidas */}
      {vencidas.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" /> Contas Vencidas ({vencidas.length})
          </h3>
          <div className="space-y-2">
            {vencidas.slice(0, 10).map(l => (
              <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{l.descricao}</p>
                  <p className="text-xs text-gray-500">{l.cliente_nome || l.fornecedor_nome || "—"} · Venc: {l.data_vencimento}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${l.tipo === "Receita" ? "text-green-700" : "text-red-700"}`}>{fmt(l.valor - (l.valor_pago || 0))}</p>
                  <Badge variant="destructive" className="text-xs">{l.tipo}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}