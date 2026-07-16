import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Link2 } from "lucide-react";

const ACTION_LABEL = {
  criar_aluno_e_matricula: { label: "Criar aluno + matrícula", cls: "bg-green-100 text-green-800" },
  criar_matricula: { label: "Criar matrícula", cls: "bg-blue-100 text-blue-800" },
  atualizar_e_matricular: { label: "Atualizar aluno + matrícula", cls: "bg-indigo-100 text-indigo-800" },
  ja_matriculado: { label: "Já matriculado (ignorar)", cls: "bg-gray-100 text-gray-600" },
  ignorar_duplicado: { label: "Duplicado na planilha", cls: "bg-gray-100 text-gray-600" },
  corrigir_erro: { label: "Corrigir erro (CPF)", cls: "bg-red-100 text-red-700" },
  curso_inexistente: { label: "Curso não vinculado", cls: "bg-orange-100 text-orange-700" },
};
const IMPORTAVEIS = ["criar_aluno_e_matricula", "criar_matricula", "atualizar_e_matricular"];

export default function ImportSheetPreviewCard({
  sheet, course, isOverride, allCourses, certModels,
  linkedModelName, modelSelection, onSelectModel, onLinkModel,
  onSelectCourse, getAction,
}) {
  const candidates = sheet.course_match?.candidates || [];
  const modelName = linkedModelName || course?.certificate_model_name || null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className={`px-3 py-2 text-xs flex flex-wrap items-center gap-x-4 gap-y-1 ${course ? "bg-emerald-50 border-b border-emerald-100" : "bg-orange-50 border-b border-orange-100"}`}>
        <span className="font-bold text-gray-800">📑 Aba: {sheet.sheet}</span>
        <span>
          Curso: <strong>{sheet.course_title}</strong>{" "}
          {course
            ? <Badge className="bg-emerald-100 text-emerald-800 ml-1">✓ {course.name}{isOverride ? " (manual)" : ""}</Badge>
            : <Badge className="bg-orange-100 text-orange-700 ml-1">{sheet.course_match?.status === "ambiguo" ? "ambíguo — selecione o curso" : "não identificado"}</Badge>}
        </span>
        {(sheet.tipo_original || sheet.certification_type) && (
          <span>Tipo: <strong>{sheet.tipo_original || sheet.certification_type}</strong>{sheet.tipo_original && sheet.tipo_original !== sheet.certification_type ? ` → ${sheet.certification_type}` : ""}</span>
        )}
        {sheet.carga && <span>Carga: <strong>{sheet.carga}</strong></span>}
        <span>Turma: {sheet.class_found ? <Badge className="bg-blue-100 text-blue-700">existente</Badge> : <Badge variant="outline">será criada</Badge>}</span>
        {course && (modelName
          ? <span>Modelo: <Badge className="bg-purple-100 text-purple-700">🏅 {modelName}</Badge></span>
          : (
            <span className="flex items-center gap-1">
              <span className="text-amber-700">⚠ Curso sem modelo de certificado —</span>
              <Select value={modelSelection} onValueChange={onSelectModel}>
                <SelectTrigger className="h-6 w-52 text-xs bg-white"><SelectValue placeholder="Selecionar modelo existente" /></SelectTrigger>
                <SelectContent>
                  {certModels.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" disabled={!modelSelection} onClick={onLinkModel}>
                <Link2 className="w-3 h-3 mr-1" /> Vincular
              </Button>
            </span>
          ))}
      </div>

      {(!course || isOverride) && (
        <div className="px-3 py-2 bg-white border-b flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray-600 font-medium">Vincular curso manualmente:</span>
          <Select
            value={isOverride ? course?.id : ""}
            onValueChange={(v) => {
              const c = allCourses.find((x) => x.id === v);
              if (c) onSelectCourse({ id: c.id, name: c.name, certificate_model_id: c.certificate_model_id, certificate_model_name: c.certificate_model_name });
            }}
          >
            <SelectTrigger className="h-7 w-80 text-xs"><SelectValue placeholder="Selecione o curso correto" /></SelectTrigger>
            <SelectContent>
              {candidates.map((c) => <SelectItem key={c.id} value={c.id}>⭐ {c.name} — compatibilidade {c.score}%</SelectItem>)}
              {allCourses.filter((c) => !candidates.some((k) => k.id === c.id)).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {candidates.length > 0 && <span className="text-gray-400">({candidates.length} candidato(s) sugerido(s) — nada é importado sem sua seleção)</span>}
        </div>
      )}

      {sheet.warnings.length > 0 && (
        <div className="px-3 py-1.5 bg-yellow-50 border-b border-yellow-100">
          {sheet.warnings.map((w, i) => <p key={i} className="text-xs text-yellow-800">⚠ {w}</p>)}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-2 py-1.5 text-left">Aluno</th>
              <th className="px-2 py-1.5 text-left">CPF</th>
              <th className="px-2 py-1.5 text-left">E-mail</th>
              <th className="px-2 py-1.5 text-left">WhatsApp</th>
              <th className="px-2 py-1.5 text-left">Período</th>
              <th className="px-2 py-1.5 text-left">Cadastro</th>
              <th className="px-2 py-1.5 text-left">Ação sugerida</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sheet.rows.map((r, i) => {
              const action = getAction(r);
              return (
                <tr key={i} className={action === "corrigir_erro" ? "bg-red-50" : IMPORTAVEIS.includes(action) ? "" : "opacity-60"}>
                  <td className="px-2 py-1.5 font-medium">{r.name}</td>
                  <td className="px-2 py-1.5 font-mono whitespace-nowrap">
                    {r.cpf || "—"}{" "}
                    {r.cpf_status === "valido" ? <CheckCircle className="w-3 h-3 text-green-600 inline" /> : <XCircle className="w-3 h-3 text-red-500 inline" />}
                  </td>
                  <td className="px-2 py-1.5">{r.email || <span className="text-yellow-600">⚠ ausente</span>}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{r.whatsapp || "—"}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {r.period_status === "ok" ? `${r.start_date} → ${r.end_date}` : <span className="text-yellow-600">⚠ pendente</span>}
                    {r.period_inherited && <span className="text-gray-400 ml-1">(herdado)</span>}
                  </td>
                  <td className="px-2 py-1.5">{r.student_exists ? <Badge className="bg-blue-100 text-blue-700">já cadastrado</Badge> : <Badge variant="outline">novo</Badge>}</td>
                  <td className="px-2 py-1.5"><Badge className={ACTION_LABEL[action]?.cls || "bg-gray-100"}>{ACTION_LABEL[action]?.label || action}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}