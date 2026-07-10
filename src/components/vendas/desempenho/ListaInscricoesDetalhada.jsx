import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Eye, UserCog, FileText } from "lucide-react";
import { toast } from "sonner";
import { logVenda } from "@/lib/auditVendas";
import { fmtBRL, dataDe, valorDe, isCancelada } from "./desempenhoUtils";

const PGTO_CLS = {
  "Pago": "bg-green-100 text-green-700",
  "Pendente": "bg-yellow-100 text-yellow-800",
  "Aguardando Confirmação": "bg-yellow-100 text-yellow-800",
  "Parcialmente Pago": "bg-blue-100 text-blue-700",
  "Inadimplente": "bg-red-100 text-red-700",
  "Cancelado": "bg-red-100 text-red-700",
  "Cortesia": "bg-purple-100 text-purple-700",
};

function AlterarAtendenteDialog({ enrollment, onClose, onSaved }) {
  const [novoNome, setNovoNome] = useState(enrollment.atendente_nome || "");
  const [justificativa, setJustificativa] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!novoNome.trim()) { toast.error("Informe o nome do atendente."); return; }
    if (!justificativa.trim()) { toast.error("A justificativa é obrigatória para alterar o atendente."); return; }
    setSaving(true);
    try {
      await base44.entities.StudentCourseEnrollment.update(enrollment.id, { atendente_nome: novoNome.trim() });
      await logVenda("update", {
        entity_type: "StudentCourseEnrollment", entity_id: enrollment.id,
        entity_name: `${enrollment.student_name} — ${enrollment.course_name}`,
        details: `FASE 3 Desempenho: atendente alterado manualmente de "${enrollment.atendente_nome || "—"}" para "${novoNome.trim()}". Justificativa: ${justificativa.trim()}`,
      });
      toast.success("Atendente alterado e registrado na auditoria.");
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><UserCog className="w-5 h-5" /> Alterar Atendente</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-gray-500">{enrollment.student_name} — {enrollment.course_name}</p>
          <div>
            <Label className="text-xs">Novo atendente *</Label>
            <Input value={novoNome} onChange={e => setNovoNome(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Justificativa * (obrigatória — vai para auditoria)</Label>
            <Textarea rows={2} value={justificativa} onChange={e => setJustificativa(e.target.value)} placeholder="Ex: inscrição registrada no atendente errado..." />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button className="bg-gray-900 hover:bg-gray-800" onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Confirmar"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetalheInscricaoDialog({ enrollment, lanc, onClose }) {
  const linhas = [
    ["Aluno", enrollment.student_name],
    ["CPF", enrollment.student_cpf],
    ["Curso", enrollment.course_name],
    ["Pacote", enrollment.pacote_nome || "—"],
    ["Oferta", enrollment.oferta_nome || "—"],
    ["Período", `${enrollment.start_date} → ${enrollment.end_date}`],
    ["Valor", fmtBRL(valorDe(enrollment))],
    ["Forma de pagamento", enrollment.forma_pagamento || "—"],
    ["Status pagamento", enrollment.status_pagamento || "—"],
    ["Status matrícula", enrollment.status_matricula || "—"],
    ["Origem da inscrição", enrollment.origem_inscricao || "—"],
    ["Atendente", enrollment.atendente_nome || "—"],
    ["Data da inscrição", enrollment.data_inscricao ? new Date(enrollment.data_inscricao).toLocaleString("pt-BR") : dataDe(enrollment)],
    ["Pré-cadastro (QR Code)", enrollment.pre_cadastro_id ? `Sim — origem QR Code de inscrição` : "Não"],
    ["Matrícula criada", "✅ Sim"],
    ["Financeiro criado", lanc ? `✅ Sim — ${lanc.status} (${fmtBRL(lanc.valor)})` : "—"],
  ];
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Detalhes da Inscrição</DialogTitle></DialogHeader>
        <div className="divide-y text-sm">
          {linhas.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-1.5">
              <span className="text-gray-500 text-xs flex-shrink-0">{k}</span>
              <span className="font-medium text-gray-800 text-right">{v}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ListaInscricoesDetalhada({ filtradas, lancPorOrigem }) {
  const queryClient = useQueryClient();
  const [detalhe, setDetalhe] = useState(null);
  const [alterando, setAlterando] = useState(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] });

  return (
    <Card className="border border-gray-200">
      <CardContent className="p-0 overflow-x-auto">
        {detalhe && <DetalheInscricaoDialog enrollment={detalhe} lanc={lancPorOrigem[detalhe.id]} onClose={() => setDetalhe(null)} />}
        {alterando && <AlterarAtendenteDialog enrollment={alterando} onClose={() => setAlterando(null)} onSaved={refresh} />}

        {filtradas.length === 0 ? (
          <p className="text-center py-10 text-gray-400 text-sm">Nenhuma inscrição no período/filtros selecionados.</p>
        ) : (
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-gray-50 border-y text-xs">
              <tr>
                {["Data", "Aluno", "Curso/Pacote", "Valor", "Forma", "Pgto", "Matrícula", "Origem", "Atendente", "Financeiro", ""].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(e => (
                <tr key={e.id} className={`border-b last:border-b-0 hover:bg-gray-50 ${isCancelada(e) ? "opacity-60" : ""}`}>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">{dataDe(e).split("-").reverse().join("/")}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-800 truncate max-w-[160px]">{e.student_name}</p>
                    <p className="text-xs text-gray-400 font-mono">{e.student_cpf}</p>
                  </td>
                  <td className="px-3 py-2 text-xs max-w-[180px]">
                    <p className="truncate">{e.course_name}</p>
                    {e.pacote_nome && <p className="text-gray-400 truncate">📦 {e.pacote_nome}</p>}
                  </td>
                  <td className="px-3 py-2 font-semibold text-emerald-700 whitespace-nowrap">{fmtBRL(valorDe(e))}</td>
                  <td className="px-3 py-2 text-xs">{e.forma_pagamento || "—"}</td>
                  <td className="px-3 py-2"><Badge className={`text-xs ${PGTO_CLS[e.status_pagamento] || "bg-gray-100 text-gray-600"}`}>{e.status_pagamento || "—"}</Badge></td>
                  <td className="px-3 py-2 text-xs">{e.status_matricula || "—"}</td>
                  <td className="px-3 py-2 text-xs">{e.origem_inscricao || "—"}{e.pre_cadastro_id ? " 📱" : ""}</td>
                  <td className="px-3 py-2 text-xs font-medium">{e.atendente_nome || "—"}</td>
                  <td className="px-3 py-2 text-xs">{lancPorOrigem[e.id] ? "✅" : "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Ver detalhes" onClick={() => setDetalhe(e)}><Eye className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Alterar atendente (exige justificativa)" onClick={() => setAlterando(e)}><UserCog className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}