import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import { logVenda } from "@/lib/auditVendas";
import { FORMAS_PAGAMENTO, STATUS_OFERTA } from "./OfertaFormModal";

const EMPTY = {
  nome: "", descricao: "", cursos: [], valor_total: "", desconto: "0", valor_final: "",
  formas_pagamento: [], vagas_total: "", data_inicio_geral: "", data_termino_geral: "",
  status: "Aberta", observacoes: "",
};

export default function PacoteFormModal({ open, onClose, pacote, onSaved }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [cursoAdd, setCursoAdd] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => base44.entities.Course.list("-name", 200),
  });

  useEffect(() => {
    if (open) setForm(pacote ? { ...EMPTY, ...pacote, desconto: String(pacote.desconto ?? 0), valor_total: String(pacote.valor_total ?? ""), valor_final: String(pacote.valor_final ?? ""), vagas_total: String(pacote.vagas_total ?? "") } : EMPTY);
  }, [open, pacote]);

  const set = (f, v) => setForm(s => ({ ...s, [f]: v }));

  const valorFinal = Math.max(0, (parseFloat(form.valor_total) || 0) - (parseFloat(form.desconto) || 0));

  const addCurso = () => {
    const c = courses.find(x => x.id === cursoAdd);
    if (!c) return;
    if (form.cursos.some(x => x.course_id === c.id)) { toast.error("Curso já incluído no pacote."); return; }
    set("cursos", [...form.cursos, { course_id: c.id, course_name: c.name, carga_horaria: c.carga_horaria || "", data_inicio: "", data_termino: "" }]);
    setCursoAdd("");
  };

  const setCurso = (i, f, v) => {
    const arr = [...form.cursos];
    arr[i] = { ...arr[i], [f]: v };
    set("cursos", arr);
  };

  const toggleForma = (fp) =>
    set("formas_pagamento", form.formas_pagamento.includes(fp)
      ? form.formas_pagamento.filter(x => x !== fp)
      : [...form.formas_pagamento, fp]);

  const handleSalvar = async () => {
    if (!form.nome.trim()) { toast.error("Informe o nome do pacote."); return; }
    if (form.cursos.length < 1) { toast.error("Inclua ao menos um curso no pacote."); return; }
    for (const c of form.cursos) {
      if (!c.data_inicio || !c.data_termino) { toast.error(`Informe o período do curso "${c.course_name}" — cada curso do pacote deve ter suas próprias datas.`); return; }
      if (c.data_inicio > c.data_termino) { toast.error(`Curso "${c.course_name}": a data de início não pode ser posterior à data de término.`); return; }
    }
    if (!form.valor_total) { toast.error("Informe o valor total do pacote."); return; }
    if (!form.vagas_total || parseInt(form.vagas_total) <= 0) { toast.error("Informe a quantidade de vagas."); return; }
    if (form.formas_pagamento.length === 0) { toast.error("Selecione ao menos uma forma de pagamento."); return; }

    const inicios = form.cursos.map(c => c.data_inicio).sort();
    const fins = form.cursos.map(c => c.data_termino).sort();

    setSaving(true);
    try {
      const data = {
        ...form,
        valor_total: parseFloat(form.valor_total),
        desconto: parseFloat(form.desconto) || 0,
        valor_final: valorFinal,
        vagas_total: parseInt(form.vagas_total),
        vagas_preenchidas: pacote?.vagas_preenchidas || 0,
        data_inicio_geral: form.data_inicio_geral || inicios[0],
        data_termino_geral: form.data_termino_geral || fins[fins.length - 1],
      };
      if (pacote?.id) {
        await base44.entities.CoursePackage.update(pacote.id, data);
        await logVenda("update", { entity_type: "CoursePackage", entity_id: pacote.id, entity_name: form.nome, details: `FASE 1 Vendas: pacote alterado (${form.cursos.length} cursos, valor final R$ ${valorFinal}, vagas ${data.vagas_total}, status ${form.status})` });
        toast.success("Pacote atualizado!");
      } else {
        const created = await base44.entities.CoursePackage.create(data);
        await logVenda("create", { entity_type: "CoursePackage", entity_id: created.id, entity_name: form.nome, details: `FASE 1 Vendas: pacote criado (cursos: ${form.cursos.map(c => c.course_name).join(", ")}; valor final R$ ${valorFinal}; vagas ${data.vagas_total})` });
        toast.success("Pacote criado!");
      }
      queryClient.invalidateQueries({ queryKey: ["course-packages"] });
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error("Erro ao salvar pacote: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Package className="w-5 h-5" /> {pacote ? "Editar Pacote" : "Novo Pacote de Cursos"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label>Nome do Pacote *</Label>
              <Input value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Ex: Pacote Operador de Máquinas" />
            </div>
            <div className="sm:col-span-2">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={e => set("descricao", e.target.value)} />
            </div>
          </div>

          {/* Cursos incluídos, cada um com seu período */}
          <div className="border rounded-md p-3 space-y-2 bg-gray-50">
            <Label className="text-xs uppercase tracking-wide text-gray-500">Cursos Incluídos (cada curso com seu próprio período) *</Label>
            {form.cursos.map((c, i) => (
              <div key={c.course_id} className="bg-white border rounded-md p-2.5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-800">{i + 1}. {c.course_name} {c.carga_horaria && <span className="text-xs text-gray-400 font-normal">({c.carga_horaria})</span>}</p>
                  <button onClick={() => set("cursos", form.cursos.filter((_, x) => x !== i))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Início *</Label>
                    <Input type="date" value={c.data_inicio} onChange={e => setCurso(i, "data_inicio", e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Término *</Label>
                    <Input type="date" value={c.data_termino} onChange={e => setCurso(i, "data_termino", e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Select value={cursoAdd} onValueChange={setCursoAdd}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Selecionar curso para incluir..." /></SelectTrigger>
                <SelectContent>
                  {courses.filter(c => !form.cursos.some(x => x.course_id === c.id)).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={addCurso} disabled={!cursoAdd}><Plus className="w-4 h-4 mr-1" /> Incluir</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label>Valor Total (R$) *</Label>
              <Input type="number" min="0" step="0.01" value={form.valor_total} onChange={e => set("valor_total", e.target.value)} />
            </div>
            <div>
              <Label>Desconto (R$)</Label>
              <Input type="number" min="0" step="0.01" value={form.desconto} onChange={e => set("desconto", e.target.value)} />
            </div>
            <div>
              <Label>Valor Final</Label>
              <div className="h-9 px-3 flex items-center border rounded-md bg-emerald-50 text-emerald-800 font-bold text-sm">
                R$ {valorFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <Label>Vagas *</Label>
              <Input type="number" min="1" value={form.vagas_total} onChange={e => set("vagas_total", e.target.value)} />
            </div>
            <div>
              <Label>Início Geral</Label>
              <Input type="date" value={form.data_inicio_geral} onChange={e => set("data_inicio_geral", e.target.value)} />
            </div>
            <div>
              <Label>Término Geral</Label>
              <Input type="date" value={form.data_termino_geral} onChange={e => set("data_termino_geral", e.target.value)} />
            </div>
            <div className="col-span-2">
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
              {saving ? "Salvando..." : "Salvar Pacote"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}