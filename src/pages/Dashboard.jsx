import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Building2, Calendar, DollarSign, Mail, MessageCircle, Send, CheckCircle, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Dashboard() {
  const [sendingNotifications, setSendingNotifications] = useState({});
  const [notificationResults, setNotificationResults] = useState({});

  // Buscar turmas concluídas
  const { data: completedClasses = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['completedClasses'],
    queryFn: async () => {
      const allClasses = await base44.entities.ClassSchedule.list();
      return allClasses.filter(c => c.status === 'Concluído');
    },
    initialData: [],
  });

  // Buscar todos os registros diários
  const { data: allDailyRecords = [], isLoading: loadingRecords } = useQuery({
    queryKey: ['allDailyRecords'],
    queryFn: () => base44.entities.ClassDailyRecord.list(),
    initialData: [],
  });

  // Processar dados para a tabela
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

      // Somar custos diários desta turma
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

  // Calcular totais
  const totalGeral = tableData.reduce((sum, row) => sum + row.totalCost, 0);
  const totalTreinamentos = tableData.reduce((sum, row) => sum + row.classCount, 0);
  const empresasAtendidas = new Set(tableData.map(row => row.company)).size;

  // Exportar CSV
  const exportToCSV = () => {
    const headers = ['Mês', 'Empresa', 'Custo Total (HP)', 'Quantidade'];
    const csvContent = [
      headers.join(','),
      ...tableData.map(row => [
        row.month,
        row.company,
        row.totalCost.toFixed(2),
        row.classCount
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'dashboard_custos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Enviar notificações
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
        {/* Logo e Título */}
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
            onClick={exportToCSV}
            disabled={tableData.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
          >
            <Download className="w-5 h-5 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* Resumo Total - Cards */}
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

        {/* Tabela Principal */}
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
                                    title="Enviar Tudo (E-mail + WhatsApp + SMS)"
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

            {tableData.length > 0 && (
              <div className="mt-6 p-4 bg-stone-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-stone-600 mb-2">
                  <Send className="w-4 h-4" />
                  <strong>Sistema de Notificações Automáticas</strong>
                </div>
                <p className="text-xs text-stone-600">
                  Use os botões acima para enviar notificações aos instrutores e empresas sobre os treinamentos concluídos.
                </p>
                <div className="flex gap-4 mt-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    <span>E-mail</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Send className="w-3 h-3" />
                    <span>Todos (E-mail + WhatsApp + SMS)</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações sobre Custos */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-blue-900 mb-1">Sobre os Custos (HP)</p>
                <p className="text-sm text-blue-800">
                  Os valores exibidos representam a soma de todos os custos diários registrados para cada turma concluída, 
                  incluindo: Almoço, Transporte, Coffee Break, Taxi e Custo HP. Os dados são agrupados por empresa e mês 
                  de conclusão do treinamento.
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}