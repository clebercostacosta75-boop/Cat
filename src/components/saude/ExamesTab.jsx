import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, FileText, Edit2, Trash2, Upload, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS = {
  "Válido": "bg-green-100 text-green-700",
  "Vencido": "bg-red-100 text-red-700",
  "Pendente": "bg-amber-100 text-amber-700",
};

const RESULTADO_COLORS = {
  "Apto": "bg-green-100 text-green-700",
  "Apto com Restrições": "bg-amber-100 text-amber-700",
  "Inapto": "bg-red-100 text-red-700",
};

const EMPTY_FORM = {
  colaborador_nome: "", cpf: "", cargo: "", empresa_nome: "",
  tipo_exame: "Admissional", data_realizacao: "", data_vencimento: "",
  medico_responsavel: "", crm: "", resultado: "Apto",
  status: "Válido", observacoes: ""
};

function parseBRDate(str) {
  if (!str) return "";
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return str;
}

export default function ExamesTab() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.RegistroExame.list("-created_date", 200);
    setRecords(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = records.filter(r =>
    r.colaborador_nome?.toLowerCase().includes(search.toLowerCase()) ||
    r.cpf?.includes(search) ||
    r.empresa_nome?.toLowerCase().includes(search.toLowerCase())
  );

  const isVencido = (d) => d && new Date(d + "T00:00:00") < new Date();

  const openNew = () => {
    setStep(1); setCurrentId(null); setEditingId(null);
    setForm(EMPTY_FORM); setModalOpen(true);
  };

  const openEdit = (r) => {
    setForm({ ...r }); setEditingId(r.id);
    setCurrentId(r.id); setStep(2); setModalOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const today = new Date().toISOString().split("T")[0];
    const record = await base44.entities.RegistroExame.create({
      arquivo_pdf: file_url, status: "Pendente", data_upload: today
    });
    setCurrentId(record.id);
    setUploading(false);
    setExtracting(true);
    setStep(2);
    setForm(EMPTY_FORM);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise este ASO (Atestado de Saúde Ocupacional) e extraia em JSON: colaborador_nome, cpf, cargo, empresa_nome, tipo_exame, data_realizacao (DD/MM/AAAA), data_vencimento (DD/MM/AAAA), medico_responsavel, crm, resultado. Retorne APENAS o JSON.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            colaborador_nome: { type: "string" }, cpf: { type: "string" },
            cargo: { type: "string" }, empresa_nome: { type: "string" },
            tipo_exame: { type: "string" }, data_realizacao: { type: "string" },
            data_vencimento: { type: "string" }, medico_responsavel: { type: "string" },
            crm: { type: "string" }, resultado: { type: "string" }
          }
        }
      });

      const tiposValidos = ["Admissional", "Periódico", "Demissional", "Retorno ao Trabalho", "Mudança de Risco"];
      const tipoRaw = result.tipo_exame || "";
      const tipoNorm = tiposValidos.find(t => t.toLowerCase().includes(tipoRaw.toLowerCase())) || "Admissional";

      const resultadosValidos = ["Apto", "Apto com Restrições", "Inapto"];
      const resultadoRaw = result.resultado || "";
      const resultadoNorm = resultadosValidos.find(r => r.toLowerCase().includes(resultadoRaw.toLowerCase())) || "Apto";

      const extracted = {
        colaborador_nome: result.colaborador_nome || "",
        cpf: result.cpf || "",
        cargo: result.cargo || "",
        empresa_nome: result.empresa_nome || "",
        tipo_exame: tipoNorm,
        data_realizacao: parseBRDate(result.data_realizacao),
        data_vencimento: parseBRDate(result.data_vencimento),
        medico_responsavel: result.medico_responsavel || "",
        crm: result.crm || "",
        resultado: resultadoNorm,
        status: "Válido", observacoes: "", extraido_por_ia: true
      };
      await base44.entities.RegistroExame.update(record.id, extracted);
      setForm(extracted);
    } catch { setForm(EMPTY_FORM); }
    setExtracting(false);
  };

  const save = async () => {
    setSaving(true);
    if (currentId) await base44.entities.RegistroExame.update(currentId, form);
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const cancel = async () => {
    if (step === 2 && currentId && !editingId) {
      await base44.entities.RegistroExame.delete(currentId);
    }
    setModalOpen(false);
  };

  const remove = async (id) => {
    if (!confirm("Excluir este exame?")) return;
    await base44.entities.RegistroExame.delete(id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar por colaborador, CPF ou empresa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={openNew} className="gap-1.5 bg-rose-600 hover:bg-rose-700">
          <Plus className="w-4 h-4" /> Novo Exame
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum exame cadastrado</p>
          <p className="text-gray-400 text-sm mt-1">Clique em "+ Novo Exame" para começar</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Colaborador</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cargo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimento</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Resultado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const vencido = isVencido(r.data_vencimento);
                return (
                  <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${vencido ? "bg-red-50/50" : ""}`}>
                    <td className={`px-4 py-3 font-medium ${vencido ? "text-red-700" : "text-gray-900"}`}>
                      <div>{r.colaborador_nome || <span className="text-gray-400 italic">Não identificado</span>}</div>
                      {r.empresa_nome && <div className="text-xs text-gray-400">{r.empresa_nome}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.cargo || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className="text-xs bg-blue-100 text-blue-700">{r.tipo_exame || "—"}</Badge>
                    </td>
                    <td className={`px-4 py-3 font-medium ${vencido ? "text-red-600" : "text-gray-700"}`}>
                      {r.data_vencimento
                        ? <span>{vencido ? "⚠ " : ""}{format(new Date(r.data_vencimento + "T00:00:00"), "dd/MM/yyyy")}</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.resultado && <Badge className={`text-xs ${RESULTADO_COLORS[r.resultado] || "bg-gray-100 text-gray-600"}`}>{r.resultado}</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-600"}`}>{r.status || "Pendente"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        {r.arquivo_pdf && (
                          <a href={r.arquivo_pdf} target="_blank" rel="noreferrer">
                            <Button size="icon" variant="ghost"><FileText className="w-4 h-4 text-blue-500" /></Button>
                          </a>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Edit2 className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(r.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) cancel(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{step === 1 ? "Novo Exame — Upload do ASO" : editingId ? "Editar Exame" : "Identificar Exame"}</DialogTitle>
          </DialogHeader>

          {step === 1 && (
            <div className="py-6 flex flex-col items-center gap-4">
              <div className="w-full border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-rose-400 hover:bg-rose-50/30 transition-colors"
                onClick={() => fileRef.current?.click()}>
                {uploading ? (
                  <><Loader2 className="w-10 h-10 text-rose-500 animate-spin" /><p className="text-sm text-gray-500">Enviando arquivo...</p></>
                ) : (
                  <><Upload className="w-10 h-10 text-gray-400" /><p className="font-medium text-gray-700">Selecione o ASO em PDF</p><p className="text-xs text-gray-400">Clique aqui ou arraste o arquivo</p></>
                )}
              </div>
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
              <Button variant="outline" className="w-full" onClick={cancel}>Cancelar</Button>
            </div>
          )}

          {step === 2 && (
            <>
              {extracting ? (
                <div className="flex items-center gap-3 text-sm text-purple-700 bg-purple-50 rounded-lg px-4 py-3 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                  <span><strong>IA extraindo dados do PDF...</strong> Aguarde um momento.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-2">
                  <Sparkles className="w-4 h-4 flex-shrink-0" />
                  {editingId ? "Edite os campos abaixo e salve." : "Dados extraídos pela IA. Confira e corrija se necessário."}
                </div>
              )}
              <div className="grid gap-3 py-1">
                {[
                  ["Colaborador", "colaborador_nome", "text"],
                  ["CPF", "cpf", "text"],
                  ["Cargo", "cargo", "text"],
                  ["Empresa", "empresa_nome", "text"],
                  ["Médico Responsável", "medico_responsavel", "text"],
                  ["CRM", "crm", "text"],
                  ["Data de Realização", "data_realizacao", "date"],
                  ["Data de Vencimento", "data_vencimento", "date"],
                ].map(([label, key, type]) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
                    <Input type={type} value={form[key] || ""} disabled={extracting} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Tipo de Exame</label>
                  <select value={form.tipo_exame || "Admissional"} disabled={extracting} onChange={e => setForm(f => ({ ...f, tipo_exame: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:opacity-50">
                    {["Admissional", "Periódico", "Demissional", "Retorno ao Trabalho", "Mudança de Risco"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Resultado</label>
                  <select value={form.resultado || "Apto"} disabled={extracting} onChange={e => setForm(f => ({ ...f, resultado: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:opacity-50">
                    {["Apto", "Apto com Restrições", "Inapto"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
                  <select value={form.status || "Válido"} disabled={extracting} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:opacity-50">
                    {["Válido", "Vencido", "Pendente"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Observações</label>
                  <textarea rows={3} value={form.observacoes || ""} disabled={extracting}
                    onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none disabled:opacity-50" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={cancel} disabled={extracting}>Cancelar</Button>
                <Button onClick={save} disabled={saving || extracting} className="bg-rose-600 hover:bg-rose-700">
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}