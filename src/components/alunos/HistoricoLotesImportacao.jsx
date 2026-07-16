import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Archive, Undo2, Loader2, ChevronDown, ChevronRight, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const STATUS_CLS = {
  Ativo: "bg-emerald-100 text-emerald-800",
  Arquivado: "bg-gray-100 text-gray-600",
  Desfeito: "bg-red-100 text-red-700",
};

export default function HistoricoLotesImportacao({ onBack }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(null);
  const [records, setRecords] = useState({});
  const [working, setWorking] = useState(null);
  const [blockedInfo, setBlockedInfo] = useState(null); // {batchId, blocked[], desfazer_possiveis}

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["importBatches"],
    queryFn: async () => {
      const resp = await base44.functions.invoke("importarAlunosPlanilha", { action: "listBatches" });
      return resp.data?.batches || [];
    },
  });

  const toggleExpand = async (batch) => {
    if (expanded === batch.id) { setExpanded(null); return; }
    setExpanded(batch.id);
    if (!records[batch.id]) {
      const resp = await base44.functions.invoke("importarAlunosPlanilha", { action: "batchRecords", batch_id: batch.id });
      setRecords((r) => ({ ...r, [batch.id]: resp.data?.records || [] }));
    }
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["importBatches"] });
    setRecords({});
    setExpanded(null);
  };

  const handleArchive = async (batch) => {
    if (!confirm(`Arquivar todos os registros do lote "${batch.file_name}"? Registros com certificado emitido serão preservados. Nenhum aluno ou certificado será excluído.`)) return;
    setWorking(batch.id);
    try {
      const resp = await base44.functions.invoke("importarAlunosPlanilha", { action: "archiveBatch", batch_id: batch.id });
      if (resp.data?.error) throw new Error(resp.data.error);
      toast.success(`${resp.data.arquivados} registro(s) arquivado(s).${resp.data.bloqueados?.length ? ` ${resp.data.bloqueados.length} com certificado preservado(s).` : ""}`);
      refresh();
    } catch (e) {
      toast.error("Erro ao arquivar: " + e.message);
    } finally {
      setWorking(null);
    }
  };

  const handleUndo = async (batch, confirmed = false) => {
    setWorking(batch.id);
    try {
      const resp = await base44.functions.invoke("importarAlunosPlanilha", { action: "undoBatch", batch_id: batch.id, confirm: confirmed });
      if (resp.data?.error) throw new Error(resp.data.error);
      if (resp.data.requires_confirm) {
        setBlockedInfo({ batchId: batch.id, batch, blocked: resp.data.bloqueados || [], desfazer_possiveis: resp.data.desfazer_possiveis });
        return;
      }
      toast.success(`Lote desfeito: ${resp.data.desfeitos} matrícula(s) removida(s).${resp.data.bloqueados?.length ? ` ${resp.data.bloqueados.length} com certificado preservado(s).` : ""}`);
      setBlockedInfo(null);
      refresh();
    } catch (e) {
      toast.error("Erro ao desfazer: " + e.message);
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar à importação</Button>
        <p className="text-xs text-gray-500">Alunos e certificados nunca são excluídos por ações de lote.</p>
      </div>

      {isLoading && <p className="text-sm text-gray-400 py-6 text-center">Carregando lotes...</p>}
      {!isLoading && batches.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Nenhum lote de importação registrado ainda.</p>}

      {batches.map((b) => (
        <div key={b.id} className="border rounded-lg overflow-hidden">
          <div className="px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs bg-gray-50">
            <button onClick={() => toggleExpand(b)} className="text-gray-500">
              {expanded === b.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <span className="font-semibold text-gray-800">{b.file_name}</span>
            <Badge className={STATUS_CLS[b.status] || "bg-gray-100"}>{b.status}</Badge>
            <span>{b.company_name}</span>
            <span className="text-gray-400">{b.created_date ? new Date(b.created_date).toLocaleString("pt-BR") : ""}</span>
            <span>Operador: {b.operador_email}</span>
            <span className="text-emerald-700 font-medium">{b.total_importados} importado(s)</span>
            {b.total_erros > 0 && <span className="text-red-600">{b.total_erros} erro(s)</span>}
            {b.total_alertas > 0 && <span className="text-yellow-700">{b.total_alertas} alerta(s)</span>}
            {b.status === "Ativo" && (
              <span className="ml-auto flex gap-1">
                <Button size="sm" variant="outline" className="h-7 text-xs" disabled={working === b.id} onClick={() => handleArchive(b)}>
                  {working === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Archive className="w-3 h-3 mr-1" />} Arquivar lote
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50" disabled={working === b.id} onClick={() => handleUndo(b, false)}>
                  <Undo2 className="w-3 h-3 mr-1" /> Desfazer importação
                </Button>
              </span>
            )}
          </div>
          {b.observacao && <p className="px-3 py-1 text-[11px] text-amber-700 bg-amber-50 border-t border-amber-100">{b.observacao}</p>}

          {blockedInfo?.batchId === b.id && (
            <div className="px-3 py-2 bg-red-50 border-t border-red-200 space-y-1">
              <p className="text-xs font-semibold text-red-700 flex items-center gap-1">
                <ShieldAlert className="w-4 h-4" /> Confirmação necessária — {blockedInfo.desfazer_possiveis} matrícula(s) serão removidas.
                {blockedInfo.blocked.length > 0 && ` ${blockedInfo.blocked.length} registro(s) com certificado emitido serão PRESERVADOS (tratar individualmente):`}
              </p>
              {blockedInfo.blocked.map((r) => (
                <p key={r.id} className="text-[11px] text-red-600">• {r.student_name} — {r.course_name}</p>
              ))}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setBlockedInfo(null)}>Cancelar</Button>
                <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700" disabled={working === b.id} onClick={() => handleUndo(b, true)}>
                  {working === b.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Confirmar desfazer ({blockedInfo.desfazer_possiveis})
                </Button>
              </div>
            </div>
          )}

          {expanded === b.id && (
            <div className="overflow-x-auto border-t">
              {!records[b.id] ? (
                <p className="text-xs text-gray-400 p-3">Carregando registros...</p>
              ) : records[b.id].length === 0 ? (
                <p className="text-xs text-gray-400 p-3">Nenhum registro vinculado (lote desfeito ou vazio).</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Aluno</th>
                      <th className="px-2 py-1.5 text-left">CPF</th>
                      <th className="px-2 py-1.5 text-left">Curso</th>
                      <th className="px-2 py-1.5 text-left">Período</th>
                      <th className="px-2 py-1.5 text-left">Status</th>
                      <th className="px-2 py-1.5 text-left">Certificado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {records[b.id].map((r) => (
                      <tr key={r.id} className={r.import_archived ? "opacity-50" : ""}>
                        <td className="px-2 py-1.5 font-medium">{r.student_name}</td>
                        <td className="px-2 py-1.5 font-mono whitespace-nowrap">{r.student_cpf}</td>
                        <td className="px-2 py-1.5">{r.course_name}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{r.start_date} → {r.end_date}</td>
                        <td className="px-2 py-1.5">{r.import_archived ? <Badge className="bg-gray-100 text-gray-600">Arquivado</Badge> : <Badge variant="outline">{r.status_matricula || r.status}</Badge>}</td>
                        <td className="px-2 py-1.5">{r.certificate_id ? <Badge className="bg-amber-100 text-amber-800">Emitido 🔒</Badge> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}