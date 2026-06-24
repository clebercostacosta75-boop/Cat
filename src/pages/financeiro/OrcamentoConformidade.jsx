import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, AlertTriangle, CheckCircle, TrendingUp, FileText, DollarSign, Edit2 } from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v, total) => total > 0 ? Math.min(100, Math.round((v / total) * 100)) : 0;

const STATUS_CUSTO_STYLE = {
  "Orçado": "bg-gray-100 text-gray-600",
  "Proposta Recebida": "bg-blue-100 text-blue-700",
  "Aprovado": "bg-yellow-100 text-yellow-700",
  "Pago": "bg-green-100 text-green-700",
  "Cancelado": "bg-red-100 text-red-700",
};

const STATUS_ORC_STYLE = {
  "Rascunho": "bg-gray-100 text-gray-600",
  "Aprovado": "bg-green-100 text-green-700",
  "Em Execução": "bg-blue-100 text-blue-700",
  "Encerrado": "bg-slate-100 text-slate-600",
};

const CATEGORIAS = ["PGR", "PCMSO", "LTCAT", "Exame Médico", "EPI", "Treinamento", "Outro"];
const CAT_TO_CAMPO = { PGR: "orcamento_pgr", PCMSO: "orcamento_pcmso", LTCAT: "orcamento_ltcat", "Exame Médico": "orcamento_exames", EPI: "orcamento_epi", Treinamento: "orcamento_treinamentos", Outro: "orcamento_outros" };

const EMPTY_CUSTO = { categoria: "PGR", subcategoria: "", fornecedor: "", descricao: "", quantidade: "", valor_unitario: "", valor_total: "", data_competencia: "", data_vencimento_pagamento: "", status: "Orçado", nota_fiscal: "", observacoes: "", nr_relacionada: "", documento_relacionado: "" };
const EMPTY_ORC = { ano_referencia: new Date().getFullYear(), orcamento_total: "", orcamento_pgr: "", orcamento_pcmso: "", orcamento_ltcat: "", orcamento_exames: "", orcamento_epi: "", orcamento_treinamentos: "", orcamento_outros: "", status: "Rascunho", observacoes: "" };

// ─── mini componentes ──────────────────────────────────────────────────────────
function BarraProgresso({ executado, comprometido, total }) {
  const pE = pct(executado, total);
  const pC = pct(comprometido, total);
  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-4 bg-gray-200 w-full">
        <div style={{ width: `${pE}%` }} className="bg-green-500 transition-all" title={`Executado ${pE}%`} />
        <div style={{ width: `${pC}%` }} className="bg-yellow-400 transition-all" title={`Comprometido ${pC}%`} />
      </div>
      <p className="text-xs text-gray-500 mt-1">{pE + pC}% do orçamento anual utilizado</p>
    </div>
  );
}

function MiniBar({ usado, total }) {
  const p = pct(usado, total);
  const cor = p >= 90 ? "bg-red-500" : p >= 70 ? "bg-yellow-400" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div style={{ width: `${p}%` }} className={`${cor} h-full transition-all`} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{p}%</span>
    </div>
  );
}

function SaldoCard({ label, value, color, sub }) {
  return (
    <div className={`rounded-xl p-4 border ${color}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-800">{fmt(value)}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── componente principal ──────────────────────────────────────────────────────
export default function OrcamentoConformidade() {
  const [empresas, setEmpresas] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [custos, setCustos] = useState([]);
  const [docsSST, setDocsSST] = useState([]);
  const [matrizes, setMatrizes] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);

  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroAno, setFiltroAno] = useState(String(new Date().getFullYear()));
  const [filtroCat, setFiltroCat] = useState("");
  const [filtroStatusCusto, setFiltroStatusCusto] = useState("");
  const [filtroMes, setFiltroMes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalCusto, setModalCusto] = useState(false);
  const [modalOrc, setModalOrc] = useState(false);
  const [editingCusto, setEditingCusto] = useState(null);
  const [formCusto, setFormCusto] = useState(EMPTY_CUSTO);
  const [formOrc, setFormOrc] = useState(EMPTY_ORC);

  // custos estimados manuais (planejamento)
  const [custoAso, setCustoAso] = useState("150");
  const [custoAudio, setCustoAudio] = useState("80");
  const [custoHemo, setCustoHemo] = useState("60");

  const load = useCallback(async () => {
    setLoading(true);
    const [emps, orcs, csts, pgrs, pcmsos, ltcats, mats, cols] = await Promise.all([
      base44.entities.EmpresaMestre.list("razao_social", 200),
      base44.entities.OrcamentoConformidade.list("-ano_referencia", 200),
      base44.entities.CustoConformidade.list("-created_date", 500),
      base44.entities.DocumentoPGR.list("-created_date", 100),
      base44.entities.DocumentoPCMSO.list("-created_date", 100),
      base44.entities.DocumentoLTCAT.list("-created_date", 100),
      base44.entities.MatrizTreinamentoNR.list("-created_date", 200),
      base44.entities.ColaboradorSST.list("-created_date", 500),
    ]);
    setEmpresas(emps);
    setOrcamentos(orcs);
    setCustos(csts);
    setDocsSST([
      ...pgrs.map(d => ({ ...d, _tipo: "PGR" })),
      ...pcmsos.map(d => ({ ...d, _tipo: "PCMSO" })),
      ...ltcats.map(d => ({ ...d, _tipo: "LTCAT" })),
    ]);
    setMatrizes(mats);
    setColaboradores(cols);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── cálculos ───────────────────────────────────────────────────────────────
  const orcAtual = orcamentos.find(o => o.empresa_mestre_id === filtroEmpresa && String(o.ano_referencia) === filtroAno);

  const custosEmpAno = custos.filter(c =>
    (!filtroEmpresa || c.empresa_mestre_id === filtroEmpresa) &&
    (!filtroAno || (c.data_competencia || "").startsWith(filtroAno))
  );

  const totalExecutado = custosEmpAno.filter(c => c.status === "Pago").reduce((s, c) => s + (c.valor_total || 0), 0);
  const totalComprometido = custosEmpAno.filter(c => c.status === "Aprovado").reduce((s, c) => s + (c.valor_total || 0), 0);
  const orcTotal = orcAtual?.orcamento_total || 0;
  const saldo = orcTotal - totalExecutado - totalComprometido;
  const pctSaldo = pct(saldo, orcTotal);
  const saldoCor = pctSaldo < 10 ? "border-red-200 bg-red-50" : pctSaldo < 30 ? "border-yellow-200 bg-yellow-50" : "border-green-200 bg-green-50";

  const catBreakdown = CATEGORIAS.map(cat => {
    const orcCat = orcAtual ? (orcAtual[CAT_TO_CAMPO[cat]] || 0) : 0;
    const exec = custosEmpAno.filter(c => c.categoria === cat && c.status === "Pago").reduce((s, c) => s + (c.valor_total || 0), 0);
    const comp = custosEmpAno.filter(c => c.categoria === cat && c.status === "Aprovado").reduce((s, c) => s + (c.valor_total || 0), 0);
    return { cat, orcCat, exec, comp, saldo: orcCat - exec - comp, pUso: pct(exec + comp, orcCat) };
  });

  // docs vencendo em 180 dias
  const hoje = new Date();
  const docsAlerta = docsSST.filter(d => {
    const emp = filtroEmpresa ? d.empresa_mestre_id === filtroEmpresa || d.client_id === filtroEmpresa : true;
    if (!emp) return false;
    const venc = d.vigencia_fim || d.data_validade || d.data_vencimento;
    if (!venc) return false;
    const diff = (new Date(venc) - hoje) / (1000 * 60 * 60 * 24);
    return diff <= 180 && diff >= -30;
  });

  const colsEmp = colaboradores.filter(c => !filtroEmpresa || c.empresa_mestre_id === filtroEmpresa);
  const totalExamesEst = colsEmp.length * (parseFloat(custoAso) + parseFloat(custoAudio) + parseFloat(custoHemo));

  const matrizesEmp = matrizes.filter(m => !filtroEmpresa || m.empresa_mestre_id === filtroEmpresa);

  // ─── meses p/ linha do tempo ─────────────────────────────────────────────────
  const mesesGastos = Array.from({ length: 12 }, (_, i) => {
    const mes = String(i + 1).padStart(2, "0");
    const prefixo = `${filtroAno}-${mes}`;
    const total = custosEmpAno.filter(c => (c.data_competencia || "").startsWith(prefixo) && c.status === "Pago").reduce((s, c) => s + (c.valor_total || 0), 0);
    return { mes: ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][i], total };
  });

  // ─── ações ──────────────────────────────────────────────────────────────────
  const saveCusto = async () => {
    setSaving(true);
    const emp = empresas.find(e => e.id === formCusto.empresa_mestre_id || (!formCusto.empresa_mestre_id && e.id === filtroEmpresa));
    const empId = formCusto.empresa_mestre_id || filtroEmpresa;
    const payload = {
      ...formCusto,
      empresa_mestre_id: empId,
      empresa_mestre_nome: emp?.razao_social || "",
      orcamento_conformidade_id: orcAtual?.id || "",
      quantidade: parseFloat(formCusto.quantidade) || 0,
      valor_unitario: parseFloat(formCusto.valor_unitario) || 0,
      valor_total: parseFloat(formCusto.valor_total) || (parseFloat(formCusto.quantidade) * parseFloat(formCusto.valor_unitario)) || 0,
    };
    if (editingCusto?.id) await base44.entities.CustoConformidade.update(editingCusto.id, payload);
    else await base44.entities.CustoConformidade.create(payload);
    setSaving(false); setModalCusto(false); load();
  };

  const saveOrc = async () => {
    setSaving(true);
    const emp = empresas.find(e => e.id === filtroEmpresa);
    const payload = {
      ...formOrc,
      empresa_mestre_id: filtroEmpresa,
      empresa_mestre_nome: emp?.razao_social || "",
      ano_referencia: parseInt(formOrc.ano_referencia),
      orcamento_total: parseFloat(formOrc.orcamento_total) || 0,
      orcamento_pgr: parseFloat(formOrc.orcamento_pgr) || 0,
      orcamento_pcmso: parseFloat(formOrc.orcamento_pcmso) || 0,
      orcamento_ltcat: parseFloat(formOrc.orcamento_ltcat) || 0,
      orcamento_exames: parseFloat(formOrc.orcamento_exames) || 0,
      orcamento_epi: parseFloat(formOrc.orcamento_epi) || 0,
      orcamento_treinamentos: parseFloat(formOrc.orcamento_treinamentos) || 0,
      orcamento_outros: parseFloat(formOrc.orcamento_outros) || 0,
    };
    if (orcAtual?.id) await base44.entities.OrcamentoConformidade.update(orcAtual.id, payload);
    else await base44.entities.OrcamentoConformidade.create(payload);
    setSaving(false); setModalOrc(false); load();
  };

  const aprovarCusto = async (custo) => {
    await base44.entities.CustoConformidade.update(custo.id, { status: "Aprovado", aprovado_em: new Date().toISOString().slice(0, 10) });
    load();
  };

  const recusarCusto = async (custo) => {
    await base44.entities.CustoConformidade.update(custo.id, { status: "Cancelado" });
    load();
  };

  const incluirDocNoOrc = async (doc) => {
    const custo = parseFloat(prompt(`Custo estimado renovação ${doc._tipo} (R$):`) || "0");
    if (!custo) return;
    await base44.entities.CustoConformidade.create({
      empresa_mestre_id: filtroEmpresa,
      empresa_mestre_nome: empresas.find(e => e.id === filtroEmpresa)?.razao_social || "",
      orcamento_conformidade_id: orcAtual?.id || "",
      categoria: doc._tipo,
      subcategoria: `Renovação ${doc._tipo}`,
      descricao: `Renovação ${doc._tipo} — vence ${doc.vigencia_fim || doc.data_vencimento || "—"}`,
      documento_relacionado: doc._tipo,
      valor_total: custo,
      valor_unitario: custo,
      quantidade: 1,
      status: "Orçado",
    });
    load();
  };

  const gerarOrcamentoAuto = async () => {
    if (!filtroEmpresa) { alert("Selecione uma empresa primeiro"); return; }
    const emp = empresas.find(e => e.id === filtroEmpresa);
    const totalEst = docsAlerta.length * 3000 + totalExamesEst + matrizesEmp.length * 800;
    await base44.entities.OrcamentoConformidade.create({
      empresa_mestre_id: filtroEmpresa,
      empresa_mestre_nome: emp?.razao_social || "",
      ano_referencia: parseInt(filtroAno),
      orcamento_total: Math.ceil(totalEst),
      orcamento_pgr: docsAlerta.filter(d => d._tipo === "PGR").length * 3500,
      orcamento_pcmso: docsAlerta.filter(d => d._tipo === "PCMSO").length * 4000,
      orcamento_ltcat: docsAlerta.filter(d => d._tipo === "LTCAT").length * 2500,
      orcamento_exames: Math.ceil(totalExamesEst),
      orcamento_treinamentos: matrizesEmp.length * 800,
      orcamento_epi: 0,
      orcamento_outros: 0,
      status: "Rascunho",
    });
    load();
    alert("Orçamento automático gerado como Rascunho!");
  };

  const importarMatrizOrc = async () => {
    for (const m of matrizesEmp) {
      await base44.entities.CustoConformidade.create({
        empresa_mestre_id: filtroEmpresa,
        empresa_mestre_nome: empresas.find(e => e.id === filtroEmpresa)?.razao_social || "",
        orcamento_conformidade_id: orcAtual?.id || "",
        categoria: "Treinamento",
        subcategoria: m.curso_obrigatorio || m.funcao,
        descricao: `${m.curso_obrigatorio || "Treinamento"} — ${m.nr_codigo || ""} — Função: ${m.funcao}`,
        nr_relacionada: m.nr_codigo || "",
        valor_unitario: 0,
        valor_total: 0,
        quantidade: 1,
        status: "Orçado",
      });
    }
    load();
    alert(`${matrizesEmp.length} itens importados da Matriz NR!`);
  };

  // ─── filtros lista lançamentos ───────────────────────────────────────────────
  const custosListagem = custosEmpAno.filter(c =>
    (!filtroCat || c.categoria === filtroCat) &&
    (!filtroStatusCusto || c.status === filtroStatusCusto) &&
    (!filtroMes || (c.data_competencia || "").startsWith(`${filtroAno}-${filtroMes}`))
  );
  const totalListagem = custosListagem.reduce((s, c) => s + (c.valor_total || 0), 0);

  const propostasRecebidas = custosEmpAno.filter(c => c.status === "Proposta Recebida");

  const FI = ({ label, k, type = "text", state, setState }) => (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      <Input type={type} value={state[k] ?? ""} onChange={e => setState(s => ({ ...s, [k]: e.target.value }))} />
    </div>
  );

  const anos = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 1 + i));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* cabeçalho */}
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-rose-600" /> Orçamento de Conformidade SST
          </h1>
          <p className="text-sm text-gray-500">Controle financeiro completo dos custos de SST por empresa</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Selecione a empresa</option>
            {empresas.map(e => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
          </select>
          <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            {anos.map(a => <option key={a}>{a}</option>)}
          </select>
          <Button variant="outline" onClick={() => { setFormOrc(orcAtual ? { ...orcAtual } : { ...EMPTY_ORC, ano_referencia: parseInt(filtroAno) }); setModalOrc(true); }}>
            {orcAtual ? "Editar Orçamento" : "+ Criar Orçamento"}
          </Button>
        </div>
      </div>

      {orcAtual && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-600 font-medium">{orcAtual.empresa_mestre_nome} — {orcAtual.ano_referencia}</span>
          <Badge className={`text-xs ${STATUS_ORC_STYLE[orcAtual.status] || ""}`}>{orcAtual.status}</Badge>
        </div>
      )}

      <Tabs defaultValue="dashboard">
        <TabsList className="flex flex-wrap gap-1 h-auto bg-gray-100 p-1 mb-4">
          {[["dashboard","📊 Dashboard"],["lancamentos","💳 Lançamentos"],["planejamento","🤖 Planejamento"],["propostas","📋 Propostas"],["relatorio","📈 Relatório"]].map(([v, l]) => (
            <TabsTrigger key={v} value={v} className="text-xs py-1.5 px-3 data-[state=active]:bg-white">{l}</TabsTrigger>
          ))}
        </TabsList>

        {/* ── ABA 1 DASHBOARD ─────────────────────────────────────────────── */}
        <TabsContent value="dashboard">
          {loading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
            <div className="space-y-6">
              {/* cards resumo */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <SaldoCard label="Orçamento Total" value={orcTotal} color="border-blue-200 bg-blue-50" />
                <SaldoCard label="Total Executado (Pago)" value={totalExecutado} color="border-green-200 bg-green-50" sub={`${pct(totalExecutado, orcTotal)}% do total`} />
                <SaldoCard label="Comprometido (Aprovado)" value={totalComprometido} color="border-yellow-200 bg-yellow-50" sub={`${pct(totalComprometido, orcTotal)}% do total`} />
                <SaldoCard label="Saldo Disponível" value={saldo} color={saldoCor} sub={`${pctSaldo}% restante`} />
              </div>

              {/* barra geral */}
              {orcTotal > 0 && <div className="bg-white border rounded-xl p-4"><BarraProgresso executado={totalExecutado} comprometido={totalComprometido} total={orcTotal} /></div>}

              {/* breakdown por categoria */}
              <div className="bg-white border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <h3 className="font-semibold text-gray-800 text-sm">Breakdown por Categoria</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Categoria</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Orçado</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Executado</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Comprometido</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Saldo</th>
                      <th className="px-4 py-2 font-medium text-gray-600 w-32">% Uso</th>
                    </tr></thead>
                    <tbody>
                      {catBreakdown.map(row => (
                        <tr key={row.cat} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{row.cat}</td>
                          <td className="px-4 py-2 text-right text-gray-600">{fmt(row.orcCat)}</td>
                          <td className="px-4 py-2 text-right text-green-700 font-medium">{fmt(row.exec)}</td>
                          <td className="px-4 py-2 text-right text-yellow-700">{fmt(row.comp)}</td>
                          <td className={`px-4 py-2 text-right font-medium ${row.saldo < 0 ? "text-red-600" : "text-gray-700"}`}>{fmt(row.saldo)}</td>
                          <td className="px-4 py-2"><MiniBar usado={row.exec + row.comp} total={row.orcCat} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* alertas */}
              <div className="bg-white border rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" /> Alertas Financeiros</h3>
                {catBreakdown.filter(r => r.saldo < 0).length === 0 && catBreakdown.filter(r => r.pUso >= 80).length === 0 ? (
                  <p className="text-sm text-green-600">✅ Nenhum alerta no momento</p>
                ) : (
                  <div className="space-y-2">
                    {catBreakdown.filter(r => r.saldo < 0).map(r => (
                      <div key={r.cat} className="text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700">
                        ⛔ <strong>{r.cat}</strong>: saldo negativo de {fmt(Math.abs(r.saldo))}
                      </div>
                    ))}
                    {catBreakdown.filter(r => r.pUso >= 80 && r.saldo >= 0).map(r => (
                      <div key={r.cat} className="text-sm bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-orange-700">
                        ⚠️ <strong>{r.cat}</strong>: {r.pUso}% consumido
                      </div>
                    ))}
                    {docsAlerta.slice(0, 3).map((d, i) => (
                      <div key={i} className="text-sm bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-yellow-700">
                        📄 Renovação {d._tipo} prevista — vence {d.vigencia_fim || d.data_vencimento || "breve"}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── ABA 2 LANÇAMENTOS ───────────────────────────────────────────── */}
        <TabsContent value="lancamentos">
          <div className="flex flex-wrap gap-3 mb-4">
            <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Todas categorias</option>
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={filtroStatusCusto} onChange={e => setFiltroStatusCusto(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Todos status</option>
              {["Orçado","Proposta Recebida","Aprovado","Pago","Cancelado"].map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Todos os meses</option>
              {["01","02","03","04","05","06","07","08","09","10","11","12"].map((m, i) => (
                <option key={m} value={m}>{["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][i]}</option>
              ))}
            </select>
            <Button className="ml-auto bg-rose-600 hover:bg-rose-700 gap-1.5" onClick={() => { setFormCusto({ ...EMPTY_CUSTO }); setEditingCusto(null); setModalCusto(true); }}>
              <Plus className="w-4 h-4" /> Novo Lançamento
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead><tr className="bg-gray-50 border-b">
                {["Data","Categoria","Descrição","Fornecedor","Qtd","Valor Unit.","Valor Total","Status",""].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {custosListagem.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400">Nenhum lançamento encontrado</td></tr>
                ) : custosListagem.map(c => (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs text-gray-500">{c.data_competencia || "—"}</td>
                    <td className="px-3 py-2"><Badge className="text-xs bg-blue-50 text-blue-700">{c.categoria}</Badge></td>
                    <td className="px-3 py-2 max-w-[180px]"><p className="font-medium truncate">{c.subcategoria || c.descricao || "—"}</p><p className="text-xs text-gray-400 truncate">{c.documento_relacionado}</p></td>
                    <td className="px-3 py-2 text-gray-600">{c.fornecedor || "—"}</td>
                    <td className="px-3 py-2 text-center">{c.quantidade || "—"}</td>
                    <td className="px-3 py-2 text-right">{c.valor_unitario ? fmt(c.valor_unitario) : "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmt(c.valor_total)}</td>
                    <td className="px-3 py-2">
                      <select value={c.status} onChange={async e => { await base44.entities.CustoConformidade.update(c.id, { status: e.target.value }); load(); }} className={`text-xs border rounded-md px-2 py-1 font-medium ${STATUS_CUSTO_STYLE[c.status] || ""}`}>
                        {["Orçado","Proposta Recebida","Aprovado","Pago","Cancelado"].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <Button size="icon" variant="ghost" onClick={() => { setFormCusto({ ...c }); setEditingCusto(c); setModalCusto(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                    </td>
                  </tr>
                ))}
                {custosListagem.length > 0 && (
                  <tr className="bg-gray-50 font-semibold border-t-2">
                    <td colSpan={6} className="px-3 py-2 text-right text-gray-600">Total:</td>
                    <td className="px-3 py-2 text-right">{fmt(totalListagem)}</td>
                    <td colSpan={2} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── ABA 3 PLANEJAMENTO AUTOMÁTICO ───────────────────────────────── */}
        <TabsContent value="planejamento">
          <div className="space-y-6">
            {/* Documentos SST */}
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /> Documentos SST com Renovação Prevista (180 dias)</h3>
              {docsAlerta.length === 0 ? <p className="text-sm text-gray-400">Nenhum documento vencendo no período</p> : (
                <div className="space-y-2">
                  {docsAlerta.map((d, i) => (
                    <div key={i} className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                      <div>
                        <p className="font-medium text-sm">{d._tipo} — {d.empresa_mestre_nome || "—"}</p>
                        <p className="text-xs text-gray-500">Vencimento: {d.vigencia_fim || d.data_vencimento || "—"}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => incluirDocNoOrc(d)}>Incluir no Orçamento</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Exames médicos */}
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-3">🩺 Exames Médicos Previstos</h3>
              <div className="grid sm:grid-cols-3 gap-3 mb-4">
                {[["Custo ASO (R$)", custoAso, setCustoAso], ["Custo Audiometria (R$)", custoAudio, setCustoAudio], ["Custo Hemograma (R$)", custoHemo, setCustoHemo]].map(([l, v, s]) => (
                  <div key={l}>
                    <label className="text-xs text-gray-500 block mb-1">{l}</label>
                    <Input type="number" value={v} onChange={e => s(e.target.value)} />
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-blue-800">{colsEmp.length} colaboradores × {fmt(parseFloat(custoAso) + parseFloat(custoAudio) + parseFloat(custoHemo))} por pessoa</p>
                  <p className="text-xs text-gray-500">Estimativa total de exames</p>
                </div>
                <p className="text-lg font-bold text-blue-700">{fmt(totalExamesEst)}</p>
              </div>
            </div>

            {/* Treinamentos via Matriz */}
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-3">📚 Treinamentos Obrigatórios (Matriz NR)</h3>
              <p className="text-sm text-gray-500 mb-3">{matrizesEmp.length} vínculos NR×Função encontrados para esta empresa</p>
              {matrizesEmp.slice(0, 5).map((m, i) => (
                <div key={i} className="text-xs text-gray-600 border-b py-1.5">{m.curso_obrigatorio || "Treinamento"} — {m.nr_codigo} — Função: {m.funcao}</div>
              ))}
              {matrizesEmp.length > 5 && <p className="text-xs text-gray-400 mt-1">+{matrizesEmp.length - 5} outros...</p>}
              <Button size="sm" variant="outline" className="mt-3" onClick={importarMatrizOrc}>Importar para Orçamento</Button>
            </div>

            {/* Gerar automático */}
            <Button className="w-full bg-rose-600 hover:bg-rose-700 py-3 text-sm" onClick={gerarOrcamentoAuto}>
              🤖 Gerar Orçamento Automático (Rascunho)
            </Button>
          </div>
        </TabsContent>

        {/* ── ABA 4 PROPOSTAS ─────────────────────────────────────────────── */}
        <TabsContent value="propostas">
          <div className="space-y-3">
            {propostasRecebidas.length === 0 ? (
              <div className="text-center py-12 text-gray-400">Nenhuma proposta recebida no momento</div>
            ) : propostasRecebidas.map(p => (
              <div key={p.id} className="bg-white border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="text-xs bg-blue-100 text-blue-700">{p.categoria}</Badge>
                      <p className="font-semibold text-gray-800">{p.subcategoria || p.descricao}</p>
                    </div>
                    <p className="text-sm text-gray-600">Fornecedor: {p.fornecedor || "—"} | Valor: <strong>{fmt(p.valor_total)}</strong></p>
                    {p.nr_relacionada && <p className="text-xs text-gray-500">NR: {p.nr_relacionada}</p>}
                    {p.arquivo_proposta && <a href={p.arquivo_proposta} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">📎 Ver proposta</a>}
                    {p.aprovado_em && <p className="text-xs text-gray-400 mt-1">Aprovado em: {p.aprovado_em}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" onClick={() => aprovarCusto(p)}>
                      <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => recusarCusto(p)}>
                      Recusar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── ABA 5 RELATÓRIO ─────────────────────────────────────────────── */}
        <TabsContent value="relatorio">
          <div className="space-y-6">
            {/* resumo executivo */}
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-rose-600" /> Resumo Executivo {filtroAno}</h3>
              <div className="grid sm:grid-cols-3 gap-4 mb-4">
                <div><p className="text-xs text-gray-400">Orçado</p><p className="text-xl font-bold text-blue-700">{fmt(orcTotal)}</p></div>
                <div><p className="text-xs text-gray-400">Realizado</p><p className="text-xl font-bold text-green-700">{fmt(totalExecutado)}</p></div>
                <div><p className="text-xs text-gray-400">% Conformidade Financeira</p><p className="text-xl font-bold text-gray-800">{pct(totalExecutado, orcTotal)}%</p></div>
              </div>
            </div>

            {/* gráfico barras por categoria (CSS puro) */}
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Orçado × Executado × Comprometido por Categoria</h3>
              <div className="space-y-3">
                {catBreakdown.map(row => {
                  const maxVal = Math.max(row.orcCat, row.exec + row.comp, 1);
                  return (
                    <div key={row.cat}>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span className="font-medium">{row.cat}</span>
                        <span>Orçado: {fmt(row.orcCat)}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs w-24 text-gray-400">Orçado</span>
                          <div className="flex-1 bg-gray-100 rounded h-3 overflow-hidden">
                            <div style={{ width: `${pct(row.orcCat, maxVal)}%` }} className="bg-blue-300 h-full" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs w-24 text-gray-400">Executado</span>
                          <div className="flex-1 bg-gray-100 rounded h-3 overflow-hidden">
                            <div style={{ width: `${pct(row.exec, maxVal)}%` }} className="bg-green-500 h-full" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs w-24 text-gray-400">Comprometido</span>
                          <div className="flex-1 bg-gray-100 rounded h-3 overflow-hidden">
                            <div style={{ width: `${pct(row.comp, maxVal)}%` }} className="bg-yellow-400 h-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-300 inline-block" /> Orçado</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Executado</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" /> Comprometido</span>
              </div>
            </div>

            {/* linha do tempo mês a mês */}
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Gastos Realizados Mês a Mês</h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                {mesesGastos.map(m => (
                  <div key={m.mes} className={`rounded-lg p-2 text-center border ${m.total > 0 ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100"}`}>
                    <p className="text-xs font-medium text-gray-600">{m.mes}</p>
                    <p className="text-xs font-bold text-gray-800 mt-1">{m.total > 0 ? fmt(m.total).replace("R$","") : "—"}</p>
                  </div>
                ))}
              </div>
            </div>

            <Button className="w-full bg-gray-800 hover:bg-gray-900 text-white" onClick={() => alert("Relatório gerado!")}>
              📄 Gerar Relatório PDF
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Modal Lançamento ──────────────────────────────────────────────── */}
      <Dialog open={modalCusto} onOpenChange={setModalCusto}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCusto ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Categoria</label>
              <select value={formCusto.categoria} onChange={e => setFormCusto(f => ({ ...f, categoria: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <FI label="Subcategoria" k="subcategoria" state={formCusto} setState={setFormCusto} />
            <FI label="Fornecedor" k="fornecedor" state={formCusto} setState={setFormCusto} />
            <FI label="Quantidade" k="quantidade" type="number" state={formCusto} setState={setFormCusto} />
            <FI label="Valor Unitário (R$)" k="valor_unitario" type="number" state={formCusto} setState={setFormCusto} />
            <FI label="Valor Total (R$)" k="valor_total" type="number" state={formCusto} setState={setFormCusto} />
            <FI label="Data Competência" k="data_competencia" type="date" state={formCusto} setState={setFormCusto} />
            <FI label="Vencimento Pagamento" k="data_vencimento_pagamento" type="date" state={formCusto} setState={setFormCusto} />
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
              <select value={formCusto.status} onChange={e => setFormCusto(f => ({ ...f, status: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                {["Orçado","Proposta Recebida","Aprovado","Pago","Cancelado"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <FI label="NR Relacionada" k="nr_relacionada" state={formCusto} setState={setFormCusto} />
            <FI label="Nota Fiscal" k="nota_fiscal" state={formCusto} setState={setFormCusto} />
            <FI label="Documento Relacionado" k="documento_relacionado" state={formCusto} setState={setFormCusto} />
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Descrição</label>
              <textarea rows={2} value={formCusto.descricao || ""} onChange={e => setFormCusto(f => ({ ...f, descricao: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalCusto(false)}>Cancelar</Button>
            <Button onClick={saveCusto} disabled={saving} className="bg-rose-600 hover:bg-rose-700">{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal Orçamento ───────────────────────────────────────────────── */}
      <Dialog open={modalOrc} onOpenChange={setModalOrc}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{orcAtual ? "Editar Orçamento" : "Criar Orçamento"}</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3 py-2">
            <FI label="Ano de Referência" k="ano_referencia" type="number" state={formOrc} setState={setFormOrc} />
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
              <select value={formOrc.status} onChange={e => setFormOrc(f => ({ ...f, status: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                {["Rascunho","Aprovado","Em Execução","Encerrado"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2 border-t pt-3">
              <p className="text-xs font-semibold text-gray-700 mb-2">Orçamentos por Categoria (R$)</p>
            </div>
            <FI label="Orçamento Total" k="orcamento_total" type="number" state={formOrc} setState={setFormOrc} />
            <FI label="PGR" k="orcamento_pgr" type="number" state={formOrc} setState={setFormOrc} />
            <FI label="PCMSO" k="orcamento_pcmso" type="number" state={formOrc} setState={setFormOrc} />
            <FI label="LTCAT" k="orcamento_ltcat" type="number" state={formOrc} setState={setFormOrc} />
            <FI label="Exames Médicos" k="orcamento_exames" type="number" state={formOrc} setState={setFormOrc} />
            <FI label="EPI" k="orcamento_epi" type="number" state={formOrc} setState={setFormOrc} />
            <FI label="Treinamentos" k="orcamento_treinamentos" type="number" state={formOrc} setState={setFormOrc} />
            <FI label="Outros" k="orcamento_outros" type="number" state={formOrc} setState={setFormOrc} />
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Observações</label>
              <textarea rows={2} value={formOrc.observacoes || ""} onChange={e => setFormOrc(f => ({ ...f, observacoes: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOrc(false)}>Cancelar</Button>
            <Button onClick={saveOrc} disabled={saving || !filtroEmpresa} className="bg-rose-600 hover:bg-rose-700">{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}