import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";

const EMPTY_FORM = {
  titulo: "",
  curso_nome: "",
  empresa_nome: "",
  instrutor_nome: "",
  data_inicio: "",
  data_fim: "",
  horario_inicio: "08:00",
  horario_fim: "17:00",
  local: "",
  modalidade: "Presencial",
  status: "Agendado",
  vagas_total: "",
  link_online: "",
  observacoes: "",
  alunos_inscritos: [],
};

export default function AgendaFormModal({ open, onClose, onSave, initialData, companies, instructors, courses }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [novoAluno, setNovoAluno] = useState({ nome: "", email: "", cpf: "", empresa: "" });

  useEffect(() => {
    if (initialData) {
      setForm({ ...EMPTY_FORM, ...initialData });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [initialData, open]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const addAluno = () => {
    if (!novoAluno.nome && !novoAluno.email) return;
    setForm((f) => ({
      ...f,
      alunos_inscritos: [...(f.alunos_inscritos || []), { ...novoAluno, confirmacao_enviada: false }],
    }));
    setNovoAluno({ nome: "", email: "", cpf: "", empresa: "" });
  };

  const removeAluno = (idx) => {
    setForm((f) => ({
      ...f,
      alunos_inscritos: f.alunos_inscritos.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = () => {
    if (!form.titulo || !form.data_inicio) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Título e Curso */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Ex: NR-35 Turma A" />
            </div>
            <div>
              <Label>Curso</Label>
              {courses?.length > 0 ? (
                <Select value={form.curso_nome} onValueChange={(v) => set("curso_nome", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar curso" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.curso_nome} onChange={(e) => set("curso_nome", e.target.value)} placeholder="Nome do curso" />
              )}
            </div>
          </div>

          {/* Empresa e Instrutor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Empresa</Label>
              {companies?.length > 0 ? (
                <Select value={form.empresa_nome} onValueChange={(v) => set("empresa_nome", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar empresa" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => <SelectItem key={c.id} value={c.nome_fantasia || c.razao_social}>{c.nome_fantasia || c.razao_social}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.empresa_nome} onChange={(e) => set("empresa_nome", e.target.value)} placeholder="Nome da empresa" />
              )}
            </div>
            <div>
              <Label>Instrutor</Label>
              {instructors?.length > 0 ? (
                <Select value={form.instrutor_nome} onValueChange={(v) => set("instrutor_nome", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar instrutor" /></SelectTrigger>
                  <SelectContent>
                    {instructors.map((i) => <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.instrutor_nome} onChange={(e) => set("instrutor_nome", e.target.value)} placeholder="Nome do instrutor" />
              )}
            </div>
          </div>

          {/* Datas e horários */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data Início *</Label>
              <Input type="date" value={form.data_inicio} onChange={(e) => set("data_inicio", e.target.value)} />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" value={form.data_fim} onChange={(e) => set("data_fim", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Horário Início</Label>
              <Input type="time" value={form.horario_inicio} onChange={(e) => set("horario_inicio", e.target.value)} />
            </div>
            <div>
              <Label>Horário Fim</Label>
              <Input type="time" value={form.horario_fim} onChange={(e) => set("horario_fim", e.target.value)} />
            </div>
            <div>
              <Label>Vagas</Label>
              <Input type="number" value={form.vagas_total} onChange={(e) => set("vagas_total", e.target.value)} placeholder="Ex: 20" />
            </div>
          </div>

          {/* Local, Modalidade e Status */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Label>Local</Label>
              <Input value={form.local} onChange={(e) => set("local", e.target.value)} placeholder="Endereço ou sala" />
            </div>
            <div>
              <Label>Modalidade</Label>
              <Select value={form.modalidade} onValueChange={(v) => set("modalidade", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Presencial">Presencial</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Híbrido">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agendado">Agendado</SelectItem>
                  <SelectItem value="Confirmado">Confirmado</SelectItem>
                  <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(form.modalidade === "Online" || form.modalidade === "Híbrido") && (
            <div>
              <Label>Link de Acesso Online</Label>
              <Input value={form.link_online} onChange={(e) => set("link_online", e.target.value)} placeholder="https://..." />
            </div>
          )}

          <div>
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} placeholder="Informações adicionais..." rows={2} />
          </div>

          {/* Alunos Inscritos */}
          <div>
            <Label className="text-sm font-semibold">Alunos Inscritos ({(form.alunos_inscritos || []).length})</Label>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {(form.alunos_inscritos || []).map((a, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium">{a.nome || "—"}</span>
                    {a.email && <span className="text-gray-500 ml-2">{a.email}</span>}
                    {a.confirmacao_enviada && <span className="ml-2 text-xs text-green-600">✓ E-mail enviado</span>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeAluno(idx)} className="h-6 w-6">
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              <Input placeholder="Nome" value={novoAluno.nome} onChange={(e) => setNovoAluno((n) => ({ ...n, nome: e.target.value }))} />
              <Input placeholder="E-mail" value={novoAluno.email} onChange={(e) => setNovoAluno((n) => ({ ...n, email: e.target.value }))} />
              <Input placeholder="CPF" value={novoAluno.cpf} onChange={(e) => setNovoAluno((n) => ({ ...n, cpf: e.target.value }))} />
              <Button variant="outline" onClick={addAluno} className="gap-1">
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.titulo || !form.data_inicio}>
            {initialData?.id ? "Salvar Alterações" : "Criar Agendamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}