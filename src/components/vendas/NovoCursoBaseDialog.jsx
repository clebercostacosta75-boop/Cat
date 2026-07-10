import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { logVenda } from "@/lib/auditVendas";

const norm = (v) => (v || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "").trim();

const EMPTY = { name: "", description: "", carga_horaria: "", modalidade: "", categoria: "", validity: "", conteudo_programatico: "", status: "Ativo", observacao: "" };

/**
 * Cadastro de curso base com verificação de duplicidade.
 * onSelected(course) é chamado tanto ao usar curso existente quanto ao criar novo.
 */
export default function NovoCursoBaseDialog({ open, onClose, existingCourses = [], initialName = "", onSelected }) {
  const [form, setForm] = useState(EMPTY);
  const [similares, setSimilares] = useState(null); // null = ainda não verificado
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setForm({ ...EMPTY, name: initialName }); setSimilares(null); }
  }, [open, initialName]);

  const set = (f, v) => setForm(s => ({ ...s, [f]: v }));

  const buscarSimilares = () =>
    existingCourses.filter(c => {
      const a = norm(c.name), b = norm(form.name);
      return a && b && (a.includes(b) || b.includes(a));
    });

  const criarCurso = async () => {
    setSaving(true);
    try {
      const created = await base44.entities.Course.create(form);
      await logVenda("create", {
        entity_type: "Course", entity_id: created.id, entity_name: form.name,
        details: `FASE 1 Vendas: curso base novo criado (carga: ${form.carga_horaria || "—"}, modalidade: ${form.modalidade || "—"}, categoria: ${form.categoria || "—"})`,
      });
      toast.success("Curso criado!");
      onSelected(created);
      onClose();
    } catch (e) {
      toast.error("Erro ao criar curso: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSalvar = () => {
    if (!form.name.trim()) { toast.error("Informe o nome do curso."); return; }
    const sim = buscarSimilares();
    if (sim.length > 0 && similares === null) { setSimilares(sim); return; }
    criarCurso();
  };

  const usarExistente = async (course) => {
    await logVenda("view", {
      entity_type: "Course", entity_id: course.id, entity_name: course.name,
      details: "FASE 1 Vendas: curso existente reutilizado (duplicidade evitada)",
    });
    onSelected(course);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo Curso Base</DialogTitle></DialogHeader>

        {similares !== null && similares.length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-md space-y-2">
            <p className="text-sm font-semibold text-yellow-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Curso semelhante encontrado. Deseja usar o curso existente?
            </p>
            {similares.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-white border rounded px-3 py-2">
                <span className="text-sm text-gray-800">{c.name}</span>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => usarExistente(c)}>Usar existente</Button>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="bg-gray-900 hover:bg-gray-800 text-xs" onClick={criarCurso} disabled={saving}>Criar novo curso mesmo assim</Button>
              <Button size="sm" variant="outline" className="text-xs" onClick={onClose}>Cancelar</Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Label>Nome do Curso *</Label>
            <Input value={form.name} onChange={e => { set("name", e.target.value); setSimilares(null); }} />
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição</Label>
            <Input value={form.description} onChange={e => set("description", e.target.value)} />
          </div>
          <div>
            <Label>Carga Horária</Label>
            <Input value={form.carga_horaria} onChange={e => set("carga_horaria", e.target.value)} placeholder="Ex: 8h" />
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
            <Label>Categoria</Label>
            <Input value={form.categoria} onChange={e => set("categoria", e.target.value)} placeholder="Ex: Norma Regulamentadora" />
          </div>
          <div>
            <Label>Validade do Certificado</Label>
            <Input value={form.validity} onChange={e => set("validity", e.target.value)} placeholder="Ex: 12 meses" />
          </div>
          <div className="sm:col-span-2">
            <Label>Conteúdo Programático</Label>
            <Textarea rows={3} value={form.conteudo_programatico} onChange={e => set("conteudo_programatico", e.target.value)} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observação</Label>
            <Input value={form.observacao} onChange={e => set("observacao", e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-gray-900 hover:bg-gray-800" onClick={handleSalvar} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Curso"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}