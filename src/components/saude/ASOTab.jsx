import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Heart, Edit2, Trash2 } from "lucide-react";
import { format } from "date-fns";

const CONCLUSAO_COLORS = {
  "Apto": "bg-green-100 text-green-700",
  "Apto com Restrições": "bg-amber-100 text-amber-700",
  "Inapto Temporário": "bg-orange-100 text-orange-700",
  "Inapto": "bg-red-100 text-red-700",
};

const TIPO_COLORS = {
  "Admissional": "bg-blue-100 text-blue-700",
  "Periódico": "bg-purple-100 text-purple-700",
  "Retorno ao Trabalho": "bg-teal-100 text-teal-700",
  "Mudança de Função": "bg-indigo-100 text-indigo-700",
  "Demissional": "bg-gray-100 text-gray-700",
};

const EMPTY = {
  student_name: "", student_cpf: "", empresa_nome: "", funcao: "", setor: "",
  tipo_aso: "Admissional", data_exame: "", data_validade: "",
  medico_examinador: "", crm_medico: "", conclusao: "Apto",
  restricoes: "", status: "Pendente", observacoes: ""
};

export default function ASOTab() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.ASO.list("-created_date", 200);
    setRecords(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = records.filter(r =>
    r.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.student_cpf?.includes(search) ||
    r.empresa_nome?.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setForm(EMPTY); setEditing(null); setModalOpen(true); };
  const openEdit = (r) => { setForm({ ...r }); setEditing(r.id); setModalOpen(true); };

  const save = async () => {
    setSaving(true);
    if (editing) await base44.entities.ASO.update(editing, form);
    else await base44.entities.ASO.create(form);
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const remove = async (id) => {
    if (!confirm("Excluir este ASO?")) return;
    await base44.entities.ASO.delete(id);
    load();
  };

  const isVencido = (d) => d && new Date(d) < new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar por nome, CPF ou empresa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={openNew} className="gap-1.5 bg-rose-600 hover:bg-rose-700">
          <Plus className="w-4 h-4" />Novo ASO
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum ASO cadastrado</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(r => (
            <Card key={r.id} className={`border ${isVencido(r.data_validade) ? "border-red-200 bg-red-50/30" : "border-gray-200"}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{r.student_name}</h3>
                      <Badge className={`text-xs ${TIPO_COLORS[r.tipo_aso] || "bg-gray-100 text-gray-600"}`}>{r.tipo_aso}</Badge>
                      <Badge className={`text-xs ${CONCLUSAO_COLORS[r.conclusao] || "bg-gray-100 text-gray-600"}`}>{r.conclusao}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{r.empresa_nome}{r.funcao ? ` — ${r.funcao}` : ""}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                      {r.student_cpf && <span>CPF: {r.student_cpf}</span>}
                      {r.medico_examinador && <span>👨‍⚕️ Dr. {r.medico_examinador}</span>}
                      {r.data_exame && <span>📅 Exame: {format(new Date(r.data_exame), "dd/MM/yyyy")}</span>}
                      {r.data_validade && (
                        <span className={isVencido(r.data_validade) ? "text-red-600 font-medium" : "text-green-700"}>
                          {isVencido(r.data_validade) ? "⚠ Vencido: " : "✅ Válido até: "}
                          {format(new Date(r.data_validade), "dd/MM/yyyy")}
                        </span>
                      )}
                    </div>
                    {r.restricoes && <p className="text-xs text-amber-700 mt-1">⚠ Restrição: {r.restricoes}</p>}
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
            <DialogTitle>{editing ? "Editar ASO" : "Novo ASO"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {[
              ["Nome do Colaborador *", "student_name", "text"],
              ["CPF *", "student_cpf", "text"],
              ["Empresa *", "empresa_nome", "text"],
              ["Função/Cargo", "funcao", "text"],
              ["Setor", "setor", "text"],
              ["Médico Examinador", "medico_examinador", "text"],
              ["CRM do Médico", "crm_medico", "text"],
              ["Data do Exame", "data_exame", "date"],
              ["Data de Validade", "data_validade", "date"],
            ].map(([label, key, type]) => (
              <div key={key}>
                <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
                <Input type={type} value={form[key] || ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Tipo de ASO</label>
              <select value={form.tipo_aso} onChange={e => setForm(f => ({ ...f, tipo_aso: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {["Admissional", "Periódico", "Retorno ao Trabalho", "Mudança de Função", "Demissional"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Conclusão</label>
              <select value={form.conclusao} onChange={e => setForm(f => ({ ...f, conclusao: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {["Apto", "Apto com Restrições", "Inapto Temporário", "Inapto"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            {form.conclusao === "Apto com Restrições" && (
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Restrições</label>
                <Input value={form.restricoes || ""} onChange={e => setForm(f => ({ ...f, restricoes: e.target.value }))} />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {["Pendente", "Realizado", "Vencido", "Cancelado"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Observações</label>
              <textarea rows={2} value={form.observacoes || ""} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.student_name || !form.student_cpf || !form.empresa_nome} className="bg-rose-600 hover:bg-rose-700">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}