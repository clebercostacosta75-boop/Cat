import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Sparkles, Upload, Loader2 } from "lucide-react";
import { differenceInDays, parseISO, format, addMonths } from "date-fns";

function parseBRDate(str) {
  if (!str) return "";
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return str;
}

const ASSINATURA_COLORS = {
  "Pendente": "bg-amber-100 text-amber-700",
  "Assinado": "bg-green-100 text-green-700",
  "Recusado": "bg-red-100 text-red-700",
};

const EMPTY = {
  empresa_mestre_id: "", colaborador_sst_id: "", nome_colaborador: "", cpf: "",
  matricula: "", setor: "", funcao: "", epi_cadastro_id: "", epi_nome: "",
  numero_ca: "", fabricante: "", tamanho: "", quantidade: 1,
  data_entrega: new Date().toISOString().split("T")[0],
  periodicidade_troca_meses: "", data_proxima_troca: "",
  responsavel_entrega: "", status_assinatura: "Pendente", observacoes: ""
};

function getProximaTrocaColor(data_proxima_troca) {
  if (!data_proxima_troca) return "";
  const d = differenceInDays(parseISO(data_proxima_troca), new Date());
  if (d < 0) return "text-red-600 font-medium";
  if (d <= 15) return "text-orange-600 font-medium";
  if (d <= 30) return "text-yellow-600";
  return "text-gray-700";
}

export default function EPIEntregasTab({ entregas, empresas, epis, colaboradores, reload }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [grupoForm, setGrupoForm] = useState({ empresa_mestre_id: "", setor: "", funcao: "", epi_cadastro_id: "", data_entrega: new Date().toISOString().split("T")[0], periodicidade: "", responsavel: "" });
  const [grupoColabs, setGrupoColabs] = useState([]);
  const [grupoSelected, setGrupoSelected] = useState([]);
  const [savingGrupo, setSavingGrupo] = useState(false);

  const openNew = () => { setForm(EMPTY); setModalOpen(true); };

  // Upload IA para ficha de entrega
  const [iaModalOpen, setIaModalOpen] = useState(false);
  const [iaStep, setIaStep] = useState(1);
  const [iaUploading, setIaUploading] = useState(false);
  const [iaExtracting, setIaExtracting] = useState(false);
  const [iaItems, setIaItems] = useState([]);
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
        prompt: `Analise este documento (ficha de entrega de EPI, recibo, ou lista de entrega) e extraia TODOS os registros de entrega encontrados. Para cada entrega retorne: nome_colaborador, cpf, funcao, setor, epi_nome, numero_ca, quantidade (número), data_entrega (DD/MM/AAAA), periodicidade_troca_meses (número), responsavel_entrega. Retorne um JSON com array "entregas".`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            entregas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nome_colaborador: { type: "string" },
                  cpf: { type: "string" },
                  funcao: { type: "string" },
                  setor: { type: "string" },
                  epi_nome: { type: "string" },
                  numero_ca: { type: "string" },
                  quantidade: { type: "number" },
                  data_entrega: { type: "string" },
                  periodicidade_troca_meses: { type: "number" },
                  responsavel_entrega: { type: "string" }
                }
              }
            }
          }
        }
      });
      const items = (result.entregas || []).map(item => ({
        nome_colaborador: item.nome_colaborador || "",
        cpf: item.cpf || "",
        funcao: item.funcao || "",
        setor: item.setor || "",
        epi_nome: item.epi_nome || "",
        numero_ca: item.numero_ca || "",
        quantidade: item.quantidade || 1,
        data_entrega: parseBRDate(item.data_entrega) || new Date().toISOString().split("T")[0],
        periodicidade_troca_meses: item.periodicidade_troca_meses || "",
        responsavel_entrega: item.responsavel_entrega || "",
        status_assinatura: "Pendente",
        _selected: true
      }));
      setIaItems(items.length > 0 ? items : [{ ...EMPTY, _selected: true }]);
    } catch {
      setIaItems([{ ...EMPTY, _selected: true }]);
    }
    setIaExtracting(false);
  };

  const saveIaItems = async () => {
    const selected = iaItems.filter(i => i._selected && i.nome_colaborador);
    if (!selected.length) return;
    setIaSaving(true);
    const registros = selected.map(({ _selected, ...item }) => {
      const meses = item.periodicidade_troca_meses ? parseInt(item.periodicidade_troca_meses) : null;
      const proxima = meses && item.data_entrega ? addMonths(parseISO(item.data_entrega), meses).toISOString().split("T")[0] : "";
      return { ...item, quantidade: parseInt(item.quantidade) || 1, data_proxima_troca: proxima, periodicidade_troca_meses: meses || undefined };
    });
    await base44.entities.EPIEntrega.bulkCreate(registros);
    setIaSaving(false);
    setIaModalOpen(false);
    setIaStep(1);
    setIaItems([]);
    reload();
  };

  const save = async () => {
    setSaving(true);
    const payload = { ...form, quantidade: parseInt(form.quantidade) || 1 };
    if (payload.periodicidade_troca_meses && payload.data_entrega) {
      const meses = parseInt(payload.periodicidade_troca_meses);
      payload.data_proxima_troca = addMonths(parseISO(payload.data_entrega), meses).toISOString().split("T")[0];
    }
    if (payload.empresa_mestre_id) {
      const emp = empresas.find(e => e.id === payload.empresa_mestre_id);
      payload.empresa_mestre_nome = emp?.razao_social || "";
    }
    await base44.entities.EPIEntrega.create(payload);
    setSaving(false);
    setModalOpen(false);
    reload();
  };

  const loadGrupoColabs = async () => {
    const { empresa_mestre_id, setor, funcao } = grupoForm;
    if (!empresa_mestre_id) return;
    const query = { empresa_mestre_id };
    if (setor) query.setor = setor;
    if (funcao) query.funcao = funcao;
    const cols = await base44.entities.ColaboradorSST.filter(query);
    setGrupoColabs(cols);
    setGrupoSelected(cols.map(c => c.id));
  };

  const saveGrupo = async () => {
    if (grupoSelected.length === 0 || !grupoForm.epi_cadastro_id) return;
    setSavingGrupo(true);
    const epi = epis.find(e => e.id === grupoForm.epi_cadastro_id);
    const emp = empresas.find(e => e.id === grupoForm.empresa_mestre_id);
    const meses = grupoForm.periodicidade ? parseInt(grupoForm.periodicidade) : null;
    const proxima = meses ? addMonths(parseISO(grupoForm.data_entrega), meses).toISOString().split("T")[0] : "";

    const registros = grupoColabs.filter(c => grupoSelected.includes(c.id)).map(c => ({
      empresa_mestre_id: grupoForm.empresa_mestre_id,
      empresa_mestre_nome: emp?.razao_social || "",
      colaborador_sst_id: c.id,
      nome_colaborador: c.nome,
      cpf: c.cpf || "",
      matricula: c.matricula || "",
      setor: c.setor || "",
      funcao: c.funcao || "",
      epi_cadastro_id: grupoForm.epi_cadastro_id,
      epi_nome: epi?.nome_epi || "",
      numero_ca: epi?.numero_ca || "",
      quantidade: 1,
      data_entrega: grupoForm.data_entrega,
      periodicidade_troca_meses: meses || undefined,
      data_proxima_troca: proxima,
      responsavel_entrega: grupoForm.responsavel,
      status_assinatura: "Pendente"
    }));

    await base44.entities.EPIEntrega.bulkCreate(registros);
    setSavingGrupo(false);
    setGrupoColabs([]);
    setGrupoSelected([]);
    setGrupoForm({ empresa_mestre_id: "", setor: "", funcao: "", epi_cadastro_id: "", data_entrega: new Date().toISOString().split("T")[0], periodicidade: "", responsavel: "" });
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
      <Tabs defaultValue="individual">
        <TabsList className="mb-4">
          <TabsTrigger value="individual">Individual</TabsTrigger>
          <TabsTrigger value="grupo">Em Grupo</TabsTrigger>
        </TabsList>

        <TabsContent value="individual">
          <div className="flex justify-end mb-4 gap-2">
            <Button onClick={() => { setIaStep(1); setIaItems([]); setIaModalOpen(true); }} variant="outline" className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50">
              <Sparkles className="w-4 h-4" /> Importar Ficha por IA
            </Button>
            <Button onClick={openNew} className="bg-rose-600 hover:bg-rose-700 gap-1.5">
              <Plus className="w-4 h-4" /> Nova Entrega Individual
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead><tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Colaborador</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Função</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">EPI</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Data Entrega</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Próxima Troca</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Assinatura</th>
              </tr></thead>
              <tbody>
                {entregas.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">Nenhuma entrega registrada</td></tr>
                ) : entregas.map(r => (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.nome_colaborador}</td>
                    <td className="px-4 py-3 text-gray-600">{r.funcao || "—"}</td>
                    <td className="px-4 py-3">{r.epi_nome || "—"}</td>
                    <td className="px-4 py-3">{r.data_entrega ? format(parseISO(r.data_entrega), "dd/MM/yyyy") : "—"}</td>
                    <td className={`px-4 py-3 ${getProximaTrocaColor(r.data_proxima_troca)}`}>
                      {r.data_proxima_troca ? format(parseISO(r.data_proxima_troca), "dd/MM/yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3"><Badge className={`text-xs ${ASSINATURA_COLORS[r.status_assinatura] || ""}`}>{r.status_assinatura}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="grupo">
          <div className="bg-white border rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-gray-700">Entrega em Grupo — Selecione Empresa, Setor/Função e EPI</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Empresa</label>
                <select value={grupoForm.empresa_mestre_id} onChange={e => setGrupoForm(f => ({ ...f, empresa_mestre_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Selecione...</option>
                  {empresas.map(em => <option key={em.id} value={em.id}>{em.razao_social}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Setor (opcional)</label>
                <Input value={grupoForm.setor} onChange={e => setGrupoForm(f => ({ ...f, setor: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Função (opcional)</label>
                <Input value={grupoForm.funcao} onChange={e => setGrupoForm(f => ({ ...f, funcao: e.target.value }))} />
              </div>
            </div>
            <Button onClick={loadGrupoColabs} variant="outline" disabled={!grupoForm.empresa_mestre_id}>
              Carregar Colaboradores
            </Button>

            {grupoColabs.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">{grupoColabs.length} colaboradores encontrados</p>
                <div className="max-h-40 overflow-y-auto border rounded-lg">
                  {grupoColabs.map(c => (
                    <label key={c.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={grupoSelected.includes(c.id)}
                        onChange={e => setGrupoSelected(s => e.target.checked ? [...s, c.id] : s.filter(i => i !== c.id))} />
                      <span className="text-sm">{c.nome} — {c.funcao || c.cargo}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">{grupoSelected.length} selecionados</p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">EPI</label>
                <select value={grupoForm.epi_cadastro_id} onChange={e => setGrupoForm(f => ({ ...f, epi_cadastro_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Selecione...</option>
                  {epis.filter(e => e.status === "Ativo").map(ep => <option key={ep.id} value={ep.id}>{ep.nome_epi}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Data de Entrega</label>
                <Input type="date" value={grupoForm.data_entrega} onChange={e => setGrupoForm(f => ({ ...f, data_entrega: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Periodicidade Troca (meses)</label>
                <Input type="number" value={grupoForm.periodicidade} onChange={e => setGrupoForm(f => ({ ...f, periodicidade: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Responsável pela Entrega</label>
                <Input value={grupoForm.responsavel} onChange={e => setGrupoForm(f => ({ ...f, responsavel: e.target.value }))} />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveGrupo} disabled={savingGrupo || grupoSelected.length === 0 || !grupoForm.epi_cadastro_id} className="bg-rose-600 hover:bg-rose-700">
                {savingGrupo ? "Salvando..." : `Confirmar Entrega (${grupoSelected.length} colaboradores)`}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal IA Fichas */}
      <Dialog open={iaModalOpen} onOpenChange={(open) => { if (!open) { setIaModalOpen(false); setIaStep(1); setIaItems([]); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              {iaStep === 1 ? "Importar Fichas de Entrega por IA" : "Revisar Entregas Extraídas"}
            </DialogTitle>
          </DialogHeader>

          {iaStep === 1 && (
            <div className="py-6 flex flex-col items-center gap-4">
              <p className="text-sm text-gray-500 text-center">Envie uma ficha de entrega de EPI (física digitalizada ou PDF). A IA identifica colaboradores, EPIs e datas automaticamente.</p>
              <div className="w-full border-2 border-dashed border-purple-300 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-purple-500 hover:bg-purple-50/30 transition-colors"
                onClick={() => fileRef.current?.click()}>
                {iaUploading ? (
                  <><Loader2 className="w-10 h-10 text-purple-500 animate-spin" /><p className="text-sm text-gray-500">Enviando arquivo...</p></>
                ) : (
                  <><Upload className="w-10 h-10 text-gray-400" /><p className="font-medium text-gray-700">Selecione a ficha de entrega (PDF, imagem)</p><p className="text-xs text-gray-400">Ficha assinada, recibo, ou lista de entrega</p></>
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
                  <p className="text-purple-700 font-medium">IA analisando a ficha de entrega...</p>
                  <p className="text-xs text-gray-400">Extraindo colaboradores, EPIs e datas.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-3">
                    <Sparkles className="w-4 h-4" />
                    {iaItems.length} entrega(s) identificada(s). Marque as que deseja importar e corrija se necessário.
                  </div>
                  <div className="space-y-4">
                    {iaItems.map((item, idx) => (
                      <div key={idx} className={`border rounded-xl p-4 ${item._selected ? "border-purple-300 bg-purple-50/20" : "border-gray-200 opacity-60"}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <input type="checkbox" checked={!!item._selected}
                            onChange={e => setIaItems(prev => prev.map((it, i) => i === idx ? { ...it, _selected: e.target.checked } : it))} />
                          <span className="font-medium text-sm text-gray-700">Entrega {idx + 1}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            ["Colaborador", "nome_colaborador"], ["CPF", "cpf"],
                            ["Função", "funcao"], ["Setor", "setor"],
                            ["EPI", "epi_nome"], ["Nº CA", "numero_ca"],
                            ["Responsável Entrega", "responsavel_entrega"],
                          ].map(([label, key]) => (
                            <div key={key}>
                              <label className="text-xs text-gray-500 block mb-0.5">{label}</label>
                              <Input value={item[key] || ""} onChange={e => setIaItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: e.target.value } : it))} className="text-sm h-8" />
                            </div>
                          ))}
                          <div>
                            <label className="text-xs text-gray-500 block mb-0.5">Data Entrega</label>
                            <Input type="date" value={item.data_entrega || ""} onChange={e => setIaItems(prev => prev.map((it, i) => i === idx ? { ...it, data_entrega: e.target.value } : it))} className="text-sm h-8" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-0.5">Quantidade</label>
                            <Input type="number" value={item.quantidade || 1} onChange={e => setIaItems(prev => prev.map((it, i) => i === idx ? { ...it, quantidade: e.target.value } : it))} className="text-sm h-8" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-0.5">Periodicidade Troca (meses)</label>
                            <Input type="number" value={item.periodicidade_troca_meses || ""} onChange={e => setIaItems(prev => prev.map((it, i) => i === idx ? { ...it, periodicidade_troca_meses: e.target.value } : it))} className="text-sm h-8" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => { setIaStep(1); setIaItems([]); }}>← Novo Upload</Button>
                    <Button onClick={saveIaItems} disabled={iaSaving || !iaItems.some(i => i._selected && i.nome_colaborador)} className="bg-purple-600 hover:bg-purple-700">
                      {iaSaving ? "Importando..." : `Importar ${iaItems.filter(i => i._selected && i.nome_colaborador).length} entrega(s)`}
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
          <DialogHeader><DialogTitle>Nova Entrega Individual</DialogTitle></DialogHeader>
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
              <label className="text-xs font-medium text-gray-600 block mb-1">Colaborador</label>
              <select value={form.colaborador_sst_id} onChange={e => {
                const col = colaboradores.find(c => c.id === e.target.value);
                setForm(f => ({ ...f, colaborador_sst_id: e.target.value, nome_colaborador: col?.nome || "", cpf: col?.cpf || "", matricula: col?.matricula || "", funcao: col?.funcao || "", setor: col?.setor || "" }));
              }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione ou digite abaixo...</option>
                {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <F label="Nome Colaborador *" k="nome_colaborador" />
            <F label="CPF" k="cpf" />
            <F label="Matrícula" k="matricula" />
            <F label="Setor" k="setor" />
            <F label="Função" k="funcao" />
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">EPI *</label>
              <select value={form.epi_cadastro_id} onChange={e => {
                const epi = epis.find(ep => ep.id === e.target.value);
                setForm(f => ({ ...f, epi_cadastro_id: e.target.value, epi_nome: epi?.nome_epi || "", numero_ca: epi?.numero_ca || "", fabricante: epi?.fabricante || "" }));
              }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {epis.filter(e => e.status === "Ativo").map(ep => <option key={ep.id} value={ep.id}>{ep.nome_epi} {ep.numero_ca ? `(CA: ${ep.numero_ca})` : ""}</option>)}
              </select>
            </div>
            <F label="Tamanho" k="tamanho" />
            <F label="Quantidade" k="quantidade" type="number" />
            <F label="Data de Entrega *" k="data_entrega" type="date" />
            <F label="Periodicidade Troca (meses)" k="periodicidade_troca_meses" type="number" />
            <F label="Responsável pela Entrega" k="responsavel_entrega" />
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Status Assinatura</label>
              <select value={form.status_assinatura} onChange={e => setForm(f => ({ ...f, status_assinatura: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {["Pendente", "Assinado", "Recusado"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Observações</label>
              <textarea rows={2} value={form.observacoes || ""} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.nome_colaborador || !form.epi_cadastro_id} className="bg-rose-600 hover:bg-rose-700">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}