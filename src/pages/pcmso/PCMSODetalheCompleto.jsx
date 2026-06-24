import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, Plus, Loader2, FileText, Stethoscope, Trash2 } from "lucide-react";
import ASOAutoGerador from "@/components/pcmso/ASOAutoGerador";
import { differenceInDays, parseISO } from "date-fns";

const IMPACT_DOCS = ["PGR","PCMSO","LTCAT","CIPA","Matriz de Treinamentos","Matriz de Exames","EPI","PPP","ASO","Prontuário Digital"];
const TIPOS_EXAME = ["Admissional","Periódico","Retorno ao Trabalho","Mudança de Risco","Demissional"];
const EXAMES_COMP = ["Audiometria","Espirometria","Acuidade Visual","Teste de Daltonismo","ECG","EEG","Hemograma","Glicemia","Raio-X","Avaliação Psicológica","Exame Toxicológico","Outro"];
const VACINAS = ["Tétano","Hepatite B","Covid-19","Febre Amarela","Influenza","Outra"];

function FI({ label, type = "text", value, onChange, rows, options }) {
  if (options) return (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      <select value={value ?? ""} onChange={e => onChange(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
        <option value="">Selecione...</option>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
  if (rows) return (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      <textarea rows={rows} value={value ?? ""} onChange={e => onChange(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
    </div>
  );
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      <Input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function getDiasVenc(d) {
  if (!d) return null;
  try { return differenceInDays(parseISO(d), new Date()); } catch { return null; }
}

function StatusVenc({ dias }) {
  if (dias === null) return null;
  if (dias < 0) return <Badge className="text-xs bg-red-100 text-red-700">Vencido</Badge>;
  if (dias <= 30) return <Badge className="text-xs bg-red-100 text-red-700">Vence em {dias}d</Badge>;
  if (dias <= 60) return <Badge className="text-xs bg-orange-100 text-orange-700">Vence em {dias}d</Badge>;
  if (dias <= 90) return <Badge className="text-xs bg-amber-100 text-amber-700">Vence em {dias}d</Badge>;
  return <Badge className="text-xs bg-green-100 text-green-700">Em dia</Badge>;
}

const ALL_TABS = [
  ["geral","📊 Visão Geral"],["empresa","🏢 Empresa"],["revisoes","📋 Revisões"],
  ["responsavel","👨‍⚕️ Resp. Técnico"],["setores","🏭 Setores/Funções"],["riscos_pgr","⚠️ Riscos do PGR"],
  ["matriz","📋 Matriz Exames"],["colaboradores","👥 Colabor. x Exames"],["tipos_exame","🔬 Tipos de Exame"],
  ["aso","📄 ASO"],["vencimentos","📅 Vencimentos"],["vacinacao","💉 Vacinação"],
  ["prontuario","🗂️ Prontuário"],["relatorio","📈 Relatório"],["cat","🚑 CAT/Afastamentos"],
  ["conflitos","⚖️ PGR x PCMSO"],["esocial","🖥️ eSocial S-2220"],["documentos","📎 Documentos"],
];

export default function PCMSODetalheCompleto({ doc, onClose }) {
  const [tab, setTab] = useState("geral");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...doc });
  const [matrizes, setMatrizes] = useState([]);
  const [asos, setAsos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [riscosPGR, setRiscosPGR] = useState([]);
  const [setoresPGR, setSetoresPGR] = useState([]);
  const [conflitos, setConflitos] = useState([]);
  const [loading, setLoading] = useState(true);

  // novos itens
  const [novaMatriz, setNovaMatriz] = useState({ funcao: "", setor: "", ghe: "", cbo: "", riscos_ocupacionais: "", exames_obrigatorios: "", periodicidade: "Anual", criterio_realizacao: "", base_tecnica: "" });
  const [addingMatriz, setAddingMatriz] = useState(false);
  const [novoASO, setNovoASO] = useState({ nome_colaborador: "", cpf: "", funcao: "", setor: "", tipo_exame: "Periódico", data_exame: "", resultado: "Apto", medico_examinador: "", crm: "", proxima_data: "" });
  const [addingASO, setAddingASO] = useState(false);
  const [novaVacina, setNovaVacina] = useState({ colaborador_nome: "", funcao: "", vacina: "", dose: "", data: "", proxima_dose: "", status: "Pendente" });
  const [addingVacina, setAddingVacina] = useState(false);
  const [vacinas, setVacinas] = useState([]);
  const [novaCAT, setNovaCAT] = useState({ colaborador_nome: "", cpf: "", data_acidente: "", tipo: "Acidente de Trabalho", descricao: "", dias_afastamento: "", status: "Aberto" });
  const [addingCAT, setAddingCAT] = useState(false);
  const [cats, setCATs] = useState([]);
  const [esocial, setEsocial] = useState([]);

  const loadAll = async () => {
    setLoading(true);
    const [mats, asosData, colabs, vacData, catData] = await Promise.all([
      base44.entities.PCMSOMatrizExame.filter({ pcmso_detalhe_id: doc.id }),
      base44.entities.ASORegistro.filter({ empresa_mestre_id: doc.empresa_mestre_id || "x" }),
      base44.entities.ColaboradorSST.filter({ empresa_mestre_id: doc.empresa_mestre_id || "x" }),
      base44.entities.ExameComplementar.filter({ empresa_mestre_id: doc.empresa_mestre_id || "x" }),
      base44.entities.ComplianceAlerta.filter({ empresa_mestre_id: doc.empresa_mestre_id || "x", tipo_alerta: "Exame Pendente" }),
    ]);
    setMatrizes(mats);
    setAsos(asosData);
    setColaboradores(colabs);
    setVacinas(vacData);
    setCATs(catData);

    // Riscos do PGR vinculado
    if (doc.empresa_mestre_id) {
      const leiturasPGR = await base44.entities.PGRLeitura.filter({ empresa_mestre_id: doc.empresa_mestre_id });
      if (leiturasPGR.length > 0) {
        const [rPGR, sPGR] = await Promise.all([
          base44.entities.PGRInventarioRisco.filter({ pgr_leitura_id: leiturasPGR[0].id }),
          base44.entities.PGRSetorCargo.filter({ pgr_leitura_id: leiturasPGR[0].id }),
        ]);
        setRiscosPGR(rPGR);
        setSetoresPGR(sPGR);

        // Detectar conflitos
        const divs = [];
        mats.forEach(m => {
          const fnPGR = sPGR.find(s => s.funcao === m.funcao || s.cargo === m.funcao);
          if (!fnPGR) divs.push({ tipo: "Função no PCMSO ausente no PGR", detalhe: m.funcao, acao: "Revisar PGR" });
        });
        sPGR.forEach(s => {
          const fnPCMSO = mats.find(m => m.funcao === s.funcao || m.funcao === s.cargo);
          if (!fnPCMSO) divs.push({ tipo: "Função no PGR sem exames no PCMSO", detalhe: s.funcao || s.cargo, acao: "Revisar Matriz de Exames" });
        });
        setConflitos(divs);
      }
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [doc.id]);

  const saveForm = async () => {
    setSaving(true);
    await base44.entities.DocumentoPCMSO.update(doc.id, form);
    setSaving(false);
  };

  const addMatriz = async () => {
    await base44.entities.PCMSOMatrizExame.create({ pcmso_detalhe_id: doc.id, ...novaMatriz });
    setAddingMatriz(false); loadAll();
  };

  const addASO = async () => {
    await base44.entities.ASORegistro.create({ empresa_mestre_id: doc.empresa_mestre_id, empresa_mestre_nome: doc.empresa_nome, ...novoASO });
    setAddingASO(false); loadAll();
  };

  const addVacina = async () => {
    await base44.entities.ExameComplementar.create({ empresa_mestre_id: doc.empresa_mestre_id, tipo_exame: "Outro", resultado: `Vacina: ${novaVacina.vacina} Dose: ${novaVacina.dose}`, data_realizacao: novaVacina.data, colaborador_nome: novaVacina.colaborador_nome, data_vencimento: novaVacina.proxima_dose, status: "Válido" });
    setAddingVacina(false); loadAll();
  };

  const addCAT = async () => {
    await base44.entities.ComplianceAlerta.create({ empresa_mestre_id: doc.empresa_mestre_id, empresa_mestre_nome: doc.empresa_nome, tipo_alerta: "Exame Pendente", descricao: `CAT: ${novaCAT.tipo} — ${novaCAT.colaborador_nome} — ${novaCAT.descricao}`, prioridade: "Crítico", status: "Ativo", data_alerta: novaCAT.data_acidente || new Date().toISOString().slice(0, 10) });
    setAddingCAT(false); loadAll();
  };

  const alimentarC360 = async () => {
    if (!doc.empresa_mestre_id) { alert("Empresa não vinculada."); return; }
    for (const m of matrizes) {
      await base44.entities.MatrizExameCargo.create({ nome_cargo: m.funcao || "—", nr_aplicavel: "", exames_obrigatorios: m.exames_obrigatorios || "", periodicidade_meses: m.periodicidade === "Anual" ? 12 : m.periodicidade === "Bienal" ? 24 : 12, ativo: true }).catch(() => {});
    }
    for (const aso of asos.filter(a => a.resultado === "Inapto")) {
      await base44.entities.ComplianceAlerta.create({ empresa_mestre_id: doc.empresa_mestre_id, empresa_mestre_nome: doc.empresa_nome, tipo_alerta: "Exame Pendente", descricao: `ASO Inapto: ${aso.nome_colaborador} — ${aso.funcao}`, prioridade: "Crítico", status: "Ativo", data_alerta: new Date().toISOString().slice(0, 10) }).catch(() => {});
    }
    alert(`✅ Compliance 360 alimentado!\n• ${matrizes.length} matrizes de exames\n• ${asos.filter(a => a.resultado === "Inapto").length} alertas de inaptos`);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  const aptos = asos.filter(a => a.resultado === "Apto").length;
  const inaptos = asos.filter(a => a.resultado === "Inapto").length;
  const restricao = asos.filter(a => a.resultado === "Apto com Restrição").length;
  const vencidos = asos.filter(a => a.data_vencimento && new Date(a.data_vencimento) < new Date()).length;
  const vencendo = asos.filter(a => { const d = getDiasVenc(a.data_vencimento); return d !== null && d >= 0 && d <= 90; }).length;

  const sf = form;
  const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Button variant="ghost" onClick={onClose}>← Voltar</Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">PCMSO — {doc.empresa_nome}</h1>
          <p className="text-xs text-gray-500">CNPJ: {doc.cnpj} | Médico: {doc.medico_responsavel || "—"} | Vigência: {doc.vigencia_fim || "—"}</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 text-sm" onClick={alimentarC360}>
          <CheckCircle className="w-4 h-4" /> Alimentar Compliance 360
        </Button>
        {doc.arquivo_pdf && <a href={doc.arquivo_pdf} target="_blank" rel="noreferrer"><Button variant="outline" size="sm"><FileText className="w-4 h-4 mr-1" />PDF</Button></a>}
      </div>

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
              { l: "Total Colaboradores", v: colaboradores.length, c: "text-blue-700" },
              { l: "ASOs Válidos", v: aptos + restricao, c: "text-green-600" },
              { l: "ASOs Vencidos", v: vencidos, c: "text-red-600" },
              { l: "Vencendo em 90d", v: vencendo, c: "text-amber-600" },
              { l: "Aptos", v: aptos, c: "text-green-700" },
              { l: "Inaptos", v: inaptos, c: "text-red-700" },
              { l: "Com Restrição", v: restricao, c: "text-orange-600" },
              { l: "Funções na Matriz", v: matrizes.length, c: "text-indigo-600" },
              { l: "Riscos do PGR", v: riscosPGR.length, c: "text-orange-600" },
              { l: "Conflitos", v: conflitos.length, c: conflitos.length > 0 ? "text-red-600" : "text-green-600" },
              { l: "Vacinação Ctrl.", v: vacinas.length, c: "text-teal-600" },
              { l: "CATs/Alertas", v: cats.length, c: "text-red-600" },
            ].map(card => (
              <div key={card.l} className="bg-white border rounded-xl p-3 text-center">
                <p className={`text-2xl font-bold ${card.c}`}>{card.v}</p>
                <p className="text-xs text-gray-500 mt-0.5">{card.l}</p>
              </div>
            ))}
          </div>
          {/* Geração automática de ASOs — acesso rápido na visão geral */}
          <div className="mb-4">
            <ASOAutoGerador doc={doc} matrizes={matrizes} onConcluido={loadAll} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white border rounded-xl p-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">Status dos ASOs</h3>
              {[["Apto", aptos, "bg-green-500"], ["Com Restrição", restricao, "bg-orange-500"], ["Inapto", inaptos, "bg-red-500"]].map(([l, v, c]) => {
                const total = aptos + restricao + inaptos || 1;
                return (
                  <div key={l} className="mb-2">
                    <div className="flex justify-between text-xs mb-0.5"><span>{l}</span><span>{v}</span></div>
                    <div className="h-2 bg-gray-100 rounded-full"><div className={`h-2 rounded-full ${c}`} style={{ width: `${(v / total) * 100}%` }} /></div>
                  </div>
                );
              })}
            </div>
            <div className="bg-white border rounded-xl p-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">Conflitos PGR x PCMSO</h3>
              {conflitos.length === 0 ? <p className="text-green-600 text-sm">✅ Nenhum conflito detectado</p> :
                conflitos.slice(0, 4).map((c, i) => (
                  <div key={i} className="border-b py-1.5 text-xs"><p className="font-medium text-amber-700">{c.tipo}</p><p className="text-gray-500">{c.detalhe}</p></div>
                ))}
            </div>
          </div>
        </TabsContent>

        {/* 2. DADOS DA EMPRESA */}
        <TabsContent value="empresa">
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Identificação da Empresa</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[["Razão Social","empresa_nome"],["Nome Fantasia","nome_fantasia"],["CNPJ","cnpj"],["CNAE","cnae"],["Descrição CNAE","cnae_descricao"],["Atividade Principal","atividade_principal"],["Grau de Risco","grau_risco"],["Município","municipio"],["Estado","estado"],["Endereço","endereco"]].map(([l, k]) => (
                <FI key={k} label={l} value={sf[k]} onChange={v => setF(k, v)} />
              ))}
              <FI label="Total de Empregados" type="number" value={sf.qtd_empregados} onChange={v => setF("qtd_empregados", v)} />
              {sf.vacinas_obrigatorias && (
                <div className="col-span-2 bg-teal-50 border border-teal-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-teal-700 mb-1">💉 Vacinas Obrigatórias (extraído do PCMSO)</p>
                  <p className="text-sm text-teal-800">{sf.vacinas_obrigatorias}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-4"><Button onClick={saveForm} disabled={saving} className="bg-blue-600 hover:bg-blue-700">{saving ? "Salvando..." : "Salvar"}</Button></div>
          </div>
        </TabsContent>

        {/* 3. CONTROLE DE REVISÕES */}
        <TabsContent value="revisoes">
          <div className="bg-white border rounded-xl p-5">
            <div className="grid sm:grid-cols-2 gap-3">
              {[["Número da Revisão","numero_revisao"],["Data Elaboração","data_elaboracao","date"],["Vigência Início","vigencia_inicio","date"],["Vigência Fim","vigencia_fim","date"]].map(([l, k, t]) => (
                <FI key={k} label={l} type={t || "text"} value={sf[k]} onChange={v => setF(k, v)} />
              ))}
              <FI label="Motivo da Revisão" rows={2} value={sf.motivo_revisao} onChange={v => setF("motivo_revisao", v)} />
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
                <select value={sf.status || "Ativo"} onChange={e => setF("status", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {["Ativo","Em Revisão","Vencido","Rascunho"].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-4"><Button onClick={saveForm} disabled={saving} className="bg-blue-600 hover:bg-blue-700">{saving ? "Salvando..." : "Salvar"}</Button></div>
          </div>
        </TabsContent>

        {/* 4. RESPONSÁVEL TÉCNICO */}
        <TabsContent value="responsavel">
          <div className="bg-white border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4"><Stethoscope className="w-5 h-5 text-blue-600" /><h3 className="font-semibold text-gray-800">Médico Responsável pelo PCMSO</h3></div>
            <div className="grid sm:grid-cols-2 gap-3">
              {[["Nome do Médico","medico_responsavel"],["CRM","crm"],["RQE","rqe"],["Especialidade","especialidade"],["Empresa Elaboradora","empresa_elaboradora"],["CNPJ Elaboradora","cnpj_elaboradora"],["Telefone","telefone_elaboradora"],["E-mail","email_elaboradora"]].map(([l, k]) => (
                <FI key={k} label={l} value={sf[k]} onChange={v => setF(k, v)} />
              ))}
              <FI label="Data de Elaboração" type="date" value={sf.data_elaboracao} onChange={v => setF("data_elaboracao", v)} />
            </div>
            <div className="flex justify-end mt-4"><Button onClick={saveForm} disabled={saving} className="bg-blue-600 hover:bg-blue-700">{saving ? "Salvando..." : "Salvar"}</Button></div>
          </div>
        </TabsContent>

        {/* 5. SETORES E FUNÇÕES */}
        <TabsContent value="setores">
          <div className="overflow-x-auto bg-white border rounded-xl">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-sm text-gray-800">Setores e Funções do PCMSO</h3>
            </div>
            <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">
              {["Setor","Função","CBO","Qtd","GHE","Riscos","Exames (Admissional/Periódico)","Periocidade","Exames por Tipo"].map(h => <th key={h} className="text-left px-3 py-2 font-medium text-gray-600 text-xs">{h}</th>)}
            </tr></thead>
            <tbody>
              {matrizes.length === 0 ? <tr><td colSpan={9} className="text-center py-8 text-gray-400">Nenhuma função cadastrada</td></tr> :
                matrizes.map(m => <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs">{m.setor || "—"}</td>
                  <td className="px-3 py-2 font-medium text-xs">{m.funcao || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{m.cbo || "—"}</td>
                  <td className="px-3 py-2 text-center text-xs">{m.qtd_trabalhadores || "—"}</td>
                  <td className="px-3 py-2 text-xs">{m.ghe || "—"}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 max-w-[100px] truncate" title={m.riscos_ocupacionais}>{m.riscos_ocupacionais || "—"}</td>
                  <td className="px-3 py-2 text-xs text-blue-700 max-w-[120px]">{m.exames_obrigatorios || "—"}</td>
                  <td className="px-3 py-2"><Badge className="text-xs bg-blue-100 text-blue-700">{m.periodicidade || "Anual"}</Badge></td>
                  <td className="px-3 py-2 text-xs text-gray-500 max-w-[150px]" title={m.base_tecnica}>{m.base_tecnica ? <span className="truncate block max-w-[150px]">{m.base_tecnica}</span> : "—"}</td>
                </tr>)}
            </tbody>
            </table>
          </div>
          {/* Alertas de funções faltantes no PGR */}
          {conflitos.filter(c => c.tipo.includes("PCMSO")).length > 0 && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm font-medium text-amber-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Funções no PCMSO ausentes no PGR:</p>
              {conflitos.filter(c => c.tipo.includes("PCMSO")).map((c, i) => <p key={i} className="text-xs text-amber-700 mt-1">• {c.detalhe} — {c.acao}</p>)}
            </div>
          )}
        </TabsContent>

        {/* 6. RISCOS DO PGR */}
        <TabsContent value="riscos_pgr">
          {riscosPGR.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>Nenhum PGR vinculado a esta empresa. Importe o PGR primeiro.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3">O PCMSO utiliza os riscos do PGR para definir exames e controle médico. Não recria riscos.</p>
              <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
                <thead><tr className="bg-gray-50 border-b">
                  {["Setor","Função","Tipo Risco","Perigo","Classificação","Exame PCMSO"].map(h => <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>)}
                </tr></thead>
                <tbody>
                  {riscosPGR.map(r => {
                    const exPCMSO = matrizes.find(m => m.funcao === r.cargo_funcao || m.setor === r.setor);
                    return <tr key={r.id} className={`border-b hover:bg-gray-50 ${!exPCMSO ? "bg-amber-50" : ""}`}>
                      <td className="px-3 py-2">{r.setor || "—"}</td>
                      <td className="px-3 py-2 text-xs">{r.cargo_funcao || "—"}</td>
                      <td className="px-3 py-2"><Badge className="text-xs bg-gray-100 text-gray-700">{r.tipo_risco || "—"}</Badge></td>
                      <td className="px-3 py-2 max-w-[120px] truncate text-xs">{r.perigo || "—"}</td>
                      <td className="px-3 py-2"><Badge className={`text-xs ${{ "Crítico": "bg-red-600 text-white", "Alto": "bg-orange-500 text-white", "Médio": "bg-yellow-400 text-gray-900", "Baixo": "bg-green-500 text-white" }[r.classificacao] || "bg-gray-200 text-gray-700"}`}>{r.classificacao || "—"}</Badge></td>
                      <td className="px-3 py-2 text-xs">{exPCMSO ? exPCMSO.exames_obrigatorios : <span className="text-amber-600">⚠ Sem exame vinculado</span>}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* 7. MATRIZ DE EXAMES */}
        <TabsContent value="matriz">
          <div className="flex justify-end mb-3">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1" onClick={() => setAddingMatriz(true)}><Plus className="w-3.5 h-3.5" /> Adicionar</Button>
          </div>
          {addingMatriz && (
            <div className="bg-gray-50 border rounded-xl p-4 mb-4 grid sm:grid-cols-3 gap-3">
              {[["Função","funcao"],["Setor","setor"],["CBO","cbo"],["GHE","ghe"],["Riscos Ocupacionais","riscos_ocupacionais"],["Exames Obrigatórios","exames_obrigatorios"],["Base Técnica","base_tecnica"]].map(([l, k]) => (
                <FI key={k} label={l} value={novaMatriz[k]} onChange={v => setNovaMatriz(s => ({ ...s, [k]: v }))} />
              ))}
              <FI label="Periodicidade" value={novaMatriz.periodicidade} options={["Anual","Bienal","Semestral","Trimestral"]} onChange={v => setNovaMatriz(s => ({ ...s, periodicidade: v }))} />
              <FI label="Tipo de Exame" value={novaMatriz.criterio_realizacao} options={TIPOS_EXAME} onChange={v => setNovaMatriz(s => ({ ...s, criterio_realizacao: v }))} />
              <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setAddingMatriz(false)}>Cancelar</Button><Button onClick={addMatriz} className="bg-blue-600 hover:bg-blue-700">Salvar</Button></div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead><tr className="bg-gray-50 border-b">
                {["Função","Setor","GHE","CBO","Risco","Exames","Periodicidade","Tipo"].map(h => <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>)}
              </tr></thead>
              <tbody>
                {matrizes.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">Nenhuma entrada</td></tr> :
                  matrizes.map(m => <tr key={m.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{m.funcao || "—"}</td>
                    <td className="px-3 py-2">{m.setor || "—"}</td>
                    <td className="px-3 py-2">{m.ghe || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{m.cbo || "—"}</td>
                    <td className="px-3 py-2 text-xs">{m.riscos_ocupacionais || "—"}</td>
                    <td className="px-3 py-2 text-xs text-blue-700">{m.exames_obrigatorios || "—"}</td>
                    <td className="px-3 py-2"><Badge className="text-xs bg-indigo-100 text-indigo-700">{m.periodicidade || "Anual"}</Badge></td>
                    <td className="px-3 py-2 text-xs">{m.criterio_realizacao || "—"}</td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 8. COLABORADORES x EXAMES */}
        <TabsContent value="colaboradores">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead><tr className="bg-gray-50 border-b">
                {["Colaborador","Função","Setor","Último ASO","Vencimento","Status","Resultado"].map(h => <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>)}
              </tr></thead>
              <tbody>
                {colaboradores.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum colaborador vinculado</td></tr> :
                  colaboradores.map(c => {
                    const ultimoASO = asos.find(a => a.colaborador_sst_id === c.id || a.nome_colaborador === c.nome_completo);
                    const dias = getDiasVenc(ultimoASO?.data_vencimento);
                    return <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{c.nome_completo || "—"}</td>
                      <td className="px-3 py-2 text-xs">{c.cargo || "—"}</td>
                      <td className="px-3 py-2 text-xs">{c.setor || "—"}</td>
                      <td className="px-3 py-2 text-xs">{ultimoASO?.data_exame || "—"}</td>
                      <td className="px-3 py-2 text-xs">{ultimoASO?.data_vencimento || "—"}</td>
                      <td className="px-3 py-2"><StatusVenc dias={dias} /></td>
                      <td className="px-3 py-2"><Badge className={`text-xs ${{ "Apto": "bg-green-100 text-green-700", "Inapto": "bg-red-100 text-red-700", "Apto com Restrição": "bg-amber-100 text-amber-700" }[ultimoASO?.resultado] || "bg-gray-100 text-gray-500"}`}>{ultimoASO?.resultado || "Sem ASO"}</Badge></td>
                    </tr>;
                  })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 9. TIPOS DE EXAME */}
        <TabsContent value="tipos_exame">
          <div className="space-y-4">
            {[
              { tipo: "Admissional", cor: "border-blue-400 bg-blue-50", icon: "🔵", descricao: "Realizado antes do início das atividades. Gera ASO admissional.", regra: "Obrigatório antes do 1º dia de trabalho" },
              { tipo: "Periódico", cor: "border-green-400 bg-green-50", icon: "🟢", descricao: "Segue periodicidade definida no PCMSO. Anual para expostos a riscos, bienal para demais.", regra: "NR-07: anual ou conforme risco" },
              { tipo: "Retorno ao Trabalho", cor: "border-amber-400 bg-amber-50", icon: "🟡", descricao: "Realizado antes de reassumir funções após afastamento ≥ 30 dias.", regra: "Obrigatório após ≥ 30 dias afastado" },
              { tipo: "Mudança de Risco", cor: "border-orange-400 bg-orange-50", icon: "🟠", descricao: "Realizado antes de mudança de função/setor/atividade com novo risco. Gera revisão no PGR, PCMSO, ASO, PPP.", regra: "Obrigatório antes da mudança" },
              { tipo: "Demissional", cor: "border-red-400 bg-red-50", icon: "🔴", descricao: "Realizado em até 10 dias do término do contrato. Pode ser dispensado conforme validade do último ASO e grau de risco.", regra: "Até 10 dias do desligamento" },
            ].map(t => (
              <div key={t.tipo} className={`border-l-4 rounded-xl p-4 ${t.cor}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{t.icon}</span>
                  <h3 className="font-bold text-gray-800">{t.tipo}</h3>
                  <Badge className="text-xs bg-gray-200 text-gray-700 ml-2">{t.regra}</Badge>
                </div>
                <p className="text-sm text-gray-700">{t.descricao}</p>
                <p className="text-xs text-gray-500 mt-2">ASOs deste tipo: <strong>{asos.filter(a => a.tipo_exame === t.tipo).length}</strong></p>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 10. ASO */}
        <TabsContent value="aso">
          {/* Geração automática via PCMSO */}
          <div className="mb-4">
            <ASOAutoGerador
              doc={doc}
              matrizes={matrizes}
              onConcluido={loadAll}
            />
          </div>
          <div className="flex justify-end mb-3">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1" onClick={() => setAddingASO(true)}><Plus className="w-3.5 h-3.5" /> Novo ASO Manual</Button>
          </div>
          {addingASO && (
            <div className="bg-gray-50 border rounded-xl p-4 mb-4 grid sm:grid-cols-3 gap-3">
              {[["Colaborador","nome_colaborador"],["CPF","cpf"],["Matrícula","matricula"],["Função","funcao"],["Setor","setor"],["CRM Médico","crm"],["Médico Examinador","medico_examinador"]].map(([l, k]) => (
                <FI key={k} label={l} value={novoASO[k]} onChange={v => setNovoASO(s => ({ ...s, [k]: v }))} />
              ))}
              <FI label="Tipo de Exame" value={novoASO.tipo_exame} options={TIPOS_EXAME} onChange={v => setNovoASO(s => ({ ...s, tipo_exame: v }))} />
              <FI label="Data do Exame" type="date" value={novoASO.data_exame} onChange={v => setNovoASO(s => ({ ...s, data_exame: v }))} />
              <FI label="Próxima Data" type="date" value={novoASO.proxima_data} onChange={v => setNovoASO(s => ({ ...s, proxima_data: v }))} />
              <FI label="Resultado" value={novoASO.resultado} options={["Apto","Apto com Restrição","Inapto"]} onChange={v => setNovoASO(s => ({ ...s, resultado: v }))} />
              <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setAddingASO(false)}>Cancelar</Button><Button onClick={addASO} className="bg-blue-600 hover:bg-blue-700">Salvar ASO</Button></div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead><tr className="bg-gray-50 border-b">
                {["Colaborador","CPF","Função","Tipo","Data Exame","Próximo","Resultado","Status"].map(h => <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>)}
              </tr></thead>
              <tbody>
                {asos.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">Nenhum ASO cadastrado</td></tr> :
                  asos.map(a => {
                    const dias = getDiasVenc(a.data_vencimento);
                    return <tr key={a.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{a.nome_colaborador || "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{a.cpf || "—"}</td>
                      <td className="px-3 py-2 text-xs">{a.funcao || "—"}</td>
                      <td className="px-3 py-2 text-xs">{a.tipo_exame || "—"}</td>
                      <td className="px-3 py-2 text-xs">{a.data_exame || "—"}</td>
                      <td className="px-3 py-2 text-xs">{a.data_vencimento || "—"}</td>
                      <td className="px-3 py-2"><Badge className={`text-xs ${{ "Apto": "bg-green-100 text-green-700", "Inapto": "bg-red-100 text-red-700", "Apto com Restrição": "bg-amber-100 text-amber-700" }[a.resultado] || ""}`}>{a.resultado || "—"}</Badge></td>
                      <td className="px-3 py-2"><StatusVenc dias={dias} /></td>
                    </tr>;
                  })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 11. VENCIMENTOS */}
        <TabsContent value="vencimentos">
          <div className="space-y-2">
            {[
              { label: "Vencidos", items: asos.filter(a => getDiasVenc(a.data_vencimento) !== null && getDiasVenc(a.data_vencimento) < 0), cor: "border-red-400 bg-red-50" },
              { label: "Vencendo em 30 dias", items: asos.filter(a => { const d = getDiasVenc(a.data_vencimento); return d !== null && d >= 0 && d <= 30; }), cor: "border-orange-400 bg-orange-50" },
              { label: "Vencendo em 31–60 dias", items: asos.filter(a => { const d = getDiasVenc(a.data_vencimento); return d !== null && d > 30 && d <= 60; }), cor: "border-amber-400 bg-amber-50" },
              { label: "Vencendo em 61–90 dias", items: asos.filter(a => { const d = getDiasVenc(a.data_vencimento); return d !== null && d > 60 && d <= 90; }), cor: "border-yellow-400 bg-yellow-50" },
            ].map(grupo => (
              <div key={grupo.label} className={`border-l-4 rounded-xl p-4 ${grupo.cor}`}>
                <p className="font-semibold text-gray-800 mb-2">{grupo.label} — {grupo.items.length}</p>
                {grupo.items.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-sm py-1 border-b border-black/5">
                    <span>{a.nome_colaborador} <span className="text-gray-500">({a.funcao})</span></span>
                    <span className="text-xs text-gray-600">{a.data_vencimento}</span>
                  </div>
                ))}
                {grupo.items.length === 0 && <p className="text-xs text-gray-400">Nenhum</p>}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 12. VACINAÇÃO */}
        <TabsContent value="vacinacao">
          <div className="flex justify-end mb-3">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1" onClick={() => setAddingVacina(true)}><Plus className="w-3.5 h-3.5" /> Registrar Vacina</Button>
          </div>
          {addingVacina && (
            <div className="bg-gray-50 border rounded-xl p-4 mb-4 grid sm:grid-cols-3 gap-3">
              <FI label="Colaborador" value={novaVacina.colaborador_nome} onChange={v => setNovaVacina(s => ({ ...s, colaborador_nome: v }))} />
              <FI label="Função" value={novaVacina.funcao} onChange={v => setNovaVacina(s => ({ ...s, funcao: v }))} />
              <FI label="Vacina" value={novaVacina.vacina} options={VACINAS} onChange={v => setNovaVacina(s => ({ ...s, vacina: v }))} />
              <FI label="Dose" value={novaVacina.dose} onChange={v => setNovaVacina(s => ({ ...s, dose: v }))} />
              <FI label="Data" type="date" value={novaVacina.data} onChange={v => setNovaVacina(s => ({ ...s, data: v }))} />
              <FI label="Próxima Dose" type="date" value={novaVacina.proxima_dose} onChange={v => setNovaVacina(s => ({ ...s, proxima_dose: v }))} />
              <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setAddingVacina(false)}>Cancelar</Button><Button onClick={addVacina} className="bg-blue-600 hover:bg-blue-700">Salvar</Button></div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead><tr className="bg-gray-50 border-b">
                {["Colaborador","Vacina/Exame","Resultado","Data","Vencimento","Status"].map(h => <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>)}
              </tr></thead>
              <tbody>
                {vacinas.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhuma vacinação registrada</td></tr> :
                  vacinas.map(v => <tr key={v.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">{v.colaborador_nome || "—"}</td>
                    <td className="px-3 py-2">{v.tipo_exame || "—"}</td>
                    <td className="px-3 py-2 text-xs">{v.resultado || "—"}</td>
                    <td className="px-3 py-2 text-xs">{v.data_realizacao || "—"}</td>
                    <td className="px-3 py-2 text-xs">{v.data_vencimento || "—"}</td>
                    <td className="px-3 py-2"><Badge className={`text-xs ${{ "Válido": "bg-green-100 text-green-700", "Vencendo": "bg-amber-100 text-amber-700", "Vencido": "bg-red-100 text-red-700" }[v.status] || "bg-gray-100 text-gray-500"}`}>{v.status || "—"}</Badge></td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 13. PRONTUÁRIO MÉDICO */}
        <TabsContent value="prontuario">
          <div className="space-y-3">
            {colaboradores.map(c => {
              const cAsos = asos.filter(a => a.colaborador_sst_id === c.id || a.nome_colaborador === c.nome_completo);
              const cVacinas = vacinas.filter(v => v.colaborador_nome === c.nome_completo);
              return (
                <details key={c.id} className="bg-white border rounded-xl">
                  <summary className="px-4 py-3 cursor-pointer flex items-center justify-between">
                    <div>
                      <span className="font-medium">{c.nome_completo}</span>
                      <span className="text-xs text-gray-500 ml-2">{c.cargo} — {c.setor}</span>
                    </div>
                    <div className="flex gap-1">
                      <Badge className="text-xs bg-blue-100 text-blue-700">{cAsos.length} ASOs</Badge>
                      <Badge className="text-xs bg-teal-100 text-teal-700">{cVacinas.length} Vacinas</Badge>
                    </div>
                  </summary>
                  <div className="px-4 pb-4 pt-2 space-y-2">
                    {cAsos.map(a => <div key={a.id} className="text-xs bg-gray-50 rounded p-2"><span className="font-medium">{a.tipo_exame}</span> — {a.data_exame} — <span className={a.resultado === "Apto" ? "text-green-600" : "text-red-600"}>{a.resultado}</span></div>)}
                    {cAsos.length === 0 && <p className="text-xs text-gray-400">Sem ASOs registrados</p>}
                    <p className="text-xs text-gray-400 mt-2">Histórico mínimo: 20 anos após desligamento. Acesso restrito.</p>
                  </div>
                </details>
              );
            })}
            {colaboradores.length === 0 && <p className="text-center py-8 text-gray-400">Nenhum colaborador vinculado</p>}
          </div>
        </TabsContent>

        {/* 14. RELATÓRIO ANALÍTICO */}
        <TabsContent value="relatorio">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
            {[
              { l: "Exames Clínicos Realizados", v: asos.length, c: "text-blue-700" },
              { l: "Aptos", v: aptos, c: "text-green-700" },
              { l: "Inaptos", v: inaptos, c: "text-red-700" },
              { l: "Com Restrição", v: restricao, c: "text-orange-600" },
              { l: "ASOs Vencidos", v: vencidos, c: "text-red-600" },
              { l: "Funções com Exames", v: matrizes.length, c: "text-indigo-600" },
              { l: "Exames Complementares", v: vacinas.length, c: "text-teal-600" },
              { l: "Conflitos PGR x PCMSO", v: conflitos.length, c: conflitos.length > 0 ? "text-red-600" : "text-green-600" },
            ].map(card => (
              <div key={card.l} className="bg-white border rounded-xl p-4 text-center">
                <p className={`text-3xl font-bold ${card.c}`}>{card.v}</p>
                <p className="text-xs text-gray-500 mt-1">{card.l}</p>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-medium mb-1">Relatório Analítico Anual — PCMSO</p>
            <ul className="space-y-0.5">
              <li>• Empresa: {doc.empresa_nome}</li>
              <li>• CNPJ: {doc.cnpj}</li>
              <li>• Médico Responsável: {doc.medico_responsavel || "—"} — CRM: {doc.crm || "—"}</li>
              <li>• Período: {doc.vigencia_inicio || "—"} a {doc.vigencia_fim || "—"}</li>
              <li>• Total de exames realizados: {asos.length}</li>
              <li>• Taxa de aptidão: {asos.length > 0 ? Math.round((aptos / asos.length) * 100) : 0}%</li>
            </ul>
          </div>
        </TabsContent>

        {/* 15. CAT E AFASTAMENTOS */}
        <TabsContent value="cat">
          <div className="flex justify-end mb-3">
            <Button size="sm" className="bg-red-600 hover:bg-red-700 gap-1" onClick={() => setAddingCAT(true)}><Plus className="w-3.5 h-3.5" /> Registrar CAT</Button>
          </div>
          {addingCAT && (
            <div className="bg-gray-50 border rounded-xl p-4 mb-4 grid sm:grid-cols-3 gap-3">
              <FI label="Colaborador" value={novaCAT.colaborador_nome} onChange={v => setNovaCAT(s => ({ ...s, colaborador_nome: v }))} />
              <FI label="CPF" value={novaCAT.cpf} onChange={v => setNovaCAT(s => ({ ...s, cpf: v }))} />
              <FI label="Tipo" value={novaCAT.tipo} options={["Acidente de Trabalho","Doença Ocupacional","Afastamento > 15 dias"]} onChange={v => setNovaCAT(s => ({ ...s, tipo: v }))} />
              <FI label="Data" type="date" value={novaCAT.data_acidente} onChange={v => setNovaCAT(s => ({ ...s, data_acidente: v }))} />
              <FI label="Dias de Afastamento" type="number" value={novaCAT.dias_afastamento} onChange={v => setNovaCAT(s => ({ ...s, dias_afastamento: v }))} />
              <div className="col-span-3"><FI label="Descrição" rows={2} value={novaCAT.descricao} onChange={v => setNovaCAT(s => ({ ...s, descricao: v }))} /></div>
              <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setAddingCAT(false)}>Cancelar</Button><Button onClick={addCAT} className="bg-red-600 hover:bg-red-700">Registrar</Button></div>
            </div>
          )}
          <div className="space-y-2">
            {cats.length === 0 ? <p className="text-center py-8 text-gray-400">Nenhuma CAT ou afastamento registrado</p> :
              cats.map(c => (
                <div key={c.id} className="bg-white border-l-4 border-red-500 rounded-lg p-3">
                  <p className="font-medium text-sm">{c.descricao}</p>
                  <p className="text-xs text-gray-500 mt-1">{c.data_alerta} — Prioridade: {c.prioridade}</p>
                </div>
              ))}
          </div>
        </TabsContent>

        {/* 16. CONFLITOS PGR x PCMSO */}
        <TabsContent value="conflitos">
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <strong>Conferência PGR x PCMSO:</strong> Comparação automática entre dados do PGR e do PCMSO para identificar divergências.
          </div>
          {conflitos.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-green-700 font-medium">Nenhum conflito detectado entre PGR e PCMSO.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conflitos.map((c, i) => (
                <div key={i} className="bg-white border-l-4 border-amber-400 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold text-amber-800">{c.tipo}</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">Detalhe: <strong>{c.detalhe}</strong></p>
                  <p className="text-xs text-gray-500">Ação recomendada: {c.acao}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="text-xs">Manter Atual</Button>
                    <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-700">Enviar para Validação</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 17. eSocial S-2220 */}
        <TabsContent value="esocial">
          <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-700">
            Evento <strong>S-2220</strong> — Monitoramento da Saúde do Trabalhador. Campos preparados para integração com eSocial.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead><tr className="bg-gray-50 border-b">
                {["Colaborador","CPF","Tipo Exame","Data ASO","Resultado","Médico","CRM","Status eSocial"].map(h => <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>)}
              </tr></thead>
              <tbody>
                {asos.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">Nenhum ASO para exportar ao eSocial</td></tr> :
                  asos.map(a => (
                    <tr key={a.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{a.nome_colaborador || "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{a.cpf || "—"}</td>
                      <td className="px-3 py-2 text-xs">{a.tipo_exame || "—"}</td>
                      <td className="px-3 py-2 text-xs">{a.data_exame || "—"}</td>
                      <td className="px-3 py-2"><Badge className={`text-xs ${{ "Apto": "bg-green-100 text-green-700", "Inapto": "bg-red-100 text-red-700", "Apto com Restrição": "bg-amber-100 text-amber-700" }[a.resultado] || ""}`}>{a.resultado || "—"}</Badge></td>
                      <td className="px-3 py-2 text-xs">{a.medico_responsavel || "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{a.crm || "—"}</td>
                      <td className="px-3 py-2"><Badge className="text-xs bg-gray-100 text-gray-600">Não enviado</Badge></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm">Validar Dados</Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">Preparar S-2220</Button>
          </div>
        </TabsContent>

        {/* 18. DOCUMENTOS */}
        <TabsContent value="documentos">
          <div className="space-y-3">
            {doc.arquivo_pdf && (
              <div className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div><p className="font-medium">PCMSO — Documento Original</p><p className="text-xs text-gray-500">PDF importado e processado</p></div>
                </div>
                <a href={doc.arquivo_pdf} target="_blank" rel="noreferrer"><Button variant="outline" size="sm">Visualizar PDF</Button></a>
              </div>
            )}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
              <p className="font-medium mb-1">Dados estruturados vinculados:</p>
              <ul className="space-y-0.5">
                <li>• {matrizes.length} entradas na Matriz de Exames</li>
                <li>• {asos.length} ASOs registrados</li>
                <li>• {colaboradores.length} colaboradores vinculados</li>
                <li>• {vacinas.length} registros de exames complementares/vacinação</li>
                <li>• {conflitos.length} conflitos PGR x PCMSO</li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}