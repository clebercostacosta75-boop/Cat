import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Calendar, Bell, History, Edit2, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from "date-fns";

const STATUS_STYLES = {
  "Aguardando Análise": "bg-gray-100 text-gray-600",
  "Em Análise": "bg-blue-100 text-blue-700",
  "Aprovado": "bg-green-100 text-green-600",
  "Agendado": "bg-green-100 text-green-700",
  "Concluído": "bg-emerald-100 text-emerald-800",
  "Cancelado": "bg-red-100 text-red-700",
};

const ORIGEM_STYLE = { "Portal Empresa": "bg-blue-100 text-blue-700", "Portal CAT": "bg-orange-100 text-orange-700" };

const EMPTY_SOL = { titulo_treinamento: "", nr_relacionada: "", numero_participantes: "", colaboradores_nomes: "", data_preferencial: "", local_preferencial: "Presencial", descricao: "", empresa_mestre_id: "", tipo_solicitacao: "Empresa Solicita", origem: "Portal Empresa" };
const EMPTY_RESP = { status: "Em Análise", instrutor_designado: "", custo_estimado: "", data_confirmada: "", horario_inicio: "", horario_fim: "", link_online: "", observacoes_cat: "" };

export default function AgendamentoTreinamentos() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [modalNova, setModalNova] = useState(false);
  const [modalResposta, setModalResposta] = useState(false);
  const [solSelecionada, setSolSelecionada] = useState(null);
  const [formNova, setFormNova] = useState(EMPTY_SOL);
  const [formResp, setFormResp] = useState(EMPTY_RESP);
  const [saving, setSaving] = useState(false);
  const [mesAtual, setMesAtual] = useState(new Date());

  const load = async () => {
    setLoading(true);
    const [sols, emps] = await Promise.all([
      base44.entities.SolicitacaoTreinamento.list("-created_date", 500),
      base44.entities.EmpresaMestre.list("razao_social", 200),
    ]);
    setSolicitacoes(sols);
    setEmpresas(emps);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = solicitacoes.filter(s =>
    (!filtroEmpresa || s.empresa_mestre_id === filtroEmpresa) &&
    (!filtroStatus || s.status === filtroStatus) &&
    (!filtroTipo || s.tipo_solicitacao === filtroTipo)
  );

  const saveNova = async () => {
    setSaving(true);
    const emp = empresas.find(e => e.id === formNova.empresa_mestre_id);
    await base44.entities.SolicitacaoTreinamento.create({ ...formNova, empresa_mestre_nome: emp?.razao_social || "", status: "Aguardando Análise", numero_participantes: parseInt(formNova.numero_participantes) || 0 });
    setSaving(false); setModalNova(false); load();
  };

  const saveResposta = async () => {
    if (!solSelecionada) return;
    setSaving(true);
    await base44.entities.SolicitacaoTreinamento.update(solSelecionada.id, { ...formResp, custo_estimado: parseFloat(formResp.custo_estimado) || undefined, numero_participantes: parseInt(solSelecionada.numero_participantes) || 0 });
    setSaving(false); setModalResposta(false); load();
  };

  const openResposta = (sol) => { setSolSelecionada(sol); setFormResp({ status: sol.status || "Em Análise", instrutor_designado: sol.instrutor_designado || "", custo_estimado: sol.custo_estimado || "", data_confirmada: sol.data_confirmada || "", horario_inicio: sol.horario_inicio || "", horario_fim: sol.horario_fim || "", link_online: sol.link_online || "", observacoes_cat: sol.observacoes_cat || "" }); setModalResposta(true); };

  // Calendário
  const agendados = solicitacoes.filter(s => s.status === "Agendado" && s.data_confirmada);
  const diasMes = eachDayOfInterval({ start: startOfMonth(mesAtual), end: endOfMonth(mesAtual) });
  const primeiraCol = getDay(startOfMonth(mesAtual));

  const concluidos = solicitacoes.filter(s => s.status === "Concluído");
  const totalHoras = concluidos.reduce((s, c) => s + 0, 0); // placeholder
  const totalCusto = concluidos.reduce((s, c) => s + (c.custo_estimado || 0), 0);
  const empresasAtend = [...new Set(concluidos.map(c => c.empresa_mestre_nome).filter(Boolean))].length;

  const FN = ({ label, k, type = "text", state, setState }) => (
    <div><label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      <Input type={type} value={state[k] ?? ""} onChange={e => setState(s => ({ ...s, [k]: e.target.value }))} /></div>
  );

  const notificacoes = [
    ...solicitacoes.filter(s => s.tipo_solicitacao === "Empresa Solicita" && s.status === "Aguardando Análise").map(s => ({ tipo: "📩", texto: `Nova solicitação de ${s.empresa_mestre_nome}: "${s.titulo_treinamento}"`, data: s.created_date, status: s.notificacao_enviada ? "Enviada" : "Pendente", id: s.id })),
    ...solicitacoes.filter(s => s.status === "Agendado").map(s => ({ tipo: "📅", texto: `Treinamento agendado para ${s.empresa_mestre_nome}: "${s.titulo_treinamento}" em ${s.data_confirmada || "—"}`, data: s.data_confirmada, status: "Enviada", id: s.id + "a" })),
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Calendar className="w-6 h-6 text-rose-600" /> Agendamento de Treinamentos</h1>
        <p className="text-sm text-gray-500">Solicitações, cronograma, notificações e histórico</p>
      </div>

      <Tabs defaultValue="solicitacoes">
        <TabsList className="flex flex-wrap gap-1 h-auto bg-gray-100 p-1 mb-4">
          {[["solicitacoes","📋 Solicitações"],["cronograma","📅 Cronograma"],["notificacoes","🔔 Notificações"],["historico","📜 Histórico"]].map(([v,l]) => (
            <TabsTrigger key={v} value={v} className="text-xs py-1.5 px-3 data-[state=active]:bg-white">{l}</TabsTrigger>
          ))}
        </TabsList>

        {/* ABA 1 – Solicitações */}
        <TabsContent value="solicitacoes">
          <div className="flex flex-wrap gap-3 mb-4">
            <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Todas as empresas</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
            </select>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Todos os status</option>
              {Object.keys(STATUS_STYLES).map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Todos os tipos</option>
              {["Empresa Solicita","CAT Programa"].map(t => <option key={t}>{t}</option>)}
            </select>
            <Button className="ml-auto bg-rose-600 hover:bg-rose-700 gap-1.5" onClick={() => { setFormNova(EMPTY_SOL); setModalNova(true); }}>
              <Plus className="w-4 h-4" /> Nova Solicitação
            </Button>
          </div>

          {loading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
            <div className="space-y-3">
              {filtered.length === 0 ? <div className="text-center py-12 text-gray-400">Nenhuma solicitação encontrada</div> :
                filtered.map(s => (
                  <div key={s.id} className="bg-white border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold text-gray-800">{s.titulo_treinamento}</p>
                          <Badge className={`text-xs ${ORIGEM_STYLE[s.origem] || ""}`}>{s.origem === "Portal Empresa" ? "EMPRESA SOLICITOU" : "CAT PROGRAMOU"}</Badge>
                        </div>
                        <p className="text-sm text-gray-500">{s.empresa_mestre_nome} {s.nr_relacionada ? `| ${s.nr_relacionada}` : ""} {s.numero_participantes ? `| ${s.numero_participantes} participantes` : ""}</p>
                        <p className="text-xs text-gray-400 mt-1">Data preferencial: {s.data_preferencial || "—"} | Local: {s.local_preferencial} {s.data_confirmada ? `| Confirmado: ${s.data_confirmada}` : ""}</p>
                        {s.instrutor_designado && <p className="text-xs text-gray-500">Instrutor: {s.instrutor_designado}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${STATUS_STYLES[s.status] || ""}`}>{s.status}</Badge>
                        <Button size="icon" variant="ghost" onClick={() => openResposta(s)}><Edit2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </TabsContent>

        {/* ABA 2 – Cronograma */}
        <TabsContent value="cronograma">
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => setMesAtual(m => subMonths(m, 1))}><ChevronLeft className="w-4 h-4" /></Button>
              <h3 className="font-semibold text-gray-800">{format(mesAtual, "MMMM yyyy")}</h3>
              <Button variant="ghost" size="sm" onClick={() => setMesAtual(m => addMonths(m, 1))}><ChevronRight className="w-4 h-4" /></Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-xs text-center mb-2">
              {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => <div key={d} className="font-medium text-gray-500 py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array(primeiraCol).fill(null).map((_, i) => <div key={`e${i}`} />)}
              {diasMes.map(dia => {
                const dStr = format(dia, "yyyy-MM-dd");
                const eventos = agendados.filter(s => s.data_confirmada === dStr);
                const isToday = dStr === format(new Date(), "yyyy-MM-dd");
                return (
                  <div key={dStr} className={`min-h-[60px] border rounded-lg p-1 ${isToday ? "bg-rose-50 border-rose-300" : "border-gray-100"}`}>
                    <p className={`text-xs font-medium mb-1 ${isToday ? "text-rose-700" : "text-gray-600"}`}>{format(dia, "d")}</p>
                    {eventos.map(e => (
                      <div key={e.id} className="bg-green-100 text-green-800 rounded text-xs px-1 py-0.5 mb-0.5 truncate" title={`${e.titulo_treinamento} — ${e.empresa_mestre_nome}`}>
                        {e.titulo_treinamento}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ABA 3 – Notificações */}
        <TabsContent value="notificacoes">
          <div className="space-y-3">
            {notificacoes.length === 0 ? <div className="text-center py-12 text-gray-400">Nenhuma notificação</div> :
              notificacoes.map((n, i) => (
                <div key={i} className="bg-white border rounded-xl p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{n.tipo}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{n.texto}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.data || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${n.status === "Enviada" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{n.status}</Badge>
                    {n.status === "Pendente" && (
                      <Button size="sm" variant="ghost" className="gap-1 text-xs"><Send className="w-3 h-3" /> Enviar</Button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </TabsContent>

        {/* ABA 4 – Histórico */}
        <TabsContent value="historico">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center"><p className="text-3xl font-bold text-blue-700">{concluidos.length}</p><p className="text-xs text-gray-500">Treinamentos</p></div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center"><p className="text-3xl font-bold text-green-700">{empresasAtend}</p><p className="text-xs text-gray-500">Empresas Atendidas</p></div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center"><p className="text-3xl font-bold text-purple-700">—</p><p className="text-xs text-gray-500">Total de Horas</p></div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center"><p className="text-3xl font-bold text-amber-700">R$ {totalCusto.toLocaleString("pt-BR")}</p><p className="text-xs text-gray-500">Custo Total</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead><tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Treinamento</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Empresa</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Instrutor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Participantes</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Custo</th>
              </tr></thead>
              <tbody>
                {concluidos.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">Nenhum treinamento concluído</td></tr> :
                  concluidos.map(s => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{s.titulo_treinamento}</td>
                      <td className="px-4 py-3 text-gray-600">{s.empresa_mestre_nome || "—"}</td>
                      <td className="px-4 py-3">{s.data_confirmada || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{s.instrutor_designado || "—"}</td>
                      <td className="px-4 py-3">{s.numero_participantes || "—"}</td>
                      <td className="px-4 py-3">{s.custo_estimado ? `R$ ${Number(s.custo_estimado).toLocaleString("pt-BR")}` : "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Nova Solicitação */}
      <Dialog open={modalNova} onOpenChange={setModalNova}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Solicitação de Treinamento</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Empresa</label>
              <select value={formNova.empresa_mestre_id} onChange={e => {
                const emp = empresas.find(em => em.id === e.target.value);
                setFormNova(f => ({ ...f, empresa_mestre_id: e.target.value, empresa_mestre_nome: emp?.razao_social || "" }));
              }} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Tipo</label>
              <select value={formNova.tipo_solicitacao} onChange={e => setFormNova(f => ({ ...f, tipo_solicitacao: e.target.value, origem: e.target.value === "CAT Programa" ? "Portal CAT" : "Portal Empresa" }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                {["Empresa Solicita","CAT Programa"].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="col-span-2"><FN label="Título do Treinamento *" k="titulo_treinamento" state={formNova} setState={setFormNova} /></div>
            <FN label="NR Relacionada" k="nr_relacionada" state={formNova} setState={setFormNova} />
            <FN label="Nº Participantes" k="numero_participantes" type="number" state={formNova} setState={setFormNova} />
            <FN label="Data Preferencial" k="data_preferencial" type="date" state={formNova} setState={setFormNova} />
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Local</label>
              <select value={formNova.local_preferencial} onChange={e => setFormNova(f => ({ ...f, local_preferencial: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                {["Presencial","Online","Híbrido"].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Colaboradores</label>
              <textarea rows={2} value={formNova.colaboradores_nomes || ""} onChange={e => setFormNova(f => ({ ...f, colaboradores_nomes: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalNova(false)}>Cancelar</Button>
            <Button onClick={saveNova} disabled={saving || !formNova.titulo_treinamento} className="bg-rose-600 hover:bg-rose-700">{saving ? "Salvando..." : "Enviar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Resposta CAT */}
      <Dialog open={modalResposta} onOpenChange={setModalResposta}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Responder / Editar Solicitação</DialogTitle></DialogHeader>
          {solSelecionada && <p className="text-sm text-gray-500 px-1 -mt-2 mb-3">"{solSelecionada.titulo_treinamento}" — {solSelecionada.empresa_mestre_nome}</p>}
          <div className="grid sm:grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
              <select value={formResp.status} onChange={e => setFormResp(f => ({ ...f, status: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                {Object.keys(STATUS_STYLES).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <FN label="Instrutor Designado" k="instrutor_designado" state={formResp} setState={setFormResp} />
            <FN label="Custo Estimado (R$)" k="custo_estimado" type="number" state={formResp} setState={setFormResp} />
            <FN label="Data Confirmada" k="data_confirmada" type="date" state={formResp} setState={setFormResp} />
            <FN label="Horário Início" k="horario_inicio" state={formResp} setState={setFormResp} />
            <FN label="Horário Fim" k="horario_fim" state={formResp} setState={setFormResp} />
            <div className="col-span-2"><FN label="Link Online" k="link_online" state={formResp} setState={setFormResp} /></div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Observações CAT</label>
              <textarea rows={3} value={formResp.observacoes_cat || ""} onChange={e => setFormResp(f => ({ ...f, observacoes_cat: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalResposta(false)}>Cancelar</Button>
            <Button onClick={saveResposta} disabled={saving} className="bg-rose-600 hover:bg-rose-700">{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}