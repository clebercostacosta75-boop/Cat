import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DollarSign, Calendar, CheckCircle, AlertCircle, Send, FileText, Loader2, Bell } from "lucide-react";
import { toast } from "sonner";

export default function PaymentAutomation() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedInstructors, setSelectedInstructors] = useState([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [sendingNotifications, setSendingNotifications] = useState(false);

  const { data: classSchedules = [] } = useQuery({
    queryKey: ['classSchedules'],
    queryFn: () => base44.entities.ClassSchedule.list(),
    initialData: [],
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => base44.entities.Instructor.list(),
    initialData: [],
  });

  const updateClassScheduleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClassSchedule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSchedules'] });
      toast.success('Status de pagamento atualizado');
    },
  });

  const paymentSummary = useMemo(() => {
    const filteredClasses = classSchedules.filter(cls => {
      if (!cls.start_date) return false;
      const classDate = new Date(cls.start_date);
      const classMonth = classDate.getMonth() + 1;
      const classYear = classDate.getFullYear();
      
      return classMonth === parseInt(selectedMonth) && classYear === parseInt(selectedYear);
    });

    const instructorSummary = {};

    filteredClasses.forEach(cls => {
      if (!cls.instructor_id) return;
      
      if (!instructorSummary[cls.instructor_id]) {
        const instructor = instructors.find(i => i.id === cls.instructor_id);
        instructorSummary[cls.instructor_id] = {
          id: cls.instructor_id,
          name: cls.instructor_name || instructor?.name || "Desconhecido",
          email: instructor?.email || "",
          phone: instructor?.phone || "",
          bank_data: instructor?.bank_data || {},
          pix_keys: instructor?.pix_keys || [],
          classes: [],
          totalValue: 0,
          paidValue: 0,
          pendingValue: 0,
        };
      }

      const paid = cls.payment_installments?.filter(i => i.status === "Pago")
        .reduce((sum, i) => sum + (i.amount || 0), 0) || 
        (cls.payment_status === "Pago" ? cls.instructor_payment_value : 0);

      instructorSummary[cls.instructor_id].classes.push({
        id: cls.id,
        training_name: cls.training_name,
        company_name: cls.company_name,
        start_date: cls.start_date,
        totalValue: cls.instructor_payment_value || 0,
        paidValue: paid,
        pendingValue: (cls.instructor_payment_value || 0) - paid,
        payment_status: cls.payment_status,
        payment_installments: cls.payment_installments || [],
      });

      instructorSummary[cls.instructor_id].totalValue += cls.instructor_payment_value || 0;
      instructorSummary[cls.instructor_id].paidValue += paid;
    });

    Object.values(instructorSummary).forEach(instructor => {
      instructor.pendingValue = instructor.totalValue - instructor.paidValue;
    });

    return Object.values(instructorSummary).sort((a, b) => b.pendingValue - a.pendingValue);
  }, [classSchedules, instructors, selectedMonth, selectedYear]);

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const response = await base44.functions.invoke('gerarRelatoriosPagamentos', {
        month: selectedMonth,
        year: selectedYear,
        instructors: selectedInstructors.length > 0 ? selectedInstructors : paymentSummary.map(i => i.id)
      });

      if (response.data?.pdf_url) {
        window.open(response.data.pdf_url, '_blank');
        toast.success('Relatório gerado com sucesso');
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório de pagamentos');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleSendNotifications = async () => {
    setSendingNotifications(true);
    try {
      const instructorsToNotify = selectedInstructors.length > 0 
        ? paymentSummary.filter(i => selectedInstructors.includes(i.id))
        : paymentSummary.filter(i => i.pendingValue > 0);

      await base44.functions.invoke('notificarPagamentosPendentes', {
        month: selectedMonth,
        year: selectedYear,
        instructors: instructorsToNotify.map(i => ({
          id: i.id,
          name: i.name,
          email: i.email,
          phone: i.phone,
          pendingValue: i.pendingValue
        }))
      });

      toast.success(`Notificações enviadas para ${instructorsToNotify.length} instrutor(es)`);
    } catch (error) {
      console.error('Erro ao enviar notificações:', error);
      toast.error('Erro ao enviar notificações');
    } finally {
      setSendingNotifications(false);
    }
  };

  const handleMarkAsPaid = async (classId, installmentIndex = null) => {
    const classToUpdate = classSchedules.find(c => c.id === classId);
    
    if (installmentIndex !== null && classToUpdate.payment_installments) {
      const updatedInstallments = [...classToUpdate.payment_installments];
      updatedInstallments[installmentIndex] = {
        ...updatedInstallments[installmentIndex],
        status: "Pago",
        paid_date: new Date().toISOString().split('T')[0]
      };

      const allPaid = updatedInstallments.every(i => i.status === "Pago");
      await updateClassScheduleMutation.mutateAsync({
        id: classId,
        data: {
          payment_installments: updatedInstallments,
          payment_status: allPaid ? "Pago" : "Parcialmente Pago"
        }
      });
    } else {
      await updateClassScheduleMutation.mutateAsync({
        id: classId,
        data: { payment_status: "Pago" }
      });
    }
  };

  const handleToggleInstructor = (instructorId) => {
    setSelectedInstructors(prev => 
      prev.includes(instructorId)
        ? prev.filter(id => id !== instructorId)
        : [...prev, instructorId]
    );
  };

  const handleSelectAll = () => {
    if (selectedInstructors.length === paymentSummary.length) {
      setSelectedInstructors([]);
    } else {
      setSelectedInstructors(paymentSummary.map(i => i.id));
    }
  };

  const months = [
    { value: "1", label: "Janeiro" }, { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" }, { value: "4", label: "Abril" },
    { value: "5", label: "Maio" }, { value: "6", label: "Junho" },
    { value: "7", label: "Julho" }, { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" }, { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
  ];

  const years = [2024, 2025, 2026, 2027, 2028];

  const totalPending = paymentSummary.reduce((sum, i) => sum + i.pendingValue, 0);
  const totalPaid = paymentSummary.reduce((sum, i) => sum + i.paidValue, 0);
  const instructorsWithPending = paymentSummary.filter(i => i.pendingValue > 0).length;

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-emerald-600" />
            Automação de Pagamentos
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Gestão automatizada de pagamentos de instrutores
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-2 border-yellow-200">
            <CardContent className="p-4">
              <AlertCircle className="w-6 h-6 text-yellow-600 mb-2" />
              <p className="text-2xl font-bold text-yellow-600">
                R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-600">Total Pendente</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200">
            <CardContent className="p-4">
              <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
              <p className="text-2xl font-bold text-green-600">
                R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-600">Total Pago</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200">
            <CardContent className="p-4">
              <Bell className="w-6 h-6 text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-blue-600">{instructorsWithPending}</p>
              <p className="text-sm text-gray-600">Instrutores com Pendências</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="border-2 border-purple-200">
          <CardHeader className="bg-purple-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Selecionar Período
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
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

            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <Button
                onClick={handleGenerateReport}
                disabled={generatingReport || paymentSummary.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {generatingReport ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Gerar Relatório
                  </>
                )}
              </Button>

              <Button
                onClick={handleSendNotifications}
                disabled={sendingNotifications || instructorsWithPending === 0}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {sendingNotifications ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Notificar Pendências
                  </>
                )}
              </Button>

              <Button
                onClick={handleSelectAll}
                variant="outline"
              >
                {selectedInstructors.length === paymentSummary.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructors List */}
        <Card className="border-2 border-stone-300">
          <CardHeader className="bg-stone-50">
            <CardTitle className="text-lg">
              Resumo de Pagamentos ({paymentSummary.length} instrutores)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {paymentSummary.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Nenhum pagamento encontrado no período selecionado</p>
              </div>
            ) : (
              <div className="divide-y">
                {paymentSummary.map((instructor) => (
                  <div key={instructor.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedInstructors.includes(instructor.id)}
                        onCheckedChange={() => handleToggleInstructor(instructor.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-stone-900">{instructor.name}</h3>
                            <div className="flex gap-4 text-xs text-gray-600 mt-1">
                              {instructor.email && <span>📧 {instructor.email}</span>}
                              {instructor.phone && <span>📱 {instructor.phone}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-emerald-600">
                              R$ {instructor.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <div className="flex gap-2 mt-1">
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

                        {/* Bank Info */}
                        {instructor.bank_data?.bank_name && (
                          <div className="bg-gray-50 p-3 rounded mb-3">
                            <p className="text-xs font-semibold text-gray-700 mb-1">Dados Bancários:</p>
                            <p className="text-xs text-gray-600">
                              {instructor.bank_data.bank_name} - Ag: {instructor.bank_data.agency} - Conta: {instructor.bank_data.account}
                            </p>
                            {instructor.pix_keys && instructor.pix_keys.length > 0 && (
                              <p className="text-xs text-gray-600 mt-1">
                                PIX: {instructor.pix_keys[0].type} - {instructor.pix_keys[0].key}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Classes */}
                        <div className="space-y-2">
                          {instructor.classes.map((cls) => (
                            <Card key={cls.id} className="bg-white border">
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{cls.training_name}</p>
                                    <p className="text-xs text-gray-600">{cls.company_name} - {cls.start_date}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold text-sm">
                                      R$ {cls.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                    <Badge variant="outline" className="text-xs">
                                      {cls.payment_status}
                                    </Badge>
                                  </div>
                                </div>

                                {cls.payment_installments && cls.payment_installments.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {cls.payment_installments.map((inst, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-xs">
                                        <span>Parcela {inst.installment_number}</span>
                                        <div className="flex items-center gap-2">
                                          <span>R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                          {inst.status === "Pago" ? (
                                            <Badge className="bg-green-100 text-green-800">Pago</Badge>
                                          ) : (
                                            <Button
                                              size="sm"
                                              onClick={() => handleMarkAsPaid(cls.id, idx)}
                                              className="h-6 text-xs"
                                            >
                                              Marcar Pago
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}