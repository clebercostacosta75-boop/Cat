import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, Edit, Trash2, Search, Phone, Mail, Building2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const STATUS_OPTIONS = ["Novo", "Em Atendimento", "Qualificado", "Proposta Enviada", "Matriculado", "Perdido", "Sem Interesse"];
const CHANNEL_OPTIONS = ["Instagram", "Facebook", "WhatsApp", "LinkedIn", "TikTok", "Site", "Indicação", "Telefone", "E-mail", "Outro"];
const PRIORITY_OPTIONS = ["Alta", "Média", "Baixa"];

const STATUS_COLORS = {
  "Novo": "bg-blue-100 text-blue-800",
  "Em Atendimento": "bg-yellow-100 text-yellow-800",
  "Qualificado": "bg-purple-100 text-purple-800",
  "Proposta Enviada": "bg-orange-100 text-orange-800",
  "Matriculado": "bg-green-100 text-green-800",
  "Perdido": "bg-red-100 text-red-800",
  "Sem Interesse": "bg-gray-100 text-gray-600",
};

const PRIORITY_COLORS = {
  "Alta": "bg-red-100 text-red-700",
  "Média": "bg-yellow-100 text-yellow-700",
  "Baixa": "bg-gray-100 text-gray-600",
};

const EMPTY_FORM = {
  name: "", email: "", phone: "", lead_type: "Pessoa Física",
  company_name: "", origin_channel: "Instagram", status: "Novo",
  priority: "Média", interest_course: "", notes: "", city: "", state: "",
};

export default function GestaoLeads() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterChannel, setFilterChannel] = useState("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list("-created_date", 500),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingLead
      ? base44.entities.Lead.update(editingLead.id, data)
      : base44.entities.Lead.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success(editingLead ? "Lead atualizado!" : "Lead criado!");
      setModalOpen(false);
      setEditingLead(null);
      setForm(EMPTY_FORM);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Lead.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead removido.");
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Lead.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  const openCreate = () => {
    setEditingLead(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (lead) => {
    setEditingLead(lead);
    setForm({ ...EMPTY_FORM, ...lead });
    setModalOpen(true);
  };

  const filtered = leads.filter(l => {
    const matchSearch = !search || l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.phone?.includes(search) ||
      l.company_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || l.status === filterStatus;
    const matchChannel = filterChannel === "todos" || l.origin_channel === filterChannel;
    return matchSearch && matchStatus && matchChannel;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Gestão de Leads
          </h1>
          <p className="text-sm text-gray-500 mt-1">{leads.length} leads cadastrados · {leads.filter(l => l.status === "Novo").length} novos</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-4 h-4" /> Novo Lead
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar por nome, e-mail, telefone ou empresa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterChannel} onValueChange={setFilterChannel}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Canais</SelectItem>
            {CHANNEL_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-200">
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">Nenhum lead encontrado</p>
            <Button onClick={openCreate} className="mt-4 bg-blue-600 hover:bg-blue-700">Cadastrar Primeiro Lead</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(lead => (
            <Card key={lead.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700 shrink-0 text-sm">
                      {lead.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">{lead.name}</p>
                        <Badge className={`text-xs ${STATUS_COLORS[lead.status] || "bg-gray-100"}`}>{lead.status}</Badge>
                        <Badge className={`text-xs ${PRIORITY_COLORS[lead.priority] || "bg-gray-100"}`}>{lead.priority}</Badge>
                        <Badge variant="outline" className="text-xs">{lead.origin_channel}</Badge>
                        {lead.lead_type === "Pessoa Jurídica" && <Badge variant="outline" className="text-xs text-purple-600">PJ</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>}
                        {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>}
                        {lead.company_name && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{lead.company_name}</span>}
                        {lead.interest_course && <span className="text-blue-600">→ {lead.interest_course}</span>}
                      </div>
                      {lead.notes && <p className="text-xs text-gray-400 mt-1 truncate">{lead.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={lead.status} onValueChange={(status) => updateStatus.mutate({ id: lead.id, status })}>
                      <SelectTrigger className="h-8 text-xs w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(lead)}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => { if (confirm("Remover lead?")) deleteMutation.mutate(lead.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLead ? "Editar Lead" : "Novo Lead"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1 md:col-span-2">
                <Label>Nome Completo *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nome do lead" />
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={form.lead_type} onValueChange={v => setForm({...form, lead_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pessoa Física">Pessoa Física</SelectItem>
                    <SelectItem value="Pessoa Jurídica">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Canal de Origem</Label>
                <Select value={form.origin_channel} onValueChange={v => setForm({...form, origin_channel: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANNEL_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@exemplo.com" />
              </div>
              <div className="space-y-1">
                <Label>Telefone / WhatsApp</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="(91) 99999-9999" />
              </div>
              {form.lead_type === "Pessoa Jurídica" && (
                <div className="space-y-1 md:col-span-2">
                  <Label>Nome da Empresa</Label>
                  <Input value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} placeholder="Razão social ou nome fantasia" />
                </div>
              )}
              <div className="space-y-1">
                <Label>Cidade</Label>
                <Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Ex: Barcarena" />
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Input value={form.state} onChange={e => setForm({...form, state: e.target.value})} placeholder="Ex: PA" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Curso de Interesse</Label>
                <Input value={form.interest_course} onChange={e => setForm({...form, interest_course: e.target.value})} placeholder="Ex: NR-35 — Trabalho em Altura" />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notas sobre o lead..." rows={3} />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending || !form.name}
              >
                {saveMutation.isPending ? "Salvando..." : editingLead ? "Atualizar" : "Criar Lead"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}