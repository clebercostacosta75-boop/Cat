import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Building2, Calendar, DollarSign, Mail, MessageCircle, Send, CheckCircle, Loader2, BookOpen, Clock, MapPin, TrendingUp, Users, BarChart3, PieChart } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [instructorData, setInstructorData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Verificar se é instrutor
        if (currentUser.email) {
          const instructors = await base44.entities.Instructor.filter({ email: currentUser.email });
          if (instructors.length > 0) {
            setUserRole('Instrutor');
            setInstructorData(instructors[0]);
            return;
          }
        }
        
        setUserRole(currentUser.custom_role || currentUser.role || 'user');
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
      }
    };
    loadUser();
  }, []);

  // Renderizar dashboard específico baseado no role
  if (userRole === 'Instrutor') {
    return <DashboardInstrutor instructor={instructorData} />;
  }

  if (userRole === 'Coordenador de Operações') {
    // Coordenador não tem Dashboard, redirecionar para Cronograma
    useEffect(() => {
      navigate(createPageUrl('Schedule'));
    }, [navigate]);
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="ml-3 text-stone-600">Redirecionando...</p>
      </div>
    );
  }

  // Admin Master e Financeiro
  return <DashboardAdminMaster />;
}

// ===== DASHBOARD ADMIN MASTER E FINANCEIRO =====
function DashboardAdminMaster() {
  const [sendingNotifications, setSendingNotifications] = useState({});
  const [notificationResults, setNotificationResults] = useState({});

  const { data: completedClasses = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['completedClasses'],
    queryFn: async () => {
      const allClasses = await base44.entities.ClassSchedule.list();
      return allClasses.filter(c => c.status === 'Concluído');
    },
    initialData: [],
  });

  const { data: allDailyRecords = [], isLoading: loadingRecords } = useQuery({
    queryKey: ['allDailyRecords'],
    queryFn: () => base44.entities.ClassDailyRecord.list(),
    initialData: [],
  });

  const tableData = React.useMemo(() => {
    const groupedData = {};

    completedClasses.forEach(classItem => {
      const month = classItem.month || 'Sem mês';
      const company = classItem.company_name || 'Sem empresa';
      const key = `${month}|${company}`;

      if (!groupedData[key]) {
        groupedData[key] = {
          month,
          company,
          totalCost: 0,
          classCount: 0,
          classIds: []
        };
      }

      const classDailyRecords = allDailyRecords.filter(
        record => record.class_schedule_id === classItem.id
      );

      const classTotalCost = classDailyRecords.reduce(
        (sum, record) => sum + (record.total_daily_cost || 0), 
        0
      );

      groupedData[key].totalCost += classTotalCost;
      groupedData[key].classCount += 1;
      groupedData[key].classIds.push(classItem.id);
    });

    return Object.values(groupedData).sort((a, b) => {
      if (a.month !== b.month) return a.month.localeCompare(b.month);
      return a.company.localeCompare(b.company);
    });
  }, [completedClasses, allDailyRecords]);

  const totalGeral = tableData.reduce((sum, row) => sum + row.totalCost, 0);
  const totalTreinamentos = tableData.reduce((sum, row) => sum + row.classCount, 0);
  const empresasAtendidas = new Set(tableData.map(row => row.company)).size;

  // Dados para gráfico de linha (custos por mês)
  const monthlyData = React.useMemo(() => {
    const grouped = {};
    tableData.forEach(row => {
      if (!grouped[row.month]) {
        grouped[row.month] = { month: row.month, total: 0, count: 0 };
      }
      grouped[row.month].total += row.totalCost;
      grouped[row.month].count += row.classCount;
    });
    return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
  }, [tableData]);

  // Dados para gráfico de barras (top 5 empresas)
  const topCompanies = React.useMemo(() => {
    const grouped = {};
    tableData.forEach(row => {
      if (!grouped[row.company]) {
        grouped[row.company] = { company: row.company, total: 0 };
      }
      grouped[row.company].total += row.totalCost;
    });
    return Object.values(grouped)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [tableData]);

  // Dados para gráfico de pizza (distribuição por mês)
  const pieData = React.useMemo(() => {
    return monthlyData.slice(0, 6);
  }, [monthlyData]);

  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];

  const exportToExcel = () => {
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Dashboard</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #000000; padding: 8px; }
          th { 
            background-color: #10B981; 
            color: #FFFFFF; 
            font-weight: bold; 
            text-align: center;
            font-size: 12pt;
          }
          td { text-align: left; font-size: 11pt; }
          .numero { text-align: right; }
          .total-row { 
            background-color: #D1FAE5; 
            font-weight: bold; 
          }
          .titulo { 
            background-color: #065F46; 
            color: #FFFFFF; 
            font-size: 14pt; 
            font-weight: bold; 
            text-align: center; 
          }
          .subtitulo { 
            background-color: #ECFDF5; 
            font-size: 10pt; 
            text-align: center; 
            color: #374151;
          }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="4" class="titulo">DASHBOARD DE CUSTOS - CAT</td>
          </tr>
          <tr>
            <td colspan="4" class="subtitulo">Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</td>
          </tr>
          <tr><td colspan="4"></td></tr>
          <tr>
            <th style="width: 150px;">Mês</th>
            <th style="width: 250px;">Empresa</th>
            <th style="width: 150px;">Custo Total (HP)</th>
            <th style="width: 100px;">Quantidade</th>
          </tr>
          ${tableData.map(row => `
            <tr>
              <td>${row.month}</td>
              <td>${row.company}</td>
              <td class="numero">R$ ${row.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              <td class="numero">${row.classCount}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td><strong>TOTAL</strong></td>
            <td><strong>${empresasAtendidas} empresa(s)</strong></td>
            <td class="numero"><strong>R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></td>
            <td class="numero"><strong>${totalTreinamentos}</strong></td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `dashboard_custos_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendNotifications = async (classIds, type) => {
    const key = classIds.join(',');
    setSendingNotifications(prev => ({ ...prev, [key]: type }));
    setNotificationResults(prev => ({ ...prev, [key]: null }));

    try {
      const results = await Promise.all(
        classIds.map(classId => 
          base44.functions.invoke('enviarNotificacoesTreinamento', { schedule_id: classId })
        )
      );

      const allSuccess = results.every(r => r.data?.success);
      
      setNotificationResults(prev => ({ 
        ...prev, 
        [key]: { 
          success: allSuccess, 
          message: allSuccess ? 'Notificações enviadas com sucesso!' : 'Algumas notificações falharam'
        } 
      }));
    } catch (error) {
      setNotificationResults(prev => ({ 
        ...prev, 
        [key]: { success: false, message: 'Erro ao enviar notificações' } 
      }));
    } finally {
      setSendingNotifications(prev => ({ ...prev, [key]: null }));
    }
  };

  if (loadingClasses || loadingRecords) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho Moderno */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-xl">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-purple-500 rounded-full border-4 border-white flex items-center justify-center">
                <TrendingUp className="w-3 h-3 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-stone-900 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Dashboard Analytics
              </h1>
              <p className="text-stone-600 text-sm mt-1 font-medium">
                Visão completa de custos, desempenho e atividades
              </p>
            </div>
          </div>
          <Button 
            onClick={exportToExcel}
            disabled={tableData.length === 0}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Download className="w-5 h-5 mr-2" />
            Exportar Excel
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-emerald-100 to-teal-50 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <DollarSign className="w-10 h-10 text-emerald-600 mb-3" />
                  <p className="text-4xl font-black text-emerald-900 mb-1">
                    R$ {(totalGeral / 1000).toFixed(0)}k
                  </p>
                  <p className="text-xs font-semibold text-emerald-700">Total em Custos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-blue-100 to-cyan-50 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <Calendar className="w-10 h-10 text-blue-600 mb-3" />
                  <p className="text-4xl font-black text-blue-900 mb-1">{totalTreinamentos}</p>
                  <p className="text-xs font-semibold text-blue-700">Treinamentos Concluídos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-purple-100 to-violet-50 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <Building2 className="w-10 h-10 text-purple-600 mb-3" />
                  <p className="text-4xl font-black text-purple-900 mb-1">{empresasAtendidas}</p>
                  <p className="text-xs font-semibold text-purple-700">Empresas Atendidas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-amber-100 to-orange-50 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <TrendingUp className="w-10 h-10 text-amber-600 mb-3" />
                  <p className="text-4xl font-black text-amber-900 mb-1">
                    R$ {totalGeral > 0 ? (totalGeral / totalTreinamentos).toFixed(0) : 0}
                  </p>
                  <p className="text-xs font-semibold text-amber-700">Custo Médio/Turma</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Gráfico de Linha - Evolução Mensal */}
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-stone-900">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Evolução de Custos por Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#10B981" strokeWidth={3} name="Custo Total" dot={{ fill: '#10B981', r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-stone-400">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Pizza - Distribuição por Mês */}
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-stone-900">
                <PieChart className="w-5 h-5 text-purple-600" />
                Distribuição de Custos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.month}: ${((entry.total / totalGeral) * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="total"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-stone-400">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Barras - Top 5 Empresas */}
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-stone-900">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Top 5 Empresas por Custo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCompanies.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCompanies}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="company" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  />
                  <Legend />
                  <Bar dataKey="total" fill="#3B82F6" name="Custo Total" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-stone-400">
                Sem dados disponíveis
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabela Detalhada */}
        <Card className="border-none shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="w-6 h-6" />
              Custos Detalhados por Mês e Empresa
            </h2>
            <p className="text-emerald-100 text-sm mt-1">Visualização completa com opções de notificação</p>
          </div>
          <CardContent className="p-0">
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-stone-50 to-stone-100 border-b-2 border-stone-200">
                    <TableHead className="font-bold text-stone-700">📅 Mês</TableHead>
                    <TableHead className="font-bold text-stone-700">🏢 Empresa</TableHead>
                    <TableHead className="font-bold text-right text-stone-700">💰 Custo Total (HP)</TableHead>
                    <TableHead className="font-bold text-right text-stone-700">📊 Quantidade</TableHead>
                    <TableHead className="font-bold text-center text-stone-700">📢 Notificações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-stone-500">
                        Nenhum treinamento concluído encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableData.map((row, index) => {
                      const key = row.classIds.join(',');
                      const sending = sendingNotifications[key];
                      const result = notificationResults[key];

                      return (
                        <TableRow key={index} className="hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 transition-all duration-200 border-b border-stone-100">
                          <TableCell className="font-bold text-stone-900">{row.month}</TableCell>
                          <TableCell className="font-medium text-stone-700">{row.company}</TableCell>
                          <TableCell className="text-right">
                            <span className="font-black text-emerald-600 text-lg">
                              R$ {row.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className="bg-blue-100 text-blue-700 font-bold">{row.classCount}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              {result ? (
                                <div className="flex items-center gap-2">
                                  {result.success ? (
                                    <>
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                      <span className="text-xs text-green-600">Enviado</span>
                                    </>
                                  ) : (
                                    <span className="text-xs text-red-600">Erro</span>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleSendNotifications(row.classIds, 'email')}
                                    disabled={!!sending}
                                    title="Enviar E-mail"
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md"
                                  >
                                    {sending === 'email' ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Mail className="w-3 h-3" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleSendNotifications(row.classIds, 'whatsapp')}
                                    disabled={!!sending}
                                    title="Enviar WhatsApp"
                                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md"
                                  >
                                    {sending === 'whatsapp' ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <MessageCircle className="w-3 h-3" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleSendNotifications(row.classIds, 'all')}
                                    disabled={!!sending}
                                    title="Enviar Tudo"
                                    className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md"
                                  >
                                    {sending === 'all' ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Send className="w-3 h-3" />
                                    )}
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Alert className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-lg">
            <AlertDescription>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-blue-900 mb-1">💡 Sobre os Custos (HP)</p>
                  <p className="text-sm text-blue-800">
                    Os valores exibidos representam a soma de todos os custos diários registrados para cada turma concluída.
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <Alert className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 shadow-lg">
            <AlertDescription>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-purple-900 mb-1">📊 Insights de Performance</p>
                  <p className="text-sm text-purple-800">
                    Use os gráficos acima para identificar tendências de custos e otimizar o planejamento de treinamentos.
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}

// ===== DASHBOARD INSTRUTOR =====
function DashboardInstrutor({ instructor }) {
  const { data: myClasses = [], isLoading } = useQuery({
    queryKey: ['instructorClasses', instructor?.name],
    queryFn: async () => {
      if (!instructor?.name) return [];
      const allClasses = await base44.entities.ClassSchedule.filter({ 
        instructor_name: instructor.name 
      });
      return allClasses.sort((a, b) => {
        if (a.start_date > b.start_date) return 1;
        if (a.start_date < b.start_date) return -1;
        return 0;
      });
    },
    enabled: !!instructor?.name,
    initialData: [],
  });

  const upcomingClasses = myClasses.filter(c => 
    c.status === 'Agendado' || c.status === 'Em Andamento'
  );
  const completedClasses = myClasses.filter(c => c.status === 'Concluído');

  const statusColors = {
    'Agendado': 'bg-blue-100 text-blue-800',
    'Em Andamento': 'bg-yellow-100 text-yellow-800',
    'Concluído': 'bg-green-100 text-green-800',
    'Cancelado': 'bg-red-100 text-red-800',
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
          <div className="flex-shrink-0">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png" 
              alt="CAT Logo" 
              className="h-24 w-auto"
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-stone-900">
              Meus Treinamentos
            </h1>
            <p className="text-stone-600">Olá, {instructor?.name || 'Instrutor'}!</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-stone-600">Próximos</CardTitle>
              <Calendar className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{upcomingClasses.length}</div>
              <p className="text-xs text-stone-600 mt-1">Treinamentos agendados</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-stone-600">Concluídos</CardTitle>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{completedClasses.length}</div>
              <p className="text-xs text-stone-600 mt-1">Treinamentos finalizados</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-gradient-to-br from-purple-50 to-violet-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-stone-600">Total</CardTitle>
              <BookOpen className="w-5 h-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{myClasses.length}</div>
              <p className="text-xs text-stone-600 mt-1">Todos os treinamentos</p>
            </CardContent>
          </Card>
        </div>

        {upcomingClasses.length > 0 && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-stone-900">
                Próximos Treinamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingClasses.map((classItem) => (
                  <Card key={classItem.id} className="border-stone-200">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-stone-900">
                              {classItem.training_name}
                            </h3>
                            <Badge className={statusColors[classItem.status]}>
                              {classItem.status}
                            </Badge>
                          </div>
                          <p className="text-stone-600 mb-3">{classItem.company_name}</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-sm text-stone-600">
                          <Calendar className="w-4 h-4" />
                          <span>{classItem.start_date} a {classItem.end_date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-stone-600">
                          <Clock className="w-4 h-4" />
                          <span>{classItem.training_schedule || 'Não definido'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-stone-600">
                          <MapPin className="w-4 h-4" />
                          <span>{classItem.location || 'Não definido'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-stone-600">
                          👥 <span>{classItem.students_count || 0} alunos</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-stone-200">
                        <Link to={createPageUrl(`ClassDetails?id=${classItem.id}`)}>
                          <Button variant="outline" size="sm">
                            Ver Detalhes
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {completedClasses.length > 0 && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-stone-900">
                Treinamentos Concluídos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {completedClasses.slice(0, 5).map((classItem) => (
                  <div key={classItem.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-stone-900">{classItem.training_name}</p>
                      <p className="text-sm text-stone-600">
                        {classItem.company_name} • {classItem.start_date}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      Concluído
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {myClasses.length === 0 && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-stone-300" />
              <p className="text-stone-600">Nenhum treinamento agendado</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}