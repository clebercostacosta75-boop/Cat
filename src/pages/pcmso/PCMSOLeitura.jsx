import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, Trash2, Loader2, ChevronRight, AlertTriangle, Stethoscope } from "lucide-react";
import { format } from "date-fns";
import PCMSODetalheCompleto from "./PCMSODetalheCompleto";

function parseBRDate(str) {
  if (!str) return "";
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : str;
}

const STATUS_COLORS = { "Completo": "bg-green-100 text-green-700", "Processando": "bg-blue-100 text-blue-700", "Erro": "bg-red-100 text-red-700" };

export default function PCMSOLeitura() {
  const [leituras, setLeituras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [divergencia, setDivergencia] = useState(null);
  const [selected, setSelected] = useState(null);
  const fileRef = useRef();

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.DocumentoPCMSO.list("-created_date", 100);
    setLeituras(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = leituras.filter(r =>
    r.empresa_nome?.toLowerCase().includes(search.toLowerCase()) ||
    r.cnpj?.toLowerCase().includes(search.toLowerCase())
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

    let ex = {};
    try {
      ex = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise este PCMSO (Programa de Controle Médico de Saúde Ocupacional) e extraia em JSON completo: razao_social, nome_fantasia, cnpj, cnae, cnae_descricao, grau_risco (string 1-4), municipio, estado, endereco, qtd_empregados (inteiro), medico_responsavel, crm, rqe, especialidade, empresa_elaboradora, cnpj_elaboradora, telefone_elaboradora, email_elaboradora, data_elaboracao (DD/MM/AAAA), vigencia_inicio (DD/MM/AAAA), vigencia_fim (DD/MM/AAAA), numero_revisao, setores_funcoes (array de {setor, funcao, cbo, qtd_trabalhadores, ghe, riscos, exames_obrigatorios, periodicidade}), matriz_exames (array de {funcao, setor, ghe, cbo, risco_ocupacional, exame_clinico, exames_complementares, periodicidade, tipo_exame, base_tecnica}), vacinas_requeridas (array de {vacina, dose, funcao, motivo}).`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            razao_social: { type: "string" }, nome_fantasia: { type: "string" }, cnpj: { type: "string" },
            cnae: { type: "string" }, cnae_descricao: { type: "string" }, grau_risco: { type: "string" },
            municipio: { type: "string" }, estado: { type: "string" }, endereco: { type: "string" },
            qtd_empregados: { type: "number" }, medico_responsavel: { type: "string" },
            crm: { type: "string" }, rqe: { type: "string" }, especialidade: { type: "string" },
            empresa_elaboradora: { type: "string" }, cnpj_elaboradora: { type: "string" },
            telefone_elaboradora: { type: "string" }, email_elaboradora: { type: "string" },
            data_elaboracao: { type: "string" }, vigencia_inicio: { type: "string" }, vigencia_fim: { type: "string" },
            numero_revisao: { type: "string" },
            setores_funcoes: { type: "array", items: { type: "object" } },
            matriz_exames: { type: "array", items: { type: "object" } },
            vacinas_requeridas: { type: "array", items: { type: "object" } },
          }
        }
      });
    } catch { ex = {}; }
    setExtracting(false);

    const cnpj = ex.cnpj || "";
    let empId = null, empNome = ex.razao_social || "";

    if (cnpj) {
      const emps = await base44.entities.EmpresaMestre.filter({ cnpj });
      if (emps.length > 0) {
        const emp = emps[0];
        empId = emp.id; empNome = emp.razao_social;
        // verificar divergências
        const divs = [];
        if (emp.cnae && ex.cnae && emp.cnae !== ex.cnae) divs.push({ campo: "CNAE", atual: emp.cnae, novo: ex.cnae });
        if (emp.grau_risco && ex.grau_risco && emp.grau_risco !== ex.grau_risco) divs.push({ campo: "Grau de Risco", atual: emp.grau_risco, novo: ex.grau_risco });
        if (emp.qtd_colaboradores && ex.qtd_empregados && emp.qtd_colaboradores !== ex.qtd_empregados) divs.push({ campo: "Total de Trabalhadores", atual: String(emp.qtd_colaboradores), novo: String(ex.qtd_empregados) });
        if (divs.length > 0) {
          const doc = await base44.entities.DocumentoPCMSO.create({ empresa_nome: empNome, cnpj, empresa_mestre_id: empId, arquivo_pdf: file_url, status: "Processando", data_upload: today });
          setDivergencia({ emp, ex, divs, docId: doc.id, file_url, today });
          return;
        }
      } else {
        const nova = await base44.entities.EmpresaMestre.create({ cnpj, razao_social: ex.razao_social || "Empresa PCMSO", cnae: ex.cnae || "", cnae_descricao: ex.cnae_descricao || "", grau_risco: ex.grau_risco || "1", municipio: ex.municipio || "", estado: ex.estado || "", qtd_colaboradores: ex.qtd_empregados ? parseInt(ex.qtd_empregados) : undefined, status_empresa: "Ativa", data_cadastro: today });
        empId = nova.id;
      }
    }
    await salvarPCMSO(empId, empNome, cnpj, ex, file_url, today);
  };

  const salvarPCMSO = async (empId, empNome, cnpj, ex, file_url, today) => {
    const doc = await base44.entities.DocumentoPCMSO.create({
      empresa_nome: empNome, cnpj, empresa_mestre_id: empId,
      medico_responsavel: ex.medico_responsavel || "", crm: ex.crm || "", rqe: ex.rqe || "",
      especialidade: ex.especialidade || "", empresa_elaboradora: ex.empresa_elaboradora || "",
      cnpj_elaboradora: ex.cnpj_elaboradora || "", telefone_elaboradora: ex.telefone_elaboradora || "",
      email_elaboradora: ex.email_elaboradora || "", numero_revisao: ex.numero_revisao || "",
      data_elaboracao: parseBRDate(ex.data_elaboracao), vigencia_inicio: parseBRDate(ex.vigencia_inicio),
      vigencia_fim: parseBRDate(ex.vigencia_fim), arquivo_pdf: file_url,
      status: "Ativo", data_upload: today, extraido_por_ia: true,
      grau_risco: ex.grau_risco || "", qtd_empregados: ex.qtd_empregados ? parseInt(ex.qtd_empregados) : undefined,
    });

    await Promise.all([
      ...(ex.setores_funcoes || []).map(sf => base44.entities.PCMSOMatrizExame.create({
        pcmso_detalhe_id: doc.id, funcao: sf.funcao, setor: sf.setor, ghe: sf.ghe, cbo: sf.cbo || "",
        riscos_ocupacionais: sf.riscos || "", exames_obrigatorios: sf.exames_obrigatorios || "", periodicidade: sf.periodicidade || "Anual"
      })),
      ...(ex.matriz_exames || []).map(me => base44.entities.PCMSOMatrizExame.create({
        pcmso_detalhe_id: doc.id, funcao: me.funcao, setor: me.setor, ghe: me.ghe, cbo: me.cbo || "",
        riscos_ocupacionais: me.risco_ocupacional || "", exames_obrigatorios: `${me.exame_clinico || ""} ${me.exames_complementares || ""}`.trim(),
        periodicidade: me.periodicidade || "Anual", criterio_realizacao: me.tipo_exame || "", base_tecnica: me.base_tecnica || ""
      })),
    ]);
    load();
  };

  const resolverDivergencia = async (acao) => {
    const { emp, ex, docId, file_url, today } = divergencia;
    if (acao === "atualizar") {
      await base44.entities.EmpresaMestre.update(emp.id, {
        cnae: ex.cnae || emp.cnae,
        grau_risco: ex.grau_risco || emp.grau_risco,
        qtd_colaboradores: ex.qtd_empregados ? parseInt(ex.qtd_empregados) : emp.qtd_colaboradores,
      });
    }
    await base44.entities.DocumentoPCMSO.update(docId, { status: "Ativo" });
    await salvarPCMSO(emp.id, emp.razao_social, emp.cnpj, ex, file_url, today);
    setDivergencia(null);
  };

  if (divergencia) {
    const { emp, divs } = divergencia;
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-5 h-5 text-amber-600" /><h2 className="font-bold text-amber-800">Divergência Detectada — PCMSO x Cadastro Mestre</h2></div>
          <p className="text-sm text-amber-700 mb-4">CNPJ <strong>{emp.cnpj}</strong> já cadastrado como <strong>{emp.razao_social}</strong>, mas os dados diferem:</p>
          <div className="grid grid-cols-3 gap-2 text-sm mb-4">
            <div className="font-semibold text-gray-700">Campo</div><div className="font-semibold text-gray-700">Cadastro Atual</div><div className="font-semibold text-gray-700">PCMSO Importado</div>
            {divs.map(d => <React.Fragment key={d.campo}><div>{d.campo}</div><div className="text-gray-600">{d.atual}</div><div className="text-blue-700 font-medium">{d.novo}</div></React.Fragment>)}
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={() => resolverDivergencia("manter")}>Manter Atual</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => resolverDivergencia("atualizar")}>Atualizar Cadastro</Button>
            <Button variant="ghost" className="text-red-500" onClick={() => { setDivergencia(null); load(); }}>Cancelar</Button>
          </div>
        </div>
      </div>
    );
  }

  if (selected) return <PCMSODetalheCompleto doc={selected} onClose={() => { setSelected(null); load(); }} />;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Stethoscope className="w-6 h-6 text-blue-600" /> PCMSO — Prog. de Controle Médico de Saúde Ocupacional</h1>
          <p className="text-gray-500 text-sm">Upload PDF → IA extrai dados → Interface completa com 18 abas</p>
        </div>
        <Button onClick={() => fileRef.current?.click()} disabled={uploading || extracting} className="bg-blue-600 hover:bg-blue-700 gap-1.5">
          {uploading || extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {uploading ? "Enviando..." : extracting ? "IA extraindo..." : "Novo PCMSO"}
        </Button>
        <input ref={fileRef} type="file" accept="application/pdf,.docx,.xlsx" className="hidden" onChange={handleUpload} />
      </div>

      {extracting && (
        <div className="mb-4 flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-purple-700">
          <Loader2 className="w-5 h-5 animate-spin" /><span><strong>IA extraindo dados completos do PCMSO...</strong> Funções, exames, matriz, riscos, vacinação.</span>
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
              <th className="text-left px-4 py-3 font-medium text-gray-600">Médico Responsável</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Vigência Fim</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  Nenhum PCMSO. Clique em "Novo PCMSO".
                </td></tr>
              ) : filtered.map(r => {
                const vencido = r.vigencia_fim && new Date(r.vigencia_fim + "T00:00:00") < new Date();
                return (
                  <tr key={r.id} className={`border-b hover:bg-gray-50 cursor-pointer ${vencido ? "bg-red-50/40" : ""}`} onClick={() => setSelected(r)}>
                    <td className="px-4 py-3 font-medium">{r.empresa_nome || "—"}</td>
                    <td className="px-4 py-3 font-mono text-sm">{r.cnpj || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{r.medico_responsavel || "—"}</td>
                    <td className="px-4 py-3"><Badge className={`text-xs ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-600"}`}>{r.status || "Rascunho"}</Badge></td>
                    <td className={`px-4 py-3 ${vencido ? "text-red-600 font-medium" : "text-gray-700"}`}>
                      {r.vigencia_fim ? `${vencido ? "⚠ " : ""}${format(new Date(r.vigencia_fim + "T00:00:00"), "dd/MM/yyyy")}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => setSelected(r)}><ChevronRight className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-red-500" onClick={async () => { if (!confirm("Excluir?")) return; await base44.entities.DocumentoPCMSO.delete(r.id); load(); }}><Trash2 className="w-4 h-4" /></Button>
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