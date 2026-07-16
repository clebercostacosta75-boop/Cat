import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { DollarSign, Copy, Send, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import OrigemBadge from "./OrigemBadge";
import { maskCPF, isIndividual } from "@/lib/filaVisual";

const SOL_BADGE = {
  Pendente: "bg-blue-100 text-blue-700",
  Aprovada: "bg-emerald-100 text-emerald-700",
  Negada: "bg-red-100 text-red-700",
  Cancelada: "bg-gray-100 text-gray-600",
};

export default function FilaPendFinanceirasTab({ items, solicitacoes = [], onAtualizar }) {
  const [enviandoId, setEnviandoId] = useState(null);
  const [verificando, setVerificando] = useState(false);
  const queryClient = useQueryClient();

  const verificarPagamentos = async () => {
    setVerificando(true);
    try {
      const res = await base44.functions.invoke("monitorFinanceiroMatriculas", {});
      const { verificadas = 0, atualizadas = 0 } = res.data || {};
      queryClient.invalidateQueries(["enrollments-control"]);
      onAtualizar?.();
      toast.success(`Verificação concluída: ${verificadas} matrícula(s) verificada(s), ${atualizadas} atualizada(s).`);
    } catch (err) {
      toast.error("Erro na verificação: " + (err.response?.data?.error || err.message));
    } finally {
      setVerificando(false);
    }
  };

  const ultimaSol = (e) =>
    solicitacoes
      .filter((s) => s.enrollment_id === e.id)
      .sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))[0];

  const copiar = (e) => {
    navigator.clipboard.writeText(
      `Aluno: ${e.student_name} | CPF: ${e.student_cpf} | Curso: ${e.course_name} | Empresa: ${e.company_name || "Individual (PF)"} | Situação: ${e.aptidao?.financeiro?.motivo || "—"}`
    );
    toast.success("Dados copiados!");
  };

  const encaminhar = async (e) => {
    setEnviandoId(e.id);
    try {
      const user = await base44.auth.me().catch(() => null);
      const individual = isIndividual(e);
      await base44.entities.SolicitacaoLiberacaoFinanceira.create({
        enrollment_id: e.id,
        student_id: e.student_id || "",
        student_name: e.student_name,
        course_id: e.course_id || "",
        course_name: e.course_name,
        company_id: individual ? "" : (e.company_id || ""),
        company_name: individual ? "" : (e.company_name || ""),
        origem_matricula: individual ? "Individual" : "Empresa",
        status_solicitacao: "Pendente",
        motivo_solicitacao: "Encaminhado pela Certificação — aluno aprovado com bloqueio financeiro",
        solicitado_por: user?.email || "desconhecido",
        solicitado_em: new Date().toISOString(),
        status_financeiro_no_momento: e.aptidao?.financeiro?.motivo || e.status_pagamento || "—",
      });
      try {
        await base44.entities.AuditLog.create({
          user_email: user?.email || "desconhecido",
          user_name: user?.full_name || user?.email || "desconhecido",
          action: "create",
          entity_type: "SolicitacaoLiberacaoFinanceira",
          entity_id: e.id,
          entity_name: `${e.student_name} — ${e.course_name}`,
          details: `Solicitação de liberação financeira encaminhada pela Certificação em ${new Date().toLocaleString("pt-BR")}. Situação: ${e.aptidao?.financeiro?.motivo || "—"}.`,
        });
      } catch { /* log não bloqueia */ }
      toast.success("Solicitação encaminhada ao Financeiro.");
      onAtualizar?.();
    } catch (err) {
      toast.error("Erro ao encaminhar: " + err.message);
    } finally {
      setEnviandoId(null);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden border-yellow-300">
      <div className="bg-yellow-50 border-b px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-yellow-800 flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4" /> Pendências Financeiras ({items.length})
          </h2>
          <Button size="sm" variant="outline" className="h-7 text-xs bg-white" disabled={verificando} onClick={verificarPagamentos}>
            {verificando ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            Verificar pagamentos agora
          </Button>
        </div>
        <p className="text-xs text-yellow-700 mt-1">🔒 A liberação financeira é aprovada exclusivamente pelo <strong>Financeiro</strong> — aqui é possível apenas visualizar e encaminhar.</p>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">Nenhuma pendência financeira.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Aluno</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Curso</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Origem</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Situação Financeira</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Solicitação</th>
              <th className="px-4 py-2 font-medium text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => {
              const sol = ultimaSol(e);
              return (
                <tr key={e.id} className="border-b">
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900">{e.student_name}</div>
                    <div className="text-xs text-gray-400 font-mono">{maskCPF(e.student_cpf)}</div>
                  </td>
                  <td className="px-4 py-2 text-gray-600 max-w-[140px] truncate">{e.course_name}</td>
                  <td className="px-4 py-2"><OrigemBadge enrollment={e} /></td>
                  <td className="px-4 py-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                      {e.aptidao?.financeiro?.motivo || "Bloqueio financeiro"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {sol ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${SOL_BADGE[sol.status_solicitacao] || "bg-gray-100 text-gray-600"}`}>
                        {sol.status_solicitacao}
                      </span>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => copiar(e)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                        disabled={sol?.status_solicitacao === "Pendente" || enviandoId === e.id}
                        onClick={() => encaminhar(e)}>
                        {enviandoId === e.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                        {sol?.status_solicitacao === "Pendente" ? "Encaminhado" : "Encaminhar ao Financeiro"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}