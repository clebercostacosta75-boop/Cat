import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Users, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS = { "Ativo": "bg-green-100 text-green-700", "Inativo": "bg-gray-100 text-gray-600", "Afastado": "bg-amber-100 text-amber-700" };
const RESULTADO_COLORS = { "Apto": "bg-green-100 text-green-700", "Apto com Restrição": "bg-amber-100 text-amber-700", "Inapto": "bg-red-100 text-red-700" };

const EMPTY = { nome: "", cpf: "", matricula: "", cargo: "", funcao: "", setor: "", empresa_mestre_id: "", empresa_mestre_nome: "", data_admissao: "", status: "Ativo" };

export default function ColaboradoresSST() {
  const [records, setRecords] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedCol, setSelectedCol] = useState(null);
  const [colData, setColData] = useState({});

  const load = async () => {
    setLoading(true);
    const [cols, emps] = await Promise.all([
      base44.entities.ColaboradorSST.list("-created_date", 500),
      base44.entities.EmpresaMestre.list("razao_social", 200)
    ]);
    setRecords(cols);
    setEmpresas(emps);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = records.filter(r =>
    r.nome?.toLowerCase().includes(search.toLowerCase()) ||
    r.cpf?.includes(search) || r.empresa_mestre_nome?.toLowerCase().includes(search.toLowerCase())
  );

  const openDetalhe = async (col) => {
    setSelectedCol(col);
    const [asos, exames] = await Promise.all([
      base44.entities.ASORegistro.filter({ colaborador_sst_id: col.id }),
      base44.entities.ExameComplementar.filter({ colaborador_sst_id: col.id })
    ]);
    setColData({ asos, exames });
  };

  const save = async () => {
    setSaving(true);
    if (editingId) await base44.entities.ColaboradorSST.update(editingId, form);
    else await base44.entities.ColaboradorSST.create(form);
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const isVencido = (d) => d && new Date(d + "T00:00:00") < new Date();

  if (selectedCol) {
    const { asos = [], exames = [] } = colData;
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" onClick={() => setSelectedCol(null)}>← Voltar</Button>
          <div>
            <h1 className="text-xl font-bold">{selectedCol.nome}</h1>
            <p className="text-sm text-gray-500">{selectedCol.funcao || selectedCol.cargo} — {selectedCol.empresa_mestre_nome}</p>
          </div>
          <Badge className={`ml-auto ${STATUS_COLORS[selectedCol.status] || ""}`}>{selectedCol.status}</Badge>
        </div>

        <Tabs defaultValue="asos">
          <TabsList className="mb-4">
            <TabsTrigger value="asos">ASOs ({asos.length})</TabsTrigger>
            <TabsTrigger value="exames">Exames Complementares ({exames.length})</TabsTrigger>
            <TabsTrigger value="dados">Dados</TabsTrigger>
          </TabsList>

          <TabsContent value="asos">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Data Exame</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Médico</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Resultado</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Vencimento</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                </tr></thead>
                <tbody>
                  {asos.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhum ASO</td></tr> :
                    asos.map(a => (
                      <tr key={a.id} className={`border-b hover:bg-gray-50 ${isVencido(a.data_vencimento) ? "bg-red-50/50" : ""}`}>
                        <td className="px-4 py-2"><Badge className="text-xs bg-blue-100 text-blue-700">{a.tipo_exame}</Badge></td>
                        <td className="px-4 py-2">{a.data_exame ? format(new Date(a.data_exame + "T00:00:00"), "dd/MM/yyyy") : "—"}</td>
                        <td className="px-4 py-2">{a.medico_responsavel || "—"}</td>
                        <td className="px-4 py-2"><Badge className={`text-xs ${RESULTADO_COLORS[a.resultado] || "bg-gray-100 text-gray-600"}`}>{a.resultado}</Badge></td>
                        <td className={`px-4 py-2 ${isVencido(a.data_vencimento) ? "text-red-600 font-medium" : ""}`}>{a.data_vencimento ? format(new Date(a.data_vencimento + "T00:00:00"), "dd/MM/yyyy") : "—"}</td>
                        <td className="px-4 py-2"><Badge className={`text-xs ${a.status === "Válido" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{a.status}</Badge></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="exames">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Tipo Exame</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Data</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Resultado</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Laboratório</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Vencimento</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                </tr></thead>
                <tbody>
                  {exames.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhum exame complementar</td></tr> :
                    exames.map(ex => (
                      <tr key={ex.id} className={`border-b hover:bg-gray-50 ${isVencido(ex.data_vencimento) ? "bg-red-50/50" : ""}`}>
                        <td className="px-4 py-2 font-medium">{ex.tipo_exame}</td>
                        <td className="px-4 py-2">{ex.data_realizacao ? format(new Date(ex.data_realizacao + "T00:00:00"), "dd/MM/yyyy") : "—"}</td>
                        <td className="px-4 py-2">{ex.resultado || "—"}</td>
                        <td className="px-4 py-2">{ex.laboratorio || "—"}</td>
                        <td className={`px-4 py-2 ${isVencido(ex.data_vencimento) ? "text-red-600 font-medium" : ""}`}>{ex.data_vencimento ? format(new Date(ex.data_vencimento + "T00:00:00"), "dd/MM/yyyy") : "—"}</td>
                        <td className="px-4 py-2"><Badge className={`text-xs ${ex.status === "Válido" ? "bg-green-100 text-green-700" : ex.status === "Vencendo" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{ex.status}</Badge></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="dados">
            <div className="bg-white border rounded-xl p-5 grid sm:grid-cols-2 gap-4">
              {[["Nome","nome"],["CPF","cpf"],["Matrícula","matricula"],["Cargo","cargo"],["Função","funcao"],["Setor","setor"],["Empresa","empresa_mestre_nome"],["Admissão","data_admissao"],["Status","status"]].map(([l,k])=>(
                <div key={k}><p className="text-xs text-gray-500">{l}</p><p className="font-medium">{selectedCol[k]||"—"}</p></div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-rose-600" /> Colaboradores SST
          </h1>
          <p className="text-gray-500 text-sm">Gestão de colaboradores vinculados à SST</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setEditingId(null); setModalOpen(true); }} className="bg-rose-600 hover:bg-rose-700 gap-1.5">
          <Plus className="w-4 h-4" /> Novo Colaborador
        </Button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Buscar por nome, CPF ou empresa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
            <thead><tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">CPF</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Empresa</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Função</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nenhum colaborador</td></tr> :
                filtered.map(r => (
                  <tr key={r.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => openDetalhe(r)}>
                    <td className="px-4 py-3 font-medium">{r.nome}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.cpf || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{r.empresa_mestre_nome || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{r.funcao || r.cargo || "—"}</td>
                    <td className="px-4 py-3"><Badge className={`text-xs ${STATUS_COLORS[r.status] || ""}`}>{r.status}</Badge></td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" onClick={() => openDetalhe(r)}><ChevronRight className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Empresa</label>
              <select value={form.empresa_mestre_id} onChange={e => {
                const emp = empresas.find(em => em.id === e.target.value);
                setForm(f => ({ ...f, empresa_mestre_id: e.target.value, empresa_mestre_nome: emp?.razao_social || "" }));
              }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {empresas.map(em => <option key={em.id} value={em.id}>{em.razao_social}</option>)}
              </select>
            </div>
            {[["Nome *","nome"],["CPF","cpf"],["Matrícula","matricula"],["Cargo","cargo"],["Função","funcao"],["Setor","setor"]].map(([label,k])=>(
              <div key={k}>
                <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
                <Input value={form[k]||""} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Data Admissão</label>
              <Input type="date" value={form.data_admissao||""} onChange={e=>setForm(f=>({...f,data_admissao:e.target.value}))}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
              <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {["Ativo","Inativo","Afastado"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving||!form.nome} className="bg-rose-600 hover:bg-rose-700">{saving?"Salvando...":"Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}