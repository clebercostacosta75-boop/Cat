import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Download, Calendar, AlertCircle, CheckCircle, Clock, FileText, Eye } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function InstructorPaymentReport() {
  const [selectedInstructor, setSelectedInstructor] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [selectedClass, setSelectedClass] = useState(null);

  const { data: classSchedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['classSchedules'],
    queryFn: () => base44.entities.ClassSchedule.list(),
    initialData: [],
  });

  const { data: instructors = [], isLoading: loadingInstructors } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => base44.entities.Instructor.list(),
    initialData: [],
  });

  const { data: dailyRecords = [] } = useQuery({
    queryKey: ['dailyRecords'],
    queryFn: () => base44.entities.ClassDailyRecord.list(),
    initialData: [],
  });

  // Filtrar e processar dados
  const processedData = React.useMemo(() => {
    let filtered = classSchedules.filter(cls => {
      const classDate = new Date(cls.start_date);
      const classMonth = classDate.getMonth();
      const classYear = classDate.getFullYear();

      const matchesInstructor = selectedInstructor === "all" || cls.instructor_id === selectedInstructor;
      const matchesMonth = classMonth === parseInt(selectedMonth);
      const matchesYear = classYear === parseInt(selectedYear);
      const matchesStatus = paymentStatus === "all" || cls.payment_status === paymentStatus;

      return matchesInstructor && matchesMonth && matchesYear && matchesStatus;
    });

    return filtered.map(cls => {
      // Calcular custos operacionais
      const classDailyRecordsForClass = dailyRecords.filter(dr => dr.class_schedule_id === cls.id);
      const operationalCost = classDailyRecordsForClass.reduce((sum, dr) => {
        return sum + (dr.lunch_cost || 0) + (dr.transport_cost || 0) + 
               (dr.coffee_break_cost || 0) + (dr.taxi_cost || 0);
      }, 0);

      // Calcular custo do instrutor
      const instructorCost = cls.instructor_payment_value || 0;

      // Calcular custo HP dos registros diários
      const hpCost = classDailyRecordsForClass.reduce((sum, dr) => sum + (dr.hp_cost || 0), 0);

      const totalCost = operationalCost + instructorCost + hpCost;
      const revenue = cls.total_value || 0;
      const profit = revenue - totalCost;
      const profitMargin = revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : 0;

      // Status das parcelas
      let installmentStatus = "Sem Parcelas";
      let paidInstallments = 0;
      let totalInstallments = 0;

      if (cls.payment_installments && cls.payment_installments.length > 0) {
        totalInstallments = cls.payment_installments.length;
        paidInstallments = cls.payment_installments.filter(inst => inst.status === "Pago").length;
        installmentStatus = `${paidInstallments}/${totalInstallments}`;
      }

      return {
        ...cls,
        operationalCost,
        instructorCost,
        hpCost,
        totalCost,
        revenue,
        profit,
        profitMargin,
        installmentStatus,
        paidInstallments,
        totalInstallments
      };
    });
  }, [classSchedules, dailyRecords, selectedInstructor, selectedMonth, selectedYear, paymentStatus]);

  // Estatísticas
  const stats = React.useMemo(() => {
    const totalRevenue = processedData.reduce((sum, cls) => sum + cls.revenue, 0);
    const totalCosts = processedData.reduce((sum, cls) => sum + cls.totalCost, 0);
    const totalProfit = totalRevenue - totalCosts;
    const totalInstructorPayment = processedData.reduce((sum, cls) => sum + cls.instructorCost, 0);
    const pendingPayment = processedData
      .filter(cls => cls.payment_status !== "Pago")
      .reduce((sum, cls) => sum + cls.instructorCost, 0);

    return {
      totalRevenue,
      totalCosts,
      totalProfit,
      totalInstructorPayment,
      pendingPayment,
      totalClasses: processedData.length
    };
  }, [processedData]);

  // Função de exportação para Excel
  const exportToExcel = () => {
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
                        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    const rows = processedData.map(cls => [
      cls.training_name,
      cls.company_name,
      cls.instructor_name,
      format(new Date(cls.start_date), 'dd/MM/yyyy'),
      `R$ ${cls.revenue.toFixed(2)}`,
      `R$ ${cls.instructorCost.toFixed(2)}`,
      `R$ ${cls.operationalCost.toFixed(2)}`,
      `R$ ${cls.hpCost.toFixed(2)}`,
      `R$ ${cls.totalCost.toFixed(2)}`,
      `R$ ${cls.profit.toFixed(2)}`,
      `${cls.profitMargin}%`,
      cls.payment_status,
      cls.installmentStatus
    ]);

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Relatório Pagamento</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #000000; padding: 8px; text-align: left; }
          th { background-color: #10B981; color: #FFFFFF; font-weight: bold; }
          .totals { background-color: #F3F4F6; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>Relatório de Pagamento de Instrutores - ${monthNames[parseInt(selectedMonth)]}/${selectedYear}</h2>
        <table>
          <thead>
            <tr>
              <th>Treinamento</th>
              <th>Empresa</th>
              <th>Instrutor</th>
              <th>Data</th>
              <th>Receita</th>
              <th>Custo Instrutor</th>
              <th>Custo Operacional</th>
              <th>Custo HP</th>
              <th>Custo Total</th>
              <th>Lucro</th>
              <th>Margem</th>
              <th>Status Pagamento</th>
              <th>Parcelas</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell}</td>`).join('')}
              </tr>
            `).join('')}
            <tr class="totals">
              <td colspan="4">TOTAIS</td>
              <td>R$ ${stats.totalRevenue.toFixed(2)}</td>
              <td>R$ ${stats.totalInstructorPayment.toFixed(2)}</td>
              <td>-</td>
              <td>-</td>
              <td>R$ ${stats.totalCosts.toFixed(2)}</td>
              <td>R$ ${stats.totalProfit.toFixed(2)}</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_pagamento_instrutores_${monthNames[parseInt(selectedMonth)]}_${selectedYear}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPaymentStatusBadge = (status) => {
    const colors = {
      "Pendente": "bg-yellow-100 text-yellow-800",
      "Parcialmente Pago": "bg-blue-100 text-blue-800",
      "Pago": "bg-green-100 text-green-800"
    };
    return <Badge className={colors[status] || "bg-gray-100"}>{status}</Badge>;
  };

  const getInstallmentStatusIcon = (installment) => {
    if (installment.status === "Pago") {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (installment.status === "Atrasado") {
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
    return <Clock className="w-4 h-4 text-yellow-600" />;
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black flex items-center gap-2">
              <DollarSign className="w-7 h-7" />
              Relatório de Pagamento de Instrutores
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Custos, receitas e lucros detalhados por turma
            </p>
          </div>
          <Button onClick={exportToExcel} className="bg-emerald-600 hover:bg-emerald-700">
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid md:grid-cols-5 gap-4">
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <DollarSign className="w-6 h-6 text-emerald-600 mb-2" />
              <p className="text-2xl font-bold text-black">
                R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-600">Receita Total</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <DollarSign className="w-6 h-6 text-red-600 mb-2" />
              <p className="text-2xl font-bold text-black">
                R$ {stats.totalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-600">Custos Totais</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <DollarSign className="w-6 h-6 text-blue-600 mb-2" />
              <p className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {stats.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-600">Lucro Total</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <DollarSign className="w-6 h-6 text-purple-600 mb-2" />
              <p className="text-2xl font-bold text-black">
                R$ {stats.totalInstructorPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-600">Total Instrutores</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <AlertCircle className="w-6 h-6 text-yellow-600 mb-2" />
              <p className="text-2xl font-bold text-black">
                R$ {stats.pendingPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-600">Pendente</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Instrutor</Label>
                <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Instrutores</SelectItem>
                    {instructors.map(inst => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mês</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
                      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((month, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ano</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Parcialmente Pago">Parcialmente Pago</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card className="border border-gray-300">
          <CardHeader className="bg-gray-100">
            <h2 className="text-lg font-bold">Detalhamento por Turma</h2>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="font-bold">Treinamento</TableHead>
                    <TableHead className="font-bold">Empresa</TableHead>
                    <TableHead className="font-bold">Instrutor</TableHead>
                    <TableHead className="font-bold">Data</TableHead>
                    <TableHead className="font-bold text-right">Receita</TableHead>
                    <TableHead className="font-bold text-right">Custo Instrutor</TableHead>
                    <TableHead className="font-bold text-right">Custo Operacional</TableHead>
                    <TableHead className="font-bold text-right">Custo Total</TableHead>
                    <TableHead className="font-bold text-right">Lucro</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold">Parcelas</TableHead>
                    <TableHead className="font-bold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSchedules ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : processedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                        Nenhuma turma encontrada para os filtros selecionados
                      </TableCell>
                    </TableRow>
                  ) : (
                    processedData.map((cls) => (
                      <TableRow key={cls.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{cls.training_name}</TableCell>
                        <TableCell>{cls.company_name}</TableCell>
                        <TableCell>{cls.instructor_name}</TableCell>
                        <TableCell>{format(new Date(cls.start_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          R$ {cls.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          R$ {cls.instructorCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          R$ {cls.operationalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-red-700 font-medium">
                          R$ {cls.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${cls.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          R$ {cls.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          <div className="text-xs text-gray-500">{cls.profitMargin}%</div>
                        </TableCell>
                        <TableCell>{getPaymentStatusBadge(cls.payment_status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {cls.installmentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setSelectedClass(cls)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Dialog de Detalhes */}
        <Dialog open={!!selectedClass} onOpenChange={() => setSelectedClass(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Pagamento - {selectedClass?.training_name}</DialogTitle>
            </DialogHeader>
            {selectedClass && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Empresa</Label>
                    <p className="font-medium">{selectedClass.company_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Instrutor</Label>
                    <p className="font-medium">{selectedClass.instructor_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Data</Label>
                    <p className="font-medium">{format(new Date(selectedClass.start_date), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Status</Label>
                    <div className="mt-1">{getPaymentStatusBadge(selectedClass.payment_status)}</div>
                  </div>
                </div>

                {/* Parcelas */}
                {selectedClass.payment_installments && selectedClass.payment_installments.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Parcelas de Pagamento</h3>
                    <div className="space-y-3">
                      {selectedClass.payment_installments.map((inst, idx) => (
                        <Card key={idx} className="bg-gray-50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getInstallmentStatusIcon(inst)}
                                <div>
                                  <p className="font-medium">
                                    Parcela {inst.installment_number} - R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Vencimento: {format(new Date(inst.due_date), 'dd/MM/yyyy')}
                                  </p>
                                  {inst.paid_date && (
                                    <p className="text-sm text-green-600">
                                      Pago em: {format(new Date(inst.paid_date), 'dd/MM/yyyy')}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={
                                  inst.status === "Pago" ? "bg-green-100 text-green-800" :
                                  inst.status === "Atrasado" ? "bg-red-100 text-red-800" :
                                  "bg-yellow-100 text-yellow-800"
                                }>
                                  {inst.status}
                                </Badge>
                                {inst.proof_of_payment_url && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(inst.proof_of_payment_url, '_blank')}
                                  >
                                    <FileText className="w-4 h-4 mr-1" />
                                    Ver Comprovante
                                  </Button>
                                )}
                              </div>
                            </div>
                            {inst.notes && (
                              <p className="text-sm text-gray-600 mt-2 pl-7">{inst.notes}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Breakdown de Custos */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Breakdown Financeiro</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Receita Total</span>
                      <span className="font-medium text-green-600">
                        R$ {selectedClass.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Custo Instrutor</span>
                      <span className="text-red-600">
                        - R$ {selectedClass.instructorCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Custo Operacional</span>
                      <span className="text-orange-600">
                        - R$ {selectedClass.operationalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Custo HP</span>
                      <span className="text-red-600">
                        - R$ {selectedClass.hpCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold">
                      <span>Lucro</span>
                      <span className={selectedClass.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        R$ {selectedClass.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Margem de Lucro</span>
                      <span>{selectedClass.profitMargin}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}