import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Microscope } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";

const TIPOS_EXAME = ["Hemograma","Glicemia","Colesterol","Audiometria","Espirometria","Acuidade Visual","Teste de Daltonismo","ECG","EEG","Raio-X","Avaliação Psicológica","Exame Toxicológico","Outro"];

const EMPTY = { colaborador_sst_id: "", colaborador_nome: "", empresa_mestre_id: "", tipo_exame: "Audiometria", data_realizacao: "", resultado: "", laboratorio: "", data_vencimento: "", status: "Válido" };

function getAlertaColor(data_vencimento) {
  if (!data_vencimento) return { badge: "bg-gray-100 text-gray-600", row: "" };
  const dias = differenceInDays(parseISO(data_vencimento), new Date());
  if (dias < 0) return { badge: "bg-red-100 text-red-700", row: "bg-red-50/50" };
  if (dias <= 15) return { badge: "bg-orange-100 text-orange-700", row: "bg-orange-50/30" };
  if (dias <= 30) return { badge: "bg-yellow-100 text-yellow-700", row: "bg-yellow-50/20" };
  return { badge: "bg-green-100 text-green-700", row: "" };
}

export default function GestaoExames() {
  const [records, setRecords] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [exs, cols] = await Promise.all([
      base44.entities.ExameComplementar.list("-created_date", 500),
      base44.entities.ColaboradorSST.list("nome", 500)
    ]);
    setRecords(exs);
    setColaboradores(cols);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = records.filter(r =>
    (r.colaborador_nome?.toLowerCase().includes(search.toLowerCase()) || r.tipo_exame?.toLowerCase().includes(search.toLowerCase())) &&
    (!filtroTipo || r.tipo_exame === filtroTipo) &&
    (!filtroStatus || r.status === filtroStatus)
  );

  const save = async () => {
    setSaving(true);
    if (editingId) await base44.entities.ExameComplementar.update(editingId, form);
    else await base44.entities.ExameComplementar.create(form);
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const vencidos = records.filter(r => getAlertaColor(r.data_vencimento).badge.includes("red-100")).length;
  const vencendo15 = records.filter(r => {
    if (!r.data_vencimento) return false;
    const d = differenceInDays(parseISO(r.data_vencimento), new Date());
    return d >= 0 && d <= 15;
  }).length;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Microscope className="w-6 h-6 text-rose-600" /> Gestão de Exames Complementares
          </h1>
          <p className="text-gray-500 text-sm">Monitoramento com alertas de vencimento</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setEditingId(null); setModalOpen(true); }} className="bg-rose-600 hover:bg-rose-700 gap-1.5">
          <Plus className="w-4 h-4" /> Novo Exame
        </Button>
      </div>

      {/* Resumo alertas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-red-700">{vencidos}</p><p className="text-xs text-gray-500">Vencidos</p></div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-orange-600">{vencendo15}</p><p className="text-xs text-gray-500">Vencem em 15d</p></div>
        <div className="bg-gray-50 border rounded-lg p-3 text-center"><p className="text-2xl font-bold text-gray-700">{records.length}</p><p className="text-xs text-gray-500">Total</p></div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-green-700">{records.filter(r=>r.status==="Válido").length}</p><p className="text-xs text-gray-500">Válidos</p></div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todos os tipos</option>
          {TIPOS_EXAME.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todos os status</option>
          {["Válido","Vencendo","Vencido"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Colaborador</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo Exame</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Data Realização</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Resultado</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Laboratório</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimento</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-gray-400">Nenhum exame encontrado</td></tr> :
                filtered.map(r => {
                  const alerta = getAlertaColor(r.data_vencimento);
                  return (
                    <tr key={r.id} className={`border-b hover:bg-gray-50 ${alerta.row}`}>
                      <td className="px-4 py-3 font-medium">{r.colaborador_nome || "—"}</td>
                      <td className="px-4 py-3"><Badge className="text-xs bg-blue-100 text-blue-700">{r.tipo_exame}</Badge></td>
                      <td className="px-4 py-3">{r.data_realizacao ? format(new Date(r.data_realizacao + "T00:00:00"), "dd/MM/yyyy") : "—"}</td>
                      <td className="px-4 py-3">{r.resultado || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{r.laboratorio || "—"}</td>
                      <td className={`px-4 py-3 font-medium`}>
                        {r.data_vencimento ? format(new Date(r.data_vencimento + "T00:00:00"), "dd/MM/yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3"><Badge className={`text-xs ${alerta.badge}`}>{r.status || "—"}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => { setForm({ ...r }); setEditingId(r.id); setModalOpen(true); }}>Editar</Button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar Exame" : "Novo Exame Complementar"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Colaborador</label>
              <select value={form.colaborador_sst_id} onChange={e => {
                const col = colaboradores.find(c => c.id === e.target.value);
                setForm(f => ({ ...f, colaborador_sst_id: e.target.value, colaborador_nome: col?.nome || "" }));
              }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Tipo de Exame</label>
              <select value={form.tipo_exame} onChange={e => setForm(f => ({ ...f, tipo_exame: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {TIPOS_EXAME.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {[["Data de Realização","data_realizacao","date"],["Resultado","resultado","text"],["Laboratório","laboratorio","text"],["Data de Vencimento","data_vencimento","date"]].map(([label,k,type])=>(
              <div key={k}>
                <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
                <Input type={type} value={form[k]||""} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
              <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {["Válido","Vencendo","Vencido"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-rose-600 hover:bg-rose-700">{saving?"Salvando...":"Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}