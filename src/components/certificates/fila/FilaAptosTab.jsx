import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Award, Eye, Send, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import OrigemBadge from "./OrigemBadge";
import { maskCPF } from "@/lib/filaVisual";

const fmt = (d) => (d ? format(parseISO(d), "dd/MM/yyyy") : "—");

export default function FilaAptosTab({ items, canGenerate, selectedIds, setSelectedIds, onEmitir, onEmitirMassa, emitindoMassa }) {
  const [detalhe, setDetalhe] = useState(null);
  const toggle = (id) => setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allSelected = items.length > 0 && items.every((e) => selectedIds.includes(e.id));
  const toggleAll = () => setSelectedIds(allSelected ? [] : items.map((e) => e.id));

  return (
    <div className="border-2 border-emerald-200 rounded-lg overflow-hidden">
      <div className="bg-emerald-50 border-b px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-emerald-800 flex items-center gap-2 text-sm">
          <Award className="w-4 h-4" /> Aptos para Emissão ({items.length}) — validados pelo motor central
        </h2>
        {canGenerate && selectedIds.length > 0 && (
          <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={onEmitirMassa} disabled={emitindoMassa}>
            {emitindoMassa ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
            Emitir Selecionados ({selectedIds.length})
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">Nenhuma matrícula apta para emissão no momento.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {canGenerate && (
                  <th className="px-3 py-2"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                )}
                <th className="text-left px-3 py-2 font-medium text-gray-600">Aluno</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Curso</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Origem</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Empresa</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Período</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">CH</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Acadêmico</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Financeiro</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Modelo</th>
                {canGenerate && <th className="px-3 py-2 font-medium text-gray-600">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id} className="border-b hover:bg-gray-50">
                  {canGenerate && (
                    <td className="px-3 py-2"><input type="checkbox" checked={selectedIds.includes(e.id)} onChange={() => toggle(e.id)} /></td>
                  )}
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{e.student_name}</div>
                    <div className="text-xs text-gray-400 font-mono">{maskCPF(e.student_cpf)}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-600 max-w-[150px] truncate">{e.course_name}</td>
                  <td className="px-3 py-2"><OrigemBadge enrollment={e} /></td>
                  <td className="px-3 py-2 text-gray-500 text-xs max-w-[120px] truncate">{e.company_name || "—"}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{fmt(e.start_date)} – {fmt(e.end_date)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{e.course_duration || "—"}</td>
                  <td className="px-3 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Aprovado</span></td>
                  <td className="px-3 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{e.aptidao?.financeiro?.status || "Liberado"}</span></td>
                  <td className="px-3 py-2 text-xs text-gray-600 max-w-[120px] truncate">{e.aptidao?.modelo?.name || "—"}</td>
                  {canGenerate && (
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => onEmitir(e)}>
                          <Award className="w-3 h-3 mr-1" /> Emitir
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDetalhe(e)}>
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detalhe && (
        <Dialog open onOpenChange={() => setDetalhe(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Matrícula e Aptidão — {detalhe.student_name}</DialogTitle></DialogHeader>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Curso:</span> {detalhe.course_name}</p>
              <p><span className="text-gray-500">Empresa/Origem:</span> {detalhe.company_name || "Individual (PF)"}</p>
              <p><span className="text-gray-500">Período:</span> {fmt(detalhe.start_date)} – {fmt(detalhe.end_date)}</p>
              <p><span className="text-gray-500">Carga horária:</span> {detalhe.course_duration || "—"}</p>
              <p><span className="text-gray-500">Resultado acadêmico:</span> {detalhe.resultado_academico || "—"} {detalhe.responsavel_resultado ? `(por ${detalhe.responsavel_resultado})` : ""}</p>
              <p><span className="text-gray-500">Financeiro:</span> {detalhe.aptidao?.financeiro?.status} — {detalhe.aptidao?.financeiro?.motivo}</p>
              <p><span className="text-gray-500">Modelo:</span> {detalhe.aptidao?.modelo?.name || "—"}</p>
              {(detalhe.aptidao?.alertas || []).length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {detalhe.aptidao.alertas.map((a, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">⚠ {a}</span>
                  ))}
                </div>
              )}
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1.5 mt-1">✅ Apto pelo motor central — histórico completo na aba Auditoria.</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}