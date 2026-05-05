import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, QrCode, FileText, CheckCircle, Copy, ExternalLink, Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS = {
  PENDING: { label: "Aguardando", color: "bg-yellow-100 text-yellow-800" },
  RECEIVED: { label: "Pago", color: "bg-green-100 text-green-800" },
  CONFIRMED: { label: "Confirmado", color: "bg-green-100 text-green-800" },
  OVERDUE: { label: "Vencido", color: "bg-red-100 text-red-800" },
  REFUNDED: { label: "Estornado", color: "bg-gray-100 text-gray-800" },
  CANCELLED: { label: "Cancelado", color: "bg-gray-100 text-gray-800" },
};

export default function AsaasPaymentModal({ open, onClose, enrollment }) {
  const [billingType, setBillingType] = useState("PIX");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [loading, setLoading] = useState(false);
  const [charge, setCharge] = useState(null);

  if (!enrollment) return null;

  const handleGenerate = async () => {
    if (!dueDate) { toast.error("Informe o vencimento"); return; }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("asaasPayment", {
        action: "createCharge",
        student_cpf: enrollment.student_cpf,
        student_name: enrollment.student_name,
        student_email: enrollment.student_email,
        student_phone: enrollment.student_phone,
        value: enrollment.unit_value,
        due_date: dueDate,
        billing_type: billingType,
        enrollment_id: enrollment.id,
        description: `Curso: ${enrollment.course_name}`,
      });
      if (res.data?.success) {
        setCharge(res.data.charge);
        toast.success("Cobrança gerada com sucesso!");
      } else {
        toast.error(res.data?.error || "Erro ao gerar cobrança");
      }
    } catch (e) {
      toast.error("Erro ao conectar com o Asaas");
    }
    setLoading(false);
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const handleClose = () => {
    setCharge(null);
    onClose();
  };

  const statusInfo = charge ? (STATUS_LABELS[charge.status] || { label: charge.status, color: "bg-gray-100 text-gray-800" }) : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Gerar Cobrança — Asaas
          </DialogTitle>
        </DialogHeader>

        {/* Info do aluno */}
        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1 border border-gray-200">
          <p className="font-semibold text-gray-900">{enrollment.student_name}</p>
          <p className="text-gray-500">CPF: {enrollment.student_cpf}</p>
          <p className="text-gray-500">Curso: {enrollment.course_name}</p>
          <p className="text-lg font-bold text-green-700">
            R$ {parseFloat(enrollment.unit_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>

        {!charge ? (
          <div className="space-y-4">
            {/* Tipo de pagamento */}
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Forma de Pagamento</Label>
              <Tabs value={billingType} onValueChange={setBillingType}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="PIX" className="flex items-center gap-1 text-xs">
                    <QrCode className="w-3 h-3" /> Pix
                  </TabsTrigger>
                  <TabsTrigger value="BOLETO" className="flex items-center gap-1 text-xs">
                    <FileText className="w-3 h-3" /> Boleto
                  </TabsTrigger>
                  <TabsTrigger value="CREDIT_CARD" className="flex items-center gap-1 text-xs">
                    <CreditCard className="w-3 h-3" /> Cartão
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Vencimento */}
            <div>
              <Label>Vencimento *</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>

            {billingType === "CREDIT_CARD" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                Para cartão de crédito, o Asaas envia um link de pagamento seguro por e-mail ao cliente.
              </div>
            )}

            <Button
              className="w-full bg-green-600 hover:bg-green-700 h-11"
              onClick={handleGenerate}
              disabled={loading || !enrollment.unit_value}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-2" /> Gerar Cobrança</>
              )}
            </Button>

            {!enrollment.unit_value && (
              <p className="text-xs text-red-500 text-center">Esta matrícula não possui valor cadastrado.</p>
            )}
          </div>
        ) : (
          // Resultado da cobrança
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Cobrança gerada!</p>
              {statusInfo && <Badge className={statusInfo.color}>{statusInfo.label}</Badge>}
            </div>

            {/* PIX - QR Code */}
            {charge.billing_type === "PIX" && charge.pix_qr_code && (
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <img
                    src={`data:image/png;base64,${charge.pix_qr_code}`}
                    alt="QR Code Pix"
                    className="w-48 h-48 border border-gray-200 rounded-lg"
                  />
                </div>
                {charge.pix_copy_paste && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Pix Copia e Cola:</p>
                    <p className="text-xs font-mono break-all text-gray-700 line-clamp-2">{charge.pix_copy_paste}</p>
                    <Button
                      size="sm" variant="outline" className="mt-2 w-full text-xs"
                      onClick={() => copyText(charge.pix_copy_paste)}
                    >
                      <Copy className="w-3 h-3 mr-1" /> Copiar código
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Boleto */}
            {charge.billing_type === "BOLETO" && charge.bank_slip_url && (
              <Button
                className="w-full" variant="outline"
                onClick={() => window.open(charge.bank_slip_url, "_blank")}
              >
                <FileText className="w-4 h-4 mr-2" /> Abrir Boleto
              </Button>
            )}

            {/* Link de pagamento geral */}
            {charge.invoice_url && (
              <Button
                className="w-full bg-gray-900 hover:bg-gray-800"
                onClick={() => window.open(charge.invoice_url, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" /> Abrir Link de Pagamento
              </Button>
            )}

            <div className="text-xs text-gray-400 text-center">
              ID da cobrança: {charge.id}
            </div>

            <Button variant="outline" className="w-full" onClick={() => setCharge(null)}>
              Gerar Nova Cobrança
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}