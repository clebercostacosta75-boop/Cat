import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Building2, Calendar, DollarSign, Mail, MessageCircle, Send, CheckCircle, Loader2, BookOpen, Clock, MapPin, TrendingUp, Users, BarChart3, PieChart, Bell, AlertOctagon } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { logAction } from "@/components/audit/AuditLogger";
import ClassCard from "@/components/instructor/ClassCard";

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

  // Redirecionar coordenador
  useEffect(() => {
    if (userRole === 'Coordenador de Operações') {
      navigate(createPageUrl('Schedule'));
    }
  }, [userRole, navigate]);

  // Renderizar dashboard específico baseado no role
  if (userRole === 'Instrutor') {
    return <DashboardInstrutor instructor={instructorData} />;
  }

  if (userRole === 'Coordenador de Operações') {
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

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
    initialData: [],
  });

  // Função para verificar status de reciclagem
  const checkRecyclableStatus = (dataRealizacao, validadeMeses) => {
    const hoje = new Date();
    const dataVencimento = new Date(dataRealizacao);
    dataVencimento.setMonth(dataVencimento.getMonth() + validadeMeses);

    const diffTime = dataVencimento - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { status: "VENCIDO", color: "text-red-600", icon: "AlertOctagon", dias: diffDays };
    if (diffDays <= 30) return { status: "RECICLAGEM PRÓXIMA", color: "text-orange-500", icon: "Clock", dias: diffDays };
    return { status: "VÁLIDO", color: "text-green-600", icon: "CheckCircle", dias: diffDays };
  };

  // Calcular treinamentos para reciclagem (vencidos e próximos)
  const recyclableTrainings = React.useMemo(() => {
    const expired = [];
    const expiring = [];
    
    completedClasses.forEach(classItem => {
      // Buscar curso para pegar a validade
      const course = courses.find(c => c.name === classItem.training_name);
      if (!course || !course.validity || !classItem.end_date) return;
      
      // Extrair número de meses da validade (ex: "12 meses" -> 12)
      const validityMonths = parseInt(course.validity);
      if (isNaN(validityMonths)) return;
      
      const recycleStatus = checkRecyclableStatus(classItem.end_date, validityMonths);
      
      const item = {
        id: classItem.id,
        aluno_nome: classItem.company_name,
        curso_nome: classItem.training_name,
        dias_restantes: Math.abs(recycleStatus.dias),
        end_date: classItem.end_date,
        company_id: classItem.company_id,
        status: recycleStatus.status
      };
      
      if (recycleStatus.status === "VENCIDO") {
        expired.push(item);
      } else if (recycleStatus.status === "RECICLAGEM PRÓXIMA") {
        expiring.push(item);
      }
    });
    
    return {
      expired: expired.sort((a, b) => b.dias_restantes - a.dias_restantes),
      expiring: expiring.sort((a, b) => a.dias_restantes - b.dias_restantes),
      total: expired.length + expiring.length
    };
  }, [completedClasses, courses]);

  const handleNotifyRecycle = async (item) => {
    try {
      // Buscar empresa para pegar contatos
      const companies = await base44.entities.Company.list();
      const company = companies.find(c => 
        c.nome_fantasia === item.aluno_nome || 
        c.razao_social === item.aluno_nome ||
        c.id === item.company_id
      );

      if (!company || !company.contacts || company.contacts.length === 0) {
        alert('Empresa não possui contatos cadastrados');
        return;
      }

      // Buscar primeiro contato com WhatsApp
      const contact = company.contacts.find(c => c.is_whatsapp && c.phone);
      
      if (!contact) {
        alert('Empresa não possui contato com WhatsApp cadastrado');
        return;
      }

      // Validar telefone
      const phoneRegex = /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/;
      if (!phoneRegex.test(contact.phone)) {
        alert('Telefone do contato está em formato inválido');
        return;
      }

      // Calcular data de vencimento
      const dataVencimento = new Date(item.end_date);
      dataVencimento.setMonth(dataVencimento.getMonth() + parseInt(courses.find(c => c.name === item.curso_nome)?.validity || 12));
      const dataFormatada = dataVencimento.toLocaleDateString('pt-BR');

      const mensagem = `Olá ${contact.name || company.nome_fantasia}, o treinamento de *${item.curso_nome}* da empresa *${item.aluno_nome}* vence em ${dataFormatada} (${item.dias_restantes} dias). Favor agendar a reciclagem com a coordenação.`;
      
      // Formatar telefone para WhatsApp (remover caracteres especiais)
      const phoneClean = contact.phone.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/55${phoneClean}?text=${encodeURIComponent(mensagem)}`;
      
      // Abrir WhatsApp
      window.open(whatsappUrl, '_blank');
      
      // Registrar no log de auditoria
      await logAction(
        "ENVIO_WHATSAPP",
        "ClassSchedule",
        item.id,
        `Reciclagem: ${item.curso_nome}`,
        { 
          empresa: item.aluno_nome,
          dias_restantes: item.dias_restantes,
          contato: contact.name,
          telefone: contact.phone,
          status: 'Sucesso'
        }
      );
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      
      await logAction(
        "ENVIO_WHATSAPP",
        "ClassSchedule",
        item.id || '',
        `Reciclagem: ${item.curso_nome}`,
        { 
          empresa: item.aluno_nome,
          status: 'Falha',
          erro: error.message
        }
      );
      
      alert('Erro ao enviar notificação: ' + error.message);
    }
  };

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

  // Cálculos financeiros
  const financialSummary = React.useMemo(() => {
    const totalReceita = completedClasses.reduce((sum, c) => sum + (c.total_value || 0), 0);
    const totalCustos = allDailyRecords.reduce((sum, r) => sum + (r.total_daily_cost || 0), 0);
    const lucroLiquido = totalReceita - totalCustos;

    return { totalReceita, totalCustos, lucroLiquido };
  }, [completedClasses, allDailyRecords]);

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

  const COLORS = ['#374151', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB'];

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
      
      // Registrar no log de auditoria
      await logAction(
        "ENVIO_EMAIL",
        "ClassSchedule",
        classIds[0],
        `${classIds.length} turma(s)`,
        { 
          tipo: type === 'email' ? 'E-mail' : type === 'whatsapp' ? 'WhatsApp' : 'Todos',
          quantidade: classIds.length,
          status: allSuccess ? 'Sucesso' : 'Parcial'
        }
      );
      
      setNotificationResults(prev => ({ 
        ...prev, 
        [key]: { 
          success: allSuccess, 
          message: allSuccess ? 'Notificações enviadas com sucesso!' : 'Algumas notificações falharam'
        } 
      }));
    } catch (error) {
      // Registrar falha no log
      await logAction(
        "ENVIO_EMAIL",
        "ClassSchedule",
        classIds[0] || '',
        `${classIds.length} turma(s)`,
        { 
          tipo: type === 'email' ? 'E-mail' : type === 'whatsapp' ? 'WhatsApp' : 'Todos',
          quantidade: classIds.length,
          status: 'Falha',
          erro: error.message
        }
      );
      
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
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">
            Dashboard Analytics
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Visão completa de custos e desempenho
          </p>
        </div>

        {/* Resumo Financeiro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-xl border border-green-200">
            <p className="text-xs text-green-700 font-medium">Receita Projetada (BMM)</p>
            <h2 className="text-2xl font-bold text-green-900">
              R$ {financialSummary.totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-200">
            <p className="text-xs text-red-700 font-medium">Custo Operacional (Instrutores)</p>
            <h2 className="text-2xl font-bold text-red-900">
              R$ {financialSummary.totalCustos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <p className="text-xs text-blue-700 font-medium">Lucro Líquido Real</p>
            <h2 className="text-2xl font-bold text-blue-900">
              R$ {financialSummary.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <DollarSign className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">
                R$ {(totalGeral / 1000).toFixed(0)}k
              </p>
              <p className="text-sm text-gray-600">Total em Custos</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <Calendar className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{totalTreinamentos}</p>
              <p className="text-sm text-gray-600">Treinamentos Concluídos</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <Building2 className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{empresasAtendidas}</p>
              <p className="text-sm text-gray-600">Empresas Atendidas</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <TrendingUp className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">
                R$ {totalGeral > 0 ? (totalGeral / totalTreinamentos).toFixed(0) : 0}
              </p>
              <p className="text-sm text-gray-600">Custo Médio/Turma</p>
            </CardContent>
          </Card>
        </div>

        {/* Card de Reciclagens Pendentes */}
        {recyclableTrainings.total > 0 && (
          <Card className="border border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-black flex items-center gap-2">
                  <Bell className="w-5 h-5 text-red-500" />
                  Reciclagens Pendentes
                </CardTitle>
                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                  {recyclableTrainings.total} {recyclableTrainings.total === 1 ? 'turma' : 'turmas'}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Mantenha os treinamentos de Alubar e Unitapajós atualizados
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Vencidos - URGENTE */}
              {recyclableTrainings.expired.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-red-700 mb-3 flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4" />
                    URGENTE - Vencidos ({recyclableTrainings.expired.length})
                  </h4>
                  <div className="space-y-2">
                    {recyclableTrainings.expired.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-red-300 shadow-sm">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-gray-900">{item.aluno_nome}</p>
                          <p className="text-[10px] text-gray-600">{item.curso_nome}</p>
                        </div>
                        <Badge className="text-[10px] bg-red-100 text-red-800 border border-red-300 mr-2">
                          Vencido há {item.dias_restantes} dias
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={() => handleNotifyRecycle(item)} title="Notificar via WhatsApp" className="hover:bg-red-100">
                          <Send className="w-3 h-3 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Próximos de Vencer */}
              {recyclableTrainings.expiring.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-orange-700 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Vencem nos Próximos 30 Dias ({recyclableTrainings.expiring.length})
                  </h4>
                  <div className="space-y-2">
                    {recyclableTrainings.expiring.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-orange-200 shadow-sm">
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-900">{item.aluno_nome}</p>
                          <p className="text-[10px] text-gray-500">{item.curso_nome}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-300 mr-2">
                          {item.dias_restantes} dias
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={() => handleNotifyRecycle(item)} title="Notificar via WhatsApp" className="hover:bg-orange-100">
                          <Send className="w-3 h-3 text-orange-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Gráficos */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Gráfico de Linha - Evolução Mensal */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-black">
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
                    <Line type="monotone" dataKey="total" stroke="#6b7280" strokeWidth={2} name="Custo Total" dot={{ fill: '#6b7280', r: 4 }} />
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
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-black">
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
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-black">
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
                  <Bar dataKey="total" fill="#6b7280" name="Custo Total" radius={[4, 4, 0, 0]} />
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
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-black">
              Custos Detalhados por Mês e Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="font-bold text-black">Mês</TableHead>
                    <TableHead className="font-bold text-black">Empresa</TableHead>
                    <TableHead className="font-bold text-right text-black">Custo Total (HP)</TableHead>
                    <TableHead className="font-bold text-right text-black">Quantidade</TableHead>
                    <TableHead className="font-bold text-center text-black">Notificações</TableHead>
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
                        <TableRow key={index} className="hover:bg-gray-50 border-b border-gray-200">
                          <TableCell className="font-semibold text-black">{row.month}</TableCell>
                          <TableCell className="text-gray-700">{row.company}</TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-black">
                              R$ {row.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">{row.classCount}</Badge>
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
                                    variant="outline"
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
                                    variant="outline"
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
                                    variant="outline"
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

        <div className="grid md:grid-cols-2 gap-4">
          <Alert className="bg-gray-50 border-gray-200">
            <AlertDescription>
              <p className="font-semibold text-black mb-1">Sobre os Custos (HP)</p>
              <p className="text-sm text-gray-700">
                Os valores exibidos representam a soma de todos os custos diários registrados para cada turma concluída.
              </p>
            </AlertDescription>
          </Alert>

          <Alert className="bg-gray-50 border-gray-200">
            <AlertDescription>
              <p className="font-semibold text-black mb-1">Insights de Performance</p>
              <p className="text-sm text-gray-700">
                Use os gráficos acima para identificar tendências de custos e otimizar o planejamento de treinamentos.
              </p>
            </AlertDescription>
          </Alert>
        </div>

        {/* Botão Fixo no Rodapé */}
        {tableData.length > 0 && (
          <div className="fixed bottom-8 right-8 z-50">
            <button 
              onClick={exportToExcel}
              className="px-6 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 shadow-lg flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Exportar Excel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== DASHBOARD INSTRUTOR =====
function DashboardInstrutor({ instructor }) {
  const { data: myClasses = [], isLoading } = useQuery({
    queryKey: ['instructorClasses', instructor?.id],
    queryFn: async () => {
      if (!instructor?.id) return [];
      const allClasses = await base44.entities.ClassSchedule.filter({ 
        instructor_id: instructor.id 
      });
      return allClasses.sort((a, b) => {
        if (a.start_date > b.start_date) return 1;
        if (a.start_date < b.start_date) return -1;
        return 0;
      });
    },
    enabled: !!instructor?.id,
    initialData: [],
  });

  const upcomingClasses = myClasses.filter(c => 
    c.status === 'Agendado' || c.status === 'Em Andamento'
  );
  const completedClasses = myClasses.filter(c => c.status === 'Concluído');

  const statusColors = {
    'Agendado': 'bg-gray-100 text-gray-800 border border-gray-300',
    'Em Andamento': 'bg-gray-100 text-gray-800 border border-gray-300',
    'Concluído': 'bg-gray-100 text-gray-800 border border-gray-300',
    'Cancelado': 'bg-gray-100 text-gray-800 border border-gray-300',
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">
            Meus Treinamentos
          </h1>
          <p className="text-gray-600 text-sm mt-1">Olá, {instructor?.name || 'Instrutor'}!</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <Calendar className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{upcomingClasses.length}</p>
              <p className="text-sm text-gray-600">Próximos</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <CheckCircle className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{completedClasses.length}</p>
              <p className="text-sm text-gray-600">Concluídos</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <BookOpen className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{myClasses.length}</p>
              <p className="text-sm text-gray-600">Total</p>
            </CardContent>
          </Card>
        </div>

        {upcomingClasses.length > 0 && (
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-black">
                Próximos Treinamentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingClasses.map((classItem) => (
                <ClassCard key={classItem.id} classItem={classItem} />
              ))}
            </CardContent>
          </Card>
        )}

        {completedClasses.length > 0 && (
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-black">
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
                    <Badge className="bg-gray-100 text-gray-800 border border-gray-300">
                      Concluído
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {myClasses.length === 0 && (
          <Card className="border border-gray-200">
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Nenhum treinamento agendado</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}