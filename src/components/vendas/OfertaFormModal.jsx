import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { logVenda } from "@/lib/auditVendas";
import NovoCursoBaseDialog from "./NovoCursoBaseDialog";

export const FORMAS_PAGAMENTO = ["Pix", "Boleto", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Transferência Bancária", "Cortesia"];
export const STATUS_OFERTA = ["Aberta", "Em divulgação", "Esgotada", "Encerrada", "Cancelada"];

const EMPTY = {
  course_id: "", course_name: "", nome_comercial: "", carga_horaria: "", valor: "",
  formas_pagamento: [], vagas_total: "", data_inicio: "", data_termino: "",
  horario: "", local: "", modalidade: "", status: "Aberta", observacoes: "",
};

export default function OfertaFormModal({ open, onClose, oferta, onSaved }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [novoCursoOpen, setNovoCursoOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => base44.entities.Course.list("-name", 200),
  });

  useEffect(() => {
    if (open) setForm(oferta ? { ...EMPTY, ...oferta } : EMPTY);
  }, [open, oferta]);

  const set = (f, v) => setForm(s => ({ ...s, [f]: v }));

  const toggleForma = (fp) =>
    set("formas_pagamento", form.formas_pagamento.includes(fp)
      ? form.formas_pagamento.filter(x => x !== fp)
      : [...form.formas_pagamento, fp]);

  const handleCursoSelecionado = (c) => {
    setForm(s => ({
      ...s, course_id: c.id, course_name: c.name,
      carga_horaria: s.carga_horaria || c.carga_horaria || "",
      modalidade: s.modalidade || c.modalidade || "",
      nome_comercial: s.nome_comercial || `${c.name} — Turma Aberta Comunidade`,
    }));
  };

  const handleSalvar = async () => {
    if (!form.course_id) { toast.error("Vincule um curso base à oferta."); return; }
    if (!form.nome_comercial.trim()) { toast.error("Informe o nome comercial da oferta."); return; }
    if (!form.data_inicio || !form.data_termino) { toast.error("Informe as datas de início e término — elas alimentam a Certificação."); return; }
    if (form.data_inicio > form.data_termino) { toast.error("A data de início não pode ser posterior à data de término."); return; }
    if (!form.valor || parseFloat(form.valor) < 0) { toast.error("Informe o valor da oferta."); return; }
    if (!form.vagas_total || parseInt(form.vagas_total) <= 0) { toast.error("Informe a quantidade de vagas."); return; }
    if (form.formas_pagamento.length === 0) { toast.error("Selecione ao menos uma forma de pagamento."); return; }

    setSaving(true);
    try {
      const data = {
        ...form,
        valor: parseFloat(form.valor),
        vagas_total: parseInt(form.vagas_total),
        vagas_preenchidas: oferta?.vagas_preenchidas || 0,
      };
      if (oferta?.id) {
        await base44.entities.CourseOffer.update(oferta.id, data);
        await logVenda("update", { entity_type: "CourseOffer", entity_id: oferta.id, entity_name: form.nome_comercial, details: `FASE 1 Vendas: oferta alterada (valor R$ ${data.valor}, vagas ${data.vagas_total}, ${form.data_inicio} → ${form.data_termino}, status ${form.status})` });
        toast.success("Oferta atualizada!");
      } else {
        const created = await base44.entities.CourseOffer.create(data);
        await logVenda("create", { entity_type: "CourseOffer", entity_id: created.id, entity_name: form.nome_comercial, details: `FASE 1 Vendas: oferta para comunidade criada (curso: ${form.course_name}, valor R$ ${data.valor}, vagas ${data.vagas_total}, ${form.data_inicio} → ${form.data_termino})` });
        toast.success("Oferta criada!");
      }
      queryClient.invalidateQueries({ queryKey: ["course-offers"] });
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error("Erro ao salvar oferta: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <NovoCursoBaseDialog
        open={novoCursoOpen}
        onClose={() => setNovoCursoOpen(false)}
        existingCourses={courses}
        onSelected={(c) => { queryClient.invalidateQueries({ queryKey: ["courses"] }); handleCursoSelecionado(c); }}
      />
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{oferta ? "Editar Oferta" : "Nova Oferta para Comunidade"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Curso Base *</Label>
                <button className="text-xs text-blue-700 underline flex items-center gap-1" onClick={() => setNovoCursoOpen(true)}>
                  <Plus className="w-3 h-3" /> Criar novo curso
                </button>
              </div>
              <Select value={form.course_id} onValueChange={id => { const c = courses.find(x => x.id === id); if (c) handleCursoSelecionado(c); }}>
                <SelectTrigger><SelectValue placeholder="Buscar curso existente..." /></SelectTrigger>
                <SelectContent>
                  {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome Comercial da Oferta *</Label>
              <Input value={form.nome_comercial} onChange={e => set("nome_comercial", e.target.value)} placeholder="Ex: NR-35 — Turma Aberta Comunidade — Setembro 2026" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <Label>Valor (R$) *</Label>
                <Input type="number" min="0" step="0.01" value={form.valor} onChange={e => set("valor", e.target.value)} />
              </div>
              <div>
                <Label>Vagas *</Label>
                <Input type="number" min="1" value={form.vagas_total} onChange={e => set("vagas_total", e.target.value)} />
              </div>
              <div>
                <Label>Carga Horária</Label>
                <Input value={form.carga_horaria} onChange={e => set("carga_horaria", e.target.value)} placeholder="8h" />
              </div>
              <div>
                <Label>Data Início *</Label>
                <Input type="date" value={form.data_inicio} onChange={e => set("data_inicio", e.target.value)} />
              </div>
              <div>
                <Label>Data Término *</Label>
                <Input type="date" value={form.data_termino} onChange={e => set("data_termino", e.target.value)} />
              </div>
              <div>
                <Label>Horário</Label>
                <Input value={form.horario} onChange={e => set("horario", e.target.value)} placeholder="08:00 às 17:00" />
              </div>
              <div>
                <Label>Local</Label>
                <Input value={form.local} onChange={e => set("local", e.target.value)} />
              </div>
              <div>
                <Label>Modalidade</Label>
                <Select value={form.modalidade} onValueChange={v => set("modalidade", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Presencial">Presencial</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="Híbrido">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OFERTA.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Formas de Pagamento Aceitas *</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {FORMAS_PAGAMENTO.map(fp => (
                  <button
                    key={fp}
                    type="button"
                    onClick={() => toggleForma(fp)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${form.formas_pagamento.includes(fp) ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"}`}
                  >
                    {fp}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={form.observacoes} onChange={e => set("observacoes", e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button className="bg-gray-900 hover:bg-gray-800" onClick={handleSalvar} disabled={saving}>
                {saving ? "Salvando..." : "Salvar Oferta"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}