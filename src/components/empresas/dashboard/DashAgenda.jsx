import React from "react";
import { Link } from "react-router-dom";
import { CalendarClock, ExternalLink } from "lucide-react";
import DashBloco, { VazioBloco } from "./DashBloco";
import DashStatusBadge from "./DashStatusBadge";
import { getTurmaPeriodo, turmaTempo, turmaPendencias } from "./dashDataEmpresas";

const fmt = (d) => (d ? d.split("-").reverse().join("/") : "—");

export default function DashAgenda({ turmas, matsByTurma }) {
  const itens = turmas
    .map(t => {
      const tempo = turmaTempo(t);
      const pend = turmaPendencias(t, matsByTurma[t.id] || []);
      return { t, tempo, pend };
    })
    .filter(({ tempo, pend }) => tempo.hoje || tempo.semana || tempo.futura || pend.length > 0)
    .sort((a, b) => (getTurmaPeriodo(a.t).inicio || "9999") < (getTurmaPeriodo(b.t).inicio || "9999") ? -1 : 1)
    .slice(0, 15);

  return (
    <DashBloco titulo="Agenda de Treinamentos" icone={CalendarClock}
      acoes={
        <Link to="/AgendaTreinamentos" className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5">
          Abrir agenda <ExternalLink className="w-3 h-3" />
        </Link>
      }>
      {itens.length === 0 ? <VazioBloco msg="Nenhum treinamento próximo ou com pendências." /> : (
        <ul className="divide-y">
          {itens.map(({ t, tempo, pend }) => {
            const { inicio } = getTurmaPeriodo(t);
            return (
              <li key={t.id} className="px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 hover:bg-gray-50 text-xs">
                <span className="font-mono text-gray-500 w-[68px]">{fmt(inicio)}</span>
                <span className="text-gray-500">{t.training_schedule || "—"}</span>
                <span className="font-medium text-gray-800 max-w-[160px] truncate">{t.training_name || "Sem curso"}</span>
                <span className="text-gray-600 max-w-[130px] truncate">{t.company_name}</span>
                <span className="text-gray-500">{t.instructor_name || "Sem instrutor"}</span>
                <DashStatusBadge status={tempo.atrasada ? "Atrasada" : t.status}>{tempo.atrasada ? "Atrasada" : t.status}</DashStatusBadge>
                {pend[0] && <DashStatusBadge status="Pendente">⚠ {pend[0]}</DashStatusBadge>}
                {tempo.hoje && !tempo.atrasada && <DashStatusBadge status="Em Andamento">Hoje</DashStatusBadge>}
                <Link to={`/ClassDetails?id=${t.id}`} className="ml-auto text-blue-600 hover:underline">Abrir</Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashBloco>
  );
}