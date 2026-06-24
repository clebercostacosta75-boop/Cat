import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, BookOpen, AlertTriangle, FileText, Search } from "lucide-react";

const NR_CORES = { "Crítico": "bg-red-100 text-red-700 border-red-200", "Alto": "bg-orange-100 text-orange-700 border-orange-200", "Médio": "bg-yellow-100 text-yellow-700 border-yellow-200", "Baixo": "bg-green-100 text-green-700 border-green-200" };
const NR_BG = { "Crítico": "bg-red-50 border-red-300", "Alto": "bg-orange-50 border-orange-300", "Médio": "bg-yellow-50 border-yellow-200", "Baixo": "bg-green-50 border-green-200" };

const NRS_PADRAO = [
  { codigo: "NR-1", nome: "Disposições Gerais", orgao_emissor: "MTE", aplicavel_grau_risco: "Todos", periodicidade_revisao_meses: 24, ativo: true },
  { codigo: "NR-5", nome: "CIPA", orgao_emissor: "MTE", aplicavel_grau_risco: "Todos", periodicidade_revisao_meses: 12, ativo: true },
  { codigo: "NR-6", nome: "EPI", orgao_emissor: "MTE", aplicavel_grau_risco: "Todos", periodicidade_revisao_meses: 12, ativo: true },
  { codigo: "NR-7", nome: "PCMSO", orgao_emissor: "MTE", aplicavel_grau_risco: "Todos", periodicidade_revisao_meses: 12, ativo: true },
  { codigo: "NR-9", nome: "Agentes Ambientais", orgao_emissor: "MTE", aplicavel_grau_risco: "Todos", periodicidade_revisao_meses: 12, ativo: true },
  { codigo: "NR-10", nome: "Segurança em Instalações Elétricas", orgao_emissor: "MTE", aplicavel_grau_risco: "3", periodicidade_revisao_meses: 24, ativo: true },
  { codigo: "NR-12", nome: "Segurança em Máquinas e Equipamentos", orgao_emissor: "MTE", aplicavel_grau_risco: "Todos", periodicidade_revisao_meses: 24, ativo: true },
  { codigo: "NR-17", nome: "Ergonomia", orgao_emissor: "MTE", aplicavel_grau_risco: "Todos", periodicidade_revisao_meses: 24, ativo: true },
  { codigo: "NR-18", nome: "Construção Civil", orgao_emissor: "MTE", aplicavel_grau_risco: "4", periodicidade_revisao_meses: 12, ativo: true },
  { codigo: "NR-23", nome: "Proteção Contra Incêndios", orgao_emissor: "MTE", aplicavel_grau_risco: "Todos", periodicidade_revisao_meses: 12, ativo: true },
  { codigo: "NR-35", nome: "Trabalho em Altura", orgao_emissor: "MTE", aplicavel_grau_risco: "Todos", periodicidade_revisao_meses: 24, ativo: true },
];

const EMPTY_MATRIZ = { funcao: "", setor: "", nr_referencia_id: "", nr_codigo: "", nr_nome: "", curso_obrigatorio: "", carga_horaria: "", periodicidade_meses: "", justificativa: "", nivel_risco: "Médio", prazo_inicial_dias: "", empresa_mestre_id: "" };
const EMPTY_NR = { codigo: "", nome: "", descricao: "", orgao_emissor: "MTE", periodicidade_revisao_meses: "", aplicavel_grau_risco: "Todos", ativo: true };
const EMPTY_SOL = { titulo_treinamento: "", nr_relacionada: "", numero_participantes: "", colaboradores_nomes: "", data_preferencial: "", local_preferencial: "Presencial", descricao: "", empresa_mestre_id: "" };

export default function MatrizTreinamentos() {
  const [matrizes, setMatrizes] = useState([]);
  const [nrs, setNrs] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("");
  const [filtroNR, setFiltroNR] = useState("");
  const [modalMatriz, setModalMatriz] = useState(false);
  const [modalNR, setModalNR] = useState(false);
  const [modalRelatorio, setModalRelatorio] = useState(false);
  const [modalSolicitacao, setModalSolicitacao] = useState(false);
  const [editingNR, setEditingNR] = useState(null);
  const [formMatriz, setFormMatriz] = useState(EMPTY_MATRIZ);
  const [formNR, setFormNR] = useState(EMPTY_NR);
  const [formSol, setFormSol] = useState(EMPTY_SOL);
  const [saving, setSaving] = useState(false);
  const [searchNR, setSearchNR] = useState("");
  const [filtroStatusPend, setFiltroStatusPend] = useState("");

  const load = async () => {
    setLoading(true);
    const [mat, nrData, emps] = await Promise.all([
      base44.entities.MatrizTreinamentoNR.list("-created_date", 500),
      base44.entities.NRReferencia.list("codigo", 100),
      base44.entities.EmpresaMestre.list("razao_social", 200),
    ]);
    setMatrizes(mat);
    setNrs(nrData.length > 0 ? nrData : NRS_PADRAO);
    setEmpresas(emps);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const seedNRs = async () => {
    for (const nr of NRS_PADRAO) { await base44.entities.NRReferencia.create(nr); }
    load();
  };

  const filteredMatrizes = matrizes.filter(m =>
    (!filtroEmpresa || m.empresa_mestre_id === filtroEmpresa) &&
    (!filtroSetor || m.setor === filtroSetor) &&
    (!filtroNR || m.nr_codigo === filtroNR)
  );

  // Tabela cruzada: linhas=funções, colunas=NRs
  const funcoes = [...new Set(filteredMatrizes.map(m => m.funcao).filter(Boolean))];
  const nrsCols = [...new Set(filteredMatrizes.map(m => m.nr_codigo).filter(Boolean))];

  const saveMatriz = async () => {
    setSaving(true);
    const nr = nrs.find(n => n.id === formMatriz.nr_referencia_id || n.codigo === formMatriz.nr_referencia_id);
    const emp = empresas.find(e => e.id === formMatriz.empresa_mestre_id);
    const payload = { ...formMatriz, nr_codigo: nr?.codigo || "", nr_nome: nr?.nome || "", empresa_mestre_nome: emp?.razao_social || "", carga_horaria: parseInt(formMatriz.carga_horaria) || 0, periodicidade_meses: parseInt(formMatriz.periodicidade_meses) || 0, prazo_inicial_dias: parseInt(formMatriz.prazo_inicial_dias) || 0 };
    await base44.entities.MatrizTreinamentoNR.create(payload);
    setSaving(false); setModalMatriz(false); load();
  };

  const saveNR = async () => {
    setSaving(true);
    const payload = { ...formNR, periodicidade_revisao_meses: parseInt(formNR.periodicidade_revisao_meses) || 0 };
    if (editingNR?.id) await base44.entities.NRReferencia.update(editingNR.id, payload);
    else await base44.entities.NRReferencia.create(payload);
    setSaving(false); setModalNR(false); load();
  };

  const saveSolicitacao = async () => {
    setSaving(true);
    const emp = empresas.find(e => e.id === formSol.empresa_mestre_id);
    await base44.entities.SolicitacaoTreinamento.create({ ...formSol, empresa_mestre_nome: emp?.razao_social || "", tipo_solicitacao: "Empresa Solicita", origem: "Portal Empresa", status: "Aguardando Análise", numero_participantes: parseInt(formSol.numero_participantes) || 0 });
    setSaving(false); setModalSolicitacao(false);
  };

  const FI = ({ label, k, type = "text", state, setState }) => (
    <div><label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      <Input type={type} value={state[k] || ""} onChange={e => setState(s => ({ ...s, [k]: e.target.value }))} /></div>
  );

  const setores = [...new Set(matrizes.map(m => m.setor).filter(Boolean))];
  const nrsFiltradas = nrs.filter(n => n.codigo?.toLowerCase().includes(searchNR.toLowerCase()) || n.nome?.toLowerCase().includes(searchNR.toLowerCase()));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><BookOpen className="w-6 h-6 text-rose-600" /> Matriz de Treinamentos</h1>
          <p className="text-sm text-gray-500">Gestão de NRs, funções e obrigações de treinamento</p>
        </div>
      </div>

      <Tabs defaultValue="matriz">
        <TabsList className="flex flex-wrap gap-1 h-auto bg-gray-100 p-1 mb-4">
          {[["matriz","📊 Matriz NR × Função"],["catalogo","📚 Catálogo NRs"],["conformidade","✅ Conformidade por Função"],["pendencias","⚠️ Pendências"]].map(([v,l]) => (
            <TabsTrigger key={v} value={v} className="text-xs py-1.5 px-3 data-[state=active]:bg-white">{l}</TabsTrigger>
          ))}
        </TabsList>

        {/* ABA 1 – Matriz */}
        <TabsContent value="matriz">
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Todas as empresas</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
            </select>
            <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Todos os setores</option>
              {setores.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={filtroNR} onChange={e => setFiltroNR(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Todas as NRs</option>
              {nrsCols.map(n => <option key={n}>{n}</option>)}
            </select>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={() => setModalRelatorio(true)}><FileText className="w-4 h-4 mr-1" /> Relatório</Button>
              <Button className="bg-rose-600 hover:bg-rose-700 gap-1.5" onClick={() => { setFormMatriz(EMPTY_MATRIZ); setModalMatriz(true); }}><Plus className="w-4 h-4" /> Vincular Treinamento</Button>
            </div>
          </div>

          {loading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : funcoes.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-300" /><p>Nenhuma vinculação cadastrada. Clique em "+ Vincular Treinamento".</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border px-3 py-2 text-left font-medium text-gray-600 min-w-[120px]">Função</th>
                    {nrsCols.map(nr => <th key={nr} className="border px-2 py-2 font-medium text-gray-600 min-w-[100px]">{nr}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {funcoes.map(f => (
                    <tr key={f} className="hover:bg-gray-50">
                      <td className="border px-3 py-2 font-medium text-gray-800">{f}</td>
                      {nrsCols.map(nr => {
                        const cursos = filteredMatrizes.filter(m => m.funcao === f && m.nr_codigo === nr);
                        if (cursos.length === 0) return <td key={nr} className="border px-2 py-2 text-center text-gray-300">—</td>;
                        const nivel = cursos[0].nivel_risco;
                        return (
                          <td key={nr} className={`border px-2 py-1.5 ${NR_BG[nivel] || ""}`}>
                            {cursos.map((c, i) => <div key={i} className="text-xs font-medium">{c.curso_obrigatorio}<span className="text-gray-500 ml-1">({c.carga_horaria}h)</span></div>)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ABA 2 – Catálogo NRs */}
        <TabsContent value="catalogo">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Buscar NR..." value={searchNR} onChange={e => setSearchNR(e.target.value)} className="pl-9" />
            </div>
            {nrs.filter(n => n.id).length === 0 && <Button variant="outline" onClick={seedNRs}>Importar NRs Padrão</Button>}
            <Button className="bg-rose-600 hover:bg-rose-700 gap-1.5 ml-auto" onClick={() => { setFormNR(EMPTY_NR); setEditingNR(null); setModalNR(true); }}><Plus className="w-4 h-4" /> Nova NR</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead><tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Código</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Órgão</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Grau Risco</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Revisão</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
              </tr></thead>
              <tbody>
                {nrsFiltradas.map((n, i) => (
                  <tr key={n.id || i} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-bold text-rose-700">{n.codigo}</td>
                    <td className="px-4 py-3 font-medium">{n.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{n.orgao_emissor}</td>
                    <td className="px-4 py-3"><Badge className="text-xs bg-blue-50 text-blue-700">GR {n.aplicavel_grau_risco}</Badge></td>
                    <td className="px-4 py-3">{n.periodicidade_revisao_meses ? `${n.periodicidade_revisao_meses}m` : "—"}</td>
                    <td className="px-4 py-3"><Badge className={`text-xs ${n.ativo !== false ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{n.ativo !== false ? "Ativo" : "Inativo"}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      {n.id && <Button size="sm" variant="ghost" onClick={() => { setFormNR({ ...n }); setEditingNR(n); setModalNR(true); }}>Editar</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ABA 3 – Conformidade por Função */}
        <TabsContent value="conformidade">
          {funcoes.length === 0 ? <div className="text-center py-12 text-gray-400">Nenhuma função na matriz. Adicione vínculos primeiro.</div> : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {funcoes.map(f => {
                const cursosF = matrizes.filter(m => m.funcao === f);
                const temCritico = cursosF.some(c => c.nivel_risco === "Crítico");
                return (
                  <div key={f} className={`bg-white border rounded-xl p-4 ${temCritico ? "border-red-300" : "border-gray-200"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-800">{f}</h3>
                      {temCritico && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{cursosF.length} curso(s) obrigatório(s)</p>
                    <div className="space-y-1.5">
                      {cursosF.map((c, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-xs text-gray-700 truncate">{c.curso_obrigatorio}</span>
                          <Badge className={`text-xs ml-2 ${NR_CORES[c.nivel_risco] || ""}`}>{c.nr_codigo}</Badge>
                        </div>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" className="mt-3 w-full text-xs">Exportar PDF</Button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ABA 4 – Pendências */}
        <TabsContent value="pendencias">
          <div className="flex flex-wrap gap-3 mb-4">
            <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Todas as empresas</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
            </select>
            <select value={filtroStatusPend} onChange={e => setFiltroStatusPend(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Todos os status</option>
              {["Pendente","Vencido","Em Dia"].map(s => <option key={s}>{s}</option>)}
            </select>
            <Button className="ml-auto bg-rose-600 hover:bg-rose-700 gap-1.5" onClick={() => { setFormSol(EMPTY_SOL); setModalSolicitacao(true); }}>
              <Plus className="w-4 h-4" /> Solicitar Treinamento
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead><tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Função</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Curso Obrigatório</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">NR</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">C.H.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Periodicidade</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nível Risco</th>
              </tr></thead>
              <tbody>
                {filteredMatrizes.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">Nenhuma pendência encontrada</td></tr> :
                  filteredMatrizes.map(m => (
                    <tr key={m.id || Math.random()} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{m.funcao || "—"}</td>
                      <td className="px-4 py-3">{m.curso_obrigatorio || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-rose-700">{m.nr_codigo || "—"}</td>
                      <td className="px-4 py-3">{m.carga_horaria ? `${m.carga_horaria}h` : "—"}</td>
                      <td className="px-4 py-3">{m.periodicidade_meses === 0 ? "Único" : m.periodicidade_meses ? `${m.periodicidade_meses}m` : "—"}</td>
                      <td className="px-4 py-3"><Badge className={`text-xs ${NR_CORES[m.nivel_risco] || ""}`}>{m.nivel_risco}</Badge></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Vincular Treinamento */}
      <Dialog open={modalMatriz} onOpenChange={setModalMatriz}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Vincular Treinamento à Função</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Empresa</label>
              <select value={formMatriz.empresa_mestre_id} onChange={e => setFormMatriz(f => ({ ...f, empresa_mestre_id: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Geral</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
              </select>
            </div>
            <FI label="Função" k="funcao" state={formMatriz} setState={setFormMatriz} />
            <FI label="Setor" k="setor" state={formMatriz} setState={setFormMatriz} />
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">NR de Referência</label>
              <select value={formMatriz.nr_referencia_id} onChange={e => {
                const nr = nrs.find(n => n.id === e.target.value || n.codigo === e.target.value);
                setFormMatriz(f => ({ ...f, nr_referencia_id: e.target.value, nr_codigo: nr?.codigo || "", nr_nome: nr?.nome || "" }));
              }} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {nrs.map((n, i) => <option key={n.id || i} value={n.id || n.codigo}>{n.codigo} — {n.nome}</option>)}
              </select>
            </div>
            <FI label="Curso Obrigatório" k="curso_obrigatorio" state={formMatriz} setState={setFormMatriz} />
            <FI label="Carga Horária (h)" k="carga_horaria" type="number" state={formMatriz} setState={setFormMatriz} />
            <FI label="Periodicidade (meses, 0=único)" k="periodicidade_meses" type="number" state={formMatriz} setState={setFormMatriz} />
            <FI label="Prazo Inicial (dias após admissão)" k="prazo_inicial_dias" type="number" state={formMatriz} setState={setFormMatriz} />
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Nível de Risco</label>
              <select value={formMatriz.nivel_risco} onChange={e => setFormMatriz(f => ({ ...f, nivel_risco: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                {["Crítico","Alto","Médio","Baixo"].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Justificativa (por que esta NR exige este treinamento para esta função)</label>
              <textarea rows={3} value={formMatriz.justificativa || ""} onChange={e => setFormMatriz(f => ({ ...f, justificativa: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalMatriz(false)}>Cancelar</Button>
            <Button onClick={saveMatriz} disabled={saving} className="bg-rose-600 hover:bg-rose-700">{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal NR */}
      <Dialog open={modalNR} onOpenChange={setModalNR}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingNR ? "Editar NR" : "Nova NR"}</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3 py-2">
            <FI label="Código (ex: NR-35)" k="codigo" state={formNR} setState={setFormNR} />
            <FI label="Nome" k="nome" state={formNR} setState={setFormNR} />
            <FI label="Órgão Emissor" k="orgao_emissor" state={formNR} setState={setFormNR} />
            <FI label="Revisão (meses)" k="periodicidade_revisao_meses" type="number" state={formNR} setState={setFormNR} />
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Grau de Risco</label>
              <select value={formNR.aplicavel_grau_risco} onChange={e => setFormNR(f => ({ ...f, aplicavel_grau_risco: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                {["Todos","1","2","3","4"].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Descrição</label>
              <textarea rows={2} value={formNR.descricao || ""} onChange={e => setFormNR(f => ({ ...f, descricao: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalNR(false)}>Cancelar</Button>
            <Button onClick={saveNR} disabled={saving} className="bg-rose-600 hover:bg-rose-700">{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Relatório */}
      <Dialog open={modalRelatorio} onOpenChange={setModalRelatorio}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Relatório Completo de Conformidade NR</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm">
            {funcoes.map(f => (
              <div key={f} className="border rounded-xl p-4">
                <h3 className="font-bold text-gray-800 mb-2">{f}</h3>
                {matrizes.filter(m => m.funcao === f).map((m, i) => (
                  <div key={i} className="border-l-4 border-rose-300 pl-3 mb-3">
                    <p className="font-medium">{m.curso_obrigatorio} <span className="text-gray-400">({m.nr_codigo})</span></p>
                    <p className="text-xs text-gray-500 mt-0.5">Carga: {m.carga_horaria}h | Periodicidade: {m.periodicidade_meses === 0 ? "Único" : `${m.periodicidade_meses}m`} | Risco: {m.nivel_risco}</p>
                    {m.justificativa && <p className="text-xs text-gray-600 mt-1 italic">"{m.justificativa}"</p>}
                  </div>
                ))}
              </div>
            ))}
            {funcoes.length === 0 && <p className="text-center text-gray-400 py-6">Nenhuma vinculação cadastrada</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Solicitação */}
      <Dialog open={modalSolicitacao} onOpenChange={setModalSolicitacao}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Solicitação de Treinamento</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Empresa</label>
              <select value={formSol.empresa_mestre_id} onChange={e => setFormSol(f => ({ ...f, empresa_mestre_id: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
              </select>
            </div>
            <div className="col-span-2"><FI label="Título do Treinamento *" k="titulo_treinamento" state={formSol} setState={setFormSol} /></div>
            <FI label="NR Relacionada" k="nr_relacionada" state={formSol} setState={setFormSol} />
            <FI label="Nº Participantes" k="numero_participantes" type="number" state={formSol} setState={setFormSol} />
            <FI label="Data Preferencial" k="data_preferencial" type="date" state={formSol} setState={setFormSol} />
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Local Preferencial</label>
              <select value={formSol.local_preferencial} onChange={e => setFormSol(f => ({ ...f, local_preferencial: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                {["Presencial","Online","Híbrido"].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Colaboradores</label>
              <textarea rows={2} value={formSol.colaboradores_nomes || ""} onChange={e => setFormSol(f => ({ ...f, colaboradores_nomes: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" placeholder="Nomes separados por vírgula" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalSolicitacao(false)}>Cancelar</Button>
            <Button onClick={saveSolicitacao} disabled={saving || !formSol.titulo_treinamento} className="bg-rose-600 hover:bg-rose-700">{saving ? "Salvando..." : "Enviar Solicitação"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}