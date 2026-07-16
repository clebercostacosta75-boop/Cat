import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, XCircle, Loader2, Users, BookOpen, ArrowLeft, History, Link2 } from "lucide-react";
import { toast } from "sonner";
import HistoricoLotesImportacao from "@/components/alunos/HistoricoLotesImportacao";
import ImportSheetPreviewCard from "@/components/alunos/ImportSheetPreviewCard";

const ACTION_LABEL = {
  criar_aluno_e_matricula: { label: "Criar aluno + matrícula", cls: "bg-green-100 text-green-800" },
  criar_matricula: { label: "Criar matrícula", cls: "bg-blue-100 text-blue-800" },
  atualizar_e_matricular: { label: "Atualizar aluno + matrícula", cls: "bg-indigo-100 text-indigo-800" },
  ja_matriculado: { label: "Já matriculado (ignorar)", cls: "bg-gray-100 text-gray-600" },
  ignorar_duplicado: { label: "Duplicado na planilha", cls: "bg-gray-100 text-gray-600" },
  corrigir_erro: { label: "Corrigir erro (CPF)", cls: "bg-red-100 text-red-700" },
  curso_inexistente: { label: "Curso não cadastrado", cls: "bg-orange-100 text-orange-700" },
};

const IMPORTAVEIS = ["criar_aluno_e_matricula", "criar_matricula", "atualizar_e_matricular"];

export default function ImportarAlunosPlanilha({ open, onClose, onImported, origemFixa }) {
  // origemFixa ("Empresa" | "Comunidade"): trava a origem quando aberto de dentro das abas PJ/PF
  const [step, setStep] = useState(origemFixa === "Comunidade" ? 1 : 0); // 0=destino, 1=upload, 2=preview, 3=resultado
  const [origem, setOrigem] = useState(origemFixa || "Comunidade");
  const [companyId, setCompanyId] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [createClasses, setCreateClasses] = useState(true);
  const [result, setResult] = useState(null);
  const [view, setView] = useState("import"); // import | history
  const [courseOverrides, setCourseOverrides] = useState({}); // { [sheetName]: course }
  const [modelSelections, setModelSelections] = useState({}); // { [sheetName]: modelId }
  const [linkedModels, setLinkedModels] = useState({}); // { [sheetName]: modelName }

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-import"],
    queryFn: () => base44.entities.Company.list("-created_date", 500),
    enabled: open && origem === "Empresa",
  });

  const { data: allCourses = [] } = useQuery({
    queryKey: ["courses-import"],
    queryFn: () => base44.entities.Course.list("-name", 1000),
    enabled: open,
  });

  const { data: certModels = [] } = useQuery({
    queryKey: ["certmodels-import"],
    queryFn: () => base44.entities.CertificateModel.list("-created_date", 200),
    enabled: open,
  });

  // Curso efetivo da aba: identificado automaticamente ou selecionado manualmente
  const effCourse = (sheet) => {
    const ov = courseOverrides[sheet.sheet];
    if (ov) return ov;
    return sheet.course_id ? { id: sheet.course_id, name: sheet.course_name, certificate_model_id: sheet.certificate_model_id, certificate_model_name: sheet.certificate_model_name } : null;
  };

  const selectedCompany = companies.find((c) => c.id === companyId);

  const reset = () => { setStep(origemFixa === "Comunidade" ? 1 : 0); setOrigem(origemFixa || "Comunidade"); setCompanyId(""); setFileName(""); setPreview(null); setResult(null); setCreateClasses(true); setView("import"); setCourseOverrides({}); setModelSelections({}); setLinkedModels({}); };
  const handleClose = () => { reset(); onClose(); };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) { toast.error("Envie um arquivo Excel (.xlsx)"); return; }
    setLoading(true);
    setFileName(file.name);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const resp = await base44.functions.invoke("importarAlunosPlanilha", {
        action: "preview",
        file_url,
        origem,
        company_id: origem === "Empresa" ? companyId : undefined,
      });
      if (resp.data?.error) throw new Error(resp.data.error);
      setPreview(resp.data);
      setStep(2);
    } catch (err) {
      toast.error("Erro ao processar planilha: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkModel = async (sheet) => {
    const course = effCourse(sheet);
    const modelId = modelSelections[sheet.sheet];
    if (!course?.id || !modelId) return;
    try {
      const resp = await base44.functions.invoke("importarAlunosPlanilha", { action: "linkModel", course_id: course.id, model_id: modelId });
      if (resp.data?.error) throw new Error(resp.data.error);
      setLinkedModels((m) => ({ ...m, [sheet.sheet]: resp.data.model_name }));
      toast.success(`Modelo "${resp.data.model_name}" vinculado ao curso.`);
    } catch (e) {
      toast.error("Erro ao vincular modelo: " + e.message);
    }
  };

  // Reclassifica linhas "curso não cadastrado" quando o operador seleciona o curso manualmente
  const effectiveAction = (r, sheet) => {
    const course = effCourse(sheet);
    if (r.action === "curso_inexistente" && course?.id && r.cpf_status === "valido" && !r.enrollment_exists) {
      if (r.dup_in_sheet) return "ignorar_duplicado";
      return r.student_exists ? (r.needs_update ? "atualizar_e_matricular" : "criar_matricula") : "criar_aluno_e_matricula";
    }
    return r.action;
  };

  const effectiveImportaveis = (preview?.sheets || []).reduce(
    (acc, s) => acc + s.rows.filter((r) => IMPORTAVEIS.includes(effectiveAction(r, s))).length, 0
  );

  const handleCommit = async () => {
    setLoading(true);
    try {
      const rows = (preview?.sheets || []).flatMap((s) => {
        const course = effCourse(s);
        return s.rows.map((r) => ({
          ...r,
          action: effectiveAction(r, s),
          course_id: course?.id || null,
          course_name: course?.name || null,
          carga: s.carga,
          class_id: s.class_id,
          certification_type: s.certification_type,
          tipo_original: s.tipo_original,
        }));
      });
      const resp = await base44.functions.invoke("importarAlunosPlanilha", {
        action: "commit",
        rows,
        origem,
        company_id: origem === "Empresa" ? companyId : undefined,
        company_name: origem === "Empresa" ? (selectedCompany?.nome_fantasia || selectedCompany?.razao_social) : undefined,
        create_classes: createClasses,
        file_name: fileName,
      });
      if (resp.data?.error) throw new Error(resp.data.error);
      setResult(resp.data);
      setStep(3);
      onImported?.();
    } catch (err) {
      toast.error("Erro na importação: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const summary = preview?.summary;
  const cursosNaoEncontrados = (preview?.sheets || []).filter((s) => !effCourse(s) && s.rows.length > 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 pr-6">
            <span className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-emerald-600" /> {view === "history" ? "Histórico de Lotes de Importação" : "Importar Alunos por Planilha"}</span>
            {view === "import" && step <= 1 && (
              <Button variant="outline" size="sm" className="text-xs font-normal" onClick={() => setView("history")}>
                <History className="w-3.5 h-3.5 mr-1" /> Histórico de lotes
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {view === "history" && <HistoricoLotesImportacao onBack={() => setView("import")} />}

        {/* ETAPA 0: Destino */}
        {view === "import" && step === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Selecione o destino das matrículas. Os alunos importados entram como <strong>Aguardando Autorização</strong> — nenhum certificado é gerado automaticamente.</p>
            {!origemFixa ? (
              <div>
                <Label>Origem da matrícula *</Label>
                <div className="flex gap-2 mt-1">
                  {["Comunidade", "Empresa"].map((o) => (
                    <Button key={o} variant={origem === o ? "default" : "outline"} className={origem === o ? "bg-gray-900" : ""} onClick={() => setOrigem(o)}>
                      {o === "Comunidade" ? "👤 Comunidade (PF)" : "🏢 Empresa"}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800">
                🏢 Origem fixada: <strong>Empresa (PJ)</strong> — selecione abaixo a empresa vinculada.
              </div>
            )}
            {origem === "Empresa" && (
              <div>
                <Label>Empresa *</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button className="bg-gray-900 hover:bg-gray-800" disabled={origem === "Empresa" && !companyId} onClick={() => setStep(1)}>Continuar</Button>
            </div>
          </div>
        )}

        {/* ETAPA 1: Upload */}
        {view === "import" && step === 1 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              📋 A planilha pode ter <strong>múltiplas abas</strong> (uma por curso/turma). O sistema identifica automaticamente: nome do curso, carga horária, período e colunas T_NOME / T_CPF / T_EMAIL / PERÍODO DO CURSO.
            </div>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-10 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors">
              {loading ? (
                <><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /><p className="text-sm text-gray-600">Lendo e analisando a planilha...</p></>
              ) : (
                <><Upload className="w-8 h-8 text-gray-400" /><p className="text-sm font-medium text-gray-700">Clique para enviar o arquivo Excel (.xlsx)</p><p className="text-xs text-gray-400">Nada será gravado antes da sua confirmação</p></>
              )}
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} disabled={loading} />
            </label>
            {origemFixa !== "Comunidade" && (
              <div className="flex justify-start pt-2 border-t">
                <Button variant="outline" onClick={() => setStep(0)} disabled={loading}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
              </div>
            )}
          </div>
        )}

        {/* ETAPA 2: Pré-visualização */}
        {view === "import" && step === 2 && preview && (
          <div className="space-y-4">
            {/* Resumo */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-gray-50 border rounded-lg p-2"><p className="text-lg font-bold">{summary.total_lidos}</p><p className="text-xs text-gray-500">Lidos</p></div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-2"><p className="text-lg font-bold text-green-700">{summary.importaveis}</p><p className="text-xs text-green-700">Importáveis</p></div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-2"><p className="text-lg font-bold text-red-700">{summary.com_erro}</p><p className="text-xs text-red-700">Com erro</p></div>
              <div className="bg-gray-50 border rounded-lg p-2"><p className="text-lg font-bold text-gray-600">{summary.duplicados}</p><p className="text-xs text-gray-500">Duplicados</p></div>
            </div>

            {/* Cursos não cadastrados */}
            {cursosNaoEncontrados.length > 0 && (
              <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 space-y-1">
                <p className="text-sm font-semibold text-orange-800 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Curso não cadastrado. Cadastre o curso antes de importar alunos.</p>
                {cursosNaoEncontrados.map((s) => (
                  <p key={s.sheet} className="text-xs text-orange-700">• Aba "{s.sheet}": <strong>{s.course_title}</strong> ({s.rows.length} aluno(s) bloqueado(s))</p>
                ))}
                <Link to="/Courses" target="_blank"><Button size="sm" variant="outline" className="mt-1 text-xs border-orange-400 text-orange-800 hover:bg-orange-100"><BookOpen className="w-3 h-3 mr-1" /> Cadastrar curso agora</Button></Link>
              </div>
            )}

            {/* Abas */}
            {preview.sheets.filter((s) => s.rows.length > 0).map((sheet) => (
              <ImportSheetPreviewCard
                key={sheet.sheet}
                sheet={sheet}
                course={effCourse(sheet)}
                isOverride={!!courseOverrides[sheet.sheet]}
                allCourses={allCourses}
                certModels={certModels}
                linkedModelName={linkedModels[sheet.sheet]}
                modelSelection={modelSelections[sheet.sheet] || ""}
                onSelectModel={(v) => setModelSelections((m) => ({ ...m, [sheet.sheet]: v }))}
                onLinkModel={() => handleLinkModel(sheet)}
                onSelectCourse={(c) => setCourseOverrides((o) => ({ ...o, [sheet.sheet]: c }))}
                getAction={(r) => effectiveAction(r, sheet)}
              />
            ))}

            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={createClasses} onChange={(e) => setCreateClasses(e.target.checked)} className="w-4 h-4 accent-gray-800" />
              Criar turmas automaticamente para os cursos sem turma existente
            </label>

            <div className="bg-gray-50 border rounded-lg p-2.5 text-xs text-gray-600">
              🎓 Os alunos entram com status <strong>Aguardando Autorização</strong>. A Certificação recebe apenas alunos autorizados/concluintes — nenhum certificado é gerado nesta importação.
            </div>

            <div className="flex justify-between gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => { setPreview(null); setStep(1); }} disabled={loading}><ArrowLeft className="w-4 h-4 mr-1" /> Enviar outro arquivo</Button>
              <Button className="bg-emerald-700 hover:bg-emerald-800" disabled={loading || effectiveImportaveis === 0} onClick={handleCommit}>
                {loading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Importando...</> : <><CheckCircle className="w-4 h-4 mr-1" /> Confirmar importação ({effectiveImportaveis})</>}
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA 3: Resultado */}
        {view === "import" && step === 3 && result && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
            <p className="font-bold text-gray-900">Importação concluída!</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3"><p className="text-xl font-bold text-green-700">{result.criados}</p><p className="text-xs text-green-700 flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Alunos criados</p></div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3"><p className="text-xl font-bold text-blue-700">{result.matriculas}</p><p className="text-xs text-blue-700">Matrículas criadas</p></div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3"><p className="text-xl font-bold text-indigo-700">{result.atualizados}</p><p className="text-xs text-indigo-700">Alunos atualizados</p></div>
            </div>
            {result.erros > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-left">
                <p className="text-sm font-semibold text-red-700">{result.erros} erro(s):</p>
                {result.erros_detalhe.map((e, i) => <p key={i} className="text-xs text-red-600">• {e}</p>)}
              </div>
            )}
            <p className="text-xs text-gray-500">A importação foi registrada no Log de Auditoria.{result.batch_id ? ` Lote: ${result.batch_id} — consulte em "Histórico de lotes" para arquivar ou desfazer com segurança.` : ""}</p>
            <Button className="bg-gray-900 hover:bg-gray-800" onClick={handleClose}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}