import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Edit2 } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";

const CA_COLORS = {
  "Válido": "bg-green-100 text-green-700",
  "Vencendo": "bg-yellow-100 text-yellow-700",
  "Vencido": "bg-red-100 text-red-700",
  "Não Informado": "bg-gray-100 text-gray-600",
};

const EMPTY = {
  nome_epi: "", nome_personalizado: "", tipo_esocial: "", numero_ca: "", fabricante: "",
  cnpj_fabricante: "", marca: "", modelo: "", tamanho: "", unidade_medida: "",
  data_emissao_ca: "", data_validade_ca: "", situacao_ca: "Válido", numero_processo: "",
  numero_laudo: "", laboratorio: "", natureza: "Nacional", restricoes_uso: "",
  riscos_protegidos: "", status: "Ativo", empresa_mestre_id: "", empresa_mestre_nome: ""
};

export default function EPICadastroTab({ epis, empresas, reload }) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const getSituacaoCa = (data_validade) => {
    if (!data_validade) return "Não Informado";
    const d = differenceInDays(parseISO(data_validade), new Date());
    if (d < 0) return "Vencido";
    if (d <= 90) return "Vencendo";
    return "Válido";
  };

  const filtered = epis.filter(e =>
    e.nome_epi?.toLowerCase().includes(search.toLowerCase()) ||
    e.numero_ca?.includes(search) ||
    e.fabricante?.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setForm(EMPTY); setEditingId(null); setModalOpen(true); };
  const openEdit = (r) => { setForm({ ...r }); setEditingId(r.id); setModalOpen(true); };

  const save = async () => {
    setSaving(true);
    const payload = { ...form };
    if (payload.empresa_mestre_id) {
      const emp = empresas.find(e => e.id === payload.empresa_mestre_id);
      payload.empresa_mestre_nome = emp?.razao_social || "";
    }
    if (editingId) await base44.entities.EPICadastro.update(editingId, payload);
    else await base44.entities.EPICadastro.create(payload);
    setSaving(false);
    setModalOpen(false);
    reload();
  };

  const F = ({ label, k, type = "text" }) => (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      <Input type={type} value={form[k] || ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
    </div>
  );

  const Sel = ({ label, k, opts }) => (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      <select value={form[k] || ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
        {opts.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar EPI, CA, fabricante..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={openNew} className="bg-rose-600 hover:bg-rose-700 gap-1.5">
          <Plus className="w-4 h-4" /> Novo EPI
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
          <thead><tr className="bg-gray-50 border-b">
            <th className="text-left px-4 py-3 font-medium text-gray-600">Nome EPI</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">CA</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Fabricante</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Validade CA</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Situação CA</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Nenhum EPI cadastrado</td></tr>
            ) : filtered.map(r => {
              const situacao = getSituacaoCa(r.data_validade_ca);
              return (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.nome_epi}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.numero_ca || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{r.fabricante || "—"}</td>
                  <td className={`px-4 py-3 ${situacao === "Vencido" ? "text-red-600 font-medium" : situacao === "Vencendo" ? "text-yellow-600" : ""}`}>
                    {r.data_validade_ca ? format(parseISO(r.data_validade_ca), "dd/MM/yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3"><Badge className={`text-xs ${CA_COLORS[situacao] || ""}`}>{situacao}</Badge></td>
                  <td className="px-4 py-3"><Badge className={`text-xs ${r.status === "Ativo" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{r.status}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Edit2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar EPI" : "Novo EPI"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <F label="Nome do EPI *" k="nome_epi" />
            <F label="Nome Personalizado" k="nome_personalizado" />
            <F label="Tipo eSocial" k="tipo_esocial" />
            <F label="Nº CA" k="numero_ca" />
            <F label="Fabricante" k="fabricante" />
            <F label="CNPJ Fabricante" k="cnpj_fabricante" />
            <F label="Marca" k="marca" />
            <F label="Modelo" k="modelo" />
            <F label="Tamanho" k="tamanho" />
            <F label="Unidade de Medida" k="unidade_medida" />
            <F label="Data Emissão CA" k="data_emissao_ca" type="date" />
            <F label="Data Validade CA" k="data_validade_ca" type="date" />
            <Sel label="Situação CA" k="situacao_ca" opts={["Válido","Vencendo","Vencido","Não Informado"]} />
            <Sel label="Natureza" k="natureza" opts={["Nacional","Importado"]} />
            <F label="Nº Processo" k="numero_processo" />
            <F label="Nº Laudo" k="numero_laudo" />
            <F label="Laboratório" k="laboratorio" />
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Empresa</label>
              <select value={form.empresa_mestre_id || ""} onChange={e => setForm(f => ({ ...f, empresa_mestre_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Geral (todas)</option>
                {empresas.map(em => <option key={em.id} value={em.id}>{em.razao_social}</option>)}
              </select>
            </div>
            <Sel label="Status" k="status" opts={["Ativo","Inativo"]} />
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Riscos Protegidos</label>
              <textarea rows={2} value={form.riscos_protegidos || ""} onChange={e => setForm(f => ({ ...f, riscos_protegidos: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Restrições de Uso</label>
              <textarea rows={2} value={form.restricoes_uso || ""} onChange={e => setForm(f => ({ ...f, restricoes_uso: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.nome_epi} className="bg-rose-600 hover:bg-rose-700">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}