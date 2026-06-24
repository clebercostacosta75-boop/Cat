import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Edit2, Upload, Loader2, Sparkles } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";

function parseBRDate(str) {
  if (!str) return "";
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return str;
}

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

  // Upload IA
  const [iaModalOpen, setIaModalOpen] = useState(false);
  const [iaStep, setIaStep] = useState(1); // 1=upload 2=review
  const [iaUploading, setIaUploading] = useState(false);
  const [iaExtracting, setIaExtracting] = useState(false);
  const [iaItems, setIaItems] = useState([]); // lista de EPIs extraídos
  const [iaSaving, setIaSaving] = useState(false);
  const fileRef = useRef();

  const handleIaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIaUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setIaUploading(false);
    setIaExtracting(true);
    setIaStep(2);
    setIaItems([]);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise este documento de EPI (pode ser laudo, certificado CA, ficha técnica ou lista de EPIs) e extraia TODOS os EPIs encontrados. Para cada EPI retorne: nome_epi, numero_ca, fabricante, marca, modelo, data_emissao_ca (DD/MM/AAAA), data_validade_ca (DD/MM/AAAA), riscos_protegidos. Retorne um JSON com array "epis".`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            epis: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nome_epi: { type: "string" },
                  numero_ca: { type: "string" },
                  fabricante: { type: "string" },
                  marca: { type: "string" },
                  modelo: { type: "string" },
                  data_emissao_ca: { type: "string" },
                  data_validade_ca: { type: "string" },
                  riscos_protegidos: { type: "string" }
                }
              }
            }
          }
        }
      });
      const items = (result.epis || []).map(item => ({
        nome_epi: item.nome_epi || "",
        numero_ca: item.numero_ca || "",
        fabricante: item.fabricante || "",
        marca: item.marca || "",
        modelo: item.modelo || "",
        data_emissao_ca: parseBRDate(item.data_emissao_ca),
        data_validade_ca: parseBRDate(item.data_validade_ca),
        riscos_protegidos: item.riscos_protegidos || "",
        situacao_ca: "Válido",
        status: "Ativo",
        natureza: "Nacional",
        _selected: true
      }));
      setIaItems(items.length > 0 ? items : [{ ...EMPTY, _selected: true }]);
    } catch {
      setIaItems([{ ...EMPTY, _selected: true }]);
    }
    setIaExtracting(false);
  };

  const saveIaItems = async () => {
    const selected = iaItems.filter(i => i._selected && i.nome_epi);
    if (!selected.length) return;
    setIaSaving(true);
    for (const item of selected) {
      const { _selected, ...payload } = item;
      await base44.entities.EPICadastro.create(payload);
    }
    setIaSaving(false);
    setIaModalOpen(false);
    setIaStep(1);
    setIaItems([]);
    reload();
  };

  const openIaModal = () => { setIaStep(1); setIaItems([]); setIaModalOpen(true); };

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
        <div className="flex gap-2">
          <Button onClick={openIaModal} variant="outline" className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50">
            <Sparkles className="w-4 h-4" /> Importar por IA
          </Button>
          <Button onClick={openNew} className="bg-rose-600 hover:bg-rose-700 gap-1.5">
            <Plus className="w-4 h-4" /> Novo EPI
          </Button>
        </div>
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

      {/* Modal IA */}
      <Dialog open={iaModalOpen} onOpenChange={(open) => { if (!open) { setIaModalOpen(false); setIaStep(1); setIaItems([]); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              {iaStep === 1 ? "Importar EPIs por IA — Upload do Documento" : "Revisar EPIs Extraídos"}
            </DialogTitle>
          </DialogHeader>

          {iaStep === 1 && (
            <div className="py-6 flex flex-col items-center gap-4">
              <p className="text-sm text-gray-500 text-center">Envie um laudo, certificado CA, ficha técnica ou qualquer documento com dados de EPIs. A IA extrai e preenche os campos automaticamente.</p>
              <div
                className="w-full border-2 border-dashed border-purple-300 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-purple-500 hover:bg-purple-50/30 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {iaUploading ? (
                  <><Loader2 className="w-10 h-10 text-purple-500 animate-spin" /><p className="text-sm text-gray-500">Enviando arquivo...</p></>
                ) : (
                  <><Upload className="w-10 h-10 text-gray-400" /><p className="font-medium text-gray-700">Selecione o documento (PDF, imagem)</p><p className="text-xs text-gray-400">Certificado CA, laudo, ficha técnica...</p></>
                )}
              </div>
              <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={handleIaUpload} />
            </div>
          )}

          {iaStep === 2 && (
            <>
              {iaExtracting ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                  <p className="text-purple-700 font-medium">IA analisando o documento...</p>
                  <p className="text-xs text-gray-400">Extraindo dados dos EPIs, aguarde.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-3">
                    <Sparkles className="w-4 h-4" />
                    {iaItems.length} EPI(s) identificado(s). Marque os que deseja importar e corrija se necessário.
                  </div>
                  <div className="space-y-4">
                    {iaItems.map((item, idx) => (
                      <div key={idx} className={`border rounded-xl p-4 ${item._selected ? "border-purple-300 bg-purple-50/20" : "border-gray-200 opacity-60"}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <input type="checkbox" checked={!!item._selected}
                            onChange={e => setIaItems(prev => prev.map((it, i) => i === idx ? { ...it, _selected: e.target.checked } : it))} />
                          <span className="font-medium text-sm text-gray-700">EPI {idx + 1}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            ["Nome do EPI", "nome_epi"],
                            ["Nº CA", "numero_ca"],
                            ["Fabricante", "fabricante"],
                            ["Marca", "marca"],
                            ["Modelo", "modelo"],
                            ["Riscos Protegidos", "riscos_protegidos"],
                          ].map(([label, key]) => (
                            <div key={key}>
                              <label className="text-xs text-gray-500 block mb-0.5">{label}</label>
                              <Input
                                value={item[key] || ""}
                                onChange={e => setIaItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: e.target.value } : it))}
                                className="text-sm h-8"
                              />
                            </div>
                          ))}
                          {[["Data Emissão CA", "data_emissao_ca"], ["Data Validade CA", "data_validade_ca"]].map(([label, key]) => (
                            <div key={key}>
                              <label className="text-xs text-gray-500 block mb-0.5">{label}</label>
                              <Input type="date" value={item[key] || ""}
                                onChange={e => setIaItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: e.target.value } : it))}
                                className="text-sm h-8" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => { setIaStep(1); setIaItems([]); }}>← Novo Upload</Button>
                    <Button onClick={saveIaItems} disabled={iaSaving || !iaItems.some(i => i._selected && i.nome_epi)} className="bg-purple-600 hover:bg-purple-700">
                      {iaSaving ? "Importando..." : `Importar ${iaItems.filter(i => i._selected && i.nome_epi).length} EPI(s)`}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

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