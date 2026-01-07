import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Users, Calendar, AlertCircle, Coffee, Car, Utensils, Receipt } from "lucide-react";

export default function GeneralFinancialControl() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());

  const { data: classSchedules = [] } = useQuery({
    queryKey: ['classSchedules'],
    queryFn: () => base44.entities.ClassSchedule.list(),
    initialData: [],
  });

  const { data: dailyRecords = [] } = useQuery({
    queryKey: ['classDailyRecords'],
    queryFn: () => base44.entities.ClassDailyRecord.list(),
    initialData: [],
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => base44.entities.Instructor.list(),
    initialData: [],
  });

  const financialSummary = useMemo(() => {
    // Filtrar turmas por período
    const filteredClasses = classSchedules.filter(cls => {
      if (!cls.start_date) return false;
      const classDate = new Date(cls.start_date);
      const classMonth = classDate.getMonth() + 1;
      const classYear = classDate.getFullYear();
      
      return classMonth === parseInt(selectedMonth) && classYear === parseInt(selectedYear);
    });

    // Calcular pagamentos de instrutores
    const instructorPayments = filteredClasses.reduce((sum, cls) => {
      return sum + (cls.instructor_payment_value || 0);
    }, 0);

    const instructorPaymentsPaid = filteredClasses.reduce((sum, cls) => {
      if (cls.payment_installments && cls.payment_installments.length > 0) {
        return sum + cls.payment_installments
          .filter(inst => inst.status === "Pago")
          .reduce((instSum, inst) => instSum + (inst.amount || 0), 0);
      }
      return sum + (cls.payment_status === "Pago" ? (cls.instructor_payment_value || 0) : 0);
    }, 0);

    const instructorPaymentsPending = instructorPayments - instructorPaymentsPaid;

    // Calcular custos operacionais dos registros diários
    const classIds = filteredClasses.map(cls => cls.id);
    const filteredDailyRecords = dailyRecords.filter(record => 
      classIds.includes(record.class_schedule_id)
    );

    const operationalCosts = {
      lunch: filteredDailyRecords.reduce((sum, r) => sum + (r.lunch_cost || 0), 0),
      transport: filteredDailyRecords.reduce((sum, r) => sum + (r.transport_cost || 0), 0),
      coffeeBreak: filteredDailyRecords.reduce((sum, r) => sum + (r.coffee_break_cost || 0), 0),
      taxi: filteredDailyRecords.reduce((sum, r) => sum + (r.taxi_cost || 0), 0),
      hp: filteredDailyRecords.reduce((sum, r) => sum + (r.hp_cost || 0), 0),
    };

    const totalOperationalCosts = Object.values(operationalCosts).reduce((sum, val) => sum + val, 0);
    const totalCosts = instructorPayments + totalOperationalCosts;

    // Agrupar por instrutor
    const instructorBreakdown = {};
    filteredClasses.forEach(cls => {
      if (!cls.instructor_id) return;
      
      if (!instructorBreakdown[cls.instructor_id]) {
        const instructor = instructors.find(i => i.id === cls.instructor_id);
        instructorBreakdown[cls.instructor_id] = {
          name: cls.instructor_name || instructor?.name || "Desconhecido",
          totalValue: 0,
          paidValue: 0,
          pendingValue: 0,
          classesCount: 0,
        };
      }

      instructorBreakdown[cls.instructor_id].totalValue += cls.instructor_payment_value || 0;
      instructorBreakdown[cls.instructor_id].classesCount += 1;

      if (cls.payment_installments && cls.payment_installments.length > 0) {
        const paid = cls.payment_installments
          .filter(inst => inst.status === "Pago")
          .reduce((sum, inst) => sum + (inst.amount || 0), 0);
        instructorBreakdown[cls.instructor_id].paidValue += paid;
      } else if (cls.payment_status === "Pago") {
        instructorBreakdown[cls.instructor_id].paidValue += cls.instructor_payment_value || 0;
      }
    });

    Object.values(instructorBreakdown).forEach(instructor => {
      instructor.pendingValue = instructor.totalValue - instructor.paidValue;
    });

    return {
      instructorPayments,
      instructorPaymentsPaid,
      instructorPaymentsPending,
      operationalCosts,
      totalOperationalCosts,
      totalCosts,
      classesCount: filteredClasses.length,
      instructorBreakdown: Object.values(instructorBreakdown).sort((a, b) => b.totalValue - a.totalValue),
    };
  }, [classSchedules, dailyRecords, instructors, selectedMonth, selectedYear]);

  const months = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const years = [2024, 2025, 2026, 2027, 2028];

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="bg-purple-50">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Controle Financeiro Geral por Período
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
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
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-2 border-red-200">
          <CardContent className="p-4">
            <DollarSign className="w-6 h-6 text-red-600 mb-2" />
            <p className="text-2xl font-bold text-red-600">
              R$ {financialSummary.totalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-600">Custo Total do Período</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200">
          <CardContent className="p-4">
            <Users className="w-6 h-6 text-orange-600 mb-2" />
            <p className="text-2xl font-bold text-orange-600">
              R$ {financialSummary.instructorPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-600">Pagamentos de Instrutores</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-200">
          <CardContent className="p-4">
            <Receipt className="w-6 h-6 text-amber-600 mb-2" />
            <p className="text-2xl font-bold text-amber-600">
              R$ {financialSummary.totalOperationalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-600">Custos Operacionais</p>
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento de Custos Operacionais */}
      <Card className="border-2 border-amber-200">
        <CardHeader className="bg-amber-50">
          <CardTitle className="text-lg">Detalhamento de Custos Operacionais</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-5 gap-3">
            <div className="flex items-center gap-2 p-3 bg-white rounded border">
              <Utensils className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-xs text-gray-600">Almoço</p>
                <p className="font-semibold">R$ {financialSummary.operationalCosts.lunch.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white rounded border">
              <Car className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-xs text-gray-600">Transporte</p>
                <p className="font-semibold">R$ {financialSummary.operationalCosts.transport.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white rounded border">
              <Coffee className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-xs text-gray-600">Coffee Break</p>
                <p className="font-semibold">R$ {financialSummary.operationalCosts.coffeeBreak.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white rounded border">
              <Car className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-xs text-gray-600">Taxi</p>
                <p className="font-semibold">R$ {financialSummary.operationalCosts.taxi.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white rounded border">
              <DollarSign className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-xs text-gray-600">HP</p>
                <p className="font-semibold">R$ {financialSummary.operationalCosts.hp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status de Pagamento dos Instrutores */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-2 border-green-200">
          <CardContent className="p-4">
            <TrendingUp className="w-6 h-6 text-green-600 mb-2" />
            <p className="text-2xl font-bold text-green-600">
              R$ {financialSummary.instructorPaymentsPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-600">Instrutores Pagos</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-yellow-200">
          <CardContent className="p-4">
            <AlertCircle className="w-6 h-6 text-yellow-600 mb-2" />
            <p className="text-2xl font-bold text-yellow-600">
              R$ {financialSummary.instructorPaymentsPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-600">Instrutores Pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown por Instrutor */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Detalhamento por Instrutor ({financialSummary.instructorBreakdown.length} instrutores)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {financialSummary.instructorBreakdown.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhum instrutor encontrado no período selecionado</p>
            </div>
          ) : (
            <div className="divide-y">
              {financialSummary.instructorBreakdown.map((instructor, idx) => (
                <div key={idx} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-stone-900">{instructor.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {instructor.classesCount} {instructor.classesCount === 1 ? 'turma' : 'turmas'}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-lg font-bold text-blue-600">
                        R$ {instructor.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <div className="flex gap-2 justify-end">
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          Pago: R$ {instructor.paidValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Badge>
                        {instructor.pendingValue > 0 && (
                          <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                            Pendente: R$ {instructor.pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo Final */}
      <Card className="border-2 border-stone-300 bg-stone-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-600">Resumo do período</p>
              <p className="text-lg font-semibold text-stone-900 mt-1">
                {months.find(m => m.value === selectedMonth)?.label} / {selectedYear}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-stone-600">Total de turmas</p>
              <p className="text-2xl font-bold text-stone-900">{financialSummary.classesCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}