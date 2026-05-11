import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FileText, Plus, Edit, Eye, Send, PenLine, CheckCircle, Clock,
  Loader2, Search, Download, AlertTriangle, Trash2
} from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS = {
  "Rascunho": "bg-gray-100 text-gray-700",
  "Aguardando_Assinatura": "bg-yellow-100 text-yellow-800",
  "Assinado_Aluno": "bg-blue-100 text-blue-800",
  "Assinado_Gestor": "bg-indigo-100 text-indigo-800",
  "Vigente": "bg-green-100 text-green-800",
  "Vencido": "bg-red-100 text-red-800",
  "Cancelado": "bg-gray-200 text-gray-500",
};

const DEFAULT_TEMPLATE = `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; font-size: 14px; line-height: 1.6; color: #333;">
  <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px;">
    <h1 style="font-size: 20px; font-weight: bold; margin: 0;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS</h1>
    <p style="margin: 5px 0;">Contrato Nº: <strong>{{contract.number}}</strong> | Data: <strong>{{contract.date}}</strong></p>
  </div>

  <h2 style="font-size: 14px; font-weight: bold; margin: 20px 0 8px;">CONTRATADA:</h2>
  <p><strong>{{company.name}}</strong>, CNPJ: {{company.cnpj}}<br/>Endereço: {{company.address}}</p>

  <h2 style="font-size: 14px; font-weight: bold; margin: 20px 0 8px;">CONTRATANTE (ALUNO):</h2>
  <p>
    <strong>{{student.full_name}}</strong>, CPF: {{student.cpf}}, RG: {{student.rg}} ({{student.rg_orgao_emissor}})<br/>
    Nascimento: {{student.data_nascimento}}<br/>
    Endereço: {{student.logradouro}}, {{student.numero}}, {{student.bairro}} - {{student.cidade}}/{{student.estado}} - CEP: {{student.cep}}<br/>
    E-mail: {{student.email}} | WhatsApp: {{student.whatsapp}}
  </p>

  <h2 style="font-size: 14px; font-weight: bold; margin: 20px 0 8px;">CLÁUSULA 1ª — OBJETO</h2>
  <p>O presente contrato tem por objeto a prestação de serviços de treinamento e capacitação profissional no curso de <strong>{{course.name}}</strong>, com início em <strong>{{course.start_date}}</strong> e término em <strong>{{course.end_date}}</strong>.</p>

  <h2 style="font-size: 14px; font-weight: bold; margin: 20px 0 8px;">CLÁUSULA 2ª — VALOR E PAGAMENTO</h2>
  <p>O valor total do treinamento é de <strong>{{course.value}}</strong>, a ser pago via <strong>{{course.payment_method}}</strong>.</p>

  <h2 style="font-size: 14px; font-weight: bold; margin: 20px 0 8px;">CLÁUSULA 3ª — PENALIDADES</h2>
  <p>Em caso de inadimplência, incidirá multa de <strong>{{fine_percentage}}%</strong> e juros de <strong>{{interest_percentage}}%</strong> ao mês sobre o valor em atraso.</p>

  <h2 style="font-size: 14px; font-weight: bold; margin: 20px 0 8px;">CLÁUSULA 4ª — RESCISÃO</h2>
  <p>Qualquer das partes poderá rescindir o presente contrato mediante comunicação prévia de 15 (quinze) dias, por escrito.</p>

  <div style="margin-top: 60px;">
    <p>{{company.address}}, {{contract.date}}</p>
    <div style="display: flex; justify-content: space-between; margin-top: 40px;">
      <div style="text-align: center; width: 45%;">
        <div style="border-top: 1px solid #000; padding-top: 8px;">
          <p style="margin: 0;"><strong>{{company.name}}</strong></p>
          <p style="margin: 0; font-size: 12px;">CONTRATADA</p>
        </div>
      </div>
      <div style="text-align: center; width: 45%;">
        <div style="border-top: 1px solid #000; padding-top: 8px;">
          <p style="margin: 0;"><strong>{{student.full_name}}</strong></p>
          <p style="margin: 0; font-size: 12px;">CONTRATANTE — CPF: {{student.cpf}}</p>
        </div>
      </div>
    </div>
  </div>

  <div style="margin-top: 30px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; background: #f9f9f9; font-size: 11px; color: #666;">
    <strong>AUTENTICIDADE:</strong> Este documento foi gerado eletronicamente pelo sistema CAT Cursos em {{contract.date}}. Contrato Nº {{contract.number}}.
  </div>
</div>`;

// ─── Aba: Modelos de Contrato ────────────────────────────────────────────────
function ModelosContrato() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", template_type: "Individual", html_content: DEFAULT_TEMPLATE, fine_percentage: 2, interest_percentage: 1 });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["contract-templates"],
    queryFn: () => base44.entities.ContractTemplate.list("-created_date"),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.ContractTemplate.update(editing.id, data)
      : base44.entities.ContractTemplate.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contract-templates"] }); toast.success("Modelo salvo!"); setModalOpen(false); setEditing(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ContractTemplate.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contract-templates"] }); toast.success("Modelo removido!"); }
  });

  const openNew = () => { setEditing(null); setForm({ name: "", template_type: "Individual", html_content: DEFAULT_TEMPLATE, fine_percentage: 2, interest_percentage: 1 }); setModalOpen(true); };
  const openEdit = (t) => { setEditing(t); setForm(t); setModalOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} className="bg-gray-900 hover:bg-gray-800"><Plus className="w-4 h-4 mr-1" /> Novo Modelo</Button>
      </div>
      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {isLoading ? <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
            : templates.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FileText className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">Nenhum modelo cadastrado. Crie o primeiro!</p>
              </div>
            ) : (
              <div className="divide-y">
                {templates.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                    <div>
                      <p className="font-semibold text-gray-900">{t.name}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge className="bg-blue-100 text-blue-800 text-xs">{t.template_type}</Badge>
                        <Badge className={t.is_active !== false ? "bg-green-100 text-green-800 text-xs" : "bg-gray-100 text-gray-500 text-xs"}>
                          {t.is_active !== false ? "Ativo" : "Inativo"}
                        </Badge>
                        <span className="text-xs text-gray-400">v{t.version || 1}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Edit className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteMutation.mutate(t.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Modelo" : "Novo Modelo de Contrato"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nome do Modelo *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.template_type} onValueChange={v => setForm(f => ({ ...f, template_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individual">Individual (PF)</SelectItem>
                    <SelectItem value="Empresarial">Empresarial (PJ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Multa (%)</Label><Input type="number" value={form.fine_percentage} onChange={e => setForm(f => ({ ...f, fine_percentage: parseFloat(e.target.value) }))} /></div>
              <div><Label>Juros ao mês (%)</Label><Input type="number" value={form.interest_percentage} onChange={e => setForm(f => ({ ...f, interest_percentage: parseFloat(e.target.value) }))} /></div>
            </div>
            <div>
              <Label>Conteúdo HTML do Contrato</Label>
              <p className="text-xs text-gray-500 mb-2">Use variáveis: {'{{student.full_name}}'}, {'{{course.name}}'}, {'{{contract.number}}'}, {'{{contract.date}}'}, etc.</p>
              <textarea
                className="w-full border rounded-md p-3 text-sm font-mono h-80 resize-y focus:outline-none focus:ring-1 focus:ring-gray-400"
                value={form.html_content}
                onChange={e => setForm(f => ({ ...f, html_content: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button className="bg-gray-900 hover:bg-gray-800" onClick={() => saveMutation.mutate(form)}>Salvar Modelo</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Aba: Contratos Gerados ──────────────────────────────────────────────────
function ContratosGerados() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [gerarModal, setGerarModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [gerarForm, setGerarForm] = useState({ template_id: "", student_id: "", enrollment_id: "" });
  const [generating, setGenerating] = useState(false);

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list("-created_date", 100),
    initialData: [],
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["contract-templates"],
    queryFn: () => base44.entities.ContractTemplate.filter({ is_active: true }),
    initialData: [],
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-pf"],
    queryFn: () => base44.entities.Student.list(),
    initialData: [],
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["enrollments-pf"],
    queryFn: () => base44.entities.StudentCourseEnrollment.list("-created_date", 200),
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contract.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contracts"] }); toast.success("Contrato atualizado!"); }
  });

  const handleGerar = async () => {
    if (!gerarForm.template_id || !gerarForm.student_id) { toast.error("Selecione modelo e aluno"); return; }
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("gerarContrato", gerarForm);
      toast.success(`Contrato ${res.data.contract_number} gerado!`);
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      setGerarModal(false);
    } catch (err) {
      toast.error("Erro: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleEnviar = async (contract) => {
    await updateMutation.mutateAsync({ id: contract.id, data: { status: "Aguardando_Assinatura", sent_at: new Date().toISOString(), sent_via: "manual" } });
    // Registrar timeline
    await base44.entities.StudentTimeline.create({
      student_id: contract.student_id,
      student_name: contract.student_name,
      event_type: "contrato_enviado",
      title: "Contrato Enviado para Assinatura",
      description: `Contrato ${contract.contract_number} marcado como enviado`,
      performed_by: "sistema"
    });
    toast.success("Status atualizado para 'Aguardando Assinatura'");
  };

  const filtered = contracts.filter(c =>
    c.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.contract_number?.includes(search)
  );

  const studentEnrollments = gerarForm.student_id
    ? enrollments.filter(e => e.student_id === gerarForm.student_id)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar por aluno ou nº contrato..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={() => setGerarModal(true)} className="bg-gray-900 hover:bg-gray-800">
          <Plus className="w-4 h-4 mr-1" /> Gerar Contrato
        </Button>
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {isLoading ? <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
            : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FileText className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">Nenhum contrato gerado ainda</p>
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{c.student_name}</p>
                      <p className="text-xs text-gray-500">{c.contract_number} {c.course_name && `— ${c.course_name}`}</p>
                      <p className="text-xs text-gray-400">{new Date(c.created_date).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_COLORS[c.status] || "bg-gray-100 text-gray-700"}>
                        {c.status?.replace("_", " ")}
                      </Badge>
                      <Button size="sm" variant="ghost" onClick={() => setViewModal(c)}><Eye className="w-4 h-4" /></Button>
                      {c.status === "Rascunho" && (
                        <Button size="sm" variant="outline" className="text-blue-600 border-blue-300" onClick={() => handleEnviar(c)}>
                          <Send className="w-3 h-3 mr-1" /> Enviar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>

      {/* Modal: Gerar Contrato */}
      <Dialog open={gerarModal} onOpenChange={setGerarModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Gerar Novo Contrato</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Modelo de Contrato *</Label>
              <Select value={gerarForm.template_id} onValueChange={v => setGerarForm(f => ({ ...f, template_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Aluno *</Label>
              <Select value={gerarForm.student_id} onValueChange={v => setGerarForm(f => ({ ...f, student_id: v, enrollment_id: "" }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name} — {s.cpf}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {studentEnrollments.length > 0 && (
              <div>
                <Label>Matrícula (opcional)</Label>
                <Select value={gerarForm.enrollment_id} onValueChange={v => setGerarForm(f => ({ ...f, enrollment_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a matrícula" /></SelectTrigger>
                  <SelectContent>{studentEnrollments.map(e => <SelectItem key={e.id} value={e.id}>{e.course_name} — {e.start_date}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGerarModal(false)}>Cancelar</Button>
              <Button className="bg-gray-900 hover:bg-gray-800" onClick={handleGerar} disabled={generating}>
                {generating ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Gerando...</> : "Gerar Contrato"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Visualizar Contrato */}
      <Dialog open={!!viewModal} onOpenChange={() => setViewModal(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {viewModal?.contract_number} — {viewModal?.student_name}
            </DialogTitle>
          </DialogHeader>
          {viewModal?.html_content_filled && (
            <div
              className="border rounded-lg p-4 bg-white text-sm"
              dangerouslySetInnerHTML={{ __html: viewModal.html_content_filled }}
            />
          )}
          {viewModal?.student_signed_at && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
              <strong>Assinado pelo Aluno:</strong> {new Date(viewModal.student_signed_at).toLocaleString("pt-BR")} | IP: {viewModal.student_signed_ip}
            </div>
          )}
          {viewModal?.manager_signed_at && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
              <strong>Assinado pelo Gestor:</strong> {viewModal.manager_signed_by} em {new Date(viewModal.manager_signed_at).toLocaleString("pt-BR")}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Página Principal ────────────────────────────────────────────────────────
export default function GestaoContratos() {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">Gestão de Contratos</h1>
          <p className="text-gray-600 text-sm mt-1">Modelos, geração automática, assinatura digital e auditoria</p>
        </div>
        <Tabs defaultValue="contratos">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 p-1">
            <TabsTrigger value="contratos" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" /> Contratos Gerados
            </TabsTrigger>
            <TabsTrigger value="modelos" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              <Edit className="w-4 h-4 mr-2" /> Modelos de Contrato
            </TabsTrigger>
          </TabsList>
          <TabsContent value="contratos"><ContratosGerados /></TabsContent>
          <TabsContent value="modelos"><ModelosContrato /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}