import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { addDays, format, startOfDay, eachDayOfInterval, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

const fmt = v => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function FluxoCaixaTab() {
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("30");

  useEffect(() => {
    base44.entities.LancamentoFinanceiro.list("-data_vencimento", 500)
      .then(setLancamentos)
      .finally(() => setLoading(false));
  }, []);

  const hoje = startOfDay(new Date());
  const diasPeriodo = parseInt(periodo);
  const fim = addDays(hoje, diasPeriodo);

  // Fluxo diário previsto (todos os lançamentos pendentes)
  const dias = eachDayOfInterval({ start: hoje, end: fim });
  const fluxoDiario = dias.map(dia => {
    const dataStr = format(dia, "yyyy-MM-dd");
    const entradas = lancamentos
      .filter(l => l.tipo === "Receita" && l.data_vencimento === dataStr && !["Cancelado"].includes(l.status))
      .reduce((s, l) => s + l.valor, 0);
    const saidas = lancamentos
      .filter(l => l.tipo === "Despesa" && l.data_vencimento === dataStr && !["Cancelado"].includes(l.status))
      .reduce((s, l) => s + l.valor, 0);
    return {
      data: format(dia, "dd/MM", { locale: ptBR }),
      entradas,
      saidas,
      saldo: entradas - saidas,
    };
  });

  // Saldo acumulado
  let acumulado = 0;
  const fluxoAcumulado = fluxoDiario.map(d => {
    acumulado += d.saldo;
    return { ...d, acumulado };
  });

  // Resumo do período
  const totalEntradas = fluxoDiario.reduce((s, d) => s + d.entradas, 0);
  const totalSaidas = fluxoDiario.reduce((s, d) => s + d.saidas, 0);
  const saldoPrevisto = totalEntradas - totalSaidas;

  // Fluxo realizado (já pagos/recebidos)
  const realizadoReceitas = lancamentos.filter(l => l.tipo === "Receita" && l.status === "Recebido").reduce((s, l) => s + (l.valor_pago || l.valor), 0);
  const realizadoDespesas = lancamentos.filter(l => l.tipo === "Despesa" && l.status === "Pago").reduce((s, l) => s + (l.valor_pago || l.valor), 0);

  // Agrupamento por mês para os próximos 3 meses
  const meses3 = Array.from({ length: 3 }, (_, i) => {
    const mes = addMonths(hoje, i);
    const mesStr = format(mes, "yyyy-MM");
    const ent = lancamentos.filter(l => l.tipo === "Receita" && l.data_vencimento?.startsWith(mesStr) && !["Cancelado"].includes(l.status)).reduce((s, l) => s + l.valor, 0);
    const sai = lancamentos.filter(l => l.tipo === "Despesa" && l.data_vencimento?.startsWith(mesStr) && !["Cancelado"].includes(l.status)).reduce((s, l) => s + l.valor, 0);
    return { mes: format(mes, "MMM/yy", { locale: ptBR }), entradas: ent, saidas: sai, resultado: ent - sai };
  });

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-gray-200 border-t-gray-700 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 pt-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-xs text-gray-500">Entradas Previstas</p>
          <p className="text-lg font-bold text-green-700">{fmt(totalEntradas)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-gray-500">Saídas Previstas</p>
          <p className="text-lg font-bold text-red-700">{fmt(totalSaidas)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-gray-500">Saldo Projetado</p>
          <p className={`text-lg font-bold ${saldoPrevisto >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(saldoPrevisto)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-gray-500">Saldo Realizado</p>
          <p className={`text-lg font-bold ${(realizadoReceitas - realizadoDespesas) >= 0 ? "text-blue-700" : "text-red-700"}`}>{fmt(realizadoReceitas - realizadoDespesas)}</p>
        </Card>
      </div>

      {/* Filtro de período */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 font-medium">Projeção para:</span>
        {["30", "60", "90"].map(p => (
          <Button key={p} size="sm" variant={periodo === p ? "default" : "outline"} onClick={() => setPeriodo(p)}>
            {p} dias
          </Button>
        ))}
      </div>

      {/* Gráfico de área */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-800 mb-4">Fluxo Diário — Próximos {periodo} dias</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={fluxoAcumulado}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="data" tick={{ fontSize: 10 }} interval={Math.floor(diasPeriodo / 10)} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend />
            <Area type="monotone" dataKey="entradas" name="Entradas" stroke="#22c55e" fill="#dcfce7" strokeWidth={2} />
            <Area type="monotone" dataKey="saidas" name="Saídas" stroke="#ef4444" fill="#fee2e2" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Saldo acumulado */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-800 mb-4">Saldo Acumulado Projetado</h3>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={fluxoAcumulado}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="data" tick={{ fontSize: 10 }} interval={Math.floor(diasPeriodo / 10)} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={v => fmt(v)} />
            <Area type="monotone" dataKey="acumulado" name="Saldo Acumulado" stroke="#6366f1" fill="#eef2ff" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Projeção 3 meses */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-800 mb-4">Projeção Mensal — Próximos 3 meses</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={meses3}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend />
            <Bar dataKey="entradas" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="resultado" name="Resultado" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}