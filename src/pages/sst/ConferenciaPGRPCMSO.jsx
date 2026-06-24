import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, Search, Loader2, Link2, PlusCircle, ShieldCheck, RefreshCw } from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function normalize(str) { return (str || "").trim().toLowerCase(); }

function compareField(a, b) {
  if (!a && !b) return "ausente_ambos";
  if (!a) return "ausente_pgr";
  if (!b) return "ausente_pcmso";
  if (normalize(a) === normalize(b)) return "igual";
  return "divergente";
}

const STATUS_COLORS = {
  igual: "bg-green-100 text-green-700",
  divergente: "bg-red-100 text-red-700",
  ausente_pgr: "bg-amber-100 text-amber-700",
  ausente_pcmso: "bg-blue-100 text-blue-700",
  ausente_ambos: "bg-gray-100 text-gray-500",
  novo: "bg-purple-100 text-purple-700",
};
const STATUS_LABEL = {
  igual: "Igual",
  divergente: "Divergente",
  ausente_pgr: "Ausente no PGR",
  ausente_pcmso: "Ausente no PCMSO",
  ausente_ambos: "Ausente em ambos",
  novo: "Novo dado",
};

// ─── Dashboard de Integração ──────────────────────────────────────────────────
function DashboardIntegracao({ empresa, pgrData, pcmsoData }) {
  const { setores = [], riscos = [], epis = [], treinamentos = [] } = pgrData;
  const { matrizExames = [] } = pcmsoData;

  const funcoes = [...new Set(setores.map(s => normalize(s.funcao || s.cargo)).filter(Boolean))];

  const funcoesSemRisco = funcoes.filter(fn => !riscos.find(r => normalize(r.cargo_funcao) === fn));
  const funcoesSemExame = funcoes.filter(fn => !matrizExames.find(m => normalize(m.funcao) === fn));
  const funcoesSemEPI = funcoes.filter(fn => !epis.find(e => normalize(e.funcao) === fn));
  const funcoesSemTrein = funcoes.filter(fn => !treinamentos.find(t => normalize(t.funcao) === fn));
  const riscosSemExame = riscos.filter(r => r.necessita_exame_pcmso && !matrizExames.find(m => normalize(m.funcao) === normalize(r.cargo_funcao)));
  const examesSemFuncao = matrizExames.filter(m => !funcoes.includes(normalize(m.funcao)));
  const episSemFuncao = epis.filter(e => !funcoes.includes(normalize(e.funcao)));

  const cards = [
    { label: "Funções sem Risco", value: funcoesSemRisco.length, color: "text-red-600", items: funcoesSemRisco },
    { label: "Funções sem Exame", value: funcoesSemExame.length, color: "text-orange-600", items: funcoesSemExame },
    { label: "Funções sem EPI", value: funcoesSemEPI.length, color: "text-amber-600", items: funcoesSemEPI },
    { label: "Funções sem Treinamento", value: funcoesSemTrein.length, color: "text-yellow-600", items: funcoesSemTrein },
    { label: "Riscos sem Exame PCMSO", value: riscosSemExame.length, color: "text-purple-600", items: riscosSemExame.map(r => r.perigo) },
    { label: "Exames sem Função (PCMSO)", value: examesSemFuncao.length, color: "text-blue-600", items: examesSemFuncao.map(m => m.funcao) },
    { label: "EPIs sem Função", value: episSemFuncao.length, color: "text-indigo-600", items: episSemFuncao.map(e => e.epi_obrigatorio) },
  ];

  const totalPendencias = cards.reduce((s, c) => s + c.value, 0);

  return (
    <div className="space-y-4">
      <div className={`rounded-xl p-4 border ${totalPendencias === 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
        <div className="flex items-center gap-3">
          {totalPendencias === 0
            ? <CheckCircle className="w-6 h-6 text-green-600" />
            : <AlertTriangle className="w-6 h-6 text-amber-600" />}
          <div>
            <p className="font-semibold text-gray-800">
              {totalPendencias === 0 ? "✅ PGR e PCMSO totalmente integrados" : `${totalPendencias} pendência(s) de integração detectadas`}
            </p>
            <p className="text-xs text-gray-500">
              {funcoes.length} funções · {riscos.length} riscos · {matrizExames.length} exames na matriz
            </p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-white border rounded-xl p-3">
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>
      {cards.filter(c => c.value > 0).map(c => (
        <div key={c.label} className="bg-white border rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <span className="font-medium text-sm text-gray-700">{c.label}</span>
            <Badge className="ml-2 text-xs bg-red-100 text-red-700">{c.value}</Badge>
          </div>
          <div className="px-4 py-2 flex flex-wrap gap-2">
            {c.items.slice(0, 10).map((item, i) => (
              <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{item}</span>
            ))}
            {c.items.length > 10 && <span className="text-xs text-gray-400">+{c.items.length - 10} mais</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tabela de Comparação de Campo ───────────────────────────────────────────
function CampoRow({ campo, valorPGR, valorPCMSO, onAcao }) {
  const status = compareField(valorPGR, valorPCMSO);
  return (
    <tr className={`border-b ${status === "divergente" ? "bg-red-50" : status === "igual" ? "" : "bg-amber-50/50"}`}>
      <td className="px-3 py-2 font-medium text-sm text-gray-700">{campo}</td>
      <td className="px-3 py-2 text-sm text-gray-600">{valorPGR || <span className="text-gray-300 italic">—</span>}</td>
      <td className="px-3 py-2 text-sm text-gray-600">{valorPCMSO || <span className="text-gray-300 italic">—</span>}</td>
      <td className="px-3 py-2">
        <Badge className={`text-xs ${STATUS_COLORS[status]}`}>{STATUS_LABEL[status]}</Badge>
      </td>
      <td className="px-3 py-2">
        {status === "divergente" && (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="text-xs h-6 px-2" onClick={() => onAcao("manter_pgr", campo, valorPGR)}>PGR</Button>
            <Button size="sm" variant="outline" className="text-xs h-6 px-2" onClick={() => onAcao("usar_pcmso", campo, valorPCMSO)}>PCMSO</Button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Comparação de Funções ────────────────────────────────────────────────────
function ComparacaoFuncoes({ pgrSetores, pcmsoMatriz, onVincular }) {
  const funcoesPGR = [...new Map(pgrSetores.map(s => [normalize(s.funcao || s.cargo), s])).values()];
  const funcoesPCMSO = [...new Map(pcmsoMatriz.map(m => [normalize(m.funcao), m])).values()];
  const todasFuncoes = [...new Set([
    ...funcoesPGR.map(s => normalize(s.funcao || s.cargo)),
    ...funcoesPCMSO.map(m => normalize(m.funcao))
  ])].filter(Boolean);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
        <thead><tr className="bg-gray-50 border-b">
          {["Função","GHE (PGR)","Setor (PGR)","Exames (PCMSO)","Riscos (PCMSO)","Status","Ação"].map(h => (
            <th key={h} className="text-left px-3 py-2 font-medium text-gray-600 text-xs">{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {todasFuncoes.map(fn => {
            const pgr = funcoesPGR.find(s => normalize(s.funcao || s.cargo) === fn);
            const pcmso = funcoesPCMSO.find(m => normalize(m.funcao) === fn);
            let status = "igual";
            if (!pgr) status = "ausente_pgr";
            else if (!pcmso) status = "ausente_pcmso";

            return (
              <tr key={fn} className={`border-b ${status === "ausente_pgr" ? "bg-amber-50" : status === "ausente_pcmso" ? "bg-blue-50/40" : ""}`}>
                <td className="px-3 py-2 font-medium">{pgr ? (pgr.funcao || pgr.cargo) : pcmso?.funcao}</td>
                <td className="px-3 py-2 text-xs">{pgr?.ghe || "—"}</td>
                <td className="px-3 py-2 text-xs">{pgr?.setor || pcmso?.setor || "—"}</td>
                <td className="px-3 py-2 text-xs max-w-[150px] truncate" title={pcmso?.exames_obrigatorios}>{pcmso?.exames_obrigatorios || "—"}</td>
                <td className="px-3 py-2 text-xs max-w-[120px] truncate" title={pcmso?.riscos_ocupacionais}>{pcmso?.riscos_ocupacionais || "—"}</td>
                <td className="px-3 py-2">
                  <Badge className={`text-xs ${STATUS_COLORS[status]}`}>{STATUS_LABEL[status]}</Badge>
                </td>
                <td className="px-3 py-2">
                  {status === "ausente_pgr" && (
                    <Button size="sm" variant="outline" className="text-xs h-6 px-2 text-blue-600" onClick={() => onVincular(fn, "criar_pgr")}>
                      <PlusCircle className="w-3 h-3 mr-1" /> Criar no PGR
                    </Button>
                  )}
                  {status === "ausente_pcmso" && (
                    <Button size="sm" variant="outline" className="text-xs h-6 px-2 text-amber-600" onClick={() => onVincular(fn, "criar_pcmso")}>
                      <PlusCircle className="w-3 h-3 mr-1" /> Criar no PCMSO
                    </Button>
                  )}
                  {status === "igual" && (
                    <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Vinculado</span>
                  )}
                </td>
              </tr>
            );
          })}
          {todasFuncoes.length === 0 && (
            <tr><td colSpan={7} className="text-center py-6 text-gray-400">Nenhuma função encontrada</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function ConferenciaPGRPCMSO() {
  const [empresas, setEmpresas] = useState([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDados, setLoadingDados] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [saving, setSaving] = useState(false);

  const [pgrData, setPgrData] = useState({ leitura: null, ident: null, setores: [], riscos: [], epis: [], treinamentos: [], plano: [] });
  const [pcmsoData, setPcmsoData] = useState({ doc: null, matrizExames: [] });
  const [camposDivergentes, setCamposDivergentes] = useState([]);
  const [mensagem, setMensagem] = useState(null);

  useEffect(() => {
    base44.entities.EmpresaMestre.list("-created_date", 100).then(d => {
      setEmpresas(d);
      setLoading(false);
    });
  }, []);

  const carregarDados = async (empresa) => {
    setSelectedEmpresa(empresa);
    setLoadingDados(true);
    setTab("dashboard");
    setMensagem(null);

    const [pgrs, pcmsos] = await Promise.all([
      base44.entities.PGRLeitura.filter({ empresa_mestre_id: empresa.id }),
      base44.entities.DocumentoPCMSO.filter({ empresa_mestre_id: empresa.id }),
    ]);

    const pgr = pgrs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    const pcmso = pcmsos.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

    const [pgrIdent, pgrSetores, pgrRiscos, pgrEpis, pgrTrein, pgrPlano, pcmsoMatriz] = await Promise.all([
      pgr ? base44.entities.PGRIdentificacaoEmpresa.filter({ pgr_leitura_id: pgr.id }) : Promise.resolve([]),
      pgr ? base44.entities.PGRSetorCargo.filter({ pgr_leitura_id: pgr.id }) : Promise.resolve([]),
      pgr ? base44.entities.PGRInventarioRisco.filter({ pgr_leitura_id: pgr.id }) : Promise.resolve([]),
      pgr ? base44.entities.PGREPIFuncao.filter({ pgr_leitura_id: pgr.id }) : Promise.resolve([]),
      pgr ? base44.entities.PGRTreinamentoFuncao.filter({ pgr_leitura_id: pgr.id }) : Promise.resolve([]),
      pgr ? base44.entities.PGRPlanoAcao.filter({ pgr_leitura_id: pgr.id }) : Promise.resolve([]),
      pcmso ? base44.entities.PCMSOMatrizExame.filter({ pcmso_detalhe_id: pcmso.id }) : Promise.resolve([]),
    ]);

    const ident = pgrIdent[0] || {};

    setPgrData({ leitura: pgr, ident, setores: pgrSetores, riscos: pgrRiscos, epis: pgrEpis, treinamentos: pgrTrein, plano: pgrPlano });
    setPcmsoData({ doc: pcmso, matrizExames: pcmsoMatriz });

    // Calcular divergências de campos gerais
    const divs = [];
    const campos = [
      { campo: "CNPJ", pgr: ident.cnpj, pcmso: pcmso?.cnpj },
      { campo: "Razão Social", pgr: ident.razao_social || empresa.razao_social, pcmso: pcmso?.empresa_nome },
      { campo: "CNAE", pgr: ident.cnae || empresa.cnae, pcmso: pcmso?.cnae },
      { campo: "Grau de Risco", pgr: String(ident.grau_risco || empresa.grau_risco || ""), pcmso: String(pcmso?.grau_risco || "") },
      { campo: "Endereço", pgr: ident.endereco || empresa.endereco, pcmso: pcmso?.endereco },
      { campo: "Município", pgr: ident.municipio || empresa.municipio, pcmso: pcmso?.municipio },
      { campo: "Total Trabalhadores", pgr: String(ident.qtd_funcionarios || empresa.qtd_colaboradores || ""), pcmso: String(pcmso?.qtd_empregados || "") },
    ];
    campos.forEach(c => {
      const status = compareField(c.pgr, c.pcmso);
      if (status !== "igual") divs.push({ ...c, status });
    });
    setCamposDivergentes(divs);
    setLoadingDados(false);
  };

  const aplicarResolucao = async (campo, valor, fonte) => {
    if (!selectedEmpresa) return;
    setSaving(true);
    const campoMap = { "CNAE": "cnae", "Grau de Risco": "grau_risco", "Município": "municipio", "Endereço": "endereco", "Total Trabalhadores": "qtd_colaboradores" };
    const key = campoMap[campo];
    if (key) {
      await base44.entities.EmpresaMestre.update(selectedEmpresa.id, { [key]: valor });
      if (pgrData.ident?.id && fonte === "usar_pcmso") {
        await base44.entities.PGRIdentificacaoEmpresa.update(pgrData.ident.id, { [key === "qtd_colaboradores" ? "qtd_funcionarios" : key]: valor }).catch(() => {});
      }
    }
    setMensagem(`✅ Campo "${campo}" atualizado no cadastro mestre com valor do ${fonte === "usar_pcmso" ? "PCMSO" : "PGR"}.`);
    setSaving(false);
    await carregarDados(selectedEmpresa);
  };

  const vincularFuncao = async (fn, acao) => {
    setSaving(true);
    if (acao === "criar_pcmso" && pcmsoData.doc) {
      const pgr = pgrData.setores.find(s => normalize(s.funcao || s.cargo) === normalize(fn));
      const riscos = pgrData.riscos.filter(r => normalize(r.cargo_funcao) === normalize(fn));
      await base44.entities.PCMSOMatrizExame.create({
        pcmso_detalhe_id: pcmsoData.doc.id,
        funcao: pgr?.funcao || pgr?.cargo || fn,
        setor: pgr?.setor || "",
        ghe: pgr?.ghe || "",
        cbo: pgr?.cbo || "",
        riscos_ocupacionais: riscos.map(r => r.perigo).join(", "),
        exames_obrigatorios: "A definir — importado do PGR",
        periodicidade: "Anual",
      });
      setMensagem(`✅ Função "${fn}" criada na matriz PCMSO com riscos do PGR.`);
    }
    if (acao === "criar_pgr" && pgrData.leitura) {
      const pcmso = pcmsoData.matrizExames.find(m => normalize(m.funcao) === normalize(fn));
      await base44.entities.PGRSetorCargo.create({
        pgr_leitura_id: pgrData.leitura.id,
        funcao: pcmso?.funcao || fn,
        setor: pcmso?.setor || "",
        ghe: pcmso?.ghe || "",
        cbo: pcmso?.cbo || "",
        qtd_trabalhadores: 0,
      });
      setMensagem(`✅ Função "${fn}" criada no PGR a partir do PCMSO.`);
    }
    setSaving(false);
    await carregarDados(selectedEmpresa);
  };

  const alimentarBaseMestre = async () => {
    if (!selectedEmpresa) return;
    setSaving(true);
    const empId = selectedEmpresa.id;
    const empNome = selectedEmpresa.razao_social;

    // Funções → FuncaoCargo (sem duplicar)
    const funcaoExistentes = await base44.entities.FuncaoCargo.filter({ setor: "SST_CONCILIADO" }).catch(() => []);
    for (const s of pgrData.setores) {
      const nome = s.funcao || s.cargo;
      if (!nome) continue;
      const existe = funcaoExistentes.find(f => normalize(f.nome) === normalize(nome));
      if (!existe) {
        await base44.entities.FuncaoCargo.create({ nome, setor: s.setor || "", cbo: s.cbo || "", ativo: true }).catch(() => {});
      }
    }

    // Treinamentos → MatrizTreinamentoNR (sem duplicar)
    const treinExist = await base44.entities.MatrizTreinamentoNR.filter({ empresa_mestre_id: empId }).catch(() => []);
    for (const t of pgrData.treinamentos) {
      const existe = treinExist.find(x => normalize(x.funcao) === normalize(t.funcao) && normalize(x.nr_codigo) === normalize(t.nr_aplicavel));
      if (!existe) {
        await base44.entities.MatrizTreinamentoNR.create({ empresa_mestre_id: empId, empresa_mestre_nome: empNome, funcao: t.funcao, nr_codigo: t.nr_aplicavel, curso_obrigatorio: t.treinamento_obrigatorio, carga_horaria: parseInt(t.carga_horaria) || 0, periodicidade_meses: parseInt(t.validade_meses) || 12, ativo: true }).catch(() => {});
      }
    }

    // Exames PCMSO → MatrizExameCargo (sem duplicar)
    const exameExist = await base44.entities.MatrizExameCargo.list().catch(() => []);
    for (const m of pcmsoData.matrizExames) {
      const existe = exameExist.find(x => normalize(x.nome_cargo) === normalize(m.funcao));
      if (!existe && m.funcao) {
        await base44.entities.MatrizExameCargo.create({ nome_cargo: m.funcao, cbo: m.cbo || "", exames_obrigatorios: m.exames_obrigatorios || "", periodicidade_meses: 12, ativo: true }).catch(() => {});
      }
    }

    // Alertas de riscos críticos
    for (const r of pgrData.riscos.filter(x => x.classificacao === "Crítico" || x.classificacao === "Alto")) {
      await base44.entities.ComplianceAlerta.create({ empresa_mestre_id: empId, empresa_mestre_nome: empNome, tipo_alerta: "Documento Vencendo", descricao: `Risco ${r.classificacao}: ${r.perigo} (${r.setor || r.cargo_funcao})`, prioridade: r.classificacao, status: "Ativo", data_alerta: new Date().toISOString().slice(0, 10) }).catch(() => {});
    }

    setMensagem(`✅ Base mestre alimentada! ${pgrData.setores.length} funções, ${pgrData.treinamentos.length} treinamentos, ${pcmsoData.matrizExames.length} exames integrados.`);
    setSaving(false);
  };

  const filtered = empresas.filter(e =>
    e.razao_social?.toLowerCase().includes(search.toLowerCase()) ||
    e.cnpj?.includes(search)
  );

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  if (!selectedEmpresa) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" /> Conferência PGR × PCMSO
          </h1>
          <p className="text-gray-500 text-sm">Selecione uma empresa para comparar e integrar os dados do PGR com o PCMSO</p>
        </div>
        <div className="mb-4 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar empresa ou CNPJ..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="space-y-2">
          {filtered.map(emp => (
            <div key={emp.id} className="bg-white border rounded-xl px-4 py-3 flex items-center justify-between hover:border-blue-300 cursor-pointer" onClick={() => carregarDados(emp)}>
              <div>
                <p className="font-semibold text-gray-800">{emp.razao_social}</p>
                <p className="text-xs text-gray-500">CNPJ: {emp.cnpj} · CNAE: {emp.cnae || "—"} · Grau Risco: {emp.grau_risco || "—"}</p>
              </div>
              <Badge className={`text-xs ${emp.status_empresa === "Ativa" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{emp.status_empresa}</Badge>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center py-8 text-gray-400">Nenhuma empresa encontrada</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Button variant="ghost" onClick={() => setSelectedEmpresa(null)}>← Voltar</Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Conferência PGR × PCMSO — {selectedEmpresa.razao_social}</h1>
          <p className="text-xs text-gray-500">CNPJ: {selectedEmpresa.cnpj}</p>
        </div>
        <Button onClick={alimentarBaseMestre} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
          {saving ? "Integrando..." : "Integrar ao Compliance 360"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => carregarDados(selectedEmpresa)}>
          <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
        </Button>
      </div>

      {/* Status PGR/PCMSO */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className={`rounded-lg p-3 border text-center ${pgrData.leitura ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
          <p className="text-xs font-medium text-gray-600">PGR</p>
          <p className={`text-sm font-bold ${pgrData.leitura ? "text-green-700" : "text-gray-400"}`}>{pgrData.leitura ? "Importado" : "Ausente"}</p>
        </div>
        <div className={`rounded-lg p-3 border text-center ${pcmsoData.doc ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}>
          <p className="text-xs font-medium text-gray-600">PCMSO</p>
          <p className={`text-sm font-bold ${pcmsoData.doc ? "text-blue-700" : "text-gray-400"}`}>{pcmsoData.doc ? "Importado" : "Ausente"}</p>
        </div>
        <div className="rounded-lg p-3 border bg-purple-50 border-purple-200 text-center">
          <p className="text-xs font-medium text-gray-600">Divergências</p>
          <p className={`text-sm font-bold ${camposDivergentes.length > 0 ? "text-red-600" : "text-green-600"}`}>{camposDivergentes.length}</p>
        </div>
        <div className="rounded-lg p-3 border bg-orange-50 border-orange-200 text-center">
          <p className="text-xs font-medium text-gray-600">Funções</p>
          <p className="text-sm font-bold text-orange-700">{pgrData.setores.length + pcmsoData.matrizExames.length > 0 ? [...new Set([...pgrData.setores.map(s => normalize(s.funcao || s.cargo)), ...pcmsoData.matrizExames.map(m => normalize(m.funcao))].filter(Boolean))].length : "—"}</p>
        </div>
      </div>

      {/* Mensagem de resultado */}
      {mensagem && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {mensagem}
        </div>
      )}

      {loadingDados ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap gap-1 h-auto bg-gray-100 p-1 mb-4">
            {[
              ["dashboard", "📊 Dashboard Integração"],
              ["campos", "📋 Dados Gerais"],
              ["funcoes", "👥 Funções"],
              ["riscos", "⚠️ Riscos × Exames"],
              ["epis", "🦺 EPIs × Funções"],
              ["treinamentos", "🎓 Treinamentos"],
            ].map(([v, l]) => (
              <TabsTrigger key={v} value={v} className="text-xs py-1 px-2 data-[state=active]:bg-white">{l}</TabsTrigger>
            ))}
          </TabsList>

          {/* DASHBOARD */}
          <TabsContent value="dashboard">
            <DashboardIntegracao empresa={selectedEmpresa} pgrData={pgrData} pcmsoData={pcmsoData} />
          </TabsContent>

          {/* CAMPOS GERAIS */}
          <TabsContent value="campos">
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-800 text-sm">Comparação de Dados Gerais da Empresa</h3>
                <p className="text-xs text-gray-500">Campos divergentes entre o PGR importado e o PCMSO importado</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b">
                    {["Campo","PGR","PCMSO","Status","Resolver"].map(h => <th key={h} className="text-left px-3 py-2 font-medium text-gray-600 text-xs">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {[
                      { campo: "CNPJ", pgr: pgrData.ident?.cnpj || selectedEmpresa.cnpj, pcmso: pcmsoData.doc?.cnpj },
                      { campo: "Razão Social", pgr: pgrData.ident?.razao_social || selectedEmpresa.razao_social, pcmso: pcmsoData.doc?.empresa_nome },
                      { campo: "CNAE", pgr: pgrData.ident?.cnae || selectedEmpresa.cnae, pcmso: pcmsoData.doc?.cnae },
                      { campo: "Grau de Risco", pgr: String(pgrData.ident?.grau_risco || selectedEmpresa.grau_risco || ""), pcmso: String(pcmsoData.doc?.grau_risco || "") },
                      { campo: "Endereço", pgr: pgrData.ident?.endereco || selectedEmpresa.endereco, pcmso: pcmsoData.doc?.endereco },
                      { campo: "Município", pgr: pgrData.ident?.municipio || selectedEmpresa.municipio, pcmso: pcmsoData.doc?.municipio },
                      { campo: "Total Trabalhadores", pgr: String(pgrData.ident?.qtd_funcionarios || selectedEmpresa.qtd_colaboradores || ""), pcmso: String(pcmsoData.doc?.qtd_empregados || "") },
                      { campo: "Médico Responsável", pgr: "—", pcmso: pcmsoData.doc?.medico_responsavel },
                      { campo: "Vigência Fim", pgr: pgrData.leitura?.vigencia_fim, pcmso: pcmsoData.doc?.vigencia_fim },
                    ].map(row => (
                      <CampoRow key={row.campo} {...row} onAcao={(acao, campo, valor) => aplicarResolucao(campo, valor, acao)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* FUNÇÕES */}
          <TabsContent value="funcoes">
            <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
              <strong>Regra de conciliação:</strong> Se uma função já existe no PGR ou PCMSO, o sistema vincula automaticamente e não cria duplicata.
            </div>
            <ComparacaoFuncoes
              pgrSetores={pgrData.setores}
              pcmsoMatriz={pcmsoData.matrizExames}
              onVincular={(fn, acao) => vincularFuncao(fn, acao)}
            />
          </TabsContent>

          {/* RISCOS × EXAMES */}
          <TabsContent value="riscos">
            <div className="space-y-3">
              {pgrData.riscos.length === 0 && pcmsoData.matrizExames.length === 0 && (
                <p className="text-center py-8 text-gray-400">Nenhum risco ou exame encontrado</p>
              )}
              {pgrData.riscos.filter(r => r.necessita_exame_pcmso || r.classificacao === "Crítico" || r.classificacao === "Alto").map(r => {
                const fn = normalize(r.cargo_funcao);
                const exame = pcmsoData.matrizExames.find(m => normalize(m.funcao) === fn);
                return (
                  <div key={r.id} className={`bg-white border-l-4 rounded-lg px-4 py-3 ${exame ? "border-green-500" : "border-red-400"}`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="font-medium text-sm text-gray-800">{r.perigo}</p>
                        <p className="text-xs text-gray-500">Função: {r.cargo_funcao} · Setor: {r.setor} · Tipo: {r.tipo_risco}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${r.classificacao === "Crítico" ? "bg-red-600 text-white" : r.classificacao === "Alto" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-700"}`}>{r.classificacao}</Badge>
                        {exame
                          ? <Badge className="text-xs bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1 inline" /> Exame OK</Badge>
                          : <Badge className="text-xs bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3 mr-1 inline" /> Sem exame PCMSO</Badge>}
                      </div>
                    </div>
                    {exame && <p className="text-xs text-green-600 mt-1">📋 Exames: {exame.exames_obrigatorios}</p>}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* EPIs × FUNÇÕES */}
          <TabsContent value="epis">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
                <thead><tr className="bg-gray-50 border-b">
                  {["Função","EPI Obrigatório","CA","Fabricante","Risco Associado","Status"].map(h => <th key={h} className="text-left px-3 py-2 font-medium text-gray-600 text-xs">{h}</th>)}
                </tr></thead>
                <tbody>
                  {pgrData.epis.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-6 text-gray-400">Nenhum EPI no PGR</td></tr>
                  ) : pgrData.epis.map(ep => {
                    const fn = normalize(ep.funcao);
                    const temFuncaoPCMSO = pcmsoData.matrizExames.find(m => normalize(m.funcao) === fn);
                    return (
                      <tr key={ep.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{ep.funcao || "—"}</td>
                        <td className="px-3 py-2">{ep.epi_obrigatorio || "—"}</td>
                        <td className="px-3 py-2 font-mono text-xs">{ep.certificado_aprovacao_ca || <span className="text-red-400">Sem CA</span>}</td>
                        <td className="px-3 py-2 text-xs">{ep.fabricante || "—"}</td>
                        <td className="px-3 py-2 text-xs">{ep.risco_associado || "—"}</td>
                        <td className="px-3 py-2">
                          {temFuncaoPCMSO
                            ? <Badge className="text-xs bg-green-100 text-green-700">Função no PCMSO ✓</Badge>
                            : <Badge className="text-xs bg-amber-100 text-amber-700">Função ausente no PCMSO</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* TREINAMENTOS */}
          <TabsContent value="treinamentos">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
                <thead><tr className="bg-gray-50 border-b">
                  {["Função","NR","Treinamento","C.H.","Validade","Exame PCMSO vinculado"].map(h => <th key={h} className="text-left px-3 py-2 font-medium text-gray-600 text-xs">{h}</th>)}
                </tr></thead>
                <tbody>
                  {pgrData.treinamentos.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-6 text-gray-400">Nenhum treinamento no PGR</td></tr>
                  ) : pgrData.treinamentos.map(t => {
                    const exame = pcmsoData.matrizExames.find(m => normalize(m.funcao) === normalize(t.funcao));
                    return (
                      <tr key={t.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{t.funcao || "—"}</td>
                        <td className="px-3 py-2 font-mono text-xs">{t.nr_aplicavel || "—"}</td>
                        <td className="px-3 py-2">{t.treinamento_obrigatorio || "—"}</td>
                        <td className="px-3 py-2">{t.carga_horaria || "—"}h</td>
                        <td className="px-3 py-2">{t.validade_meses || "—"}m</td>
                        <td className="px-3 py-2 text-xs text-gray-600">{exame?.exames_obrigatorios || <span className="text-amber-500">Sem exame PCMSO</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}