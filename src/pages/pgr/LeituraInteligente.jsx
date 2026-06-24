import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, FileText, Trash2, Loader2, ChevronRight, ShieldAlert, AlertTriangle, Edit2, CheckCircle } from "lucide-react";
import { format } from "date-fns";

const STATUS_PROC_COLORS = { "Processando": "bg-blue-100 text-blue-700", "Completo": "bg-green-100 text-green-700", "Erro": "bg-red-100 text-red-700" };
const CLASSIF_COLORS = { "Crítico": "bg-red-600 text-white", "Alto": "bg-orange-500 text-white", "Médio": "bg-yellow-400 text-gray-900", "Baixo": "bg-green-500 text-white", "Irrelevante": "bg-gray-200 text-gray-700" };
const PRIORIDADE_COLORS = { "Alta": "bg-red-100 text-red-700", "Média": "bg-amber-100 text-amber-700", "Baixa": "bg-green-100 text-green-700" };
const IMPACT_DOCS = ["PGR","PCMSO","LTCAT","CIPA","Matriz de Treinamentos","Matriz de Exames","EPI","PPP"];

function parseBRDate(str) {
  if (!str) return "";
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : str;
}

const FI = ({ label, k, type = "text", value, onChange, rows }) => (
  <div>
    <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
    {rows ? (
      <textarea rows={rows} value={value ?? ""} onChange={e => onChange(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
    ) : (
      <Input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} />
    )}
  </div>
);

// ─── PGR Detalhe com 15 abas ──────────────────────────────────────────────────
function PGRDetalhe({ leitura, onClose }) {
  const [tab, setTab] = useState("geral");
  const [data, setData] = useState({ controle: null, identificacao: null, setores: [], riscos: [], plano: [], epis: [], treinamentos: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, editIdModal] = useState({ controle: null, identificacao: null });

  // estados locais editáveis
  const [ident, setIdent] = useState({});
  const [controle, setControle] = useState({});
  const [pendencias, setPendencias] = useState([]);
  const [novaAcao, setNovaAcao] = useState({ nao_conformidade: "", acao_recomendada: "", prioridade: "Média", responsavel: "", prazo: "" });
  const [addingAcao, setAddingAcao] = useState(false);
  const [novoSetor, setNovoSetor] = useState({ setor: "", cargo: "", funcao: "", cbo: "", qtd_trabalhadores: "", ghe: "", descricao_atividades: "" });
  const [addingSetor, setAddingSetor] = useState(false);
  const [novoRisco, setNovoRisco] = useState({ setor: "", cargo_funcao: "", perigo: "", tipo_risco: "Físico", probabilidade: "3", gravidade: "3", classificacao: "Médio", epc: "", epi: "", necessita_treinamento: false, necessita_exame_pcmso: false });
  const [addingRisco, setAddingRisco] = useState(false);
  const [novoEPI, setNovoEPI] = useState({ funcao: "", risco_associado: "", epi_obrigatorio: "", certificado_aprovacao_ca: "", status_epi: "Pendente" });
  const [addingEPI, setAddingEPI] = useState(false);
  const [novoTrein, setNovoTrein] = useState({ funcao: "", nr_aplicavel: "", treinamento_obrigatorio: "", carga_horaria: "", validade_meses: "", status_colaborador: "Pendente" });
  const [addingTrein, setAddingTrein] = useState(false);
  const [alertasImpacto, setAlertasImpacto] = useState([]);
  const [controles, setControles] = useState([]);
  const [novoControle, setNovoControle] = useState({ setor: "", funcao: "", risco: "", tipo: "EPI", medida: "", prazo: "", responsavel: "", status: "Planejado" });
  const [addingControle, setAddingControle] = useState(false);
  const [logAlteracoes, setLogAlteracoes] = useState([]);
  const [iaValidacao, setIaValidacao] = useState([]);
  const [iaRunning, setIaRunning] = useState(false);

  const lid = leitura.id;

  const loadAll = async () => {
    setLoading(true);
    const [ctrl, id_, set_, risc, plan, ep_, trein_, logs_] = await Promise.all([
      base44.entities.PGRControleDocumento.filter({ pgr_leitura_id: lid }),
      base44.entities.PGRIdentificacaoEmpresa.filter({ pgr_leitura_id: lid }),
      base44.entities.PGRSetorCargo.filter({ pgr_leitura_id: lid }),
      base44.entities.PGRInventarioRisco.filter({ pgr_leitura_id: lid }),
      base44.entities.PGRPlanoAcao.filter({ pgr_leitura_id: lid }),
      base44.entities.PGREPIFuncao.filter({ pgr_leitura_id: lid }),
      base44.entities.PGRTreinamentoFuncao.filter({ pgr_leitura_id: lid }),
      base44.entities.AuditLog.filter({ entity_id: lid }).catch(() => []),
    ]);
    const c0 = ctrl[0] || {}; const i0 = id_[0] || {};
    setData({ controle: c0, identificacao: i0, setores: set_, riscos: risc, plano: plan, epis: ep_, treinamentos: trein_ });
    setControle({ ...c0 }); setIdent({ ...i0 });
    setLogAlteracoes(logs_);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [lid]);

  const saveIdent = async () => {
    setSaving(true);
    const campos_sensiveis = ["cnae", "grau_risco", "qtd_funcionarios"];
    const alertas = [];
    const orig = data.identificacao || {};
    campos_sensiveis.forEach(c => {
      if (orig[c] && ident[c] && String(orig[c]) !== String(ident[c])) {
        alertas.push(`Campo "${c}" alterado de "${orig[c]}" para "${ident[c]}". Revisar: ${IMPACT_DOCS.join(", ")}.`);
      }
    });
    setAlertasImpacto(alertas);

    if (orig.id) await base44.entities.PGRIdentificacaoEmpresa.update(orig.id, { ...ident, qtd_funcionarios: parseInt(ident.qtd_funcionarios) || undefined, qtd_homens: parseInt(ident.qtd_homens) || undefined, qtd_mulheres: parseInt(ident.qtd_mulheres) || undefined });
    else await base44.entities.PGRIdentificacaoEmpresa.create({ pgr_leitura_id: lid, ...ident });
    setSaving(false); loadAll();
  };

  const saveControle = async () => {
    setSaving(true);
    if (data.controle?.id) await base44.entities.PGRControleDocumento.update(data.controle.id, controle);
    else await base44.entities.PGRControleDocumento.create({ pgr_leitura_id: lid, ...controle });
    setSaving(false); loadAll();
  };

  const addSetor = async () => {
    await base44.entities.PGRSetorCargo.create({ pgr_leitura_id: lid, ...novoSetor, qtd_trabalhadores: parseInt(novoSetor.qtd_trabalhadores) || 0 });
    setNovoSetor({ setor: "", cargo: "", funcao: "", cbo: "", qtd_trabalhadores: "", ghe: "", descricao_atividades: "" });
    setAddingSetor(false); loadAll();
  };

  const addRisco = async () => {
    const nr = parseInt(novoRisco.probabilidade || 3) * parseInt(novoRisco.gravidade || 3);
    await base44.entities.PGRInventarioRisco.create({ pgr_leitura_id: lid, ...novoRisco, nivel_risco: nr });
    setAddingRisco(false); loadAll();
  };

  const updateStatusPlano = async (id, status) => {
    await base44.entities.PGRPlanoAcao.update(id, { status });
    loadAll();
  };

  const addAcao = async () => {
    await base44.entities.PGRPlanoAcao.create({ pgr_leitura_id: lid, ...novaAcao, status: "Pendente" });
    setNovaAcao({ nao_conformidade: "", acao_recomendada: "", prioridade: "Média", responsavel: "", prazo: "" });
    setAddingAcao(false); loadAll();
  };

  const addEPI = async () => {
    await base44.entities.PGREPIFuncao.create({ pgr_leitura_id: lid, ...novoEPI });
    setAddingEPI(false); loadAll();
  };

  const addTrein = async () => {
    await base44.entities.PGRTreinamentoFuncao.create({ pgr_leitura_id: lid, ...novoTrein, carga_horaria: parseInt(novoTrein.carga_horaria) || 0, validade_meses: parseInt(novoTrein.validade_meses) || 0, status_colaborador: "Pendente" });
    setAddingTrein(false); loadAll();
  };

  const addControle = async () => {
    await base44.entities.PGRPlanoAcao.create({ pgr_leitura_id: lid, nao_conformidade: `[${novoControle.tipo}] ${novoControle.risco}`, acao_recomendada: novoControle.medida, responsavel: novoControle.responsavel, prazo: novoControle.prazo, status: novoControle.status, prioridade: "Média", medida_tipo: novoControle.tipo });
    setAddingControle(false); loadAll();
  };

  const runIaValidacao = async () => {
    setIaRunning(true);
    const pendencias = [];
    // Funções sem GHE
    data.setores.filter(s => !s.ghe).forEach(s => pendencias.push({ tipo: "⚠️ Sem GHE", funcao: s.funcao || s.cargo, setor: s.setor, severidade: "Alto" }));
    // Funções sem riscos
    data.setores.forEach(s => {
      const fn = s.funcao || s.cargo;
      if (!data.riscos.find(r => r.cargo_funcao === fn || r.setor === s.setor)) pendencias.push({ tipo: "⚠️ Sem Riscos", funcao: fn, setor: s.setor, severidade: "Alto" });
    });
    // Funções sem treinamentos
    data.setores.forEach(s => {
      const fn = s.funcao || s.cargo;
      if (!data.treinamentos.find(t => t.funcao === fn)) pendencias.push({ tipo: "🎓 Sem Treinamento", funcao: fn, setor: s.setor, severidade: "Médio" });
    });
    // Funções sem exames
    data.setores.forEach(s => {
      const fn = s.funcao || s.cargo;
      const temRiscoExame = data.riscos.find(r => (r.cargo_funcao === fn || r.setor === s.setor) && r.necessita_exame_pcmso);
      if (!temRiscoExame) pendencias.push({ tipo: "🩺 Sem Exame PCMSO", funcao: fn, setor: s.setor, severidade: "Baixo" });
    });
    // Riscos sem medidas de controle
    data.riscos.filter(r => r.classificacao === "Crítico" || r.classificacao === "Alto").forEach(r => {
      const temMedida = data.plano.find(p => p.nao_conformidade?.includes(r.perigo || ""));
      if (!temMedida) pendencias.push({ tipo: "🛡️ Risco sem Medida", funcao: r.cargo_funcao, setor: r.setor, severidade: "Crítico", detalhe: r.perigo });
    });
    // EPIs sem CA
    data.epis.filter(ep => !ep.certificado_aprovacao_ca).forEach(ep => pendencias.push({ tipo: "🦺 EPI sem CA", funcao: ep.funcao, setor: "—", severidade: "Médio", detalhe: ep.epi_obrigatorio }));
    setIaValidacao(pendencias);
    setIaRunning(false);
  };

  const alimentarCompliance360 = async () => {
    if (!leitura.empresa_mestre_id) { alert("Empresa não vinculada ao PGR."); return; }
    const empId = leitura.empresa_mestre_id;
    const empNome = leitura.empresa_mestre_nome;
    // Alimentar Funções
    for (const s of data.setores) {
      await base44.entities.FuncaoCargo.create({ nome: s.funcao || s.cargo, setor: s.setor, cbo: s.cbo || "", ativo: true }).catch(() => {});
    }
    // Alimentar Matriz Treinamentos
    for (const t of data.treinamentos) {
      await base44.entities.MatrizTreinamentoNR.create({ empresa_mestre_id: empId, empresa_mestre_nome: empNome, funcao: t.funcao, nr_codigo: t.nr_aplicavel, curso_obrigatorio: t.treinamento_obrigatorio, carga_horaria: parseInt(t.carga_horaria) || 0, periodicidade_meses: parseInt(t.validade_meses) || 12, ativo: true }).catch(() => {});
    }
    // Alertas de compliance
    for (const r of data.riscos.filter(r => r.classificacao === "Crítico" || r.classificacao === "Alto")) {
      await base44.entities.ComplianceAlerta.create({ empresa_mestre_id: empId, empresa_mestre_nome: empNome, tipo_alerta: "Documento Vencendo", descricao: `Risco ${r.classificacao}: ${r.perigo} (${r.setor})`, prioridade: r.classificacao === "Crítico" ? "Crítico" : "Alto", status: "Ativo", data_alerta: new Date().toISOString().slice(0, 10) }).catch(() => {});
    }
    alert(`✅ Compliance 360 alimentado!\n• ${data.setores.length} funções\n• ${data.treinamentos.length} treinamentos na Matriz NR\n• ${data.riscos.filter(r => r.classificacao === "Crítico" || r.classificacao === "Alto").length} alertas de risco`);
  };

  const ghe_list = [...new Set(data.setores.map(s => s.ghe).filter(Boolean))];
  const funcoes_list = [...new Set(data.setores.map(s => s.funcao || s.cargo).filter(Boolean))];

    const ALL_TABS = [
    ["geral","📊 Visão Geral"],["empresa","🏢 Dados Empresa"],["revisoes","📋 Revisões"],
    ["quadro","👥 Quadro Func."],["setores","🏭 Setores/Funções"],["atividades","📝 Atividades"],
    ["ghe","🔵 GHE"],["inventario","⚠️ Inv. Riscos"],["matriz","🗺️ Matriz Riscos"],
    ["controles","🛡️ Medidas Controle"],["epi","🦺 EPI"],["treinamentos","🎓 Treinamentos"],["exames","🩺 Exames"],
    ["plano","📌 Plano de Ação"],["alteracoes","📝 Log Alterações"],["ia_val","🤖 IA Validação"],["pendencias","🔔 Pendências"],["documentos","📎 Documentos"],
  ];

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-rose-600" /></div>;

  const { setores, riscos, plano, epis, treinamentos } = data;
  const totalFunc = setores.reduce((s, r) => s + (parseInt(r.qtd_trabalhadores) || 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Button variant="ghost" onClick={onClose}>← Voltar</Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">PGR — {leitura.empresa_mestre_nome || "Empresa"}</h1>
          <p className="text-xs text-gray-500">CNPJ: {leitura.empresa_mestre_cnpj} | Vigência até: {leitura.vigencia_fim || "—"}</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 text-sm" onClick={alimentarCompliance360}>
          <CheckCircle className="w-4 h-4" /> Alimentar Compliance 360
        </Button>
        {leitura.arquivo_pdf && <a href={leitura.arquivo_pdf} target="_blank" rel="noreferrer"><Button variant="outline" size="sm"><FileText className="w-4 h-4 mr-1" /> PDF</Button></a>}
      </div>

      {/* Alertas de impacto */}
      {alertasImpacto.map((a, i) => (
        <div key={i} className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-2 text-sm text-amber-800 flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {a}
        </div>
      ))}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto bg-gray-100 p-1 mb-4">
          {ALL_TABS.map(([v, l]) => (
            <TabsTrigger key={v} value={v} className="text-xs py-1 px-2 data-[state=active]:bg-white">{l}</TabsTrigger>
          ))}
        </TabsList>

        {/* 1. VISÃO GERAL */}
        <TabsContent value="geral">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { l: "Total Funcionários", v: totalFunc || ident.qtd_funcionarios || "—", c: "text-blue-700" },
              { l: "Riscos Identificados", v: riscos.length, c: "text-orange-600" },
              { l: "Críticos", v: riscos.filter(r => r.classificacao === "Crítico").length, c: "text-red-600" },
              { l: "Ações Pendentes", v: plano.filter(p => p.status !== "Concluído").length, c: "text-amber-600" },
              { l: "Setores", v: [...new Set(setores.map(s => s.setor).filter(Boolean))].length, c: "text-gray-700" },
              { l: "Funções", v: funcoes_list.length, c: "text-gray-700" },
              { l: "Treinamentos", v: treinamentos.length, c: "text-indigo-600" },
              { l: "EPIs Cadastrados", v: epis.length, c: "text-emerald-600" },
            ].map(card => (
              <div key={card.l} className="bg-white border rounded-xl p-4 text-center">
                <p className={`text-3xl font-bold ${card.c}`}>{card.v}</p>
                <p className="text-xs text-gray-500 mt-1">{card.l}</p>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white border rounded-xl p-4">
              <h3 className="font-semibold text-gray-700 text-sm mb-3">Top Riscos Críticos</h3>
              {riscos.filter(r => r.classificacao === "Crítico").slice(0, 4).map(r => (
                <div key={r.id} className="flex items-center justify-between border-b py-1.5 text-sm">
                  <span className="text-gray-700 truncate">{r.perigo || "—"}</span>
                  <Badge className="text-xs bg-red-600 text-white ml-2">{r.tipo_risco}</Badge>
                </div>
              ))}
              {riscos.filter(r => r.classificacao === "Crítico").length === 0 && <p className="text-gray-400 text-sm">Nenhum risco crítico</p>}
            </div>
            <div className="bg-white border rounded-xl p-4">
              <h3 className="font-semibold text-gray-700 text-sm mb-3">Ações Prioritárias</h3>
              {plano.filter(p => p.prioridade === "Alta" && p.status !== "Concluído").slice(0, 4).map(p => (
                <div key={p.id} className="border-b py-1.5 text-sm">
                  <p className="text-gray-700 truncate">{p.nao_conformidade || p.acao_recomendada}</p>
                  <p className="text-xs text-gray-400">Prazo: {p.prazo || "—"}</p>
                </div>
              ))}
              {plano.filter(p => p.prioridade === "Alta" && p.status !== "Concluído").length === 0 && <p className="text-gray-400 text-sm">Nenhuma ação prioritária</p>}
            </div>
          </div>
        </TabsContent>

        {/* 2. DADOS DA EMPRESA */}
        <TabsContent value="empresa">
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Identificação da Empresa</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[["Razão Social","razao_social"],["Nome Fantasia","nome_fantasia"],["CNPJ","cnpj"],["CNAE","cnae"],["Atividade Principal","cnae_descricao"],["Grau de Risco (NR-04)","grau_risco"],["Endereço","endereco"],["Município","municipio"],["Estado","estado"],["CEP","cep"],["Horário de Trabalho","horario_trabalho"],["Data Elaboração","data_elaboracao","date"],["Data da Revisão","data_revisao","date"],["Data de Vencimento","data_vencimento","date"],["Responsável Técnico","responsavel_tecnico"],["Conselho Profissional (CREA)","crea_registro"],["Total Funcionários","qtd_funcionarios","number"],["Total Homens","qtd_homens","number"],["Total Mulheres","qtd_mulheres","number"]].map(([l, k, t]) => (
                <FI key={k} label={l} k={k} type={t || "text"} value={ident[k]} onChange={v => setIdent(s => ({ ...s, [k]: v }))} />
              ))}
              <div className="col-span-2">
                <FI label="Responsável Legal" k="responsavel_legal" value={ident.responsavel_legal} onChange={v => setIdent(s => ({ ...s, responsavel_legal: v }))} />
              </div>
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <Button onClick={saveIdent} disabled={saving} className="bg-rose-600 hover:bg-rose-700">{saving ? "Salvando..." : "Salvar Dados"}</Button>
            </div>
            {alertasImpacto.length > 0 && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Alertas de Impacto:</p>
                <ul className="mt-1 space-y-1">
                  {IMPACT_DOCS.map(d => <li key={d} className="text-xs text-amber-700">• {d} deve ser revisado</li>)}
                </ul>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 3. CONTROLE DE REVISÕES */}
        <TabsContent value="revisoes">
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Controle do Documento</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[["Nome do Documento","nome_documento"],["Nº Revisão","numero_revisao"],["Data Emissão","data_emissao","date"],["Vigência Início","vigencia_inicio","date"],["Vigência Fim","vigencia_fim","date"],["Elaborado Por","elaborado_por"],["Verificado Por","verificado_por"],["Aprovado Por","aprovado_por"],["Responsável Técnico","responsavel_tecnico"]].map(([l, k, t]) => (
                <FI key={k} label={l} k={k} type={t || "text"} value={controle[k]} onChange={v => setControle(s => ({ ...s, [k]: v }))} />
              ))}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
                <select value={controle.status_doc || "Vigente"} onChange={e => setControle(s => ({ ...s, status_doc: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {["Vigente","Vencendo","Vencido","Em Revisão"].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <FI label="Descrição da Alteração" k="descricao_revisao" rows={2} value={controle.descricao_revisao} onChange={v => setControle(s => ({ ...s, descricao_revisao: v }))} />
              </div>
            </div>
            <div className="flex justify-end mt-4"><Button onClick={saveControle} disabled={saving} className="bg-rose-600 hover:bg-rose-700">{saving ? "Salvando..." : "Salvar Revisão"}</Button></div>
          </div>
        </TabsContent>

        {/* 4. QUADRO DE FUNCIONÁRIOS */}
        <TabsContent value="quadro">
          <div className="overflow-x-auto bg-white border rounded-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-800 text-sm">Quadro de Funcionários por Função</h3>
              <Button size="sm" className="bg-rose-600 hover:bg-rose-700 gap-1" onClick={() => setAddingSetor(true)}><Plus className="w-3.5 h-3.5" /> Adicionar Função</Button>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b">
                {["Setor","Cargo","Função","CBO","Homens","Mulheres","Total","GHE","Jornada",""].map(h => <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>)}
              </tr></thead>
              <tbody>
                {setores.length === 0 ? <tr><td colSpan={10} className="text-center py-8 text-gray-400">Nenhuma função cadastrada</td></tr> :
                  setores.map(s => <tr key={s.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">{s.setor || "—"}</td>
                    <td className="px-3 py-2">{s.cargo || "—"}</td>
                    <td className="px-3 py-2 font-medium">{s.funcao || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{s.cbo || "—"}</td>
                    <td className="px-3 py-2 text-center">{s.qtd_homens || "—"}</td>
                    <td className="px-3 py-2 text-center">{s.qtd_mulheres || "—"}</td>
                    <td className="px-3 py-2 text-center font-bold">{s.qtd_trabalhadores || "—"}</td>
                    <td className="px-3 py-2">{s.ghe || "—"}</td>
                    <td className="px-3 py-2 text-xs">{s.jornada_trabalho || "—"}</td>
                    <td className="px-3 py-2"><Button size="icon" variant="ghost" onClick={async () => { await base44.entities.PGRSetorCargo.delete(s.id); loadAll(); }}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button></td>
                  </tr>)}
                <tr className="bg-gray-50 font-semibold border-t-2">
                  <td colSpan={6} className="px-3 py-2 text-right text-gray-600">Total geral:</td>
                  <td className="px-3 py-2 text-center text-blue-700">{totalFunc}</td>
                  <td colSpan={3} />
                </tr>
              </tbody>
            </table>
          </div>
          {addingSetor && (
            <div className="mt-4 bg-gray-50 border rounded-xl p-4 grid sm:grid-cols-3 gap-3">
              {[["Setor","setor"],["Cargo","cargo"],["Função","funcao"],["CBO","cbo"],["Qtd Trabalhadores","qtd_trabalhadores"],["GHE","ghe"],["Jornada","jornada_trabalho"]].map(([l, k]) => (
                <FI key={k} label={l} k={k} type={k === "qtd_trabalhadores" ? "number" : "text"} value={novoSetor[k]} onChange={v => setNovoSetor(s => ({ ...s, [k]: v }))} />
              ))}
              <div className="col-span-3"><FI label="Descrição das Atividades" k="descricao_atividades" rows={2} value={novoSetor.descricao_atividades} onChange={v => setNovoSetor(s => ({ ...s, descricao_atividades: v }))} /></div>
              <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setAddingSetor(false)}>Cancelar</Button><Button onClick={addSetor} className="bg-rose-600 hover:bg-rose-700">Salvar Função</Button></div>
            </div>
          )}
        </TabsContent>

        {/* 5. SETORES E FUNÇÕES */}
        <TabsContent value="setores">
          <div className="space-y-3">
            {[...new Set(setores.map(s => s.setor).filter(Boolean))].map(setor => {
              const fns = setores.filter(s => s.setor === setor);
              return (
                <div key={setor} className="bg-white border rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">{setor}</h3>
                    <span className="text-xs text-gray-500">{fns.length} função(ões)</span>
                  </div>
                  <div className="divide-y">
                    {fns.map(f => {
                      const riscosFn = riscos.filter(r => r.setor === setor || r.cargo_funcao === f.funcao);
                      const treinFn = treinamentos.filter(t => t.funcao === f.funcao || t.funcao === f.cargo);
                      const episFn = epis.filter(e => e.funcao === f.funcao || e.funcao === f.cargo);
                      return (
                        <div key={f.id} className="px-4 py-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-medium text-sm">{f.funcao || f.cargo}</span>
                            {f.cbo && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">CBO: {f.cbo}</span>}
                            {f.ghe && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">GHE: {f.ghe}</span>}
                            <span className="text-xs text-gray-500">👥 {f.qtd_trabalhadores || 0}</span>
                            <span className="text-xs text-orange-600">⚠️ {riscosFn.length} riscos</span>
                            <span className="text-xs text-indigo-600">🎓 {treinFn.length} trein.</span>
                            <span className="text-xs text-emerald-600">🦺 {episFn.length} EPIs</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {setores.length === 0 && <p className="text-center py-8 text-gray-400">Nenhum setor cadastrado</p>}
          </div>
        </TabsContent>

        {/* 6. DESCRIÇÃO DAS ATIVIDADES */}
        <TabsContent value="atividades">
          <div className="space-y-4">
            {setores.map(s => (
              <details key={s.id} className="bg-white border rounded-xl">
                <summary className="px-4 py-3 cursor-pointer flex items-center gap-2">
                  <span className="font-semibold text-gray-800">{s.funcao || s.cargo}</span>
                  <Badge className="text-xs bg-gray-100 text-gray-600">{s.setor}</Badge>
                  {s.ghe && <Badge className="text-xs bg-purple-100 text-purple-700">GHE: {s.ghe}</Badge>}
                  {s.cbo && <span className="text-xs text-blue-600 ml-1">CBO: {s.cbo}</span>}
                </summary>
                <div className="px-4 pb-4 pt-1 grid sm:grid-cols-2 gap-3 text-sm">
                  {[["Descrição Geral","descricao_atividades"],["Atividades Rotineiras","atividades_rotineiras"],["Atividades Não Rotineiras","atividades_nao_rotineiras"],["Equipamentos Utilizados","equipamentos_utilizados"],["Ferramentas Utilizadas","ferramentas_utilizadas"],["Ambiente de Trabalho","ambiente_trabalho"]].map(([l, k]) => s[k] ? (
                    <div key={k} className={k === "descricao_atividades" ? "col-span-2" : ""}>
                      <p className="text-xs font-medium text-gray-500 mb-0.5">{l}</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{s[k]}</p>
                    </div>
                  ) : null)}
                  {s.jornada_trabalho && <p className="text-xs text-gray-500 col-span-2">⏰ Jornada: {s.jornada_trabalho}</p>}
                  <p className="text-xs text-gray-400 col-span-2 mt-1">Utilizado por: PCMSO · PPP · LTCAT · Matriz de Treinamentos</p>
                </div>
              </details>
            ))}
            {setores.length === 0 && <p className="text-center py-8 text-gray-400">Nenhuma função com descrição</p>}
          </div>
        </TabsContent>

        {/* 7. GHE */}
        <TabsContent value="ghe">
          {ghe_list.length === 0 ? <p className="text-center py-8 text-gray-400">Nenhum GHE identificado nos setores/funções</p> : (
            <div className="space-y-4">
              {ghe_list.map(ghe => {
                const fnsGHE = setores.filter(s => s.ghe === ghe);
                const riscosGHE = riscos.filter(r => fnsGHE.some(f => r.cargo_funcao === f.funcao || r.setor === f.setor));
                const treinGHE = treinamentos.filter(t => fnsGHE.some(f => t.funcao === f.funcao || t.funcao === f.cargo));
                const episGHE = epis.filter(e => fnsGHE.some(f => e.funcao === f.funcao || e.funcao === f.cargo));
                const totalTrab = fnsGHE.reduce((s, f) => s + (parseInt(f.qtd_trabalhadores) || 0), 0);
                return (
                  <div key={ghe} className="bg-white border rounded-xl overflow-hidden">
                    <div className="bg-purple-50 px-4 py-3 border-b">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-purple-800">GHE: {ghe}</h3>
                        <span className="text-sm text-purple-600">{totalTrab} trabalhadores</span>
                      </div>
                    </div>
                    <div className="p-4 grid sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Funções Vinculadas</p>
                        {fnsGHE.map(f => <div key={f.id} className="text-sm text-gray-700">• {f.funcao || f.cargo} <span className="text-gray-400">({f.setor})</span></div>)}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Riscos Comuns</p>
                        {riscosGHE.slice(0, 3).map(r => <div key={r.id} className="text-sm flex items-center gap-1">• {r.perigo} <Badge className={`text-xs ${CLASSIF_COLORS[r.classificacao] || ""}`}>{r.classificacao}</Badge></div>)}
                        {riscosGHE.length === 0 && <p className="text-sm text-gray-400">Nenhum</p>}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Treinamentos ({treinGHE.length})</p>
                        {treinGHE.slice(0, 3).map(t => <p key={t.id} className="text-xs text-gray-600">• {t.treinamento_obrigatorio}</p>)}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">EPIs ({episGHE.length})</p>
                        {episGHE.slice(0, 3).map(e => <p key={e.id} className="text-xs text-gray-600">• {e.epi_obrigatorio}</p>)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* 8. INVENTÁRIO DE RISCOS */}
        <TabsContent value="inventario">
          <div className="flex justify-end mb-3">
            <Button size="sm" className="bg-rose-600 hover:bg-rose-700 gap-1" onClick={() => setAddingRisco(true)}><Plus className="w-3.5 h-3.5" /> Adicionar Risco</Button>
          </div>
          {addingRisco && (
            <div className="bg-gray-50 border rounded-xl p-4 mb-4 grid sm:grid-cols-3 gap-3">
              {[["Setor","setor"],["Cargo/Função","cargo_funcao"],["Perigo/Fator de Risco","perigo"],["Fonte/Circunstância","fonte_circunstancia"],["Possíveis Lesões","possiveis_lesoes"],["EPI","epi"],["EPC","epc"]].map(([l, k]) => (
                <FI key={k} label={l} k={k} value={novoRisco[k]} onChange={v => setNovoRisco(s => ({ ...s, [k]: v }))} />
              ))}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Tipo de Risco</label>
                <select value={novoRisco.tipo_risco} onChange={e => setNovoRisco(s => ({ ...s, tipo_risco: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {["Físico","Químico","Biológico","Ergonômico","Acidente","Psicossocial"].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Classificação</label>
                <select value={novoRisco.classificacao} onChange={e => setNovoRisco(s => ({ ...s, classificacao: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {["Crítico","Alto","Médio","Baixo","Irrelevante"].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <FI label="Probabilidade (1-5)" k="probabilidade" type="number" value={novoRisco.probabilidade} onChange={v => setNovoRisco(s => ({ ...s, probabilidade: v }))} />
              <FI label="Gravidade (1-5)" k="gravidade" type="number" value={novoRisco.gravidade} onChange={v => setNovoRisco(s => ({ ...s, gravidade: v }))} />
              <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setAddingRisco(false)}>Cancelar</Button><Button onClick={addRisco} className="bg-rose-600 hover:bg-rose-700">Salvar</Button></div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead><tr className="bg-gray-50 border-b">
                {["Setor","Função","GHE","Perigo","eSocial","Tipo","Prob.","Grav.","NR","Classif.","Medidas Exist.","EPI"].map(h => <th key={h} className="text-left px-3 py-2 font-medium text-gray-600 text-xs">{h}</th>)}
              </tr></thead>
              <tbody>
                {riscos.length === 0 ? <tr><td colSpan={12} className="text-center py-8 text-gray-400">Nenhum risco</td></tr> :
                  riscos.map(r => <tr key={r.id} className={`border-b hover:bg-gray-50 ${r.classificacao === "Crítico" ? "bg-red-50" : r.classificacao === "Alto" ? "bg-orange-50" : ""}`}>
                    <td className="px-3 py-2 text-xs">{r.setor || "—"}</td>
                    <td className="px-3 py-2 text-xs">{r.cargo_funcao || "—"}</td>
                    <td className="px-3 py-2 text-xs">{r.ghe || "—"}</td>
                    <td className="px-3 py-2 max-w-[100px] truncate text-xs" title={r.perigo}>{r.perigo || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.codigo_esocial || "—"}</td>
                    <td className="px-3 py-2"><Badge className="text-xs bg-gray-100 text-gray-700">{r.tipo_risco || "—"}</Badge></td>
                    <td className="px-3 py-2 text-center text-xs">{r.probabilidade || "—"}</td>
                    <td className="px-3 py-2 text-center text-xs">{r.gravidade || "—"}</td>
                    <td className="px-3 py-2 text-center font-bold text-xs">{r.nivel_risco || "—"}</td>
                    <td className="px-3 py-2"><Badge className={`text-xs ${CLASSIF_COLORS[r.classificacao] || "bg-gray-200 text-gray-700"}`}>{r.classificacao || "—"}</Badge></td>
                    <td className="px-3 py-2 text-xs max-w-[100px] truncate" title={r.medidas_existentes}>{r.medidas_existentes || "—"}</td>
                    <td className="px-3 py-2 text-xs">{r.epi || "—"}</td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 9. MATRIZ DE RISCOS */}
        <TabsContent value="matriz">
          <div className="grid sm:grid-cols-3 gap-3 mb-5">
            {["Físico","Químico","Biológico","Ergonômico","Acidente","Psicossocial"].map(tipo => {
              const r = riscos.filter(r => r.tipo_risco === tipo);
              return (
                <div key={tipo} className="bg-white border rounded-xl p-4">
                  <p className="font-semibold text-gray-700">{tipo}</p>
                  <p className="text-3xl font-bold text-rose-600">{r.length}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {["Crítico","Alto","Médio","Baixo"].map(c => {
                      const cnt = r.filter(x => x.classificacao === c).length;
                      return cnt > 0 ? <Badge key={c} className={`text-xs ${CLASSIF_COLORS[c]}`}>{c}: {cnt}</Badge> : null;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Ranking por Nível de Risco</h3>
            <div className="space-y-2">
              {riscos.sort((a, b) => (b.nivel_risco || 0) - (a.nivel_risco || 0)).slice(0, 10).map(r => (
                <div key={r.id} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-gray-100 text-gray-700">{r.nivel_risco || "—"}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{r.perigo}</p>
                    <p className="text-xs text-gray-500">{r.setor} — {r.tipo_risco}</p>
                  </div>
                  <Badge className={`text-xs ${CLASSIF_COLORS[r.classificacao] || ""}`}>{r.classificacao}</Badge>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* 10. EPI */}
        <TabsContent value="epi">
          <div className="flex justify-end mb-3">
            <Button size="sm" className="bg-rose-600 hover:bg-rose-700 gap-1" onClick={() => setAddingEPI(true)}><Plus className="w-3.5 h-3.5" /> Adicionar EPI</Button>
          </div>
          {addingEPI && (
            <div className="bg-gray-50 border rounded-xl p-4 mb-4 grid sm:grid-cols-3 gap-3">
              {[["Função","funcao"],["Risco Associado","risco_associado"],["EPI Obrigatório","epi_obrigatorio"],["CA","certificado_aprovacao_ca"],["Fabricante","fabricante"],["Periodicidade Troca (meses)","periodicidade_troca"]].map(([l, k]) => (
                <FI key={k} label={l} k={k} value={novoEPI[k]} onChange={v => setNovoEPI(s => ({ ...s, [k]: v }))} />
              ))}
              <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setAddingEPI(false)}>Cancelar</Button><Button onClick={addEPI} className="bg-rose-600 hover:bg-rose-700">Salvar</Button></div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead><tr className="bg-gray-50 border-b">
                {["Função","Risco","EPI Obrigatório","CA","Fabricante","Status"].map(h => <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>)}
              </tr></thead>
              <tbody>
                {epis.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhum EPI</td></tr> :
                  epis.map(ep => <tr key={ep.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">{ep.funcao || "—"}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{ep.risco_associado || "—"}</td>
                    <td className="px-3 py-2 font-medium">{ep.epi_obrigatorio || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{ep.certificado_aprovacao_ca || "—"}</td>
                    <td className="px-3 py-2 text-xs">{ep.fabricante || "—"}</td>
                    <td className="px-3 py-2"><Badge className={`text-xs ${{ "Entregue": "bg-green-100 text-green-700", "Pendente": "bg-amber-100 text-amber-700", "Vencido": "bg-red-100 text-red-700" }[ep.status_epi] || "bg-gray-100 text-gray-600"}`}>{ep.status_epi}</Badge></td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 11. TREINAMENTOS */}
        <TabsContent value="treinamentos">
          <div className="flex justify-end mb-3">
            <Button size="sm" className="bg-rose-600 hover:bg-rose-700 gap-1" onClick={() => setAddingTrein(true)}><Plus className="w-3.5 h-3.5" /> Adicionar Treinamento</Button>
          </div>
          {addingTrein && (
            <div className="bg-gray-50 border rounded-xl p-4 mb-4 grid sm:grid-cols-3 gap-3">
              {[["Função","funcao"],["NR Aplicável","nr_aplicavel"],["Treinamento Obrigatório","treinamento_obrigatorio"],["Carga Horária (h)","carga_horaria"],["Validade (meses)","validade_meses"]].map(([l, k]) => (
                <FI key={k} label={l} k={k} type={["carga_horaria","validade_meses"].includes(k) ? "number" : "text"} value={novoTrein[k]} onChange={v => setNovoTrein(s => ({ ...s, [k]: v }))} />
              ))}
              <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setAddingTrein(false)}>Cancelar</Button><Button onClick={addTrein} className="bg-rose-600 hover:bg-rose-700">Salvar</Button></div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead><tr className="bg-gray-50 border-b">
                {["Função","NR","Treinamento","C.H.","Validade","Status"].map(h => <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>)}
              </tr></thead>
              <tbody>
                {treinamentos.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhum treinamento</td></tr> :
                  treinamentos.map(t => <tr key={t.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">{t.funcao || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{t.nr_aplicavel || "—"}</td>
                    <td className="px-3 py-2">{t.treinamento_obrigatorio || "—"}</td>
                    <td className="px-3 py-2">{t.carga_horaria || "—"}h</td>
                    <td className="px-3 py-2">{t.validade_meses || "—"}m</td>
                    <td className="px-3 py-2"><Badge className={`text-xs ${{ "Treinado": "bg-green-100 text-green-700", "Pendente": "bg-amber-100 text-amber-700", "Vencendo": "bg-orange-100 text-orange-700", "Vencido": "bg-red-100 text-red-700" }[t.status_colaborador] || "bg-gray-100 text-gray-600"}`}>{t.status_colaborador}</Badge></td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 12. EXAMES POR FUNÇÃO */}
        <TabsContent value="exames">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Exames são definidos no PCMSO. Os riscos abaixo requerem exames complementares.
          </div>
          <div className="space-y-2">
            {riscos.filter(r => r.necessita_exame_pcmso).length === 0
              ? <p className="text-center py-8 text-gray-400">Nenhum risco com exame PCMSO vinculado</p>
              : riscos.filter(r => r.necessita_exame_pcmso).map(r => (
                <div key={r.id} className="bg-white border-l-4 border-blue-500 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{r.perigo}</p>
                      <p className="text-xs text-gray-500">{r.setor} — {r.cargo_funcao} — {r.tipo_risco}</p>
                    </div>
                    <Badge className={`text-xs ${CLASSIF_COLORS[r.classificacao] || ""}`}>{r.classificacao}</Badge>
                  </div>
                  {r.epi && <p className="text-xs text-blue-600 mt-1">EPI: {r.epi}</p>}
                </div>
              ))}
          </div>
          <div className="mt-5">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">Exames por Função (via Matriz NR)</h3>
            {funcoes_list.map(fn => {
              const riscosFn = riscos.filter(r => r.cargo_funcao === fn);
              return riscosFn.length > 0 ? (
                <div key={fn} className="bg-white border rounded-lg p-3 mb-2">
                  <p className="font-medium text-sm mb-1">{fn}</p>
                  <div className="flex flex-wrap gap-1">
                    {riscosFn.map(r => r.tipo_risco === "Físico" && <Badge key={r.id} className="text-xs bg-indigo-100 text-indigo-700">Audiometria</Badge>)}
                    {riscosFn.map(r => r.tipo_risco === "Químico" && <Badge key={r.id + "q"} className="text-xs bg-purple-100 text-purple-700">Hemograma</Badge>)}
                    {riscosFn.map(r => r.tipo_risco === "Ergonômico" && <Badge key={r.id + "e"} className="text-xs bg-rose-100 text-rose-700">Avaliação Postural</Badge>)}
                    <Badge className="text-xs bg-gray-100 text-gray-600">ASO</Badge>
                  </div>
                </div>
              ) : null;
            })}
          </div>
        </TabsContent>

        {/* MEDIDAS DE CONTROLE */}
        <TabsContent value="controles">
          <div className="mb-4 bg-gray-50 border rounded-lg p-3 text-sm text-gray-600">
            Hierarquia de controle: <strong>1. Eliminação → 2. Substituição → 3. Engenharia → 4. Administrativa → 5. EPI</strong>
          </div>
          <div className="flex justify-end mb-3">
            <Button size="sm" className="bg-rose-600 hover:bg-rose-700 gap-1" onClick={() => setAddingControle(true)}><Plus className="w-3.5 h-3.5" /> Nova Medida</Button>
          </div>
          {addingControle && (
            <div className="bg-gray-50 border rounded-xl p-4 mb-4 grid sm:grid-cols-3 gap-3">
              <FI label="Setor" k="setor" value={novoControle.setor} onChange={v => setNovoControle(s => ({ ...s, setor: v }))} />
              <FI label="Função" k="funcao" value={novoControle.funcao} onChange={v => setNovoControle(s => ({ ...s, funcao: v }))} />
              <FI label="Risco Associado" k="risco" value={novoControle.risco} onChange={v => setNovoControle(s => ({ ...s, risco: v }))} />
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Tipo de Controle</label>
                <select value={novoControle.tipo} onChange={e => setNovoControle(s => ({ ...s, tipo: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {["Eliminação","Substituição","Engenharia","Administrativa","EPI"].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
                <select value={novoControle.status} onChange={e => setNovoControle(s => ({ ...s, status: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {["Planejado","Em Andamento","Concluído","Atrasado"].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <FI label="Responsável" k="responsavel" value={novoControle.responsavel} onChange={v => setNovoControle(s => ({ ...s, responsavel: v }))} />
              <FI label="Prazo" k="prazo" type="date" value={novoControle.prazo} onChange={v => setNovoControle(s => ({ ...s, prazo: v }))} />
              <div className="col-span-3"><FI label="Medida de Controle" k="medida" rows={2} value={novoControle.medida} onChange={v => setNovoControle(s => ({ ...s, medida: v }))} /></div>
              <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setAddingControle(false)}>Cancelar</Button><Button onClick={addControle} className="bg-rose-600 hover:bg-rose-700">Salvar</Button></div>
            </div>
          )}
          {["Eliminação","Substituição","Engenharia","Administrativa","EPI"].map((tipo, idx) => {
            const items = plano.filter(p => p.medida_tipo === tipo || (tipo === "EPI" && p.nao_conformidade?.startsWith("[EPI]")));
            return (
              <div key={tipo} className="bg-white border rounded-xl overflow-hidden mb-3">
                <div className="bg-gray-50 px-4 py-2 border-b flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-600 text-white text-xs flex items-center justify-center font-bold">{idx + 1}</span>
                  <span className="font-semibold text-gray-800 text-sm">{tipo}</span>
                  <Badge className="text-xs bg-gray-200 text-gray-600 ml-auto">{items.length}</Badge>
                </div>
                {items.length === 0 ? <p className="px-4 py-3 text-xs text-gray-400">Nenhuma medida cadastrada</p> :
                  items.map(p => (
                    <div key={p.id} className="px-4 py-3 border-b text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">{p.acao_recomendada || p.nao_conformidade}</span>
                        <Badge className={`text-xs ${{ "Concluído": "bg-green-100 text-green-700", "Atrasado": "bg-red-100 text-red-700", "Em Andamento": "bg-blue-100 text-blue-700", "Planejado": "bg-gray-100 text-gray-600" }[p.status] || ""}`}>{p.status}</Badge>
                      </div>
                      {p.responsavel && <p className="text-xs text-gray-500 mt-0.5">👤 {p.responsavel} {p.prazo ? `• 📅 ${p.prazo}` : ""}</p>}
                    </div>
                  ))}
              </div>
            );
          })}
        </TabsContent>

        {/* 13. PLANO DE AÇÃO */}
        <TabsContent value="plano">
          <div className="flex justify-end mb-3">
            <Button size="sm" className="bg-rose-600 hover:bg-rose-700 gap-1" onClick={() => setAddingAcao(true)}><Plus className="w-3.5 h-3.5" /> Nova Ação</Button>
          </div>
          {addingAcao && (
            <div className="bg-gray-50 border rounded-xl p-4 mb-4 grid sm:grid-cols-2 gap-3">
              <div className="col-span-2"><FI label="Não Conformidade / Evidência" k="nao_conformidade" rows={2} value={novaAcao.nao_conformidade} onChange={v => setNovaAcao(s => ({ ...s, nao_conformidade: v }))} /></div>
              <div className="col-span-2"><FI label="Ação Recomendada" k="acao_recomendada" rows={2} value={novaAcao.acao_recomendada} onChange={v => setNovaAcao(s => ({ ...s, acao_recomendada: v }))} /></div>
              <FI label="Responsável" k="responsavel" value={novaAcao.responsavel} onChange={v => setNovaAcao(s => ({ ...s, responsavel: v }))} />
              <FI label="Prazo" k="prazo" type="date" value={novaAcao.prazo} onChange={v => setNovaAcao(s => ({ ...s, prazo: v }))} />
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Prioridade</label>
                <select value={novaAcao.prioridade} onChange={e => setNovaAcao(s => ({ ...s, prioridade: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {["Alta","Média","Baixa"].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex gap-2 items-end"><Button variant="outline" onClick={() => setAddingAcao(false)}>Cancelar</Button><Button onClick={addAcao} className="bg-rose-600 hover:bg-rose-700">Salvar</Button></div>
            </div>
          )}
          <div className="space-y-3">
            {plano.length === 0 ? <p className="text-center py-8 text-gray-400">Nenhuma ação</p> :
              plano.map(p => (
                <div key={p.id} className="bg-white border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-800">{p.nao_conformidade}</p>
                      <p className="text-xs text-gray-600 mt-1">{p.acao_recomendada}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {p.responsavel && <span className="text-xs text-gray-500">👤 {p.responsavel}</span>}
                        {p.prazo && <span className="text-xs text-gray-500">📅 {p.prazo}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <Badge className={`text-xs ${PRIORIDADE_COLORS[p.prioridade] || ""}`}>{p.prioridade}</Badge>
                      <select value={p.status || "Pendente"} onChange={e => updateStatusPlano(p.id, e.target.value)} className={`text-xs border rounded px-2 py-0.5 ${p.status === "Concluído" ? "bg-green-50 text-green-700" : p.status === "Vencido" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                        {["Pendente","Em Andamento","Concluído","Vencido"].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </TabsContent>

        {/* LOG DE ALTERAÇÕES */}
        <TabsContent value="alteracoes">
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-800 text-sm">Histórico de Alterações do PGR</h3>
              <p className="text-xs text-gray-500 mt-0.5">Campos críticos (CNAE, Grau de Risco, Função, GHE) geram revisão obrigatória.</p>
            </div>
            {logAlteracoes.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400">
                <p className="text-sm">Nenhum log de alteração registrado.</p>
                <p className="text-xs mt-1">Alterações em campos sensíveis serão registradas automaticamente.</p>
              </div>
            ) : (
              <div className="divide-y">
                {logAlteracoes.map(log => (
                  <div key={log.id} className="px-4 py-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>👤 {log.user_email || "Sistema"}</span>
                      <span>{log.created_date ? new Date(log.created_date).toLocaleString("pt-BR") : "—"}</span>
                    </div>
                    <p className="text-sm text-gray-800">{log.description || log.action || "Alteração registrada"}</p>
                    {log.changes && <p className="text-xs text-gray-500 mt-0.5">{JSON.stringify(log.changes)}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="font-semibold text-amber-800 text-sm mb-2">Campos que exigem revisão obrigatória ao alterar:</h3>
            <div className="grid sm:grid-cols-2 gap-1 text-xs text-amber-700">
              {["CNAE","Grau de Risco","Função","GHE","Risco Ocupacional","Medida de Controle","EPI","Treinamento","Exame"].map(c => <span key={c}>⚠️ {c}</span>)}
            </div>
          </div>
        </TabsContent>

        {/* IA DE VALIDAÇÃO */}
        <TabsContent value="ia_val">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800">Validação Inteligente do PGR</h3>
              <p className="text-xs text-gray-500">A IA analisa consistência entre funções, riscos, medidas, EPIs e treinamentos.</p>
            </div>
            <Button onClick={runIaValidacao} disabled={iaRunning} className="bg-purple-600 hover:bg-purple-700 gap-1.5">
              {iaRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>🤖</span>}
              {iaRunning ? "Analisando..." : "Executar Validação IA"}
            </Button>
          </div>
          {iaValidacao.length === 0 && !iaRunning && (
            <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border">
              <p className="text-sm">Clique em "Executar Validação IA" para analisar o PGR.</p>
              <p className="text-xs mt-1">A IA verifica: GHE, riscos, treinamentos, exames, medidas de controle e CAs.</p>
            </div>
          )}
          {iaValidacao.length > 0 && (
            <div className="space-y-2">
              <div className="flex gap-3 mb-3">
                {["Crítico","Alto","Médio","Baixo"].map(s => {
                  const cnt = iaValidacao.filter(p => p.severidade === s).length;
                  return cnt > 0 ? <Badge key={s} className={`text-xs ${{ "Crítico": "bg-red-600 text-white", "Alto": "bg-orange-500 text-white", "Médio": "bg-yellow-400 text-gray-900", "Baixo": "bg-green-500 text-white" }[s]}`}>{s}: {cnt}</Badge> : null;
                })}
              </div>
              {["Crítico","Alto","Médio","Baixo"].map(sev => {
                const items = iaValidacao.filter(p => p.severidade === sev);
                return items.map((p, i) => (
                  <div key={`${sev}-${i}`} className={`border-l-4 rounded-lg px-4 py-3 ${{ "Crítico": "border-red-500 bg-red-50", "Alto": "border-orange-500 bg-orange-50", "Médio": "border-yellow-500 bg-yellow-50", "Baixo": "border-green-500 bg-green-50" }[p.severidade]}`}>
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm text-gray-800">{p.tipo}</p>
                      <Badge className={`text-xs ${{ "Crítico": "bg-red-600 text-white", "Alto": "bg-orange-500 text-white", "Médio": "bg-yellow-400 text-gray-900", "Baixo": "bg-green-500 text-white" }[p.severidade]}`}>{p.severidade}</Badge>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">Função: <strong>{p.funcao || "—"}</strong> | Setor: {p.setor || "—"}</p>
                    {p.detalhe && <p className="text-xs text-gray-500 mt-0.5">{p.detalhe}</p>}
                  </div>
                ));
              })}
              <div className="mt-4 flex justify-end">
                <Button size="sm" className="bg-rose-600 hover:bg-rose-700" onClick={async () => {
                  if (!leitura.empresa_mestre_id) return;
                  for (const p of iaValidacao.filter(x => x.severidade === "Crítico" || x.severidade === "Alto")) {
                    await base44.entities.ComplianceAlerta.create({ empresa_mestre_id: leitura.empresa_mestre_id, empresa_mestre_nome: leitura.empresa_mestre_nome, tipo_alerta: "Documento Vencendo", descricao: `PGR — ${p.tipo}: ${p.funcao} (${p.setor})`, prioridade: p.severidade, status: "Ativo", data_alerta: new Date().toISOString().slice(0, 10) }).catch(() => {});
                  }
                  alert(`${iaValidacao.filter(x => x.severidade === "Crítico" || x.severidade === "Alto").length} pendências criadas no Compliance 360.`);
                }}>
                  Enviar Pendências ao Compliance 360
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 14. PENDÊNCIAS E ALTERAÇÕES */}
        <TabsContent value="pendencias">
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Alertas de Impacto</h3>
              {alertasImpacto.length === 0 && (
                <div className="space-y-2">
                  {riscos.filter(r => r.classificacao === "Crítico").length > 0 && (
                    <div className="text-sm text-amber-700">⛔ {riscos.filter(r => r.classificacao === "Crítico").length} risco(s) crítico(s) identificado(s) — Plano de Ação obrigatório</div>
                  )}
                  {plano.filter(p => p.status !== "Concluído" && p.prazo && new Date(p.prazo) < new Date()).length > 0 && (
                    <div className="text-sm text-red-700">📌 {plano.filter(p => p.status !== "Concluído" && p.prazo && new Date(p.prazo) < new Date()).length} ação(ões) com prazo vencido</div>
                  )}
                  {treinamentos.filter(t => t.status_colaborador === "Vencido").length > 0 && (
                    <div className="text-sm text-red-700">🎓 {treinamentos.filter(t => t.status_colaborador === "Vencido").length} treinamento(s) vencido(s)</div>
                  )}
                  {epis.filter(e => e.status_epi === "Pendente").length > 0 && (
                    <div className="text-sm text-amber-700">🦺 {epis.filter(e => e.status_epi === "Pendente").length} EPI(s) pendente(s) de entrega</div>
                  )}
                  {alertasImpacto.length === 0 && riscos.filter(r => r.classificacao === "Crítico").length === 0 && <p className="text-sm text-green-700">✅ Nenhuma pendência crítica</p>}
                </div>
              )}
              {alertasImpacto.map((a, i) => <div key={i} className="text-sm text-amber-700">• {a}</div>)}
            </div>
            <div className="bg-white border rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Documentos que requerem revisão</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {IMPACT_DOCS.map(d => (
                  <div key={d} className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${riscos.filter(r => r.classificacao === "Crítico").length > 0 ? "bg-red-500" : "bg-green-500"}`} />
                    {d}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 15. DOCUMENTOS VINCULADOS */}
        <TabsContent value="documentos">
          <div className="space-y-3">
            {leitura.arquivo_pdf && (
              <div className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-red-500" />
                  <div><p className="font-medium">PGR — Documento Original</p><p className="text-xs text-gray-500">PDF importado e processado</p></div>
                </div>
                <a href={leitura.arquivo_pdf} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">Visualizar PDF</Button>
                </a>
              </div>
            )}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
              <p className="font-medium mb-1">Documentos vinculados automaticamente:</p>
              <ul className="space-y-1">
                <li>• Empresa Mestre: {leitura.empresa_mestre_nome} (CNPJ: {leitura.empresa_mestre_cnpj})</li>
                <li>• {setores.length} funções/setores cadastrados</li>
                <li>• {riscos.length} riscos no inventário</li>
                <li>• {treinamentos.length} treinamentos na matriz</li>
                <li>• {epis.length} EPIs por função</li>
                <li>• {plano.length} ações no plano de ação</li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function LeituraInteligente() {
  const [leituras, setLeituras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [divergencia, setDivergencia] = useState(null);
  const [selectedLeitura, setSelectedLeitura] = useState(null);
  const fileRef = useRef();

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.PGRLeitura.list("-created_date", 100);
    setLeituras(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = leituras.filter(r =>
    r.empresa_mestre_nome?.toLowerCase().includes(search.toLowerCase()) ||
    r.empresa_mestre_cnpj?.includes(search)
  );

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const today = new Date().toISOString().split("T")[0];
    setUploading(false);
    setExtracting(true);

    let extracted = {};
    try {
      extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise este PGR (Programa de Gerenciamento de Riscos) e extraia em JSON completo: cnpj, razao_social, nome_fantasia, cnae, cnae_descricao, grau_risco (número 1-4 como string), municipio, estado, cep, responsavel_legal, endereco, horario_trabalho, qtd_funcionarios (inteiro), qtd_homens (inteiro), qtd_mulheres (inteiro), responsavel_tecnico, registro_crea, data_elaboracao (DD/MM/AAAA), data_revisao (DD/MM/AAAA), vigencia_inicio (DD/MM/AAAA), vigencia_fim (DD/MM/AAAA), nome_documento, numero_revisao, setores_cargos (array de {setor, cargo, funcao, cbo, qtd_trabalhadores, qtd_homens, qtd_mulheres, ghe, descricao_atividades, atividades_rotineiras, atividades_nao_rotineiras, equipamentos_utilizados, ferramentas_utilizadas, ambiente_trabalho, jornada_trabalho}), riscos (array de {setor, cargo_funcao, ghe, atividade, perigo, tipo_risco, codigo_esocial, fonte_circunstancia, exposicao, possiveis_lesoes, classificacao, probabilidade, gravidade, medidas_existentes, medidas_recomendadas, epc, epi, necessita_treinamento, necessita_exame_pcmso}), plano_acao (array de {evidencia, acao, responsavel, prazo, status, prioridade}), epis (array de {funcao, risco_associado, epi_obrigatorio, ca, fabricante, marca, validade_ca, periodicidade_troca_meses}), treinamentos (array de {funcao, risco, nr_aplicavel, treinamento_obrigatorio, carga_horaria, validade_meses, tipo_reciclagem}).`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            cnpj: { type: "string" }, razao_social: { type: "string" }, nome_fantasia: { type: "string" },
            cnae: { type: "string" }, cnae_descricao: { type: "string" }, grau_risco: { type: "string" },
            municipio: { type: "string" }, estado: { type: "string" }, responsavel_legal: { type: "string" },
            endereco: { type: "string" }, horario_trabalho: { type: "string" },
            qtd_funcionarios: { type: "number" }, qtd_homens: { type: "number" }, qtd_mulheres: { type: "number" },
            responsavel_tecnico: { type: "string" }, registro_crea: { type: "string" },
            data_elaboracao: { type: "string" }, vigencia_inicio: { type: "string" }, vigencia_fim: { type: "string" },
            nome_documento: { type: "string" }, numero_revisao: { type: "string" },
            setores_cargos: { type: "array", items: { type: "object" } },
            riscos: { type: "array", items: { type: "object" } },
            plano_acao: { type: "array", items: { type: "object" } },
            epis: { type: "array", items: { type: "object" } },
            treinamentos: { type: "array", items: { type: "object" } }
          }
        }
      });
    } catch { extracted = {}; }

    setExtracting(false);
    const cnpj = extracted.cnpj || "";

    let empresaId = null, empresaNome = "";
    if (cnpj) {
      const empresas = await base44.entities.EmpresaMestre.filter({ cnpj });
      if (empresas.length > 0) {
        const emp = empresas[0];
        empresaId = emp.id; empresaNome = emp.razao_social;
        const hasDivergencia = (emp.cnae && extracted.cnae && emp.cnae !== extracted.cnae) ||
          (emp.grau_risco && extracted.grau_risco && emp.grau_risco !== extracted.grau_risco);
        if (hasDivergencia) {
          const lt = await base44.entities.PGRLeitura.create({ empresa_mestre_id: emp.id, empresa_mestre_cnpj: cnpj, empresa_mestre_nome: emp.razao_social, arquivo_pdf: file_url, status_processamento: "Processando", data_processamento: today, data_upload: today, vigencia_fim: parseBRDate(extracted.vigencia_fim) });
          setDivergencia({ empresaExistente: emp, dadosNovos: extracted, leituraId: lt.id, file_url });
          return;
        }
      } else {
        const nova = await base44.entities.EmpresaMestre.create({ cnpj, razao_social: extracted.razao_social || "Empresa Importada", cnae: extracted.cnae || "", cnae_descricao: extracted.cnae_descricao || "", grau_risco: extracted.grau_risco || "1", municipio: extracted.municipio || "", estado: extracted.estado || "", responsavel_legal: extracted.responsavel_legal || "", qtd_colaboradores: extracted.qtd_funcionarios ? parseInt(extracted.qtd_funcionarios) : undefined, status_empresa: "Ativa", data_cadastro: today });
        empresaId = nova.id; empresaNome = nova.razao_social;
      }
    }
    await salvarLeituraCompleta(empresaId, empresaNome, cnpj, extracted, file_url, today);
  };

  const salvarLeituraCompleta = async (empresaId, empresaNome, cnpj, extracted, file_url, today) => {
    const leitura = await base44.entities.PGRLeitura.create({ empresa_mestre_id: empresaId || "sem_empresa", empresa_mestre_cnpj: cnpj, empresa_mestre_nome: empresaNome, arquivo_pdf: file_url, status_processamento: "Completo", data_processamento: today, data_upload: today, vigencia_fim: parseBRDate(extracted.vigencia_fim) });
    const lid = leitura.id;
    await Promise.all([
      base44.entities.PGRControleDocumento.create({ pgr_leitura_id: lid, nome_documento: extracted.nome_documento || "", numero_revisao: extracted.numero_revisao || "", responsavel_tecnico: extracted.responsavel_tecnico || "", data_emissao: parseBRDate(extracted.data_elaboracao), vigencia_inicio: parseBRDate(extracted.vigencia_inicio), vigencia_fim: parseBRDate(extracted.vigencia_fim), status_doc: "Vigente" }),
      base44.entities.PGRIdentificacaoEmpresa.create({ pgr_leitura_id: lid, cnpj, razao_social: extracted.razao_social || "", nome_fantasia: extracted.nome_fantasia || "", cnae: extracted.cnae || "", cnae_descricao: extracted.cnae_descricao || "", grau_risco: extracted.grau_risco || "", municipio: extracted.municipio || "", estado: extracted.estado || "", cep: extracted.cep || "", endereco: extracted.endereco || "", horario_trabalho: extracted.horario_trabalho || "", responsavel_legal: extracted.responsavel_legal || "", responsavel_tecnico: extracted.responsavel_tecnico || "", crea_registro: extracted.registro_crea || "", qtd_funcionarios: extracted.qtd_funcionarios ? parseInt(extracted.qtd_funcionarios) : undefined, qtd_homens: extracted.qtd_homens ? parseInt(extracted.qtd_homens) : undefined, qtd_mulheres: extracted.qtd_mulheres ? parseInt(extracted.qtd_mulheres) : undefined }),
      ...(extracted.setores_cargos || []).map(sc => base44.entities.PGRSetorCargo.create({ pgr_leitura_id: lid, ...sc, cbo: sc.cbo || "", qtd_trabalhadores: parseInt(sc.qtd_trabalhadores) || 0, qtd_homens: parseInt(sc.qtd_homens) || 0, qtd_mulheres: parseInt(sc.qtd_mulheres) || 0 })),
      ...(extracted.riscos || []).map(r => base44.entities.PGRInventarioRisco.create({ pgr_leitura_id: lid, ...r, nivel_risco: r.probabilidade && r.gravidade ? parseInt(r.probabilidade) * parseInt(r.gravidade) : undefined, codigo_esocial: r.codigo_esocial || "" })),
      ...(extracted.plano_acao || []).map(p => base44.entities.PGRPlanoAcao.create({ pgr_leitura_id: lid, nao_conformidade: p.evidencia || p.nao_conformidade || "", acao_recomendada: p.acao || p.acao_recomendada || "", responsavel: p.responsavel || "", prazo: p.prazo || "", status: p.status || "Pendente", prioridade: p.prioridade || "Média" })),
      ...(extracted.epis || []).map(ep => base44.entities.PGREPIFuncao.create({ pgr_leitura_id: lid, funcao: ep.funcao, risco_associado: ep.risco_associado, epi_obrigatorio: ep.epi_obrigatorio, certificado_aprovacao_ca: ep.ca, fabricante: ep.fabricante, status_epi: "Pendente" })),
      ...(extracted.treinamentos || []).map(t => base44.entities.PGRTreinamentoFuncao.create({ pgr_leitura_id: lid, funcao: t.funcao, nr_aplicavel: t.nr_aplicavel, treinamento_obrigatorio: t.treinamento_obrigatorio, carga_horaria: t.carga_horaria ? parseInt(t.carga_horaria) : undefined, validade_meses: t.validade_meses ? parseInt(t.validade_meses) : undefined, status_colaborador: "Pendente" })),
    ]);
    load();
  };

  const resolverDivergencia = async (acao) => {
    const { empresaExistente, dadosNovos, leituraId, file_url } = divergencia;
    const today = new Date().toISOString().split("T")[0];
    if (acao === "atualizar") {
      await base44.entities.EmpresaMestre.update(empresaExistente.id, { cnae: dadosNovos.cnae || empresaExistente.cnae, grau_risco: dadosNovos.grau_risco || empresaExistente.grau_risco, qtd_colaboradores: dadosNovos.qtd_funcionarios ? parseInt(dadosNovos.qtd_funcionarios) : empresaExistente.qtd_colaboradores });
    }
    await base44.entities.PGRLeitura.update(leituraId, { status_processamento: "Completo" });
    await salvarLeituraCompleta(empresaExistente.id, empresaExistente.razao_social, empresaExistente.cnpj, dadosNovos, file_url, today);
    setDivergencia(null);
  };

  // Modal divergência
  if (divergencia) {
    const { empresaExistente: emp, dadosNovos: novo } = divergencia;
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-5 h-5 text-amber-600" /><h2 className="font-bold text-amber-800">Divergência Detectada</h2></div>
          <p className="text-sm text-amber-700 mb-4">CNPJ <strong>{novo.cnpj}</strong> já cadastrado como <strong>{emp.razao_social}</strong>, mas os dados diferem:</p>
          <div className="grid grid-cols-3 gap-2 text-sm mb-4">
            <div className="font-medium text-gray-600">Campo</div><div className="font-medium text-gray-600">Atual</div><div className="font-medium text-gray-600">No Documento</div>
            {emp.cnae !== novo.cnae && <><div>CNAE</div><div>{emp.cnae || "—"}</div><div className="text-blue-700 font-medium">{novo.cnae}</div></>}
            {emp.grau_risco !== novo.grau_risco && <><div>Grau Risco</div><div>{emp.grau_risco || "—"}</div><div className="text-blue-700 font-medium">{novo.grau_risco}</div></>}
          </div>
          <div className="flex gap-3">
            <Button onClick={() => resolverDivergencia("manter")} variant="outline">Manter Atual</Button>
            <Button onClick={() => resolverDivergencia("atualizar")} className="bg-blue-600 hover:bg-blue-700">Atualizar Cadastro</Button>
            <Button onClick={() => { setDivergencia(null); load(); }} variant="ghost" className="text-red-500">Cancelar</Button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedLeitura) return <PGRDetalhe leitura={selectedLeitura} onClose={() => { setSelectedLeitura(null); load(); }} />;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><ShieldAlert className="w-6 h-6 text-rose-600" /> PGR — Programa de Gerenciamento de Riscos</h1>
          <p className="text-gray-500 text-sm">Upload do PDF → IA extrai dados → Interface completa com 15 abas</p>
        </div>
        <Button onClick={() => fileRef.current?.click()} disabled={uploading || extracting} className="bg-rose-600 hover:bg-rose-700 gap-1.5">
          {uploading || extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {uploading ? "Enviando..." : extracting ? "IA extraindo..." : "Nova Leitura PGR"}
        </Button>
        <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
      </div>

      {extracting && (
        <div className="mb-4 flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-purple-700">
          <Loader2 className="w-5 h-5 animate-spin" /><span><strong>IA extraindo dados completos do PGR...</strong> Setores, funções, riscos, EPIs, treinamentos e plano de ação.</span>
        </div>
      )}

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Buscar por empresa ou CNPJ..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
            <thead><tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Empresa</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">CNPJ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Vigência Fim</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  Nenhuma leitura. Clique em "Nova Leitura PGR".
                </td></tr>
              ) : filtered.map(r => {
                const vencido = r.vigencia_fim && new Date(r.vigencia_fim + "T00:00:00") < new Date();
                return (
                  <tr key={r.id} className={`border-b hover:bg-gray-50 cursor-pointer ${vencido ? "bg-red-50/40" : ""}`} onClick={() => setSelectedLeitura(r)}>
                    <td className="px-4 py-3 font-medium">{r.empresa_mestre_nome || "—"}</td>
                    <td className="px-4 py-3 font-mono text-sm">{r.empresa_mestre_cnpj || "—"}</td>
                    <td className="px-4 py-3"><Badge className={`text-xs ${STATUS_PROC_COLORS[r.status_processamento] || ""}`}>{r.status_processamento}</Badge></td>
                    <td className={`px-4 py-3 ${vencido ? "text-red-600 font-medium" : "text-gray-700"}`}>
                      {r.vigencia_fim ? `${vencido ? "⚠ " : ""}${format(new Date(r.vigencia_fim + "T00:00:00"), "dd/MM/yyyy")}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => setSelectedLeitura(r)}><ChevronRight className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={async () => { if (!confirm("Excluir?")) return; await base44.entities.PGRLeitura.delete(r.id); load(); }} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}