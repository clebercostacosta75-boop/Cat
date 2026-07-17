import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Plus, Info } from "lucide-react";
import { format, parseISO } from "date-fns";
import SolicitarRenovacaoDialog from "./SolicitarRenovacaoDialog";

// Mapeia os status internos existentes (SolicitacaoTreinamento) para o fluxo exibido à empresa
const STATUS_MAP = {
  "Aguardando Análise": { label: "Enviada", cor: "bg-blue-100 text-blue-700 border-blue-200" },
  "Em Análise": { label: "Em análise", cor: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  "Aprovado": { label: "Aprovada", cor: "bg-green-100 text-green-700 border-green-200" },
  "Agendado": { label: "Aprovada — agendada", cor: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  "Concluído": { label: "Concluída", cor: "bg-gray-100 text-gray-700 border-gray-200" },
  "Cancelado": { label: "Recusada/Cancelada", cor: "bg-red-100 text-red-600 border-red-200" },
};

const fmt = (d, p = "dd/MM/yyyy") => { try { return d ? format(parseISO(d), p) : "—"; } catch { return "—"; } };

export default function SolicitacoesTab({ dados, recarregar }) {
  const [dialogAberto, setDialogAberto] = useState(false);
  const solicitacoes = dados.solicitacoes || [];

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-gray-800 text-sm">Solicitações da empresa ({solicitacoes.length})</span>
        </div>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs" onClick={() => setDialogAberto(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Nova solicitação
        </Button>
      </div>
      <div className="px-4 py-2 bg-blue-50/50 border-b text-[11px] text-blue-600 flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 flex-shrink-0" />
        A análise e aprovação das solicitações é feita exclusivamente pela equipe CAT. A empresa não aprova a própria solicitação.
      </div>
      {solicitacoes.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <Send className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma solicitação registrada. Use "Nova solicitação" ou o botão em Alertas e Renovações.</p>
        </div>
      ) : (
        <div className="divide-y">
          {solicitacoes.map((s) => {
            const st = STATUS_MAP[s.status] || { label: s.status, cor: "bg-gray-100 text-gray-600 border-gray-200" };
            return (
              <div key={s.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-gray-900 text-sm flex-1 min-w-[200px]">{s.titulo_treinamento}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${st.cor}`}>{st.label}</span>
                </div>
                <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-0.5">
                  {s.colaboradores_nomes && <span>Aluno(s): {s.colaboradores_nomes}</span>}
                  {s.nr_relacionada && <span>NR: {s.nr_relacionada}</span>}
                  {s.numero_participantes != null && <span>{s.numero_participantes} participante(s)</span>}
                  <span>Prazo desejado: {fmt(s.data_preferencial)}</span>
                  <span>Criada em: {fmt(s.created_date, "dd/MM/yyyy HH:mm")}</span>
                  {s.data_confirmada && <span className="text-emerald-600">Data confirmada: {fmt(s.data_confirmada)}</span>}
                </div>
                {s.descricao && <p className="mt-1 text-xs text-gray-400 whitespace-pre-line">{s.descricao}</p>}
                {s.observacoes_cat && <p className="mt-1 text-xs text-indigo-600">Retorno CAT: {s.observacoes_cat}</p>}
              </div>
            );
          })}
        </div>
      )}
      <SolicitarRenovacaoDialog
        aberto={dialogAberto}
        onFechar={() => setDialogAberto(false)}
        certificados={[]}
        companyId={dados.company.id}
        onCriada={recarregar}
      />
    </div>
  );
}