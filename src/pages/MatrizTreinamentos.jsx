import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Grid3X3, Search, Plus, Trash2, Edit, Building2, BookOpen, Shield,
  AlertTriangle, CheckCircle, X, ArrowUpDown, Filter, Users, Briefcase, HardHat
} from "lucide-react";

// ─── CONFIGURAÇÕES ──────────────────────────────────────────────────────────
const NR_CATEGORIAS = ["Segurança", "Saúde", "Medicina", "Ergonomia", "Construção", "Máquinas", "Eletricidade", "Química", "Geral"];
const MODALIDADES = ["Formação", "Periódico", "Eventual"];
const GRAUS_RISCO = [1, 2, 3, 4];

// ─── PÁGINA PRINCIPAL ────────────────────────────────────────────────────────
export default function MatrizTreinamentos() {
  const [activeTab, setActiveTab] = useState("matriz");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Grid3X3 className="w-6 h-6 text-indigo-600" />
          Matriz de Treinamentos
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Vincule funções, normas regulamentadoras e cursos obrigatórios</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100">
          <TabsTrigger value="matriz" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Grid3X3 className="w-4 h-4 mr-1.5" />Matriz
          </TabsTrigger>
          <TabsTrigger value="funcoes" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Briefcase className="w-4 h-4 mr-1.5" />Funções
          </TabsTrigger>
          <TabsTrigger value="nrs" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Shield className="w-4 h-4 mr-1.5" />Normas (NRs)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matriz" className="mt-4"><MatrizPanel /></TabsContent>
        <TabsContent value="funcoes" className="mt-4"><FuncoesPanel /></TabsContent>
        <TabsContent value="nrs" className="mt-4"><NRsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── PAINEL MATRIZ ────────────────────────────────────────────────────────────
function MatrizPanel() {
  const [entries, setEntries] = useState([]);
  const [funcoes, setFuncoes] = useState([]);
  const [nrs, setNrs] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroFuncao, setFiltroFuncao] = useState("all");
  const [filtroNR, setFiltroNR] = useState("all");
  const [filtroEmpresa, setFiltroEmpresa] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    funcao_id: "", funcao_nome: "", nr_id: "", nr_codigo: "",
    curso_id: "", curso_nome: "", carga_horaria: "", periodicidade_meses: "",
    modalidade: "Formação", obrigatorio: true,
    empresa_id: "", empresa_nome: "", observacoes: ""
  });

  const load = async () => {
    setLoading(true);
    const [e, f, n, c, emp] = await Promise.all([
      base44.entities.MatrizTreinamento.list("-created_date", 300),
      base44.entities.FuncaoCargo.list("nome", 200),
      base44.entities.NormaRegulamentadora.list("codigo", 50),
      base44.entities.Course.list("name", 200),
      base44.entities.Company.list("razao_social", 200)
    ]);
    setEntries(e);
    setFuncoes(f);
    setNrs(n);
    setCursos(c);
    setEmpresas(emp);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({
      funcao_id: "", funcao_nome: "", nr_id: "", nr_codigo: "",
      curso_id: "", curso_nome: "", carga_horaria: "", periodicidade_meses: "",
      modalidade: "Formação", obrigatorio: true,
      empresa_id: "", empresa_nome: "", observacoes: ""
    });
    setEditing(null);
  };

  const openNew = () => { resetForm(); setShowForm(true); };
  const openEdit = (e) => { setEditing(e.id); setForm({ ...e }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.funcao_nome || !form.nr_codigo || !form.curso_nome) return;
    if (editing) {
      await base44.entities.MatrizTreinamento.update(editing, form);
    } else {
      await base44.entities.MatrizTreinamento.create(form);
    }
    setShowForm(false);
    resetForm();
    await load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Remover este vínculo da matriz?")) return;
    await base44.entities.MatrizTreinamento.delete(id);
    await load();
  };

  const filtered = entries.filter(e => {
    const s = search.toLowerCase();
    return (!s || (e.funcao_nome || "").toLowerCase().includes(s) || (e.curso_nome || "").toLowerCase().includes(s) || (e.nr_codigo || "").toLowerCase().includes(s))
      && (filtroFuncao === "all" || e.funcao_id === filtroFuncao)
      && (filtroNR === "all" || e.nr_id === filtroNR)
      && (filtroEmpresa === "all" || e.empresa_id === filtroEmpresa);
  });

  // Agrupar por função para visão matricial
  const grouped = {};
  filtered.forEach(e => {
    const key = e.funcao_nome || "Sem função";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9 text-sm" />
        </div>
        <select value={filtroFuncao} onChange={e => setFiltroFuncao(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
          <option value="all">Todas funções</option>
          {funcoes.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
        <select value={filtroNR} onChange={e => setFiltroNR(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
          <option value="all">Todas NRs</option>
          {nrs.map(n => <option key={n.id} value={n.id}>{n.codigo}</option>)}
        </select>
        <Button onClick={openNew} size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1.5 ml-auto">
          <Plus className="w-4 h-4" />Vincular
        </Button>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm mt-3">Carregando matriz...</p>
        </div>
      )}

      {!loading && Object.keys(grouped).length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed">
          <Grid3X3 className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Matriz vazia</p>
          <p className="text-gray-400 text-sm mt-1">Vincule funções a NRs e cursos obrigatórios</p>
        </div>
      )}

      {/* Cards por função */}
      {!loading && Object.entries(grouped).map(([funcaoNome, items]) => (
        <Card key={funcaoNome} className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              {funcaoNome}
              <Badge className="text-[10px] bg-indigo-100 text-indigo-700">{items.length} treinamento{items.length !== 1 ? "s" : ""}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500 uppercase">
                    <th className="pb-2 pr-3 font-medium">NR</th>
                    <th className="pb-2 pr-3 font-medium">Curso Obrigatório</th>
                    <th className="pb-2 pr-3 font-medium">Carga</th>
                    <th className="pb-2 pr-3 font-medium">Periodicidade</th>
                    <th className="pb-2 pr-3 font-medium">Modalidade</th>
                    <th className="pb-2 pr-3 font-medium">Empresa</th>
                    <th className="pb-2 font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700 font-mono">{item.nr_codigo}</Badge>
                      </td>
                      <td className="py-2 pr-3 font-medium text-gray-800">{item.curso_nome}</td>
                      <td className="py-2 pr-3 text-gray-600">{item.carga_horaria ? `${item.carga_horaria}h` : "—"}</td>
                      <td className="py-2 pr-3 text-gray-600">{item.periodicidade_meses ? `${item.periodicidade_meses} meses` : "—"}</td>
                      <td className="py-2 pr-3">
                        <Badge className={`text-[10px] ${item.modalidade === "Formação" ? "bg-purple-100 text-purple-700" : item.modalidade === "Periódico" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                          {item.modalidade}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-gray-500">{item.empresa_nome || "Geral"}</td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(item)} className="h-7 w-7 p-0"><Edit className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)} className="h-7 w-7 p-0 text-red-500"><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-indigo-600" />
              {editing ? "Editar Vínculo" : "Novo Vínculo na Matriz"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Função *</label>
                <select value={form.funcao_nome} onChange={e => {
                  const f = funcoes.find(x => x.nome === e.target.value);
                  setForm({ ...form, funcao_nome: e.target.value, funcao_id: f?.id || "" });
                }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                  <option value="">Selecionar...</option>
                  {funcoes.map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">NR *</label>
                <select value={form.nr_codigo} onChange={e => {
                  const n = nrs.find(x => x.codigo === e.target.value);
                  setForm({ ...form, nr_codigo: e.target.value, nr_id: n?.id || "", periodicidade_meses: n?.periodicidade_padrao_meses || form.periodicidade_meses, carga_horaria: n?.carga_horaria_minima || form.carga_horaria });
                }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                  <option value="">Selecionar...</option>
                  {nrs.map(n => <option key={n.id} value={n.codigo}>{n.codigo} — {n.titulo}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Curso *</label>
                <select value={form.curso_nome} onChange={e => {
                  const c = cursos.find(x => x.name === e.target.value);
                  setForm({ ...form, curso_nome: e.target.value, curso_id: c?.id || "" });
                }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                  <option value="">Selecionar...</option>
                  {cursos.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Carga Horária (h)</label>
                <Input type="number" value={form.carga_horaria} onChange={e => setForm({ ...form, carga_horaria: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Periodicidade (meses)</label>
                <Input type="number" value={form.periodicidade_meses} onChange={e => setForm({ ...form, periodicidade_meses: e.target.value })} placeholder="Ex: 12" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Modalidade</label>
                <select value={form.modalidade} onChange={e => setForm({ ...form, modalidade: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                  {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Empresa</label>
                <select value={form.empresa_nome} onChange={e => {
                  const emp = empresas.find(x => x.razao_social === e.target.value);
                  setForm({ ...form, empresa_nome: e.target.value, empresa_id: emp?.id || "" });
                }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                  <option value="">Geral (todas)</option>
                  {empresas.map(emp => <option key={emp.id} value={emp.razao_social}>{emp.razao_social}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Observações</label>
              <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700" disabled={!form.funcao_nome || !form.nr_codigo || !form.curso_nome}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── PAINEL FUNÇÕES ──────────────────────────────────────────────────────────
function FuncoesPanel() {
  const [funcoes, setFuncoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nome: "", descricao: "", cbo: "", setor: "", grau_risco: 2, ativo: true });

  const load = async () => {
    const f = await base44.entities.FuncaoCargo.list("nome", 200);
    setFuncoes(f);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ nome: "", descricao: "", cbo: "", setor: "", grau_risco: 2, ativo: true }); setEditing(null); };
  const openNew = () => { resetForm(); setShowForm(true); };
  const openEdit = (f) => { setEditing(f.id); setForm({ ...f }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.nome) return;
    if (editing) {
      await base44.entities.FuncaoCargo.update(editing, form);
    } else {
      await base44.entities.FuncaoCargo.create(form);
    }
    setShowForm(false); resetForm(); await load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir esta função?")) return;
    await base44.entities.FuncaoCargo.delete(id);
    await load();
  };

  const filtered = funcoes.filter(f => !search || f.nome?.toLowerCase().includes(search.toLowerCase()) || f.setor?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar função..." className="pl-9 text-sm" />
        </div>
        <div className="text-xs text-gray-500 ml-auto">{funcoes.length} função{funcoes.length !== 1 ? "ões" : ""}</div>
        <Button onClick={openNew} size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1.5"><Plus className="w-4 h-4" />Nova Função</Button>
      </div>
      {loading ? (
        <div className="text-center py-8"><div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
          <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Nenhuma função cadastrada</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map(f => (
            <div key={f.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${f.ativo ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"}`}>
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{f.nome}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {f.setor && <span>{f.setor}</span>}
                    {f.cbo && <span className="font-mono">CBO {f.cbo}</span>}
                    {f.grau_risco && (
                      <Badge className={`text-[10px] ${f.grau_risco >= 3 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                        Risco {f.grau_risco}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(f)} className="h-7 w-7 p-0"><Edit className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(f.id)} className="h-7 w-7 p-0 text-red-500"><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Modal Função */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar Função" : "Nova Função"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Nome *</label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Operador de Prensa" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">CBO</label>
                <Input value={form.cbo} onChange={e => setForm({ ...form, cbo: e.target.value })} placeholder="Ex: 7234-05" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Setor</label>
                <Input value={form.setor} onChange={e => setForm({ ...form, setor: e.target.value })} placeholder="Ex: Produção" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Grau de Risco</label>
                <select value={form.grau_risco} onChange={e => setForm({ ...form, grau_risco: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                  {GRAUS_RISCO.map(g => <option key={g} value={g}>Grau {g}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Descrição</label>
              <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700" disabled={!form.nome}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── PAINEL NRs ──────────────────────────────────────────────────────────────
function NRsPanel() {
  const [nrs, setNrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    codigo: "", titulo: "", descricao: "", categoria: "Segurança",
    obrigatoria: true, periodicidade_padrao_meses: "", carga_horaria_minima: ""
  });

  const load = async () => {
    const n = await base44.entities.NormaRegulamentadora.list("codigo", 50);
    setNrs(n);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ codigo: "", titulo: "", descricao: "", categoria: "Segurança", obrigatoria: true, periodicidade_padrao_meses: "", carga_horaria_minima: "" });
    setEditing(null);
  };
  const openNew = () => { resetForm(); setShowForm(true); };
  const openEdit = (n) => { setEditing(n.id); setForm({ ...n }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.codigo || !form.titulo) return;
    if (editing) {
      await base44.entities.NormaRegulamentadora.update(editing, form);
    } else {
      await base44.entities.NormaRegulamentadora.create(form);
    }
    setShowForm(false); resetForm(); await load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir esta NR?")) return;
    await base44.entities.NormaRegulamentadora.delete(id);
    await load();
  };

  const filtered = nrs.filter(n => !search || n.codigo?.toLowerCase().includes(search.toLowerCase()) || n.titulo?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar NR..." className="pl-9 text-sm" />
        </div>
        <div className="text-xs text-gray-500 ml-auto">{nrs.length} norma{nrs.length !== 1 ? "s" : ""}</div>
        <Button onClick={openNew} size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1.5"><Plus className="w-4 h-4" />Nova NR</Button>
      </div>
      {loading ? (
        <div className="text-center py-8"><div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
          <Shield className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Nenhuma NR cadastrada</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map(n => (
            <div key={n.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${n.obrigatoria ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                  {n.codigo?.replace("NR-", "")}
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{n.codigo} — {n.titulo}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Badge className="text-[10px] bg-gray-100 text-gray-600">{n.categoria}</Badge>
                    {n.periodicidade_padrao_meses && <span>Reciclagem: {n.periodicidade_padrao_meses}m</span>}
                    {n.carga_horaria_minima && <span>Carga mín: {n.carga_horaria_minima}h</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(n)} className="h-7 w-7 p-0"><Edit className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(n.id)} className="h-7 w-7 p-0 text-red-500"><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Modal NR */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar NR" : "Nova NR"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Código *</label>
                <Input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="Ex: NR-35" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Categoria</label>
                <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                  {NR_CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Título *</label>
                <Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Trabalho em Altura" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Periodicidade (meses)</label>
                <Input type="number" value={form.periodicidade_padrao_meses} onChange={e => setForm({ ...form, periodicidade_padrao_meses: e.target.value })} placeholder="Ex: 24" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Carga Horária Mínima</label>
                <Input type="number" value={form.carga_horaria_minima} onChange={e => setForm({ ...form, carga_horaria_minima: e.target.value })} placeholder="Ex: 8" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Descrição</label>
              <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700" disabled={!form.codigo || !form.titulo}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}