import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Building2, Calendar, DollarSign, Mail, MessageCircle, Send, CheckCircle, Loader2, BookOpen, Clock, MapPin } from "lucide-react";
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
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
          <div className="flex-shrink-0">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png" 
              alt="CAT Logo" 
              className="h-24 w-auto"
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-stone-900">Dashboard</h1>
            <p className="text-stone-600">Análise de custos por mês e empresa</p>
          </div>
          <Button 
            onClick={exportToExcel}
            disabled={tableData.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
          >
            <Download className="w-5 h-5 mr-2" />
            Exportar Excel
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-none shadow-xl bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-stone-600">Total Geral</CardTitle>
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-stone-600 mt-1">Soma de todos os custos</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-stone-600">Total de Treinamentos</CardTitle>
              <Calendar className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{totalTreinamentos}</div>
              <p className="text-xs text-stone-600 mt-1">Turmas concluídas</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-gradient-to-br from-purple-50 to-violet-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-stone-600">Empresas Atendidas</CardTitle>
              <Building2 className="w-5 h-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{empresasAtendidas}</div>
              <p className="text-xs text-stone-600 mt-1">Clientes únicos</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-emerald-600" />
              Custos por Mês e Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-stone-50">
                    <TableHead className="font-bold">Mês</TableHead>
                    <TableHead className="font-bold">Empresa</TableHead>
                    <TableHead className="font-bold text-right">Custo Total (HP)</TableHead>
                    <TableHead className="font-bold text-right">Quantidade</TableHead>
                    <TableHead className="font-bold text-center">Notificações</TableHead>
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
                        <TableRow key={index} className="hover:bg-stone-50">
                          <TableCell className="font-medium">{row.month}</TableCell>
                          <TableCell>{row.company}</TableCell>
                          <TableCell className="text-right font-semibold text-emerald-600">
                            R$ {row.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">{row.classCount}</TableCell>
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
                                    variant="outline"
                                    onClick={() => handleSendNotifications(row.classIds, 'email')}
                                    disabled={!!sending}
                                    title="Enviar E-mail"
                                  >
                                    {sending === 'email' ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Mail className="w-3 h-3" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSendNotifications(row.classIds, 'whatsapp')}
                                    disabled={!!sending}
                                    title="Enviar WhatsApp"
                                  >
                                    {sending === 'whatsapp' ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <MessageCircle className="w-3 h-3" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSendNotifications(row.classIds, 'all')}
                                    disabled={!!sending}
                                    title="Enviar Tudo"
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

        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-blue-900 mb-1">Sobre os Custos (HP)</p>
                <p className="text-sm text-blue-800">
                  Os valores exibidos representam a soma de todos os custos diários registrados para cada turma concluída.
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
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