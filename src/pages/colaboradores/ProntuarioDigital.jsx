import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Users, ChevronRight } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

const STATUS_COLORS = { "Ativo": "bg-green-100 text-green-700", "Inativo": "bg-gray-100 text-gray-500", "Afastado": "bg-yellow-100 text-yellow-700", "Férias": "bg-blue-100 text-blue-700", "Demitido": "bg-red-100 text-red-700" };
const EMPTY_PRONT = { nome_completo: "", cpf: "", data_nascimento: "", sexo: "Masculino", cargo: "", funcao: "", setor: "", data_admissao: "", turno: "", salario_base: "", grau_instrucao: "Médio", deficiencia: false, tipo_deficiencia: "", observacoes_medicas: "", restricoes_atividade: "", historico_acidentes: "", status: "Ativo", empresa_mestre_id: "" };

function getDocStatus(d) {
  if (!d) return { label: "Sem Validade", color: "bg-gray-100 text-gray-500" };
  const dias = differenceInDays(parseISO(d), new Date());
  if (dias < 0) return { label: "Vencido", color: "bg-red-100 text-red-700" };
  if (dias <= 30) return { label: `${dias}d`, color: "bg-orange-100 text-orange-700" };
  return { label: "Válido", color: "bg-green-100 text-green-700" };
}

function ProntuarioDetalhe({ prontuario, onClose }) {
  const [asos, setAsos] = useState([]);
  const [exames, setExames] = useState([]);
  const [epis, setEpis] = useState([]);
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const colId = prontuario.colaborador_sst_id;
      const [a, ex, ep, ce] = await Promise.all([
        colId ? base44.entities.ASORegistro.filter({ colaborador_sst_id: colId }) : Promise.resolve([]),
        colId ? base44.entities.ExameComplementar.filter({ colaborador_sst_id: colId }) : Promise.resolve([]),
        colId ? base44.entities.EPIEntrega.filter({ colaborador_sst_id: colId }) : Promise.resolve([]),
        base44.entities.Certificate.filter({ student_name: prontuario.nome_completo }),
      ]);
      setAsos(a); setExames(ex); setEpis(ep); setCerts(ce);
      setLoading(false);
    };
    load();
  }, [prontuario]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" onClick={onClose}>← Voltar</Button>
        <div>
          <h2 className="font-bold text-gray-800 text-lg">{prontuario.nome_completo}</h2>
          <p className="text-sm text-gray-500">{prontuario.funcao || prontuario.cargo} — {prontuario.setor}</p>
        </div>
        <Badge className={`ml-auto text-xs ${STATUS_COLORS[prontuario.status] || ""}`}>{prontuario.status}</Badge>
      </div>

      <Tabs defaultValue="dados">
        <TabsList className="flex flex-wrap gap-1 h-auto bg-gray-100 p-1 mb-4">
          {[["dados","📋 Dados"],["asos","🏥 ASOs"],["exames","🔬 Exames"],["epis","🦺 EPIs"],["treinamentos","🎓 Treinamentos"],["medico","⚕️ Médico"]].map(([v,l]) => (
            <TabsTrigger key={v} value={v} className="text-xs py-1.5 px-2.5 data-[state=active]:bg-white">{l}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dados">
          <div className="bg-white border rounded-xl p-5 grid sm:grid-cols-2 gap-4">
            {prontuario.foto && <div className="col-span-2 flex justify-center"><img src={prontuario.foto} alt="foto" className="w-24 h-24 rounded-full object-cover border" /></div>}
            {[["Nome","nome_completo"],["CPF","cpf"],["Nascimento","data_nascimento"],["Sexo","sexo"],["Grau Instrução","grau_instrucao"],["Cargo","cargo"],["Função","funcao"],["Setor","setor"],["Admissão","data_admissao"],["Turno","turno"],["Salário Base","salario_base"]].map(([l,k]) => (
              <div key={k}><p className="text-xs text-gray-400">{l}</p><p className="font-medium text-gray-800">{prontuario[k] || "—"}</p></div>
            ))}
            {prontuario.deficiencia && <div><p className="text-xs text-gray-400">Deficiência</p><p className="font-medium">{prontuario.tipo_deficiencia || "Sim"}</p></div>}
          </div>
        </TabsContent>

        <TabsContent value="asos">
          {loading ? <div className="text-center py-8 text-gray-400">Carregando...</div> : (
            <div className="space-y-3">
              {asos.length === 0 ? <p className="text-center py-8 text-gray-400">Nenhum ASO</p> :
                asos.sort((a,b) => (b.data_exame||"").localeCompare(a.data_exame||"")).map(a => {
                  const st = getDocStatus(a.data_vencimento);
                  return (
                    <div key={a.id} className={`bg-white border rounded-xl p-4 flex items-center justify-between ${st.label === "Vencido" ? "border-red-300" : ""}`}>
                      <div>
                        <p className="font-medium">{a.tipo_exame}</p>
                        <p className="text-xs text-gray-500">Data: {a.data_exame || "—"} | Médico: {a.medico_responsavel || "—"} | Vencimento: {a.data_vencimento || "—"}</p>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <Badge className={`text-xs ${a.resultado === "Apto" ? "bg-green-100 text-green-700" : a.resultado === "Inapto" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{a.resultado}</Badge>
                        <Badge className={`text-xs ${st.color}`}>{st.label}</Badge>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="exames">
          {loading ? <div className="text-center py-8 text-gray-400">Carregando...</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Data</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Resultado</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Vencimento</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                </tr></thead>
                <tbody>
                  {exames.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhum exame</td></tr> :
                    exames.map(ex => {
                      const st = getDocStatus(ex.data_vencimento);
                      return <tr key={ex.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{ex.tipo_exame}</td>
                        <td className="px-4 py-2">{ex.data_realizacao || "—"}</td>
                        <td className="px-4 py-2">{ex.resultado || "—"}</td>
                        <td className="px-4 py-2">{ex.data_vencimento || "—"}</td>
                        <td className="px-4 py-2"><Badge className={`text-xs ${st.color}`}>{st.label}</Badge></td>
                      </tr>;
                    })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="epis">
          {loading ? <div className="text-center py-8 text-gray-400">Carregando...</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">EPI</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">CA</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Tamanho</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Entrega</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Próx. Troca</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Assinatura</th>
                </tr></thead>
                <tbody>
                  {epis.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhum EPI</td></tr> :
                    epis.map(ep => {
                      const st = getDocStatus(ep.data_proxima_troca);
                      return <tr key={ep.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{ep.epi_nome || "—"}</td>
                        <td className="px-4 py-2 font-mono text-xs">{ep.numero_ca || "—"}</td>
                        <td className="px-4 py-2">{ep.tamanho || "—"}</td>
                        <td className="px-4 py-2">{ep.data_entrega || "—"}</td>
                        <td className={`px-4 py-2 ${st.label === "Vencido" ? "text-red-600 font-medium" : ""}`}>{ep.data_proxima_troca || "—"}</td>
                        <td className="px-4 py-2"><Badge className={`text-xs ${{"Pendente":"bg-amber-100 text-amber-700","Assinado":"bg-green-100 text-green-700","Recusado":"bg-red-100 text-red-700"}[ep.status_assinatura]||""}`}>{ep.status_assinatura}</Badge></td>
                      </tr>;
                    })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="treinamentos">
          {loading ? <div className="text-center py-8 text-gray-400">Carregando...</div> : (
            <div className="space-y-2">
              {certs.length === 0 ? <p className="text-center py-8 text-gray-400">Nenhum certificado encontrado</p> :
                certs.map(c => {
                  const st = getDocStatus(c.valid_until);
                  return <div key={c.id} className="bg-white border rounded-lg p-3 flex items-center justify-between">
                    <div><p className="font-medium text-sm">{c.course_name}</p><p className="text-xs text-gray-500">{c.end_date || "—"}</p></div>
                    <Badge className={`text-xs ${st.color}`}>{st.label}</Badge>
                  </div>;
                })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="medico">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700 mb-4">
            ⚕️ Conteúdo visível apenas para: Médico do Trabalho, SST, Gestor Master
          </div>
          <div className="bg-white border rounded-xl p-5 space-y-4">
            {[["Observações Médicas","observacoes_medicas"],["Restrições de Atividade","restricoes_atividade"],["Histórico de Acidentes","historico_acidentes"]].map(([l,k]) => (
              <div key={k}><p className="text-xs text-gray-400 font-medium mb-1">{l}</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{prontuario[k] || "Nenhuma informação registrada"}</p></div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ProntuarioDigital() {
  const [prontuarios, setProntuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_PRONT);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [pr, emps] = await Promise.all([
      base44.entities.ProntuarioColaborador.list("-created_date", 500),
      base44.entities.EmpresaMestre.list("razao_social", 200),
    ]);
    setProntuarios(pr);
    setEmpresas(emps);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setores = [...new Set(prontuarios.map(p => p.setor).filter(Boolean))];

  const filtered = prontuarios.filter(p =>
    (p.nome_completo?.toLowerCase().includes(search.toLowerCase()) || p.cpf?.includes(search)) &&
    (!filtroEmpresa || p.empresa_mestre_id === filtroEmpresa) &&
    (!filtroSetor || p.setor === filtroSetor) &&
    (!filtroStatus || p.status === filtroStatus)
  );

  const save = async () => {
    setSaving(true);
    const emp = empresas.find(e => e.id === form.empresa_mestre_id);
    const payload = { ...form, empresa_mestre_nome: emp?.razao_social || "", salario_base: form.salario_base ? parseFloat(form.salario_base) : undefined };
    await base44.entities.ProntuarioColaborador.create(payload);
    setSaving(false); setModalOpen(false); load();
  };

  const FI = ({ label, k, type = "text" }) => (
    <div><label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      <Input type={type} value={form[k] || ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} /></div>
  );

  if (selected) return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <ProntuarioDetalhe prontuario={selected} onClose={() => setSelected(null)} />
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users className="w-6 h-6 text-rose-600" /> Prontuário Digital</h1>
          <p className="text-sm text-gray-500">Histórico completo: ASOs, exames, EPIs, treinamentos</p>
        </div>
        <Button className="bg-rose-600 hover:bg-rose-700 gap-1.5" onClick={() => { setForm(EMPTY_PRONT); setModalOpen(true); }}>
          <Plus className="w-4 h-4" /> Novo Prontuário
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar por nome ou CPF..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Todas as empresas</option>
          {empresas.map(e => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
        </select>
        <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Todos os setores</option>
          {setores.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Todos os status</option>
          {["Ativo","Inativo","Afastado","Férias","Demitido"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
            <thead><tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">CPF</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Cargo/Função</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Setor</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Empresa</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-400">Nenhum prontuário encontrado</td></tr> :
                filtered.map(p => (
                  <tr key={p.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(p)}>
                    <td className="px-4 py-3 font-medium text-rose-700">{p.nome_completo}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.cpf || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{p.funcao || p.cargo || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{p.setor || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{p.empresa_mestre_nome || "—"}</td>
                    <td className="px-4 py-3"><Badge className={`text-xs ${STATUS_COLORS[p.status] || ""}`}>{p.status}</Badge></td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" onClick={() => setSelected(p)}><ChevronRight className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Prontuário</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Empresa</label>
              <select value={form.empresa_mestre_id} onChange={e => setForm(f => ({ ...f, empresa_mestre_id: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
              </select>
            </div>
            <FI label="Nome Completo" k="nome_completo" /><FI label="CPF" k="cpf" />
            <FI label="Data Nascimento" k="data_nascimento" type="date" />
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Sexo</label>
              <select value={form.sexo} onChange={e => setForm(f => ({ ...f, sexo: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                {["Masculino","Feminino","Outro"].map(v => <option key={v}>{v}</option>)}
              </select></div>
            <FI label="Cargo" k="cargo" /><FI label="Função" k="funcao" />
            <FI label="Setor" k="setor" /><FI label="Data Admissão" k="data_admissao" type="date" />
            <FI label="Turno" k="turno" /><FI label="Salário Base" k="salario_base" type="number" />
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Grau Instrução</label>
              <select value={form.grau_instrucao} onChange={e => setForm(f => ({ ...f, grau_instrucao: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                {["Fundamental","Médio","Técnico","Superior","Pós-graduação"].map(v => <option key={v}>{v}</option>)}
              </select></div>
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                {["Ativo","Inativo","Afastado","Férias","Demitido"].map(v => <option key={v}>{v}</option>)}
              </select></div>
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