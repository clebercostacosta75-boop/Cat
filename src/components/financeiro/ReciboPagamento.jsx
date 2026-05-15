import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt, Plus, Eye, Send, Printer, CheckCircle } from "lucide-react";
import { toast } from "sonner";

function ModalNovoRecibo({ open, onClose, enrollment, onSuccess }) {
  const [form, setForm] = useState({
    amount: enrollment?.unit_value || "",
    payment_method: "Dinheiro em Espécie",
    payment_date: new Date().toISOString().split("T")[0],
    description: "",
    send_email: false,
  });
  const [loading, setLoading] = useState(false);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!form.amount || !form.payment_method || !form.payment_date) {
      toast.error("Preencha valor, forma de pagamento e data.");
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("gerarRecibo", {
        enrollment_id: enrollment?.id,
        student_id: enrollment?.student_id,
        amount: parseFloat(form.amount),
        payment_method: form.payment_method,
        payment_date: form.payment_date,
        description: form.description,
        send_email: form.send_email,
      });
      if (res.data?.success) {
        toast.success(`Recibo ${res.data.receipt_number} emitido com sucesso!`);
        onSuccess(res.data);
      }
    } catch (e) {
      toast.error("Erro ao gerar recibo: " + e.message);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-green-600" /> Emitir Recibo de Pagamento
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {enrollment && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
              <p className="font-semibold text-gray-800">{enrollment.student_name}</p>
              <p className="text-gray-500 text-xs">{enrollment.course_name}</p>
            </div>
          )}

          <div>
            <Label>Valor Recebido (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={form.amount}
              onChange={e => set("amount", e.target.value)}
            />
          </div>

          <div>
            <Label>Forma de Pagamento *</Label>
            <Select value={form.payment_method} onValueChange={v => set("payment_method", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Dinheiro em Espécie">💵 Dinheiro em Espécie</SelectItem>
                <SelectItem value="Pix">⚡ Pix</SelectItem>
                <SelectItem value="Cartão de Crédito">💳 Cartão de Crédito</SelectItem>
                <SelectItem value="Cartão de Débito">💳 Cartão de Débito</SelectItem>
                <SelectItem value="Transferência Bancária">🏦 Transferência Bancária</SelectItem>
                <SelectItem value="Boleto">📄 Boleto</SelectItem>
                <SelectItem value="Cheque">📋 Cheque</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Data do Recebimento *</Label>
            <Input
              type="date"
              value={form.payment_date}
              onChange={e => set("payment_date", e.target.value)}
            />
          </div>

          <div>
            <Label>Descrição / Observação</Label>
            <Input
              placeholder="Ex: Entrada do curso, 1ª parcela..."
              value={form.description}
              onChange={e => set("description", e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.send_email}
              onChange={e => set("send_email", e.target.checked)}
              className="w-4 h-4 accent-gray-800"
            />
            <span className="text-sm text-gray-700">Enviar recibo por e-mail ao aluno</span>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              className="bg-green-700 hover:bg-green-800"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Gerando...</>
                : <><Receipt className="w-4 h-4 mr-2" />Emitir Recibo</>
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModalVisualizarRecibo({ html, receiptNumber, onClose }) {
  return (
    <Dialog open={!!html} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Receipt className="w-5 h-5 text-green-600" />Recibo Nº {receiptNumber}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const w = window.open("", "_blank");
                w.document.write(html);
                w.document.close();
                w.print();
              }}
            >
              <Printer className="w-4 h-4 mr-1" /> Imprimir
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto rounded-lg border">
          <iframe srcDoc={html} className="w-full h-[70vh]" title="Recibo" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ReciboPagamento({ enrollment }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [reciboHtml, setReciboHtml] = useState(null);
  const [reciboNumber, setReciboNumber] = useState("");

  const { data: receipts = [], refetch } = useQuery({
    queryKey: ["receipts", enrollment?.id],
    queryFn: () => enrollment?.id
      ? base44.entities.Receipt.filter({ enrollment_id: enrollment.id })
      : Promise.resolve([]),
    enabled: !!enrollment?.id,
  });

  const handleSuccess = (data) => {
    setModalOpen(false);
    setReciboHtml(data.html);
    setReciboNumber(data.receipt_number);
    refetch();
    queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] });
  };

  const handleVerRecibo = async (receiptId, receiptNumber) => {
    // Regenerar HTML para visualização
    const receipt = receipts.find(r => r.id === receiptId);
    if (!receipt) return;
    try {
      const res = await base44.functions.invoke("gerarRecibo", {
        enrollment_id: receipt.enrollment_id || enrollment?.id,
        student_id: receipt.student_id,
        amount: receipt.amount,
        payment_method: receipt.payment_method,
        payment_date: receipt.payment_date,
        description: receipt.description,
        send_email: false,
      });
      if (res.data?.html) {
        setReciboHtml(res.data.html);
        setReciboNumber(receiptNumber);
      }
    } catch {
      toast.error("Erro ao visualizar recibo.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-green-600" />
          <span className="font-semibold text-gray-800 text-sm">Recibos de Pagamento</span>
        </div>
        <Button
          size="sm"
          className="bg-green-700 hover:bg-green-800"
          onClick={() => setModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1" /> Novo Recibo
        </Button>
      </div>

      {receipts.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <Receipt className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500">Nenhum recibo emitido ainda</p>
          <p className="text-xs text-gray-400">Clique em "Novo Recibo" para registrar um pagamento</p>
        </div>
      ) : (
        <div className="space-y-2">
          {receipts.map(r => (
            <Card key={r.id} className="border border-gray-200">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800 text-sm">{r.receipt_number}</span>
                    <Badge className={r.status === "Emitido" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}>
                      {r.status}
                    </Badge>
                    {r.email_sent && (
                      <Badge className="bg-blue-100 text-blue-700 text-xs flex items-center gap-1">
                        <Send className="w-3 h-3" /> E-mail enviado
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <strong className="text-green-700">R$ {parseFloat(r.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                    {" · "}{r.payment_method}
                    {" · "}{r.payment_date ? new Date(r.payment_date + "T00:00:00").toLocaleDateString("pt-BR") : "-"}
                  </p>
                  {r.description && <p className="text-xs text-gray-400">{r.description}</p>}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVerRecibo(r.id, r.receipt_number)}
                  className="text-xs border-green-300 text-green-700 hover:bg-green-50"
                >
                  <Eye className="w-3 h-3 mr-1" /> Ver / Imprimir
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ModalNovoRecibo
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        enrollment={enrollment}
        onSuccess={handleSuccess}
      />

      <ModalVisualizarRecibo
        html={reciboHtml}
        receiptNumber={reciboNumber}
        onClose={() => setReciboHtml(null)}
      />
    </div>
  );
}