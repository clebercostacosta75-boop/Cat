import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DollarSign, Calendar, CheckCircle, AlertCircle, Clock, Upload, FileText, Edit, Save, X, Loader2, Building2, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import GeneralFinancialControl from "@/components/financial/GeneralFinancialControl";

export default function InstructorFinancialControl() {
  const queryClient = useQueryClient();
  const [selectedInstructorId, setSelectedInstructorId] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [editingInstructor, setEditingInstructor] = useState(false);
  const [instructorData, setInstructorData] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

  const { data: instructors = [] } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => base44.entities.Instructor.list(),
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

  const updateInstructorMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Instructor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      toast.success('Dados do instrutor atualizados');
      setEditingInstructor(false);
    },
  });

  const updateClassScheduleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClassSchedule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSchedules'] });
      toast.success('Pagamento atualizado com sucesso');
    },
  });

  const selectedInstructor = instructors.find(i => i.id === selectedInstructorId);

  React.useEffect(() => {
    if (selectedInstructor) {
      setInstructorData({
        hourly_rate: selectedInstructor.hourly_rate || 0,
        bank_data: selectedInstructor.bank_data || {
          bank_name: "",
          bank_code: "",
          agency: "",
          account: "",
          account_type: "Corrente"
        },
        pix_keys: selectedInstructor.pix_keys || []
      });
      setEditingInstructor(false);
    } else {
      setInstructorData(null);
    }
  }, [selectedInstructor, selectedInstructorId]);

  const instructorClasses = React.useMemo(() => {
    if (!selectedInstructorId) return [];
    
    let filtered = classSchedules.filter(cls => cls.instructor_id === selectedInstructorId);

    if (paymentStatusFilter !== "all") {
      filtered = filtered.filter(cls => cls.payment_status === paymentStatusFilter);
    }

    return filtered.sort((a, b) => {
      const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
      const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
      return dateB - dateA;
    });
  }, [classSchedules, selectedInstructorId, paymentStatusFilter]);

  const financialSummary = React.useMemo(() => {
    const totalBruto = instructorClasses.reduce((sum, cls) => sum + (cls.instructor_payment_value || 0), 0);
    
    let totalPago = 0;
    let totalPendente = 0;
    
    instructorClasses.forEach(cls => {
      if (cls.payment_installments && cls.payment_installments.length > 0) {
        cls.payment_installments.forEach(inst => {
          if (inst.status === "Pago") {
            totalPago += inst.amount || 0;
          } else {
            totalPendente += inst.amount || 0;
          }
        });
      } else {
        if (cls.payment_status === "Pago") {
          totalPago += cls.instructor_payment_value || 0;
        } else {
          totalPendente += cls.instructor_payment_value || 0;
        }
      }
    });

    return { totalBruto, totalPago, totalPendente };
  }, [instructorClasses]);

  const handleSaveInstructorData = () => {
    if (!selectedInstructorId) return;
    updateInstructorMutation.mutate({
      id: selectedInstructorId,
      data: instructorData
    });
  };

  const handleFileUpload = async (classId, installmentIndex, file) => {
    if (!file) return;

    setUploadingFile(`${classId}-${installmentIndex}`);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const classToUpdate = classSchedules.find(c => c.id === classId);
      const updatedInstallments = [...(classToUpdate.payment_installments || [])];
      updatedInstallments[installmentIndex] = {
        ...updatedInstallments[installmentIndex],
        proof_of_payment_url: file_url
      };

      await updateClassScheduleMutation.mutateAsync({
        id: classId,
        data: { payment_installments: updatedInstallments }
      });

      toast.success('Comprovante anexado');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao anexar comprovante');
    } finally {
      setUploadingFile(null);
    }
  };

  const handleUpdateInstallment = async (classId, installmentIndex, field, value) => {
    const classToUpdate = classSchedules.find(c => c.id === classId);
    const updatedInstallments = [...(classToUpdate.payment_installments || [])];
    updatedInstallments[installmentIndex] = {
      ...updatedInstallments[installmentIndex],
      [field]: value
    };

    // Atualizar status geral do pagamento
    let newPaymentStatus = "Pendente";
    const paidCount = updatedInstallments.filter(inst => inst.status === "Pago").length;
    if (paidCount === updatedInstallments.length) {
      newPaymentStatus = "Pago";
    } else if (paidCount > 0) {
      newPaymentStatus = "Parcialmente Pago";
    }

    await updateClassScheduleMutation.mutateAsync({
      id: classId,
      data: { 
        payment_installments: updatedInstallments,
        payment_status: newPaymentStatus
      }
    });
  };

  const getPaymentStatusBadge = (status) => {
    const colors = {
      "Pendente": "bg-yellow-100 text-yellow-800",
      "Parcialmente Pago": "bg-blue-100 text-blue-800",
      "Pago": "bg-green-100 text-green-800"
    };
    return <Badge className={colors[status] || "bg-gray-100"}>{status}</Badge>;
  };

  const getInstallmentStatusIcon = (status) => {
    if (status === "Pago") return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === "Atrasado") return <AlertCircle className="w-4 h-4 text-red-600" />;
    return <Clock className="w-4 h-4 text-yellow-600" />;
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-emerald-600" />
            Controle Financeiro Instrutor
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Gestão completa de pagamentos e dados bancários
          </p>
        </div>

        {/* Controle Geral */}
        <GeneralFinancialControl />

        {/* Seleção de Instrutor */}
        <Card className="border-2 border-emerald-200">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Selecione o Instrutor</Label>
                <Select value={selectedInstructorId} onValueChange={setSelectedInstructorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um instrutor" />
                  </SelectTrigger>
                  <SelectContent>
                    {instructors.map(inst => (
                      <SelectItem key={inst.id} value={inst.id}>
                        👨‍🏫 {inst.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedInstructorId && (
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Filtrar por Status de Pagamento</Label>
                  <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
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
              )}
            </div>
          </CardContent>
        </Card>

        {selectedInstructorId && (
          <>
            {/* Resumo Financeiro */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="border-2 border-blue-200">
                <CardContent className="p-4">
                  <DollarSign className="w-6 h-6 text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-stone-900">
                    R$ {financialSummary.totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-600">Total Bruto a Pagar</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-200">
                <CardContent className="p-4">
                  <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
                  <p className="text-2xl font-bold text-green-600">
                    R$ {financialSummary.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-600">Total Pago</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-yellow-200">
                <CardContent className="p-4">
                  <AlertCircle className="w-6 h-6 text-yellow-600 mb-2" />
                  <p className="text-2xl font-bold text-yellow-600">
                    R$ {financialSummary.totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-600">Saldo Pendente</p>
                </CardContent>
              </Card>
            </div>

            {/* Dados Bancários */}
            <Card className="border-2 border-purple-200">
              <CardHeader className="bg-purple-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                    Dados Bancários e Forma de Pagamento
                  </CardTitle>
                  {!editingInstructor ? (
                    <Button onClick={() => setEditingInstructor(true)} size="sm" variant="outline">
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button onClick={handleSaveInstructorData} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                        <Save className="w-4 h-4 mr-1" />
                        Salvar
                      </Button>
                      <Button onClick={() => setEditingInstructor(false)} size="sm" variant="outline">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {instructorData && (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Valor por Hora (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={instructorData.hourly_rate}
                          onChange={(e) => setInstructorData({
                            ...instructorData,
                            hourly_rate: parseFloat(e.target.value) || 0
                          })}
                          disabled={!editingInstructor}
                        />
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3">Dados Bancários</h4>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Nome do Banco</Label>
                          <Input
                            value={instructorData.bank_data?.bank_name || ""}
                            onChange={(e) => setInstructorData({
                              ...instructorData,
                              bank_data: { ...instructorData.bank_data, bank_name: e.target.value }
                            })}
                            disabled={!editingInstructor}
                            placeholder="Ex: Banco do Brasil"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Código do Banco</Label>
                          <Input
                            value={instructorData.bank_data?.bank_code || ""}
                            onChange={(e) => setInstructorData({
                              ...instructorData,
                              bank_data: { ...instructorData.bank_data, bank_code: e.target.value }
                            })}
                            disabled={!editingInstructor}
                            placeholder="Ex: 001"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Agência</Label>
                          <Input
                            value={instructorData.bank_data?.agency || ""}
                            onChange={(e) => setInstructorData({
                              ...instructorData,
                              bank_data: { ...instructorData.bank_data, agency: e.target.value }
                            })}
                            disabled={!editingInstructor}
                            placeholder="Ex: 1234-5"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Conta</Label>
                          <Input
                            value={instructorData.bank_data?.account || ""}
                            onChange={(e) => setInstructorData({
                              ...instructorData,
                              bank_data: { ...instructorData.bank_data, account: e.target.value }
                            })}
                            disabled={!editingInstructor}
                            placeholder="Ex: 12345-6"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tipo de Conta</Label>
                          <Select
                            value={instructorData.bank_data?.account_type || "Corrente"}
                            onValueChange={(value) => setInstructorData({
                              ...instructorData,
                              bank_data: { ...instructorData.bank_data, account_type: value }
                            })}
                            disabled={!editingInstructor}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Corrente">Corrente</SelectItem>
                              <SelectItem value="Poupança">Poupança</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3">Chaves PIX</h4>
                      {instructorData.pix_keys && instructorData.pix_keys.length > 0 ? (
                        <div className="space-y-2">
                          {instructorData.pix_keys.map((pix, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                              <Badge variant="outline">{pix.type}</Badge>
                              <span className="text-sm">{pix.key}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Nenhuma chave PIX cadastrada</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Histórico de Treinamentos */}
            <Card className="border-2 border-stone-300">
              <CardHeader className="bg-stone-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-stone-600" />
                  Histórico de Treinamentos ({instructorClasses.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {instructorClasses.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Nenhum treinamento encontrado</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {instructorClasses.map((cls) => (
                      <div key={cls.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-stone-900">{cls.training_name}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {cls.company_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {cls.start_date ? format(new Date(cls.start_date), 'dd/MM/yyyy') : 'Data não definida'}
                              </span>
                            </div>
                            {(() => {
                              const course = courses.find(c => c.id === cls.training_id);
                              const instructor = instructors.find(i => i.id === cls.instructor_id);
                              const practicalHours = course?.practical_hours || cls.duration_hours || 0;
                              const hourlyRate = instructor?.hourly_rate || 0;

                              if (practicalHours > 0 && hourlyRate > 0) {
                                return (
                                  <p className="text-xs text-gray-500 mt-2">
                                    💡 Cálculo: {practicalHours}h (prática) × R$ {hourlyRate.toFixed(2)}/h = R$ {(practicalHours * hourlyRate).toFixed(2)}
                                  </p>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-emerald-600">
                              R$ {(cls.instructor_payment_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            {getPaymentStatusBadge(cls.payment_status)}
                          </div>
                        </div>

                        {/* Parcelas */}
                        {cls.payment_installments && cls.payment_installments.length > 0 ? (
                          <div className="space-y-2 mt-3 pl-4 border-l-2 border-gray-200">
                            {cls.payment_installments.map((inst, idx) => (
                              <Card key={idx} className="bg-gray-50">
                                <CardContent className="p-3">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1">
                                      {getInstallmentStatusIcon(inst.status)}
                                      <div className="flex-1">
                                        <p className="font-medium text-sm">
                                          Parcela {inst.installment_number} - R$ {(inst.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1">
                                          Vencimento: {inst.due_date ? format(new Date(inst.due_date), 'dd/MM/yyyy') : 'Data não definida'}
                                        </p>

                                        {/* Status e Data de Pagamento */}
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                          <Select
                                            value={inst.status}
                                            onValueChange={(value) => {
                                              handleUpdateInstallment(cls.id, idx, 'status', value);
                                              if (value === "Pago" && !inst.paid_date) {
                                                handleUpdateInstallment(cls.id, idx, 'paid_date', new Date().toISOString().split('T')[0]);
                                              }
                                            }}
                                          >
                                            <SelectTrigger className="h-8 text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="Pendente">⏳ Pendente</SelectItem>
                                              <SelectItem value="Pago">✅ Pago</SelectItem>
                                              <SelectItem value="Atrasado">⚠️ Atrasado</SelectItem>
                                            </SelectContent>
                                          </Select>

                                          {inst.status === "Pago" && (
                                            <Input
                                              type="date"
                                              value={inst.paid_date || ""}
                                              onChange={(e) => handleUpdateInstallment(cls.id, idx, 'paid_date', e.target.value)}
                                              className="h-8 text-xs"
                                            />
                                          )}
                                        </div>

                                        {inst.paid_date && (
                                          <p className="text-xs text-green-600 mt-1">
                                            Pago em: {inst.paid_date ? format(new Date(inst.paid_date), 'dd/MM/yyyy') : 'Data não definida'}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Upload de Comprovante */}
                                    <div className="flex flex-col gap-2">
                                      {inst.proof_of_payment_url ? (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => window.open(inst.proof_of_payment_url, '_blank')}
                                          >
                                            <FileText className="w-3 h-3 mr-1" />
                                            Ver Comprovante
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleUpdateInstallment(cls.id, idx, 'proof_of_payment_url', '')}
                                            className="text-red-600"
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <input
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) handleFileUpload(cls.id, idx, file);
                                            }}
                                            className="hidden"
                                            id={`file-${cls.id}-${idx}`}
                                            disabled={uploadingFile === `${cls.id}-${idx}`}
                                          />
                                          <label htmlFor={`file-${cls.id}-${idx}`}>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              disabled={uploadingFile === `${cls.id}-${idx}`}
                                              asChild
                                            >
                                              <span className="cursor-pointer">
                                                {uploadingFile === `${cls.id}-${idx}` ? (
                                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                ) : (
                                                  <Upload className="w-3 h-3 mr-1" />
                                                )}
                                                Anexar
                                              </span>
                                            </Button>
                                          </label>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                            ⚠️ Pagamento à vista - Nenhuma parcela configurada
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}