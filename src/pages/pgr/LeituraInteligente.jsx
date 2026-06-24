import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Search, FileText, Edit2, Trash2, Upload, Loader2, Sparkles,
  AlertTriangle, CheckCircle, ChevronRight, ShieldAlert
} from "lucide-react";
import { format } from "date-fns";

const STATUS_PROC_COLORS = { "Processando": "bg-blue-100 text-blue-700", "Completo": "bg-green-100 text-green-700", "Erro": "bg-red-100 text-red-700" };
const CLASSIF_COLORS = { "Crítico": "bg-red-600 text-white", "Alto": "bg-orange-500 text-white", "Médio": "bg-yellow-400 text-gray-900", "Baixo": "bg-green-500 text-white", "Irrelevante": "bg-gray-200 text-gray-700" };
const PRIORIDADE_COLORS = { "Alta": "bg-red-100 text-red-700", "Média": "bg-amber-100 text-amber-700", "Baixa": "bg-green-100 text-green-700" };

function parseBRDate(str) {
  if (!str) return "";
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : str;
}

export default function LeituraInteligente() {
  const [leituras, setLeituras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [divergencia, setDivergencia] = useState(null); // { empresaExistente, dadosNovos, leituraId }
  const [selectedLeitura, setSelectedLeitura] = useState(null);
  const [detalheData, setDetalheData] = useState({});
  const [activeTab, setActiveTab] = useState("controle");
  const [addingPlano, setAddingPlano] = useState(false);
  const [novaAcao, setNovaAcao] = useState({ nao_conformidade: "", acao_recomendada: "", prioridade: "Média", responsavel: "", prazo: "" });
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
    setUploading(true);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const today = new Date().toISOString().split("T")[0];

    setUploading(false);
    setExtracting(true);

    // Extração IA completa do PGR
    let extracted = {};
    try {
      extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise este PGR (Programa de Gerenciamento de Riscos) e extraia em JSON completo: cnpj, razao_social, cnae, cnae_descricao, grau_risco (número 1-4 como string), municipio, estado, responsavel_legal, qtd_funcionarios (inteiro), qtd_homens (inteiro), qtd_mulheres (inteiro), responsavel_tecnico, registro_crea, data_elaboracao (DD/MM/AAAA), vigencia_inicio (DD/MM/AAAA), vigencia_fim (DD/MM/AAAA), nome_documento, numero_revisao, setores_cargos (array de {setor, cargo, funcao, qtd_trabalhadores, ghe, descricao_atividades}), riscos (array de {setor, cargo_funcao, perigo, tipo_risco, classificacao, probabilidade, gravidade, epc, epi, necessita_treinamento, necessita_exame_pcmso}), plano_acao (array de {nao_conformidade, acao_recomendada, prioridade}), epis (array de {funcao, risco_associado, epi_obrigatorio, ca}), treinamentos (array de {funcao, nr_aplicavel, treinamento_obrigatorio, carga_horaria, validade_meses}). Retorne APENAS o JSON.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            cnpj: { type: "string" }, razao_social: { type: "string" }, cnae: { type: "string" },
            cnae_descricao: { type: "string" }, grau_risco: { type: "string" }, municipio: { type: "string" },
            estado: { type: "string" }, responsavel_legal: { type: "string" },
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

    // Verificar Empresa Mestre
    let empresaId = null;
    let empresaNome = "";

    if (cnpj) {
      const empresas = await base44.entities.EmpresaMestre.filter({ cnpj });
      if (empresas.length > 0) {
        const emp = empresas[0];
        empresaId = emp.id;
        empresaNome = emp.razao_social;

        // Verificar divergências
        const hasDivergencia = (emp.cnae && extracted.cnae && emp.cnae !== extracted.cnae) ||
          (emp.grau_risco && extracted.grau_risco && emp.grau_risco !== extracted.grau_risco);

        if (hasDivergencia) {
          const leituraTemp = await base44.entities.PGRLeitura.create({
            empresa_mestre_id: emp.id, empresa_mestre_cnpj: cnpj,
            empresa_mestre_nome: emp.razao_social, arquivo_pdf: file_url,
            status_processamento: "Processando", data_processamento: today, data_upload: today,
            vigencia_fim: parseBRDate(extracted.vigencia_fim)
          });
          setDivergencia({ empresaExistente: emp, dadosNovos: extracted, leituraId: leituraTemp.id, file_url });
          return;
        }
      } else {
        // Criar Empresa Mestre automaticamente
        const nova = await base44.entities.EmpresaMestre.create({
          cnpj, razao_social: extracted.razao_social || "Empresa Importada",
          cnae: extracted.cnae || "", cnae_descricao: extracted.cnae_descricao || "",
          grau_risco: extracted.grau_risco || "1", municipio: extracted.municipio || "",
          estado: extracted.estado || "", responsavel_legal: extracted.responsavel_legal || "",
          qtd_colaboradores: extracted.qtd_funcionarios ? parseInt(extracted.qtd_funcionarios) : undefined,
          status_empresa: "Ativa", data_cadastro: today
        });
        empresaId = nova.id;
        empresaNome = nova.razao_social;
      }
    }

    await salvarLeituraCompleta(empresaId, empresaNome, cnpj, extracted, file_url, today);
  };

  const salvarLeituraCompleta = async (empresaId, empresaNome, cnpj, extracted, file_url, today) => {
    const leitura = await base44.entities.PGRLeitura.create({
      empresa_mestre_id: empresaId || "sem_empresa",
      empresa_mestre_cnpj: cnpj,
      empresa_mestre_nome: empresaNome,
      arquivo_pdf: file_url,
      status_processamento: "Completo",
      data_processamento: today, data_upload: today,
      vigencia_fim: parseBRDate(extracted.vigencia_fim)
    });

    const lid = leitura.id;

    // Salvar sub-entidades em paralelo
    await Promise.all([
      base44.entities.PGRControleDocumento.create({
        pgr_leitura_id: lid,
        nome_documento: extracted.nome_documento || "",
        numero_revisao: extracted.numero_revisao || "",
        responsavel_tecnico: extracted.responsavel_tecnico || "",
        data_emissao: parseBRDate(extracted.data_elaboracao),
        vigencia_inicio: parseBRDate(extracted.vigencia_inicio),
        vigencia_fim: parseBRDate(extracted.vigencia_fim),
        status_doc: "Vigente"
      }),
      base44.entities.PGRIdentificacaoEmpresa.create({
        pgr_leitura_id: lid,
        cnpj, razao_social: extracted.razao_social || "",
        cnae: extracted.cnae || "", grau_risco: extracted.grau_risco || "",
        municipio: extracted.municipio || "", estado: extracted.estado || "",
        responsavel_legal: extracted.responsavel_legal || "",
        qtd_funcionarios: extracted.qtd_funcionarios ? parseInt(extracted.qtd_funcionarios) : undefined,
        qtd_homens: extracted.qtd_homens ? parseInt(extracted.qtd_homens) : undefined,
        qtd_mulheres: extracted.qtd_mulheres ? parseInt(extracted.qtd_mulheres) : undefined,
      }),
      ...(extracted.setores_cargos || []).map(sc =>
        base44.entities.PGRSetorCargo.create({ pgr_leitura_id: lid, ...sc })
      ),
      ...(extracted.riscos || []).map(r =>
        base44.entities.PGRInventarioRisco.create({
          pgr_leitura_id: lid, ...r,
          trabalhadores_expostos: r.trabalhadores_expostos ? parseInt(r.trabalhadores_expostos) : undefined,
          nivel_risco: r.probabilidade && r.gravidade ? parseInt(r.probabilidade) * parseInt(r.gravidade) : undefined
        })
      ),
      ...(extracted.plano_acao || []).map(p =>
        base44.entities.PGRPlanoAcao.create({ pgr_leitura_id: lid, ...p, status: "Pendente" })
      ),
      ...(extracted.epis || []).map(ep =>
        base44.entities.PGREPIFuncao.create({ pgr_leitura_id: lid, funcao: ep.funcao, risco_associado: ep.risco_associado, epi_obrigatorio: ep.epi_obrigatorio, certificado_aprovacao_ca: ep.ca, status_epi: "Pendente" })
      ),
      ...(extracted.treinamentos || []).map(t =>
        base44.entities.PGRTreinamentoFuncao.create({
          pgr_leitura_id: lid, ...t,
          carga_horaria: t.carga_horaria ? parseInt(t.carga_horaria) : undefined,
          validade_meses: t.validade_meses ? parseInt(t.validade_meses) : undefined,
          status_colaborador: "Pendente"
        })
      )
    ]);

    load();
  };

  const resolverDivergencia = async (acao) => {
    const { empresaExistente, dadosNovos, leituraId, file_url } = divergencia;
    const today = new Date().toISOString().split("T")[0];

    if (acao === "atualizar") {
      await base44.entities.EmpresaMestre.update(empresaExistente.id, {
        cnae: dadosNovos.cnae || empresaExistente.cnae,
        grau_risco: dadosNovos.grau_risco || empresaExistente.grau_risco,
        qtd_colaboradores: dadosNovos.qtd_funcionarios ? parseInt(dadosNovos.qtd_funcionarios) : empresaExistente.qtd_colaboradores
      });
    }

    await base44.entities.PGRLeitura.update(leituraId, { status_processamento: "Completo" });
    await salvarLeituraCompleta(empresaExistente.id, empresaExistente.razao_social, empresaExistente.cnpj, dadosNovos, file_url, today);
    setDivergencia(null);
  };

  const openDetalhe = async (leitura) => {
    setSelectedLeitura(leitura);
    setActiveTab("controle");
    const [controle, identificacao, setores, riscos, plano, epis, treinamentos] = await Promise.all([
      base44.entities.PGRControleDocumento.filter({ pgr_leitura_id: leitura.id }),
      base44.entities.PGRIdentificacaoEmpresa.filter({ pgr_leitura_id: leitura.id }),
      base44.entities.PGRSetorCargo.filter({ pgr_leitura_id: leitura.id }),
      base44.entities.PGRInventarioRisco.filter({ pgr_leitura_id: leitura.id }),
      base44.entities.PGRPlanoAcao.filter({ pgr_leitura_id: leitura.id }),
      base44.entities.PGREPIFuncao.filter({ pgr_leitura_id: leitura.id }),
      base44.entities.PGRTreinamentoFuncao.filter({ pgr_leitura_id: leitura.id }),
    ]);
    setDetalheData({ controle: controle[0], identificacao: identificacao[0], setores, riscos, plano, epis, treinamentos });
  };

  const salvarPlanoAcao = async () => {
    await base44.entities.PGRPlanoAcao.create({ pgr_leitura_id: selectedLeitura.id, ...novaAcao, status: "Pendente" });
    const plano = await base44.entities.PGRPlanoAcao.filter({ pgr_leitura_id: selectedLeitura.id });
    setDetalheData(d => ({ ...d, plano }));
    setNovaAcao({ nao_conformidade: "", acao_recomendada: "", prioridade: "Média", responsavel: "", prazo: "" });
    setAddingPlano(false);
  };

  // Modal divergência
  if (divergencia) {
    const { empresaExistente: emp, dadosNovos: novo } = divergencia;
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-amber-800">Divergência Detectada</h2>
          </div>
          <p className="text-sm text-amber-700 mb-4">O CNPJ <strong>{novo.cnpj}</strong> já está cadastrado como <strong>{emp.razao_social}</strong>, mas os dados diferem:</p>
          <div className="grid grid-cols-3 gap-2 text-sm mb-4">
            <div className="font-medium text-gray-600">Campo</div><div className="font-medium text-gray-600">Atual</div><div className="font-medium text-gray-600">No Documento</div>
            {emp.cnae !== novo.cnae && <><div>CNAE</div><div className="text-gray-700">{emp.cnae || "—"}</div><div className="text-blue-700 font-medium">{novo.cnae}</div></>}
            {emp.grau_risco !== novo.grau_risco && <><div>Grau Risco</div><div className="text-gray-700">{emp.grau_risco || "—"}</div><div className="text-blue-700 font-medium">{novo.grau_risco}</div></>}
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

  // Detalhe de leitura
  if (selectedLeitura) {
    const { controle, identificacao, setores = [], riscos = [], plano = [], epis = [], treinamentos = [] } = detalheData;
    const criticos = riscos.filter(r => r.classificacao === "Crítico").length;
    const altos = riscos.filter(r => r.classificacao === "Alto").length;
    const acoesVencidas = plano.filter(p => p.status === "Vencido").length;

    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" onClick={() => setSelectedLeitura(null)}>← Voltar</Button>
          <div>
            <h1 className="text-xl font-bold">{selectedLeitura.empresa_mestre_nome || "PGR"}</h1>
            <p className="text-sm text-gray-500">CNPJ: {selectedLeitura.empresa_mestre_cnpj}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap gap-1 h-auto bg-gray-100 p-1 mb-4">
            {["controle","identificacao","setores","inventario","matriz","treinamentos","epis","plano","pcmso","painel"].map(t => (
              <TabsTrigger key={t} value={t} className="text-xs py-1.5 px-2.5 data-[state=active]:bg-white">
                {{"controle":"Controle Doc.","identificacao":"Identificação","setores":"Setores/Funções","inventario":"Inventário Riscos","matriz":"Matriz Risco","treinamentos":"Treinamentos","epis":"EPIs","plano":"Plano de Ação","pcmso":"Integr. PCMSO","painel":"Painel Gerencial"}[t]}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* 1. Controle do Documento */}
          <TabsContent value="controle">
            {controle ? (
              <div className="bg-white border rounded-xl p-5 grid sm:grid-cols-2 gap-4">
                {[["Nome do Documento","nome_documento"],["Nº Revisão","numero_revisao"],["Elaborado Por","elaborado_por"],["Verificado Por","verificado_por"],["Aprovado Por","aprovado_por"],["Responsável Técnico","responsavel_tecnico"],["Data Emissão","data_emissao"],["Vigência Início","vigencia_inicio"],["Vigência Fim","vigencia_fim"]].map(([l,k])=>(
                  <div key={k}><p className="text-xs text-gray-500">{l}</p><p className="font-medium">{controle[k]||"—"}</p></div>
                ))}
                <div><p className="text-xs text-gray-500">Status</p><Badge className={controle.status_doc==="Vigente"?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}>{controle.status_doc||"—"}</Badge></div>
              </div>
            ) : <p className="text-gray-400 py-8 text-center">Sem dados de controle</p>}
          </TabsContent>

          {/* 2. Identificação da Empresa */}
          <TabsContent value="identificacao">
            {identificacao ? (
              <div className="space-y-3">
                {(identificacao.divergencia_cnae || identificacao.divergencia_grau_risco) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-sm text-amber-700">
                    <AlertTriangle className="w-4 h-4" />Divergência detectada com o cadastro da Empresa Mestre (CNAE ou Grau de Risco)
                  </div>
                )}
                <div className="bg-white border rounded-xl p-5 grid sm:grid-cols-2 gap-4">
                  {[["Razão Social","razao_social"],["CNPJ","cnpj"],["CNAE","cnae"],["Grau Risco","grau_risco"],["Município","municipio"],["Estado","estado"],["Responsável Legal","responsavel_legal"],["Total Funcionários","qtd_funcionarios"],["Homens","qtd_homens"],["Mulheres","qtd_mulheres"],["PCD","qtd_pcd"],["Horário Trabalho","horario_trabalho"]].map(([l,k])=>(
                    <div key={k}><p className="text-xs text-gray-500">{l}</p><p className="font-medium">{identificacao[k]||"—"}</p></div>
                  ))}
                  {identificacao.funcoes_existentes && <div className="col-span-2"><p className="text-xs text-gray-500">Funções Existentes</p><p className="text-sm text-gray-700">{identificacao.funcoes_existentes}</p></div>}
                </div>
              </div>
            ) : <p className="text-gray-400 py-8 text-center">Sem dados de identificação</p>}
          </TabsContent>

          {/* 3. Setores e Funções */}
          <TabsContent value="setores">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-gray-50 border-b">{["Setor","Cargo","Função","Qtd","GHE","Jornada"].map(h=><th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>)}</tr></thead>
                <tbody>
                  {setores.length===0?<tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhum setor/cargo</td></tr>
                  :setores.map(s=><tr key={s.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">{s.setor||"—"}</td><td className="px-3 py-2">{s.cargo||"—"}</td>
                    <td className="px-3 py-2">{s.funcao||"—"}</td><td className="px-3 py-2">{s.qtd_trabalhadores||"—"}</td>
                    <td className="px-3 py-2">{s.ghe||"—"}</td><td className="px-3 py-2">{s.jornada_trabalho||"—"}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* 4. Inventário de Riscos */}
          <TabsContent value="inventario">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-gray-50 border-b">{["Setor","Perigo","Tipo","Prob.","Grav.","NR","Classificação"].map(h=><th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>)}</tr></thead>
                <tbody>
                  {riscos.length===0?<tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum risco</td></tr>
                  :riscos.map(r=><tr key={r.id} className={`border-b ${r.classificacao==="Crítico"?"bg-red-50":r.classificacao==="Alto"?"bg-orange-50":""}`}>
                    <td className="px-3 py-2">{r.setor||"—"}</td><td className="px-3 py-2 max-w-[150px] truncate">{r.perigo||"—"}</td>
                    <td className="px-3 py-2"><Badge className="text-xs bg-gray-100 text-gray-700">{r.tipo_risco||"—"}</Badge></td>
                    <td className="px-3 py-2 text-center">{r.probabilidade||"—"}</td><td className="px-3 py-2 text-center">{r.gravidade||"—"}</td>
                    <td className="px-3 py-2 text-center font-bold">{r.nivel_risco||"—"}</td>
                    <td className="px-3 py-2"><Badge className={`text-xs ${CLASSIF_COLORS[r.classificacao]||"bg-gray-200 text-gray-700"}`}>{r.classificacao||"—"}</Badge></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* 5. Matriz de Risco */}
          <TabsContent value="matriz">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {["Físico","Químico","Biológico","Ergonômico","Acidente","Psicossocial"].map(tipo => {
                const count = riscos.filter(r => r.tipo_risco === tipo).length;
                return (
                  <div key={tipo} className="bg-white border rounded-lg p-4">
                    <p className="font-semibold text-gray-700">{tipo}</p>
                    <p className="text-3xl font-bold text-rose-600">{count}</p>
                    <p className="text-xs text-gray-500">riscos identificados</p>
                  </div>
                );
              })}
            </div>
            <h3 className="font-semibold text-gray-700 mb-3">Top 5 Críticos</h3>
            <div className="space-y-2">
              {riscos.filter(r => r.classificacao === "Crítico" || r.classificacao === "Alto").slice(0, 5).map(r => (
                <div key={r.id} className="bg-white border-l-4 border-red-500 rounded-lg p-3 flex items-center justify-between">
                  <div><p className="font-medium text-sm">{r.perigo}</p><p className="text-xs text-gray-500">{r.setor} — {r.tipo_risco}</p></div>
                  <Badge className={`text-xs ${CLASSIF_COLORS[r.classificacao]||""}`}>{r.classificacao}</Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* 6. Treinamentos */}
          <TabsContent value="treinamentos">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-gray-50 border-b">{["Função","NR Aplicável","Treinamento","C.H.","Validade (meses)","Status"].map(h=><th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>)}</tr></thead>
                <tbody>
                  {treinamentos.length===0?<tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhum treinamento</td></tr>
                  :treinamentos.map(t=><tr key={t.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">{t.funcao||"—"}</td><td className="px-3 py-2 font-mono text-xs">{t.nr_aplicavel||"—"}</td>
                    <td className="px-3 py-2">{t.treinamento_obrigatorio||"—"}</td><td className="px-3 py-2">{t.carga_horaria||"—"}h</td>
                    <td className="px-3 py-2">{t.validade_meses||"—"}m</td>
                    <td className="px-3 py-2"><Badge className={{"Treinado":"bg-green-100 text-green-700","Pendente":"bg-amber-100 text-amber-700","Vencendo":"bg-orange-100 text-orange-700","Vencido":"bg-red-100 text-red-700"}[t.status_colaborador]||"bg-gray-100 text-gray-600"}>{t.status_colaborador}</Badge></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* 7. EPIs */}
          <TabsContent value="epis">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-gray-50 border-b">{["Função","Risco Associado","EPI Obrigatório","CA","Status"].map(h=><th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>)}</tr></thead>
                <tbody>
                  {epis.length===0?<tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhum EPI</td></tr>
                  :epis.map(ep=><tr key={ep.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">{ep.funcao||"—"}</td><td className="px-3 py-2">{ep.risco_associado||"—"}</td>
                    <td className="px-3 py-2 font-medium">{ep.epi_obrigatorio||"—"}</td><td className="px-3 py-2 font-mono text-xs">{ep.certificado_aprovacao_ca||"—"}</td>
                    <td className="px-3 py-2"><Badge className={{"Entregue":"bg-green-100 text-green-700","Pendente":"bg-amber-100 text-amber-700","Vencido":"bg-red-100 text-red-700"}[ep.status_epi]||"bg-gray-100 text-gray-600"}>{ep.status_epi}</Badge></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* 8. Plano de Ação */}
          <TabsContent value="plano">
            <div className="flex justify-end mb-3">
              <Button onClick={() => setAddingPlano(true)} className="bg-rose-600 hover:bg-rose-700 gap-1.5">
                <Plus className="w-4 h-4" /> Nova Ação
              </Button>
            </div>
            {addingPlano && (
              <div className="bg-gray-50 border rounded-xl p-4 mb-4 grid sm:grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-xs font-medium text-gray-600 block mb-1">Não Conformidade</label><textarea rows={2} value={novaAcao.nao_conformidade} onChange={e=>setNovaAcao(a=>({...a,nao_conformidade:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm resize-none"/></div>
                <div className="col-span-2"><label className="text-xs font-medium text-gray-600 block mb-1">Ação Recomendada</label><textarea rows={2} value={novaAcao.acao_recomendada} onChange={e=>setNovaAcao(a=>({...a,acao_recomendada:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm resize-none"/></div>
                <div><label className="text-xs font-medium text-gray-600 block mb-1">Responsável</label><Input value={novaAcao.responsavel} onChange={e=>setNovaAcao(a=>({...a,responsavel:e.target.value}))}/></div>
                <div><label className="text-xs font-medium text-gray-600 block mb-1">Prazo</label><Input type="date" value={novaAcao.prazo} onChange={e=>setNovaAcao(a=>({...a,prazo:e.target.value}))}/></div>
                <div><label className="text-xs font-medium text-gray-600 block mb-1">Prioridade</label>
                  <select value={novaAcao.prioridade} onChange={e=>setNovaAcao(a=>({...a,prioridade:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {["Alta","Média","Baixa"].map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 items-end"><Button variant="outline" onClick={()=>setAddingPlano(false)}>Cancelar</Button><Button onClick={salvarPlanoAcao} className="bg-rose-600 hover:bg-rose-700">Salvar</Button></div>
              </div>
            )}
            <div className="space-y-3">
              {plano.length===0?<p className="text-center py-8 text-gray-400">Nenhuma ação</p>
              :plano.map(p=>(
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
                      <Badge className={`text-xs ${PRIORIDADE_COLORS[p.prioridade]||""}`}>{p.prioridade}</Badge>
                      <Badge className={`text-xs ${p.status==="Concluído"?"bg-green-100 text-green-700":p.status==="Vencido"?"bg-red-100 text-red-700":"bg-amber-100 text-amber-700"}`}>{p.status}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* 9. Integração PCMSO */}
          <TabsContent value="pcmso">
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-3">Riscos que requerem exame no PCMSO:</p>
              {riscos.filter(r=>r.necessita_exame_pcmso).length===0
                ?<p className="text-center py-8 text-gray-400">Nenhum risco requer exame PCMSO</p>
                :riscos.filter(r=>r.necessita_exame_pcmso).map(r=>(
                  <div key={r.id} className="bg-white border-l-4 border-blue-500 rounded-lg p-3">
                    <p className="font-medium text-sm">{r.perigo}</p>
                    <p className="text-xs text-gray-500">{r.setor} — {r.cargo_funcao} — {r.tipo_risco}</p>
                    {r.epi && <p className="text-xs text-blue-600 mt-1">EPI: {r.epi}</p>}
                  </div>
                ))}
            </div>
          </TabsContent>

          {/* 10. Painel Gerencial */}
          <TabsContent value="painel">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: "Total Riscos", value: riscos.length, color: "text-gray-700" },
                { label: "Críticos", value: criticos, color: "text-red-600" },
                { label: "Altos", value: altos, color: "text-orange-500" },
                { label: "Ações Vencidas", value: acoesVencidas, color: "text-red-600" },
                { label: "Trein. Vencidos", value: treinamentos.filter(t=>t.status_colaborador==="Vencido").length, color: "text-red-600" },
                { label: "EPIs Pendentes", value: epis.filter(e=>e.status_epi==="Pendente").length, color: "text-amber-600" },
                { label: "Riscos Ergon.", value: riscos.filter(r=>r.tipo_risco==="Ergonômico").length, color: "text-purple-600" },
                { label: "Req. PCMSO", value: riscos.filter(r=>r.necessita_exame_pcmso).length, color: "text-blue-600" },
                { label: "Req. Trein.", value: riscos.filter(r=>r.necessita_treinamento).length, color: "text-indigo-600" },
                { label: "Plano de Ação", value: plano.length, color: "text-gray-700" },
              ].map(card => (
                <div key={card.label} className="bg-white border rounded-xl p-4 text-center">
                  <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{card.label}</p>
                </div>
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
            <ShieldAlert className="w-6 h-6 text-rose-600" /> Leitura Inteligente PGR
          </h1>
          <p className="text-gray-500 text-sm">Upload de PDF → IA extrai e vincula à Empresa Mestre</p>
        </div>
        <Button onClick={() => fileRef.current?.click()} disabled={uploading || extracting} className="bg-rose-600 hover:bg-rose-700 gap-1.5">
          {uploading || extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {uploading ? "Enviando..." : extracting ? "IA extraindo..." : "Nova Leitura PGR"}
        </Button>
        <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
      </div>

      {extracting && (
        <div className="mb-4 flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-purple-700">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span><strong>IA extraindo dados completos do PGR...</strong> Isso pode levar alguns segundos.</span>
        </div>
      )}

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Buscar por empresa ou CNPJ..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Empresa</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">CNPJ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vigência Fim</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  Nenhuma leitura. Clique em "Nova Leitura PGR" para começar.
                </td></tr>
              ) : filtered.map(r => {
                const vencido = r.vigencia_fim && new Date(r.vigencia_fim + "T00:00:00") < new Date();
                return (
                  <tr key={r.id} className={`border-b hover:bg-gray-50 cursor-pointer ${vencido ? "bg-red-50/40" : ""}`} onClick={() => openDetalhe(r)}>
                    <td className="px-4 py-3 font-medium">{r.empresa_mestre_nome || "—"}</td>
                    <td className="px-4 py-3 font-mono text-sm">{r.empresa_mestre_cnpj || "—"}</td>
                    <td className="px-4 py-3"><Badge className={`text-xs ${STATUS_PROC_COLORS[r.status_processamento] || ""}`}>{r.status_processamento}</Badge></td>
                    <td className={`px-4 py-3 ${vencido ? "text-red-600 font-medium" : "text-gray-700"}`}>
                      {r.vigencia_fim ? `${vencido ? "⚠ " : ""}${format(new Date(r.vigencia_fim + "T00:00:00"), "dd/MM/yyyy")}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => openDetalhe(r)}><ChevronRight className="w-4 h-4" /></Button>
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