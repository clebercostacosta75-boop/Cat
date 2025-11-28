import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Filter } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function ReportsPage() {
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");

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

  // Filtrar turmas por empresa e mês selecionados
  const filteredClasses = classSchedules.filter(classItem => {
    const companyData = companyMap[classItem.company_name];
    const matchCompany = selectedCompany === "all" || 
      classItem.company_name === selectedCompany ||
      companyData?.id === selectedCompany ||
      companyData?.nome_fantasia === companies.find(c => c.id === selectedCompany)?.nome_fantasia;
    const matchMonth = selectedMonth === "all" || classItem.month === selectedMonth;
    return matchCompany && matchMonth;
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
    
    const key = `${classItem.month}|${companyName}|${classItem.training_name}`;
    if (!acc[key]) {
      acc[key] = {
        month: classItem.month || 'Sem mês',
        company: companyName,
        company_data: companyData,
        course_name: classItem.training_name,
        course_data: courseData,
        unit_value: courseValue,
        total_value: 0,
        students_count: 0,
        count: 0
      };
    }
    acc[key].total_value += totalValue;
    acc[key].students_count += studentsCount;
    acc[key].count += 1;
    return acc;
  }, {});

  const reportData = Object.values(monthCompanyReport).sort((a, b) => {
    if (a.month !== b.month) return a.month.localeCompare(b.month);
    return a.company.localeCompare(b.company);
  });

  const exportToExcel = () => {
    // Criar conteúdo HTML com tabela formatada para Excel
    const totalCost = reportData.reduce((sum, row) => sum + row.total_cost, 0);
    const totalCount = reportData.reduce((sum, row) => sum + row.count, 0);
    const totalEmpresas = new Set(reportData.map(r => r.company)).size;

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
            <td colspan="4" class="titulo">RELATÓRIO DE TREINAMENTOS - CAT</td>
          </tr>
          <tr>
            <td colspan="4" class="subtitulo">Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</td>
          </tr>
          <tr><td colspan="4"></td></tr>
          <tr>
            <th style="width: 100px;">Mês</th>
            <th style="width: 300px;">Empresa</th>
            <th style="width: 150px;">Custo Total (HP)</th>
            <th style="width: 100px;">Quantidade</th>
          </tr>
          ${reportData.map(row => `
            <tr>
              <td>${row.month}</td>
              <td>${row.company}</td>
              <td class="numero">R$ ${row.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              <td class="numero">${row.count}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td><strong>TOTAL</strong></td>
            <td><strong>${totalEmpresas} empresa(s)</strong></td>
            <td class="numero"><strong>R$ ${totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></td>
            <td class="numero"><strong>${totalCount}</strong></td>
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
            <h1 className="text-3xl md:text-4xl font-bold text-stone-900">Relatórios</h1>
            <p className="text-stone-600 mt-1">Análise de custos por mês e empresa</p>
          </div>
          <Button 
            onClick={exportToExcel}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
            disabled={reportData.length === 0}
          >
            <Download className="w-5 h-5 mr-2" />
            Exportar Excel
          </Button>
        </div>

        {/* Filtros */}
        <Card className="border-none shadow-lg">
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
              {(selectedCompany !== "all" || selectedMonth !== "all") && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedCompany("all");
                    setSelectedMonth("all");
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-emerald-600" />
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-stone-500">
                        Nenhum dado disponível para relatório
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportData.map((row, index) => (
                      <TableRow key={index} className="hover:bg-stone-50">
                        <TableCell className="font-medium">{row.month}</TableCell>
                        <TableCell>{row.company}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600">
                          R$ {row.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">{row.count}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {reportData.length > 0 && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-stone-900">Resumo Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-stone-600 mb-2">Total Geral</p>
                  <p className="text-3xl font-bold text-emerald-600">
                    R$ {reportData.reduce((sum, row) => sum + row.total_cost, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-stone-600 mb-2">Total de Treinamentos</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {reportData.reduce((sum, row) => sum + row.count, 0)}
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-stone-600 mb-2">Empresas Atendidas</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {new Set(reportData.map(r => r.company)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}