import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PaymentInstallmentsForm({ installments, onChange, instructorPaymentValue }) {
  const [uploadingFile, setUploadingFile] = useState(null);

  const handleAddInstallment = () => {
    const newInstallment = {
      installment_number: installments.length + 1,
      amount: 0,
      due_date: "",
      status: "Pendente",
      paid_date: "",
      proof_of_payment_url: "",
      notes: ""
    };
    
    if (installments.length < 2) {
      onChange([...installments, newInstallment]);
    } else {
      toast.error("Máximo de 2 parcelas permitido");
    }
  };

  // Efeito: se valor >= 500, dividir automaticamente em 2x
  useEffect(() => {
    if (instructorPaymentValue >= 500 && installments.length === 0) {
      const today = new Date();
      const firstDueDate = new Date(today);
      firstDueDate.setDate(today.getDate() + 30);
      
      const secondDueDate = new Date(today);
      secondDueDate.setDate(today.getDate() + 60);

      const halfAmount = instructorPaymentValue / 2;

      onChange([
        {
          installment_number: 1,
          amount: halfAmount,
          due_date: firstDueDate.toISOString().split('T')[0],
          status: "Pendente",
          paid_date: "",
          proof_of_payment_url: "",
          notes: ""
        },
        {
          installment_number: 2,
          amount: halfAmount,
          due_date: secondDueDate.toISOString().split('T')[0],
          status: "Pendente",
          paid_date: "",
          proof_of_payment_url: "",
          notes: ""
        }
      ]);
    }
  }, [instructorPaymentValue]);

  const handleRemoveInstallment = (index) => {
    const updated = installments.filter((_, i) => i !== index);
    // Renumerar as parcelas
    const renumbered = updated.map((inst, idx) => ({
      ...inst,
      installment_number: idx + 1
    }));
    onChange(renumbered);
  };

  const handleInstallmentChange = (index, field, value) => {
    const updated = [...installments];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleFileUpload = async (index, file) => {
    if (!file) return;

    setUploadingFile(index);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleInstallmentChange(index, 'proof_of_payment_url', file_url);
      toast.success('Comprovante anexado com sucesso');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao anexar comprovante');
    } finally {
      setUploadingFile(null);
    }
  };

  const splitEqually = () => {
    if (!instructorPaymentValue || instructorPaymentValue <= 0) {
      toast.error("Defina o valor do pagamento do instrutor primeiro");
      return;
    }

    const today = new Date();
    const firstDueDate = new Date(today);
    firstDueDate.setDate(today.getDate() + 30);
    
    const secondDueDate = new Date(today);
    secondDueDate.setDate(today.getDate() + 60);

    const halfAmount = instructorPaymentValue / 2;

    onChange([
      {
        installment_number: 1,
        amount: halfAmount,
        due_date: firstDueDate.toISOString().split('T')[0],
        status: "Pendente",
        paid_date: "",
        proof_of_payment_url: "",
        notes: ""
      },
      {
        installment_number: 2,
        amount: halfAmount,
        due_date: secondDueDate.toISOString().split('T')[0],
        status: "Pendente",
        paid_date: "",
        proof_of_payment_url: "",
        notes: ""
      }
    ]);
    toast.success("Parcelas divididas igualmente em 2x");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Parcelamento do Pagamento (até 2x)</Label>
        <div className="flex gap-2">
          {instructorPaymentValue > 0 && installments.length === 0 && (
            <Button
              type="button"
              onClick={splitEqually}
              size="sm"
              variant="outline"
            >
              Dividir em 2x
            </Button>
          )}
          {installments.length < 2 && (
            <Button
              type="button"
              onClick={handleAddInstallment}
              size="sm"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar Parcela
            </Button>
          )}
        </div>
      </div>

      {instructorPaymentValue > 0 && (
        <p className="text-sm text-gray-600">
          Valor total do instrutor: R$ {instructorPaymentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      )}

      {installments.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 text-sm">Nenhuma parcela configurada</p>
          <p className="text-gray-400 text-xs mt-1">Pagamento à vista por padrão</p>
        </div>
      ) : (
        <div className="space-y-4">
          {installments.map((inst, index) => (
            <Card key={index} className="bg-gray-50 border-2">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold">Parcela {inst.installment_number}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveInstallment(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Valor da Parcela (R$) *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={inst.amount}
                        onChange={(e) => handleInstallmentChange(index, 'amount', parseFloat(e.target.value) || 0)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Data de Vencimento *</Label>
                    <Input
                      type="date"
                      value={inst.due_date}
                      onChange={(e) => handleInstallmentChange(index, 'due_date', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={inst.status} 
                      onValueChange={(value) => handleInstallmentChange(index, 'status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendente">⏳ Pendente</SelectItem>
                        <SelectItem value="Pago">✅ Pago</SelectItem>
                        <SelectItem value="Atrasado">⚠️ Atrasado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {inst.status === "Pago" && (
                    <div className="space-y-2">
                      <Label>Data de Pagamento</Label>
                      <Input
                        type="date"
                        value={inst.paid_date}
                        onChange={(e) => handleInstallmentChange(index, 'paid_date', e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Upload de Comprovante */}
                <div className="mt-3 space-y-2">
                  <Label>Comprovante de Pagamento</Label>
                  {inst.proof_of_payment_url ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-800 flex-1">Comprovante anexado</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(inst.proof_of_payment_url, '_blank')}
                      >
                        Ver
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleInstallmentChange(index, 'proof_of_payment_url', '')}
                        className="text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(index, file);
                        }}
                        className="hidden"
                        id={`file-upload-${index}`}
                        disabled={uploadingFile === index}
                      />
                      <label
                        htmlFor={`file-upload-${index}`}
                        className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        {uploadingFile === index ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-sm text-gray-600">
                          {uploadingFile === index ? 'Enviando...' : 'Clique para anexar comprovante'}
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Observações */}
                <div className="mt-3 space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={inst.notes}
                    onChange={(e) => handleInstallmentChange(index, 'notes', e.target.value)}
                    placeholder="Informações adicionais sobre esta parcela"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Total das Parcelas */}
          <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-md">
            <span className="font-semibold text-blue-900">Total das Parcelas:</span>
            <span className="font-bold text-blue-900">
              R$ {installments.reduce((sum, inst) => sum + (inst.amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}