import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Microscope, Edit2, Trash2 } from "lucide-react";

const CATEGORIA_COLORS = {
  "Clínico": "bg-blue-100 text-blue-700",
  "Laboratorial": "bg-green-100 text-green-700",
  "Audiométrico": "bg-purple-100 text-purple-700",
  "Oftalmológico": "bg-teal-100 text-teal-700",
  "Radiológico": "bg-orange-100 text-orange-700",
  "Psicológico": "bg-pink-100 text-pink-700",
  "Outro": "bg-gray-100 text-gray-600",
};

const EMPTY = {
  nome: "", codigo: "", categoria: "Clínico", descricao: "",
  periodicidade_padrao_meses: 12, nr_referencia: "NR-7",
  preparo_necessario: "", ativo: true, observacoes: ""
};

export default function ExamesTab() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.ExameOcupacional.list("nome", 200);
    setRecords(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = records.filter(r =>
    r.nome?.toLowerCase().includes(search.toLowerCase()) ||
    r.categoria?.toLowerCase().includes(search.toLowerCase()) ||
    r.nr_referencia?.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setForm(EMPTY); setEditing(null); setModalOpen(true); };
  const openEdit = (r) => { setForm({ ...r }); setEditing(r.id); setModalOpen(true); };

  const save = async () => {
    setSaving(true);
    if (editing) await base44.entities.ExameOcupacional.update(editing, form);
    else await base44.entities.ExameOcupacional.create(form);
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const remove = async (id) => {
    if (!confirm("Excluir este exame?")) return;
    await base44.entities.ExameOcupacional.delete(id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar exame..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={openNew} className="gap-1.5 bg-rose-600 hover:bg-rose-700">
          <Plus className="w-4 h-4" />Novo Exame
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border">
          <Microscope className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum exame cadastrado</p>
          <p className="text-gray-400 text-sm mt-1">Cadastre os exames ocupacionais do catálogo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(r => (
            <Card key={r.id} className={`border ${r.ativo === false ? "opacity-60 border-gray-200" : "border-gray-200"}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-900 text-sm truncate">{r.nome}</span>
                      {r.ativo === false && <Badge className="text-xs bg-gray-100 text-gray-500">Inativo</Badge>}
                    </div>
                    <Badge className={`text-xs mb-2 ${CATEGORIA_COLORS[r.categoria] || "bg-gray-100 text-gray-600"}`}>{r.categoria}</Badge>
                    {r.descricao && <p className="text-xs text-gray-500 line-clamp-2 mt-1">{r.descricao}</p>}
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                      {r.periodicidade_padrao_meses && <span>⏱ {r.periodicidade_padrao_meses}m</span>}
                      {r.nr_referencia && <span className="font-mono">{r.nr_referencia}</span>}
                    </div>
                    {r.preparo_necessario && <p className="text-xs text-blue-600 mt-1">📋 {r.preparo_necessario}</p>}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)}><Edit2 className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => remove(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Exame" : "Novo Exame Ocupacional"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Nome *</label>
              <Input value={form.nome || ""} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Código</label>
              <Input value={form.codigo || ""} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Categoria *</label>
              <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {["Clínico", "Laboratorial", "Audiométrico", "Oftalmológico", "Radiológico", "Psicológico", "Outro"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">NR de Referência</label>
              <Input value={form.nr_referencia || ""} onChange={e => setForm(f => ({ ...f, nr_referencia: e.target.value }))} placeholder="ex: NR-7" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Periodicidade (meses)</label>
              <Input type="number" value={form.periodicidade_padrao_meses || 12} onChange={e => setForm(f => ({ ...f, periodicidade_padrao_meses: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Descrição</label>
              <textarea rows={2} value={form.descricao || ""} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Preparo Necessário</label>
              <Input value={form.preparo_necessario || ""} onChange={e => setForm(f => ({ ...f, preparo_necessario: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ativo" checked={form.ativo !== false} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} />
              <label htmlFor="ativo" className="text-sm text-gray-700">Ativo</label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.nome || !form.categoria} className="bg-rose-600 hover:bg-rose-700">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}