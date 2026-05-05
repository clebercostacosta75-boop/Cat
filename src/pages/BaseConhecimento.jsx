import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { BookOpen, Plus, Edit, Trash2, Search, Tag, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_COLORS = {
  "Curso": "bg-blue-100 text-blue-800",
  "Treinamento": "bg-purple-100 text-purple-800",
  "Preço": "bg-green-100 text-green-800",
  "Localização": "bg-orange-100 text-orange-800",
  "Calendário": "bg-yellow-100 text-yellow-800",
  "Política": "bg-red-100 text-red-800",
  "FAQ": "bg-gray-100 text-gray-800",
  "Processo de Matrícula": "bg-teal-100 text-teal-800",
  "Documentação": "bg-indigo-100 text-indigo-800",
  "Outros": "bg-slate-100 text-slate-800",
};

const EMPTY_FORM = {
  title: "", category: "Curso", content: "", keywords: [],
  target_audience: "Ambos", is_active: true, valid_until: "",
  course_name: "", priority: 5,
  price_info: { price_pf: "", price_pj: "", price_notes: "" },
  schedule_info: { duration: "", modality: "Presencial", location: "", next_dates: [] },
};

export default function BaseConhecimento() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [keywordInput, setKeywordInput] = useState("");
  const [newDate, setNewDate] = useState("");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["knowledgeBase"],
    queryFn: () => base44.entities.KnowledgeBaseEntry.list("-created_date", 200),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => base44.entities.Course.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingEntry
      ? base44.entities.KnowledgeBaseEntry.update(editingEntry.id, data)
      : base44.entities.KnowledgeBaseEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledgeBase"] });
      toast.success(editingEntry ? "Entrada atualizada!" : "Entrada criada!");
      setModalOpen(false);
      setEditingEntry(null);
      setForm(EMPTY_FORM);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.KnowledgeBaseEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledgeBase"] });
      toast.success("Entrada removida.");
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.KnowledgeBaseEntry.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["knowledgeBase"] }),
  });

  const openCreate = () => {
    setEditingEntry(null);
    setForm(EMPTY_FORM);
    setKeywordInput("");
    setModalOpen(true);
  };

  const openEdit = (entry) => {
    setEditingEntry(entry);
    setForm({
      ...EMPTY_FORM, ...entry,
      price_info: entry.price_info || { price_pf: "", price_pj: "", price_notes: "" },
      schedule_info: entry.schedule_info || { duration: "", modality: "Presencial", location: "", next_dates: [] },
      keywords: entry.keywords || [],
    });
    setKeywordInput("");
    setModalOpen(true);
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !form.keywords.includes(keywordInput.trim())) {
      setForm({ ...form, keywords: [...form.keywords, keywordInput.trim().toLowerCase()] });
      setKeywordInput("");
    }
  };

  const removeKeyword = (kw) => setForm({ ...form, keywords: form.keywords.filter(k => k !== kw) });

  const addDate = () => {
    if (newDate && !form.schedule_info.next_dates.includes(newDate)) {
      setForm({ ...form, schedule_info: { ...form.schedule_info, next_dates: [...(form.schedule_info.next_dates || []), newDate] } });
      setNewDate("");
    }
  };

  const removeDate = (d) => setForm({ ...form, schedule_info: { ...form.schedule_info, next_dates: form.schedule_info.next_dates.filter(x => x !== d) } });

  const filtered = entries.filter(e => {
    const matchSearch = !search || e.title?.toLowerCase().includes(search.toLowerCase()) || e.content?.toLowerCase().includes(search.toLowerCase()) || e.keywords?.some(k => k.includes(search.toLowerCase()));
    const matchCat = filterCategory === "todas" || e.category === filterCategory;
    return matchSearch && matchCat;
  });

  const activeCount = entries.filter(e => e.is_active !== false).length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-indigo-600" />
            Base de Conhecimento
          </h1>
          <p className="text-sm text-gray-500 mt-1">{activeCount} entradas ativas · usadas pelo Agente de IA Comercial</p>
        </div>
        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
          <Plus className="w-4 h-4" /> Nova Entrada
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar por título, conteúdo ou palavra-chave..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as Categorias</SelectItem>
            {Object.keys(CATEGORY_COLORS).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-200">
          <CardContent className="p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">Base de conhecimento vazia</p>
            <p className="text-gray-400 text-sm mt-1">Adicione informações sobre seus cursos para a IA responder com precisão</p>
            <Button onClick={openCreate} className="mt-4 bg-indigo-600 hover:bg-indigo-700">Adicionar Primeira Entrada</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(entry => (
            <Card key={entry.id} className={`border transition-opacity ${entry.is_active === false ? "opacity-50" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-gray-900">{entry.title}</p>
                      <Badge className={`text-xs ${CATEGORY_COLORS[entry.category] || "bg-gray-100"}`}>{entry.category}</Badge>
                      <Badge variant="outline" className="text-xs">{entry.target_audience}</Badge>
                      {entry.is_active === false && <Badge className="bg-red-100 text-red-700 text-xs">Inativa</Badge>}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{entry.content}</p>
                    {entry.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.keywords.map(kw => (
                          <span key={kw} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5" />{kw}
                          </span>
                        ))}
                      </div>
                    )}
                    {entry.price_info?.price_pf && (
                      <p className="text-xs text-green-700 mt-1">PF: R$ {entry.price_info.price_pf} · PJ: R$ {entry.price_info.price_pj}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => toggleActive.mutate({ id: entry.id, is_active: entry.is_active === false })}>
                      {entry.is_active !== false ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-400" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(entry)}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm("Remover?")) deleteMutation.mutate(entry.id); }}>
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
            <DialogTitle>{editingEntry ? "Editar Entrada" : "Nova Entrada na Base de Conhecimento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1 md:col-span-2">
                <Label>Título *</Label>
                <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Ex: NR-35 — Trabalho em Altura" />
              </div>
              <div className="space-y-1">
                <Label>Categoria *</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(CATEGORY_COLORS).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Público-Alvo</Label>
                <Select value={form.target_audience} onValueChange={v => setForm({...form, target_audience: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ambos">Ambos (PF e PJ)</SelectItem>
                    <SelectItem value="Pessoa Física">Pessoa Física</SelectItem>
                    <SelectItem value="Pessoa Jurídica">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Conteúdo para a IA *</Label>
                <Textarea
                  value={form.content}
                  onChange={e => setForm({...form, content: e.target.value})}
                  placeholder="Descreva detalhadamente as informações que a IA deve usar para responder sobre este item. Quanto mais completo, melhor a resposta da IA."
                  rows={4}
                />
              </div>

              {/* Preço */}
              <div className="space-y-1">
                <Label>Preço PF (R$)</Label>
                <Input type="number" value={form.price_info?.price_pf || ""} onChange={e => setForm({...form, price_info: {...form.price_info, price_pf: e.target.value}})} placeholder="Ex: 250" />
              </div>
              <div className="space-y-1">
                <Label>Preço PJ por aluno (R$)</Label>
                <Input type="number" value={form.price_info?.price_pj || ""} onChange={e => setForm({...form, price_info: {...form.price_info, price_pj: e.target.value}})} placeholder="Ex: 180" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Obs. de Preço</Label>
                <Input value={form.price_info?.price_notes || ""} onChange={e => setForm({...form, price_info: {...form.price_info, price_notes: e.target.value}})} placeholder="Ex: desconto para grupos acima de 10 alunos" />
              </div>

              {/* Agenda */}
              <div className="space-y-1">
                <Label>Duração</Label>
                <Input value={form.schedule_info?.duration || ""} onChange={e => setForm({...form, schedule_info: {...form.schedule_info, duration: e.target.value}})} placeholder="Ex: 8 horas, 2 dias" />
              </div>
              <div className="space-y-1">
                <Label>Modalidade</Label>
                <Select value={form.schedule_info?.modality || "Presencial"} onValueChange={v => setForm({...form, schedule_info: {...form.schedule_info, modality: v}})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Presencial">Presencial</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="Híbrido">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Local</Label>
                <Input value={form.schedule_info?.location || ""} onChange={e => setForm({...form, schedule_info: {...form.schedule_info, location: e.target.value}})} placeholder="Ex: Barcarena/PA, Belém/PA" />
              </div>

              {/* Próximas datas */}
              <div className="space-y-2 md:col-span-2">
                <Label>Próximas Datas Disponíveis</Label>
                <div className="flex gap-2">
                  <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="flex-1" />
                  <Button type="button" size="sm" variant="outline" onClick={addDate}>Adicionar</Button>
                </div>
                {form.schedule_info?.next_dates?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {form.schedule_info.next_dates.map(d => (
                      <span key={d} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        {d} <button onClick={() => removeDate(d)} className="ml-1 text-blue-400 hover:text-red-500">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Keywords */}
              <div className="space-y-2 md:col-span-2">
                <Label>Palavras-chave (para busca pela IA)</Label>
                <div className="flex gap-2">
                  <Input value={keywordInput} onChange={e => setKeywordInput(e.target.value)} placeholder="Ex: nr35, altura, trabalho em altura" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addKeyword())} />
                  <Button type="button" size="sm" variant="outline" onClick={addKeyword}>Adicionar</Button>
                </div>
                {form.keywords?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {form.keywords.map(kw => (
                      <span key={kw} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" />{kw}
                        <button onClick={() => removeKeyword(kw)} className="ml-1 text-gray-400 hover:text-red-500">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={form.is_active !== false} onCheckedChange={v => setForm({...form, is_active: v})} />
                <Label>Entrada Ativa</Label>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending || !form.title || !form.content}
              >
                {saveMutation.isPending ? "Salvando..." : editingEntry ? "Atualizar" : "Criar Entrada"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}