import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, AlertTriangle } from "lucide-react";

const ESTOQUE_COLORS = {
  "Normal": "bg-green-100 text-green-700",
  "Baixo": "bg-yellow-100 text-yellow-700",
  "Crítico": "bg-orange-100 text-orange-700",
  "Zerado": "bg-red-100 text-red-700",
};

const EMPTY = {
  empresa_mestre_id: "", empresa_mestre_nome: "", epi_cadastro_id: "", epi_nome: "", epi_ca: "",
  unidade: "un", quantidade_disponivel: "", quantidade_minima: "", quantidade_entregue: "",
  data_entrada: "", local_armazenamento: "", responsavel_estoque: "", status_estoque: "Normal"
};

export default function EPIEstoqueTab({ estoques, empresas, epis, reload }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const calcStatus = (disponivel, minimo) => {
    if (!disponivel || disponivel <= 0) return "Zerado";
    if (minimo && disponivel < minimo * 0.5) return "Crítico";
    if (minimo && disponivel < minimo) return "Baixo";
    return "Normal";
  };

  const save = async () => {
    setSaving(true);
    const disp = parseInt(form.quantidade_disponivel) || 0;
    const min = parseInt(form.quantidade_minima) || 0;
    const payload = {
      ...form,
      quantidade_disponivel: disp,
      quantidade_minima: min,
      quantidade_entregue: parseInt(form.quantidade_entregue) || 0,
      status_estoque: calcStatus(disp, min)
    };
    await base44.entities.EPIEstoque.create(payload);
    setSaving(false);
    setModalOpen(false);
    reload();
  };

  const F = ({ label, k, type = "text" }) => (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      <Input type={type} value={form[k] ?? ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{estoques.length} registros de estoque</p>
        <Button onClick={() => { setForm(EMPTY); setModalOpen(true); }} className="bg-rose-600 hover:bg-rose-700 gap-1.5">
          <Plus className="w-4 h-4" /> Entrada de Estoque
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
          <thead><tr className="bg-gray-50 border-b">
            <th className="text-left px-4 py-3 font-medium text-gray-600">EPI</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Empresa</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Unidade</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Disponível</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Mínimo</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Local</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
          </tr></thead>
          <tbody>
            {estoques.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Nenhum estoque cadastrado</td></tr>
            ) : estoques.map(r => {
              const status = calcStatus(r.quantidade_disponivel, r.quantidade_minima);
              return (
                <tr key={r.id} className={`border-b hover:bg-gray-50 ${status === "Zerado" ? "bg-red-50/40" : status === "Crítico" ? "bg-orange-50/30" : ""}`}>
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-1">
                      {(status === "Zerado" || status === "Crítico") && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                      {r.epi_nome || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.empresa_mestre_nome || "—"}</td>
                  <td className="px-4 py-3">{r.unidade || "—"}</td>
                  <td className={`px-4 py-3 font-bold ${status === "Zerado" ? "text-red-600" : status === "Crítico" || status === "Baixo" ? "text-orange-600" : "text-gray-800"}`}>
                    {r.quantidade_disponivel ?? 0}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.quantidade_minima ?? 0}</td>
                  <td className="px-4 py-3 text-gray-600">{r.local_armazenamento || "—"}</td>
                  <td className="px-4 py-3"><Badge className={`text-xs ${ESTOQUE_COLORS[status] || ""}`}>{status}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Entrada de Estoque</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Empresa</label>
              <select value={form.empresa_mestre_id} onChange={e => {
                const emp = empresas.find(em => em.id === e.target.value);
                setForm(f => ({ ...f, empresa_mestre_id: e.target.value, empresa_mestre_nome: emp?.razao_social || "" }));
              }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {empresas.map(em => <option key={em.id} value={em.id}>{em.razao_social}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">EPI</label>
              <select value={form.epi_cadastro_id} onChange={e => {
                const epi = epis.find(ep => ep.id === e.target.value);
                setForm(f => ({ ...f, epi_cadastro_id: e.target.value, epi_nome: epi?.nome_epi || "", epi_ca: epi?.numero_ca || "" }));
              }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {epis.filter(e => e.status === "Ativo").map(ep => <option key={ep.id} value={ep.id}>{ep.nome_epi} {ep.numero_ca ? `(CA: ${ep.numero_ca})` : ""}</option>)}
              </select>
            </div>
            <F label="Unidade" k="unidade" />
            <F label="Quantidade Disponível" k="quantidade_disponivel" type="number" />
            <F label="Quantidade Mínima" k="quantidade_minima" type="number" />
            <F label="Quantidade Entregue" k="quantidade_entregue" type="number" />
            <F label="Data de Entrada" k="data_entrada" type="date" />
            <F label="Local de Armazenamento" k="local_armazenamento" />
            <div className="col-span-2"><F label="Responsável pelo Estoque" k="responsavel_estoque" /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-rose-600 hover:bg-rose-700">{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}