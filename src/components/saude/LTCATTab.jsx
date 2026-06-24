import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, ClipboardList, Edit2, Trash2 } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS = {
  "Em Vigor": "bg-green-100 text-green-700",
  "Elaboração": "bg-blue-100 text-blue-700",
  "Em Revisão": "bg-amber-100 text-amber-700",
  "Vencido": "bg-red-100 text-red-700",
  "Cancelado": "bg-gray-100 text-gray-600",
};

const EMPTY = {
  titulo: "", empresa_nome: "", unidade: "", responsavel_tecnico: "",
  crea_crm: "", data_elaboracao: "", data_validade: "", versao: "1.0",
  status: "Elaboração", conclusao_geral: "", observacoes: ""
};

export default function LTCATTab() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.LTCAT.list("-created_date", 100);
    setRecords(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = records.filter(r =>
    r.titulo?.toLowerCase().includes(search.toLowerCase()) ||
    r.empresa_nome?.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setForm(EMPTY); setEditing(null); setModalOpen(true); };
  const openEdit = (r) => { setForm({ ...r }); setEditing(r.id); setModalOpen(true); };

  const save = async () => {
    setSaving(true);
    if (editing) await base44.entities.LTCAT.update(editing, form);
    else await base44.entities.LTCAT.create(form);
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const remove = async (id) => {
    if (!confirm("Excluir este LTCAT?")) return;
    await base44.entities.LTCAT.delete(id);
    load();
  };

  const isVencido = (d) => d && new Date(d) < new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar LTCAT..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={openNew} className="gap-1.5 bg-rose-600 hover:bg-rose-700">
          <Plus className="w-4 h-4" />Novo LTCAT
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum LTCAT cadastrado</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(r => (
            <Card key={r.id} className={`border ${isVencido(r.data_validade) ? "border-red-200 bg-red-50/30" : "border-gray-200"}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">{r.titulo}</h3>
                      <Badge className={`text-xs ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-600"}`}>{r.status}</Badge>
                      {r.versao && <Badge className="text-xs bg-gray-100 text-gray-600">v{r.versao}</Badge>}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{r.empresa_nome}{r.unidade ? ` — ${r.unidade}` : ""}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                      {r.responsavel_tecnico && <span>👤 {r.responsavel_tecnico}</span>}
                      {r.crea_crm && <span>CREA/CRM: {r.crea_crm}</span>}
                      {r.data_elaboracao && <span>📅 {format(new Date(r.data_elaboracao), "dd/MM/yyyy")}</span>}
                      {r.data_validade && (
                        <span className={isVencido(r.data_validade) ? "text-red-600 font-medium" : ""}>
                          {isVencido(r.data_validade) ? "⚠ Vencido: " : "✅ Válido até: "}
                          {format(new Date(r.data_validade), "dd/MM/yyyy")}
                        </span>
                      )}
                    </div>
                    {r.conclusao_geral && <p className="text-xs text-gray-500 mt-1 italic">{r.conclusao_geral}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Edit2 className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(r.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar LTCAT" : "Novo LTCAT"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {[
              ["Título *", "titulo", "text"],
              ["Empresa *", "empresa_nome", "text"],
              ["Unidade/Setor", "unidade", "text"],
              ["Responsável Técnico", "responsavel_tecnico", "text"],
              ["CREA/CRM", "crea_crm", "text"],
              ["Versão", "versao", "text"],
              ["Data Elaboração", "data_elaboracao", "date"],
              ["Data Validade", "data_validade", "date"],
            ].map(([label, key, type]) => (
              <div key={key}>
                <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
                <Input type={type} value={form[key] || ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {["Elaboração", "Em Vigor", "Em Revisão", "Vencido", "Cancelado"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Conclusão Geral</label>
              <textarea rows={2} value={form.conclusao_geral || ""} onChange={e => setForm(f => ({ ...f, conclusao_geral: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Observações</label>
              <textarea rows={2} value={form.observacoes || ""} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.titulo || !form.empresa_nome} className="bg-rose-600 hover:bg-rose-700">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}