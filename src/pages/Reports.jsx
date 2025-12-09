import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Filter, BarChart3, TrendingUp, DollarSign, Users, Building2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function ReportsPage() {
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedInstructor, setSelectedInstructor] = useState("all");

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => base44.entities.TrainingSchedule.list(),
    initialData: [],
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    initialData: [],
  });

  const { data: classSchedules = [] } = useQuery({
    queryKey: ['classSchedules'],
    queryFn: () => base44.entities.ClassSchedule.list(),
    initialData: [],
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
    initialData: [],
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => base44.entities.Instructor.list(),
    initialData: [],
  });

  // Criar mapa de empresas para lookup rápido
  const companyMap = companies.reduce((acc, company) => {
    acc[company.id] = company;
    acc[company.nome_fantasia] = company;
    acc[company.razao_social] = company;
    return acc;
  }, {});

  // Criar mapa de cursos para lookup rápido
  const courseMap = courses.reduce((acc, course) => {
    acc[course.name] = course;
    return acc;
  }, {});

  // Extrair meses únicos das turmas
  const availableMonths = [...new Set(classSchedules.map(s => s.month).filter(Boolean))].sort();

  // Filtrar turmas por empresa, mês e instrutor selecionados
  const filteredClasses = classSchedules.filter(classItem => {
    const companyData = companyMap[classItem.company_name];
    const matchCompany = selectedCompany === "all" || 
      classItem.company_name === selectedCompany ||
      companyData?.id === selectedCompany ||
      companyData?.nome_fantasia === companies.find(c => c.id === selectedCompany)?.nome_fantasia;
    const matchMonth = selectedMonth === "all" || classItem.month === selectedMonth;
    const matchInstructor = selectedInstructor === "all" || classItem.instructor_name === selectedInstructor;
    return matchCompany && matchMonth && matchInstructor;
  });

  // Relatório por Mês, Empresa e Curso
  const monthCompanyReport = filteredClasses.reduce((acc, classItem) => {
    // Buscar dados da empresa
    const companyData = companyMap[classItem.company_name];
    const companyName = companyData?.nome_fantasia || classItem.company_name || 'Sem empresa';

    // Buscar dados do curso
    const courseData = courseMap[classItem.training_name];

    // Calcular valor do curso (verificar se há preço específico para a empresa)
    let courseValue = courseData?.standard_value || 0;
    if (courseData?.company_prices && companyData) {
      const companyPrice = courseData.company_prices.find(cp => 
        cp.company_id === companyData.id || 
        cp.company_name === companyData.nome_fantasia
      );
      if (companyPrice) {
        courseValue = companyPrice.negotiated_value;
      }
    }

    const studentsCount = classItem.students_count || 1;
    const totalValue = courseValue * studentsCount;

    const key = `${classItem.id}`;
    if (!acc[key]) {
      acc[key] = {
        month: classItem.month || 'Sem mês',
        company: companyName,
        company_data: companyData,
        course_name: classItem.training_name,
        course_data: courseData,
        unit_value: courseValue,
        total_value: totalValue,
        students_count: studentsCount,
        count: 1,
        // Campos adicionais da turma
        location: classItem.location || '',
        start_date: classItem.start_date || '',
        end_date: classItem.end_date || '',
        specific_days: classItem.specific_days || '',
        training_schedule: classItem.training_schedule || '',
        instructor_name: classItem.instructor_name || '',
        payment_status: classItem.payment_status || 'Pendente',
        modality: classItem.modality || '',
        category: classItem.category || '',
        duration_hours: classItem.duration_hours || 0,
        status: classItem.status || '',
        notes: classItem.notes || ''
      };
    }
    return acc;
  }, {});

  const reportData = Object.values(monthCompanyReport).sort((a, b) => {
    if (a.month !== b.month) return a.month.localeCompare(b.month);
    return a.company.localeCompare(b.company);
  });

  const exportToExcel = () => {
    // Criar conteúdo HTML com tabela formatada para Excel
    const totalValue = reportData.reduce((sum, row) => sum + row.total_value, 0);
    const totalStudents = reportData.reduce((sum, row) => sum + row.students_count, 0);
    const totalCount = reportData.length;
    const totalEmpresas = new Set(reportData.map(r => r.company)).size;
    const totalHours = reportData.reduce((sum, row) => sum + (row.duration_hours || 0), 0);

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Relatório</x:Name>
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
            font-size: 11pt;
          }
          td { text-align: left; font-size: 10pt; }
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
            <td colspan="16" class="titulo">RELATÓRIO DE TREINAMENTOS - CAT</td>
          </tr>
          <tr>
            <td colspan="16" class="subtitulo">Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</td>
          </tr>
          <tr><td colspan="16"></td></tr>
          <tr>
            <th>Mês</th>
            <th>Empresa</th>
            <th>Curso</th>
            <th>Local</th>
            <th>Data Início</th>
            <th>Data Fim</th>
            <th>Dias Específicos</th>
            <th>Horário</th>
            <th>Instrutor</th>
            <th>Pago Log</th>
            <th>Modalidade</th>
            <th>Categoria</th>
            <th>Carga Horária</th>
            <th>Qtd. Alunos</th>
            <th>Valor Unit.</th>
            <th>Valor Total</th>
            </tr>
            ${reportData.map(row => `
            <tr>
              <td>${row.month}</td>
              <td>${row.company}</td>
              <td>${row.course_name}</td>
              <td>${row.location}</td>
              <td>${row.start_date}</td>
              <td>${row.end_date}</td>
              <td>${row.specific_days}</td>
              <td>${row.training_schedule}</td>
              <td>${row.instructor_name}</td>
              <td>${row.payment_status || 'Pendente'}</td>
              <td>${row.modality}</td>
              <td>${row.category}</td>
              <td class="numero">${row.duration_hours}h</td>
              <td class="numero">${row.students_count}</td>
              <td class="numero">R$ ${row.unit_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              <td class="numero">R$ ${row.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            </tr>
            `).join('')}
          <tr class="total-row">
            <td><strong>TOTAL</strong></td>
            <td><strong>${totalEmpresas} empresa(s)</strong></td>
            <td><strong>${totalCount} turma(s)</strong></td>
            <td colspan="9"></td>
            <td class="numero"><strong>${totalHours}h</strong></td>
            <td class="numero"><strong>${totalStudents}</strong></td>
            <td></td>
            <td class="numero"><strong>R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_treinamentos_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalValue = reportData.reduce((sum, row) => sum + row.total_value, 0);
  const totalStudents = reportData.reduce((sum, row) => sum + row.students_count, 0);
  const uniqueCompanies = new Set(reportData.map(r => r.company)).size;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-black">
              Relatórios Analíticos
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Análise completa de custos e desempenho
            </p>
          </div>
          <Button 
            onClick={exportToExcel}
            className="bg-gray-900 hover:bg-gray-800"
            disabled={reportData.length === 0}
          >
            <Download className="w-5 h-5 mr-2" />
            Exportar Excel
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <DollarSign className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">
                R$ {(totalValue / 1000).toFixed(0)}k
              </p>
              <p className="text-sm text-gray-600">Valor Total</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <Users className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{totalStudents}</p>
              <p className="text-sm text-gray-600">Total de Alunos</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <FileText className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{reportData.length}</p>
              <p className="text-sm text-gray-600">Total de Turmas</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <Building2 className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{uniqueCompanies}</p>
              <p className="text-sm text-gray-600">Empresas Atendidas</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="border border-gray-300">
          <CardHeader className="bg-gray-100">
            <h2 className="text-lg font-bold flex items-center gap-2 text-black">
              <Filter className="w-5 h-5" />
              Filtros de Análise
            </h2>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-stone-500" />
                <span className="font-medium text-stone-700">Filtros:</span>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-stone-500">Empresa</Label>
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Todas as empresas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as empresas</SelectItem>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.nome_fantasia || company.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-stone-500">Mês</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Todos os meses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os meses</SelectItem>
                    {availableMonths.map(month => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-stone-500">Instrutor</Label>
                <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Todos os instrutores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os instrutores</SelectItem>
                    {instructors.map(instructor => (
                      <SelectItem key={instructor.id} value={instructor.name}>
                        {instructor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(selectedCompany !== "all" || selectedMonth !== "all" || selectedInstructor !== "all") && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedCompany("all");
                    setSelectedMonth("all");
                    setSelectedInstructor("all");
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-300">
          <CardHeader className="bg-gray-100">
            <h2 className="text-xl font-bold flex items-center gap-2 text-black">
              <FileText className="w-6 h-6" />
              Custos Detalhados por Mês e Empresa
            </h2>
            <p className="text-gray-600 text-sm mt-1">Análise completa de treinamentos realizados</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100 border-b-2 border-gray-200">
                    <TableHead className="font-bold text-black">📅 Mês</TableHead>
                    <TableHead className="font-bold text-black">🏢 Empresa</TableHead>
                    <TableHead className="font-bold text-black">📚 Curso</TableHead>
                    <TableHead className="font-bold text-black">👨‍🏫 Instrutor</TableHead>
                    <TableHead className="font-bold text-black">📊 Modalidade</TableHead>
                    <TableHead className="font-bold text-right text-black">💰 Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-stone-500">
                        Nenhum dado disponível para relatório
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportData.map((row, index) => (
                      <TableRow key={index} className="hover:bg-gray-50 transition-all duration-200 border-b border-gray-100">
                        <TableCell className="font-bold text-black">{row.month}</TableCell>
                        <TableCell className="font-medium text-gray-700">{row.company}</TableCell>
                        <TableCell className="text-gray-700">{row.course_name}</TableCell>
                        <TableCell className="text-gray-600">{row.instructor_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {row.modality || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-black">
                            R$ {row.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
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