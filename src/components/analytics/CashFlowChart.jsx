import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function CashFlowChart({ charges = [], enrollments = [] }) {
  const data = useMemo(() => {
    const months = {};
    
    // Agrupa receitas por mês
    charges.forEach(c => {
      if (c.status === 'RECEIVED' || c.status === 'CONFIRMED') {
        const month = c.dueDate?.substring(0, 7) || new Date().toISOString().substring(0, 7);
        months[month] = (months[month] || 0) + parseFloat(c.value || 0);
      }
    });

    return Object.entries(months)
      .sort()
      .map(([month, value]) => ({ month, receita: value }));
  }, [charges]);

  if (!data.length) {
    return (
      <Card className="border border-gray-200">
        <CardHeader><CardTitle>Fluxo de Caixa</CardTitle></CardHeader>
        <CardContent className="flex justify-center py-8 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando dados...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200">
      <CardHeader><CardTitle>Fluxo de Caixa (últimos 6 meses)</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
            <Legend />
            <Line type="monotone" dataKey="receita" stroke="#059669" name="Receita" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}