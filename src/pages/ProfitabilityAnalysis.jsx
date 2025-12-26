import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function ProfitabilityAnalysis() {
  const { data: classSchedules = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['completedClassSchedules'],
    queryFn: async () => {
      const allClasses = await base44.entities.ClassSchedule.list();
      return allClasses.filter(c => c.status === 'Concluído');
    },
    initialData: [],
  });

  const { data: dailyRecords = [], isLoading: loadingRecords } = useQuery({
    queryKey: ['allDailyRecords'],
    queryFn: () => base44.entities.ClassDailyRecord.list(),
    initialData: [],
  });

  const calculateTurmaProfit = (valorBMM, custoInstrutor, despesasExtras) => {
    const custoTotal = custoInstrutor + despesasExtras;
    const lucroBruto = valorBMM - custoTotal;
    const margem = valorBMM > 0 ? (lucroBruto / valorBMM) * 100 : 0;

    return {
      lucro: lucroBruto,
      margem: margem.toFixed(2),
      status: margem > 30 ? "Saudável" : margem > 0 ? "Margem Baixa" : "Prejuízo"
    };
  };

  const profitabilityData = useMemo(() => {
    return classSchedules.map(classItem => {
      const classDailyRecords = dailyRecords.filter(
        record => record.class_schedule_id === classItem.id
      );

      const custoInstrutor = classDailyRecords.reduce(
        (sum, record) => sum + (record.hp_cost || 0), 
        0
      );

      const despesasExtras = classDailyRecords.reduce(
        (sum, record) => sum + 
          (record.lunch_cost || 0) + 
          (record.transport_cost || 0) + 
          (record.coffee_break_cost || 0) + 
          (record.taxi_cost || 0),
        0
      );

      const valorBMM = classItem.total_value || 0;

      const profit = calculateTurmaProfit(valorBMM, custoInstrutor, despesasExtras);

      return {
        id: classItem.id,
        training_name: classItem.training_name,
        company_name: classItem.company_name,
        month: classItem.month,
        valorBMM,
        custoInstrutor,
        despesasExtras,
        custoTotal: custoInstrutor + despesasExtras,
        lucro: profit.lucro,
        margem: parseFloat(profit.margem),
        status: profit.status
      };
    }).sort((a, b) => b.lucro - a.lucro);
  }, [classSchedules, dailyRecords]);

  const statistics = useMemo(() => {
    const totalLucro = profitabilityData.reduce((sum, item) => sum + item.lucro, 0);
    const totalReceita = profitabilityData.reduce((sum, item) => sum + item.valorBMM, 0);
    const totalCusto = profitabilityData.reduce((sum, item) => sum + item.custoTotal, 0);
    const margemMedia = totalReceita > 0 ? ((totalLucro / totalReceita) * 100).toFixed(2) : 0;
    
    const turmasSaudaveis = profitabilityData.filter(t => t.status === "Saudável").length;
    const turmasMargemBaixa = profitabilityData.filter(t => t.status === "Margem Baixa").length;
    const turmasPrejuizo = profitabilityData.filter(t => t.status === "Prejuízo").length;

    return {
      totalLucro,
      totalReceita,
      totalCusto,
      margemMedia,
      turmasSaudaveis,
      turmasMargemBaixa,
      turmasPrejuizo
    };
  }, [profitabilityData]);

  const topLucros = profitabilityData.slice(0, 5);
  const topPrejuizos = profitabilityData.filter(t => t.lucro < 0).slice(0, 5);

  const statusDistribution = [
    { name: 'Saudável (>30%)', value: statistics.turmasSaudaveis, color: '#10b981' },
    { name: 'Margem Baixa', value: statistics.turmasMargemBaixa, color: '#f59e0b' },
    { name: 'Prejuízo', value: statistics.turmasPrejuizo, color: '#ef4444' },
  ];

  const margemPorMes = useMemo(() => {
    const grouped = {};
    profitabilityData.forEach(item => {
      if (!grouped[item.month]) {
        grouped[item.month] = { month: item.month, lucroTotal: 0, receitaTotal: 0 };
      }
      grouped[item.month].lucroTotal += item.lucro;
      grouped[item.month].receitaTotal += item.valorBMM;
    });
    
    return Object.values(grouped).map(g => ({
      ...g,
      margem: g.receitaTotal > 0 ? ((g.lucroTotal / g.receitaTotal) * 100).toFixed(2) : 0
    })).sort((a, b) => a.month.localeCompare(b.month));
  }, [profitabilityData]);

  if (loadingClasses || loadingRecords) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">
            Análise de Lucratividade
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Controle financeiro e margem de lucro por turma
          </p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <DollarSign className="w-6 h-6 text-green-600 mb-2" />
              <p className="text-2xl font-bold text-black">
                R$ {(statistics.totalLucro / 1000).toFixed(0)}k
              </p>
              <p className="text-sm text-gray-600">Lucro Total</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <TrendingUp className="w-6 h-6 text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-black">{statistics.margemMedia}%</p>
              <p className="text-sm text-gray-600">Margem Média</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
              <p className="text-2xl font-bold text-black">{statistics.turmasSaudaveis}</p>
              <p className="text-sm text-gray-600">Turmas Saudáveis</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <AlertTriangle className="w-6 h-6 text-red-600 mb-2" />
              <p className="text-2xl font-bold text-black">{statistics.turmasPrejuizo}</p>
              <p className="text-sm text-gray-600">Turmas com Prejuízo</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Distribuição por Status */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-black">
                Distribuição de Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusDistribution.some(s => s.value > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-400">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>

          {/* Margem por Mês */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-black">
                Margem de Lucro por Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              {margemPorMes.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={margemPorMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    <Bar dataKey="margem" fill="#3b82f6" name="Margem %" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-400">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Lucros */}
        {topLucros.length > 0 && (
          <Card className="border border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-black flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Top 5 Turmas Mais Lucrativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topLucros.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          #{index + 1}
                        </Badge>
                        <span className="font-semibold text-gray-900">{item.training_name}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{item.company_name} • {item.month}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">R$ {item.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-gray-600">Margem: {item.margem}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Prejuízos */}
        {topPrejuizos.length > 0 && (
          <Card className="border border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-black flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                Turmas com Prejuízo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPrejuizos.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-100 text-red-800 border-red-300">
                          #{index + 1}
                        </Badge>
                        <span className="font-semibold text-gray-900">{item.training_name}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{item.company_name} • {item.month}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">R$ {item.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-gray-600">Margem: {item.margem}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela Completa */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-black">
              Análise Detalhada por Turma
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="font-bold text-black">Treinamento</TableHead>
                    <TableHead className="font-bold text-black">Empresa</TableHead>
                    <TableHead className="font-bold text-black">Mês</TableHead>
                    <TableHead className="font-bold text-right text-black">Receita (BMM)</TableHead>
                    <TableHead className="font-bold text-right text-black">Custo Total</TableHead>
                    <TableHead className="font-bold text-right text-black">Lucro</TableHead>
                    <TableHead className="font-bold text-right text-black">Margem</TableHead>
                    <TableHead className="font-bold text-center text-black">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitabilityData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                        Nenhuma turma concluída encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    profitabilityData.map((item) => (
                      <TableRow key={item.id} className="hover:bg-gray-50 border-b border-gray-200">
                        <TableCell className="font-semibold text-black">{item.training_name}</TableCell>
                        <TableCell className="text-gray-700">{item.company_name}</TableCell>
                        <TableCell className="text-gray-700">{item.month}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-black">
                            R$ {item.valorBMM.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-gray-700">
                            R$ {item.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-bold ${item.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            R$ {item.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold ${item.margem > 30 ? 'text-green-600' : item.margem > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {item.margem}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.status === "Saudável" && (
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Saudável
                            </Badge>
                          )}
                          {item.status === "Margem Baixa" && (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Margem Baixa
                            </Badge>
                          )}
                          {item.status === "Prejuízo" && (
                            <Badge className="bg-red-100 text-red-800 border-red-300">
                              <TrendingDown className="w-3 h-3 mr-1" />
                              Prejuízo
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}