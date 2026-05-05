import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, CreditCard, QrCode, FileText, Plus, ExternalLink,
  Copy, CheckCircle, Loader2, DollarSign, User, XCircle, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS = {
  PENDING: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  RECEIVED: { label: "Recebido", color: "bg-green-100 text-green-800" },
  CONFIRMED: { label: "Confirmado", color: "bg-green-100 text-green-800" },
  OVERDUE: { label: "Vencido", color: "bg-red-100 text-red-800" },
  REFUNDED: { label: "Estornado", color: "bg-gray-100 text-gray-800" },
  CANCELED: { label: "Cancelado", color: "bg-gray-100 text-gray-800" },
};

const BILLING_TYPES = [
  { value: "BOLETO", label: "Boleto Bancário", icon: FileText },
  { value: "PIX", label: "Pix", icon: QrCode },
  { value: "CREDIT_CARD", label: "Cartão de Crédito", icon: CreditCard },
  { value: "UNDEFINED", label: "À Vista (qualquer forma)", icon: DollarSign },
];

function PixModal({ charge, onClose }) {
  const [pix, setPix] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    base44.functions.invoke("asaasCobranca", { action: "getPixQrCode", paymentId: charge.id })
      .then(r => setPix(r.data.pix))
      .finally(() => setLoading(false));
  }, [charge.id]);

  const copyCode = () => {
    if (pix?.payload) {
      navigator.clipboard.writeText(pix.payload);
      toast.success("Código Pix copiado!");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><QrCode className="w-5 h-5 text-green-600" /> QR Code Pix</DialogTitle></DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : pix ? (
          <div className="space-y-4 text-center">
            {pix.encodedImage && (
              <img src={`data:image/png;base64,${pix.encodedImage}`} alt="QR Code Pix" className="mx-auto w-48 h-48 border rounded-lg" />
            )}
            <p className="text-sm font-semibold text-gray-700">R$ {parseFloat(charge.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            {pix.payload && (
              <Button variant="outline" className="w-full gap-2 text-xs" onClick={copyCode}>
                <Copy className="w-3 h-3" /> Copiar código Pix Copia e Cola
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">Não foi possível obter o QR Code.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BoletoModal({ charge, onClose }) {
  const [boleto, setBoleto] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    base44.functions.invoke("asaasCobranca", { action: "getBoletoLine", paymentId: charge.id })
      .then(r => setBoleto(r.data.boleto))
      .finally(() => setLoading(false));
  }, [charge.id]);

  const copyLine = () => {
    if (boleto?.identificationField) {
      navigator.clipboard.writeText(boleto.identificationField);
      toast.success("Linha digitável copiada!");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" /> Boleto Bancário</DialogTitle></DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : boleto ? (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-700 text-center">R$ {parseFloat(charge.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            {boleto.identificationField && (
              <div className="bg-gray-50 p-3 rounded-lg border">
                <p className="text-xs text-gray-500 mb-1">Linha digitável:</p>
                <p className="text-sm font-mono break-all text-gray-800">{boleto.identificationField}</p>
              </div>
            )}
            <div className="flex gap-2">
              {boleto.identificationField && (
                <Button variant="outline" className="flex-1 gap-2 text-xs" onClick={copyLine}>
                  <Copy className="w-3 h-3" /> Copiar linha
                </Button>
              )}
              {charge.bankSlipUrl && (
                <Button className="flex-1 gap-2 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => window.open(charge.bankSlipUrl, "_blank")}>
                  <ExternalLink className="w-3 h-3" /> Abrir boleto
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">Não foi possível obter o boleto.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NovaCobrancaModal({ student, onClose, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    billingType: "BOLETO",
    value: "",
    dueDate: "",
    description: "",
    installmentCount: 1,
  });

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleCreate = async () => {
    if (!form.value || !form.dueDate) { toast.error("Informe o valor e o vencimento."); return; }
    setLoading(true);
    try {
      // 1. Buscar ou criar cliente no Asaas
      const custRes = await base44.functions.invoke("asaasCobranca", {
        action: "getOrCreateCustomer",
        name: student.full_name,
        cpf: student.cpf,
        email: student.email || "",
        phone: student.whatsapp || "",
      });
      const customer = custRes.data.customer;
      if (!customer?.id) throw new Error("Erro ao localizar/criar cliente no Asaas.");

      // 2. Criar cobrança
      const chargeRes = await base44.functions.invoke("asaasCobranca", {
        action: "createCharge",
        customerId: customer.id,
        billingType: form.billingType,
        value: parseFloat(form.value),
        dueDate: form.dueDate,
        description: form.description || `Curso — ${student.full_name}`,
        installmentCount: form.installmentCount,
      });
      const charge = chargeRes.data.charge;
      if (charge.errors) throw new Error(charge.errors[0]?.description || "Erro ao criar cobrança.");

      // 3. Enviar notificação por e-mail e WhatsApp
      try {
        await base44.functions.invoke("enviarBoletoAsaas", {
          action: "sendBoletoNotification",
          charge: {
            studentEmail: student.email || "",
            studentPhone: student.whatsapp || "",
            studentName: student.full_name,
            chargeValue: form.value,
            chargeId: charge.id,
            dueDate: form.dueDate,
          },
          billingType: form.billingType,
        });
      } catch (notifErr) {
        console.warn("Aviso: Notificação não enviada:", notifErr.message);
      }

      toast.success("Cobrança criada e notificação enviada!");
      onCreated(charge);
      onClose();
    } catch (err) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Nova Cobrança — {student.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Forma de Cobrança *</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {BILLING_TYPES.map(bt => (
                <button
                  key={bt.value}
                  onClick={() => set("billingType", bt.value)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-all ${
                    form.billingType === bt.value
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 hover:border-gray-400 text-gray-700"
                  }`}
                >
                  <bt.icon className="w-4 h-4" /> {bt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$) *</Label>
              <Input type="number" min="0" step="0.01" placeholder="0,00" value={form.value} onChange={e => set("value", e.target.value)} />
            </div>
            <div>
              <Label>Vencimento *</Label>
              <Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
            </div>
          </div>

          {form.billingType === "CREDIT_CARD" && (
            <div>
              <Label>Parcelas</Label>
              <Select value={String(form.installmentCount)} onValueChange={v => set("installmentCount", parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <SelectItem key={n} value={String(n)}>{n === 1 ? "À vista" : `${n}x`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Descrição</Label>
            <Input placeholder="Ex: Pagamento NR-35 — Maio/2026" value={form.description} onChange={e => set("description", e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button className="bg-gray-900 hover:bg-gray-800" onClick={handleCreate} disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando...</> : "Gerar Cobrança"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PagamentosAsaas() {
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [charges, setCharges] = useState([]);
  const [loadingCharges, setLoadingCharges] = useState(false);
  const [showNovaCobranca, setShowNovaCobranca] = useState(false);
  const [pixModal, setPixModal] = useState(null);
  const [boletoModal, setBoletoModal] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const { data: students = [] } = useQuery({
    queryKey: ["students-pf"],
    queryFn: () => base44.entities.Student.list("-created_date"),
    initialData: [],
  });

  const filtered = students.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.cpf?.includes(search)
  );

  const loadCharges = async (student) => {
    setSelectedStudent(student);
    setCharges([]);
    setLoadingCharges(true);
    try {
      // Busca cliente no Asaas
      const custRes = await base44.functions.invoke("asaasCobranca", {
        action: "getOrCreateCustomer",
        name: student.full_name,
        cpf: student.cpf,
        email: student.email || "",
        phone: student.whatsapp || "",
      });
      const customer = custRes.data.customer;
      if (customer?.id) {
        const chargesRes = await base44.functions.invoke("asaasCobranca", {
          action: "listCharges",
          customerId: customer.id,
        });
        setCharges(chargesRes.data.charges || []);
      }
    } catch {
      toast.error("Erro ao carregar cobranças.");
    }
    setLoadingCharges(false);
  };

  const handleCreated = (charge) => {
    setCharges(prev => [charge, ...prev]);
  };

  const handleCancel = async (charge) => {
    if (!confirm(`Cancelar cobrança de R$ ${parseFloat(charge.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}? Isso também cancelará no Asaas.`)) return;
    setCancellingId(charge.id);
    try {
      await base44.functions.invoke("asaasCobranca", { action: "cancelCharge", paymentId: charge.id });
      toast.success("Cobrança cancelada com sucesso no Asaas!");
      setCharges(prev => prev.map(c => c.id === charge.id ? { ...c, status: "CANCELED" } : c));
    } catch {
      toast.error("Erro ao cancelar a cobrança.");
    }
    setCancellingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lista de alunos */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Buscar aluno..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Card className="border border-gray-200 max-h-[60vh] overflow-y-auto">
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <User className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Nenhum aluno</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filtered.map(s => (
                    <button
                      key={s.id}
                      className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${selectedStudent?.id === s.id ? "bg-gray-900 text-white hover:bg-gray-900" : ""}`}
                      onClick={() => loadCharges(s)}
                    >
                      <p className={`font-semibold text-sm ${selectedStudent?.id === s.id ? "text-white" : "text-gray-900"}`}>{s.full_name}</p>
                      <p className={`text-xs ${selectedStudent?.id === s.id ? "text-gray-300" : "text-gray-500"}`}>CPF: {s.cpf}</p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cobranças do aluno */}
        <div className="lg:col-span-2 space-y-3">
          {!selectedStudent ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              <CreditCard className="w-12 h-12 mb-3" />
              <p className="text-sm">Selecione um aluno para ver as cobranças</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedStudent.full_name}</h3>
                  <p className="text-xs text-gray-500">CPF: {selectedStudent.cpf}</p>
                </div>
                <Button className="bg-gray-900 hover:bg-gray-800 gap-2" onClick={() => setShowNovaCobranca(true)}>
                  <Plus className="w-4 h-4" /> Nova Cobrança
                </Button>
              </div>

              <Card className="border border-gray-200">
                <CardHeader className="bg-gray-50 py-3 px-4">
                  <CardTitle className="text-sm font-semibold text-gray-700">Cobranças no Asaas</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingCharges ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : charges.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <DollarSign className="w-10 h-10 mx-auto mb-2" />
                      <p className="text-sm">Nenhuma cobrança registrada</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {charges.map(c => {
                        const st = STATUS_LABELS[c.status] || { label: c.status, color: "bg-gray-100 text-gray-800" };
                        const billing = BILLING_TYPES.find(b => b.value === c.billingType);
                        return (
                          <div key={c.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                            <div>
                              <div className="flex items-center gap-2">
                                {billing && <billing.icon className="w-4 h-4 text-gray-500" />}
                                <p className="font-semibold text-sm text-gray-900">
                                  R$ {parseFloat(c.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{c.description || "—"}</p>
                              <p className="text-xs text-gray-400">Venc: {c.dueDate}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={st.color}>{st.label}</Badge>
                              <div className="flex flex-wrap gap-1 justify-end">
                                {c.billingType === "PIX" && c.status === "PENDING" && (
                                  <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1" onClick={() => setPixModal(c)}>
                                    <QrCode className="w-3 h-3" /> Pix
                                  </Button>
                                )}
                                {c.billingType === "BOLETO" && c.status === "PENDING" && (
                                  <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1" onClick={() => setBoletoModal(c)}>
                                    <FileText className="w-3 h-3" /> Boleto
                                  </Button>
                                )}
                                {c.invoiceUrl && (
                                  <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1" onClick={() => window.open(c.invoiceUrl, "_blank")}>
                                    <ExternalLink className="w-3 h-3" /> Link
                                  </Button>
                                )}
                                {["PENDING", "OVERDUE"].includes(c.status) && (
                                  <Button
                                    size="sm" variant="outline"
                                    className="text-xs h-7 px-2 gap-1 border-red-300 text-red-600 hover:bg-red-50"
                                    onClick={() => handleCancel(c)}
                                    disabled={cancellingId === c.id}
                                  >
                                    {cancellingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                    Cancelar
                                  </Button>
                                )}
                                <Button
                                  size="sm" variant="outline"
                                  className="text-xs h-7 px-2 gap-1 border-blue-300 text-blue-600 hover:bg-blue-50"
                                  onClick={() => setShowNovaCobranca(true)}
                                >
                                  <RefreshCw className="w-3 h-3" /> Nova
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {showNovaCobranca && selectedStudent && (
        <NovaCobrancaModal
          student={selectedStudent}
          onClose={() => setShowNovaCobranca(false)}
          onCreated={handleCreated}
        />
      )}

      {pixModal && <PixModal charge={pixModal} onClose={() => setPixModal(null)} />}
      {boletoModal && <BoletoModal charge={boletoModal} onClose={() => setBoletoModal(null)} />}
    </div>
  );
}