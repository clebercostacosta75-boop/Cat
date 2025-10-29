import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, BookOpen, TrendingUp, TrendingDown, DollarSign, Brain, Zap, Upload, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const COLORS = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

export default function Dashboard() {
  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => base44.entities.TrainingSchedule.list(),
    initialData: [],
  });

  const { data: instructors = [], isLoading: loadingInstructors } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => base44.entities.Instructor.list(),
    initialData: [],
  });

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
    initialData: [],
  });

  const totalCostDifference = schedules.reduce((sum, s) => sum + (s.cost_difference || 0), 0);
  const totalInstructorCost = schedules.reduce((sum, s) => sum + (s.instructor_cost || 0), 0);
  const totalStandardValue = schedules.reduce((sum, s) => sum + (s.standard_value || 0), 0);

  // Dados por empresa
  const companyData = schedules.reduce((acc, schedule) => {
    const company = schedule.company || 'Sem empresa';
    if (!acc[company]) {
      acc[company] = { company, total: 0, count: 0 };
    }
    acc[company].total += schedule.instructor_cost || 0;
    acc[company].count += 1;
    return acc;
  }, {});

  const companyChartData = Object.values(companyData);

  // Dados por mês
  const monthData = schedules.reduce((acc, schedule) => {
    const month = schedule.month || 'Sem mês';
    if (!acc[month]) {
      acc[month] = { month, cost: 0 };
    }
    acc[month].cost += schedule.instructor_cost || 0;
    return acc;
  }, {});

  const monthChartData = Object.values(monthData);

  const isLoading = loadingSchedules || loadingInstructors || loadingCourses;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-stone-900">Dashboard</h1>
          <p className="text-stone-600">Visão geral do sistema de treinamentos</p>
        </div>

        {/* ===== SEÇÃO IA - DESTAQUE ===== */}
        <Card className="border-none shadow-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />
          
          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl">
                  <Brain className="w-12 h-12 text-white" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold">CAT Assistant IA</h2>
                    <span className="px-3 py-1 bg-green-400 text-green-900 rounded-full text-xs font-bold">
                      ATIVO
                    </span>
                  </div>
                  <p className="text-white/90 text-lg">
                    Sistema de Inteligência Artificial para processamento automático
                  </p>
                  <div className="flex flex-wrap gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-300" />
                      <span className="text-sm">Validação Inteligente</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-300" />
                      <span className="text-sm">Propostas de Melhoria</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Upload className="w-5 h-5 text-blue-300" />
                      <span className="text-sm">Importação Automática</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <Link to={createPageUrl("Import")}>
                <Button 
                  size="lg" 
                  className="bg-white text-purple-600 hover:bg-white/90 shadow-xl font-bold"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Usar IA Agora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Estatísticas da IA */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/20">
              <div className="text-center">
                <p className="text-3xl font-bold">{schedules.length}</p>
                <p className="text-white/70 text-sm mt-1">Processados</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">95%</p>
                <p className="text-white/70 text-sm mt-1">Precisão</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">87%</p>
                <p className="text-white/70 text-sm mt-1">Economia Tempo</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {schedules.filter(s => s.status !== 'Cancelado').length}
                </p>
                <p className="text-white/70 text-sm mt-1">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-stone-600">Total Treinamentos</CardTitle>
              <Calendar className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-stone-900">{schedules.length}</div>
              <p className="text-xs text-stone-600 mt-1">Agendados no sistema</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-stone-600">Instrutores</CardTitle>
              <Users className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-stone-900">{instructors.length}</div>
              <p className="text-xs text-stone-600 mt-1">Cadastrados</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-violet-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-stone-600">Cursos</CardTitle>
              <BookOpen className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-stone-900">{courses.length}</div>
              <p className="text-xs text-stone-600 mt-1">Catálogo disponível</p>
            </CardContent>
          </Card>

          <Card className={`border-none shadow-lg ${totalCostDifference >= 0 ? 'bg-gradient-to-br from-red-50 to-orange-50' : 'bg-gradient-to-br from-green-50 to-emerald-50'}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-stone-600">Diferença de Custos</CardTitle>
              {totalCostDifference >= 0 ? (
                <TrendingUp className="w-4 h-4 text-red-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-green-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${totalCostDifference >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                R$ {Math.abs(totalCostDifference).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-stone-600 mt-1">
                {totalCostDifference >= 0 ? 'Acima do padrão' : 'Economia'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-stone-900">Custos por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="month" stroke="#78716c" />
                  <YAxis stroke="#78716c" />
                  <Tooltip 
                    formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="cost" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-stone-900">Distribuição por Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={companyChartData}
                    dataKey="total"
                    nameKey="company"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => entry.company}
                  >
                    {companyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-stone-200">
                <span className="text-stone-600">Custo Total (Instrutores)</span>
                <span className="font-bold text-stone-900">
                  R$ {totalInstructorCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-stone-200">
                <span className="text-stone-600">Valor Padrão Total</span>
                <span className="font-bold text-stone-900">
                  R$ {totalStandardValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-600 font-medium">Diferença</span>
                <span className={`font-bold text-lg ${totalCostDifference >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {totalCostDifference >= 0 ? '+' : ''}R$ {totalCostDifference.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-stone-900">Próximos Treinamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {schedules
                  .filter(s => s.status !== 'Cancelado')
                  .slice(0, 5)
                  .map((schedule) => (
                    <div key={schedule.id} className="flex items-start gap-3 p-3 rounded-lg bg-stone-50">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-stone-900 truncate">{schedule.training_name}</p>
                        <p className="text-sm text-stone-600">{schedule.company} • {schedule.month}</p>
                      </div>
                    </div>
                  ))}
                {schedules.length === 0 && (
                  <p className="text-center text-stone-500 py-8">Nenhum treinamento agendado</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}