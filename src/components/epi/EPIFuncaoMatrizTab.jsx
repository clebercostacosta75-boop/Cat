import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Info } from "lucide-react";

const EMPTY = {
  empresa_mestre_id: "", funcao: "", setor: "", atividade: "", risco_identificado: "",
  epi_cadastro_id: "", epi_nome: "", epi_ca: "", periodicidade_troca_meses: "",
  treinamento_necessario: "", exame_relacionado: "", responsavel_validacao: ""
};

export default function EPIFuncaoMatrizTab({ epis, empresas }) {
  const [matrizes, setMatrizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const data = await base44.entities.EPIFuncaoMatriz.list("-created_date", 500);
    setMatrizes(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const payload = { ...form, periodicidade_troca_meses: form.periodicidade_troca_meses ? parseInt(form.periodicidade_troca_meses) : undefined };
    if (payload.empresa_mestre_id) {
      const emp = empresas.find(e => e.id === payload.empresa_mestre_id);
      payload.empresa_mestre_nome = emp?.razao_social || "";
    }
    await base44.entities.EPIFuncaoMatriz.create(payload);
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const F = ({ label, k, type = "text" }) => (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      <Input type={type} value={form[k] || ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-700">
          <Info className="w-4 h-4 flex-shrink-0" />
          Matriz gerada automaticamente ao importar PGR. Você pode adicionar vínculos manuais.
        </div>
        <Button onClick={() => { setForm(EMPTY); setModalOpen(true); }} className="bg-rose-600 hover:bg-rose-700 gap-1.5">
          <Plus className="w-4 h-4" /> Vincular EPI à Função
        </Button>
      </div>

      {loading ? <div className="text-center py-10 text-gray-400">Carregando...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
            <thead><tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Função</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Setor</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Risco</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">EPI Obrigatório</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">CA</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Periodicidade</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Treinamento</th>
            </tr></thead>
            <tbody>
              {matrizes.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Nenhuma matriz de EPI por função. Importe um PGR ou adicione manualmente.</td></tr>
              ) : matrizes.map(m => (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{m.funcao}</td>
                  <td className="px-4 py-3 text-gray-600">{m.setor || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{m.risco_identificado || "—"}</td>
                  <td className="px-4 py-3 font-medium">{m.epi_nome || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{m.epi_ca || "—"}</td>
                  <td className="px-4 py-3">{m.periodicidade_troca_meses ? `${m.periodicidade_troca_meses}m` : "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{m.treinamento_necessario || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Vincular EPI à Função</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Empresa</label>
              <select value={form.empresa_mestre_id} onChange={e => setForm(f => ({ ...f, empresa_mestre_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Geral</option>
                {empresas.map(em => <option key={em.id} value={em.id}>{em.razao_social}</option>)}
              </select>
            </div>
            <F label="Função *" k="funcao" />
            <F label="Setor" k="setor" />
            <F label="Atividade" k="atividade" />
            <F label="Risco Identificado" k="risco_identificado" />
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">EPI Obrigatório</label>
              <select value={form.epi_cadastro_id} onChange={e => {
                const epi = epis.find(ep => ep.id === e.target.value);
                setForm(f => ({ ...f, epi_cadastro_id: e.target.value, epi_nome: epi?.nome_epi || "", epi_ca: epi?.numero_ca || "" }));
              }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {epis.map(ep => <option key={ep.id} value={ep.id}>{ep.nome_epi} {ep.numero_ca ? `(CA: ${ep.numero_ca})` : ""}</option>)}
              </select>
            </div>
            <F label="Periodicidade Troca (meses)" k="periodicidade_troca_meses" type="number" />
            <F label="Treinamento Necessário" k="treinamento_necessario" />
            <F label="Exame Relacionado" k="exame_relacionado" />
            <F label="Responsável Validação" k="responsavel_validacao" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.funcao} className="bg-rose-600 hover:bg-rose-700">{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}