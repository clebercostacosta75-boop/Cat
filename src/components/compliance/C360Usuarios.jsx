import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit2, Lock } from "lucide-react";

const PERFIL_COLORS = {
  "Gestor Master": "bg-purple-100 text-purple-700",
  "RH": "bg-blue-100 text-blue-700",
  "SST": "bg-orange-100 text-orange-700",
  "Médico do Trabalho": "bg-green-100 text-green-700",
  "Financeiro": "bg-yellow-100 text-yellow-700",
  "Visualizador": "bg-gray-100 text-gray-600",
};

const PERFIS = ["Gestor Master", "RH", "SST", "Médico do Trabalho", "Financeiro", "Visualizador"];
const EMPTY = { nome: "", email: "", perfil: "Visualizador", ativo: true };

export default function C360Usuarios({ empresa, usuariosEmp, reload }) {
  const [usuarios, setUsuarios] = useState(usuariosEmp || []);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Simula perfil atual — em produção viria do auth
  const perfilAtual = "Gestor Master";

  if (perfilAtual !== "Gestor Master") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock className="w-10 h-10 text-gray-300 mb-3" />
        <p className="font-medium text-gray-600">Acesso restrito</p>
        <p className="text-sm text-gray-400">Apenas o Gestor Master pode gerenciar usuários.</p>
      </div>
    );
  }

  const openNew = () => { setForm(EMPTY); setEditingId(null); setModalOpen(true); };
  const openEdit = (u) => { setForm({ nome: u.nome, email: u.email, perfil: u.perfil, ativo: u.ativo }); setEditingId(u.id); setModalOpen(true); };

  const save = async () => {
    setSaving(true);
    const payload = {
      ...form,
      empresa_mestre_id: empresa.id,
      empresa_mestre_nome: empresa.razao_social,
      data_criacao: new Date().toISOString().split("T")[0]
    };
    let updated;
    if (editingId) {
      await base44.entities.UsuarioEmpresa.update(editingId, payload);
      updated = usuarios.map(u => u.id === editingId ? { ...u, ...payload } : u);
    } else {
      const novo = await base44.entities.UsuarioEmpresa.create(payload);
      updated = [...usuarios, novo];
    }
    setUsuarios(updated);
    setSaving(false);
    setModalOpen(false);
  };

  const toggleAtivo = async (u) => {
    await base44.entities.UsuarioEmpresa.update(u.id, { ativo: !u.ativo });
    setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, ativo: !x.ativo } : x));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{usuarios.length} usuário(s) cadastrado(s)</p>
        <Button onClick={openNew} className="bg-rose-600 hover:bg-rose-700 gap-1.5">
          <Plus className="w-4 h-4" /> Novo Usuário
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
          <thead><tr className="bg-gray-50 border-b">
            <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Perfil</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Ativo</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Último Acesso</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
          </tr></thead>
          <tbody>
            {usuarios.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">Nenhum usuário cadastrado</td></tr> :
              usuarios.map(u => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.nome}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3"><Badge className={`text-xs ${PERFIL_COLORS[u.perfil] || "bg-gray-100 text-gray-600"}`}>{u.perfil}</Badge></td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleAtivo(u)} className={`w-10 h-5 rounded-full transition-colors relative ${u.ativo ? "bg-green-500" : "bg-gray-300"}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${u.ativo ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.ultimo_acesso || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(u)}><Edit2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Editar Usuário" : "Novo Usuário"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            {[["Nome *","nome"],["Email *","email"]].map(([label, k]) => (
              <div key={k}>
                <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
                <Input value={form[k] || ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Perfil</label>
              <select value={form.perfil} onChange={e => setForm(f => ({ ...f, perfil: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {PERFIS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ativo" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} />
              <label htmlFor="ativo" className="text-sm text-gray-700">Usuário Ativo</label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.nome || !form.email} className="bg-rose-600 hover:bg-rose-700">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}