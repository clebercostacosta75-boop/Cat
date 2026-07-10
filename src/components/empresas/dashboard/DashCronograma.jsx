import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarRange, ExternalLink } from "lucide-react";
import DashBloco, { VazioBloco } from "./DashBloco";
import DashStatusBadge from "./DashStatusBadge";
import { getTurmaPeriodo, turmaTempo } from "./dashDataEmpresas";

const fmt = (d) => (d ? d.split("-").reverse().join("/") : "—");

const VISOES = [
  { key: "hoje", label: "Hoje" },
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mês" },
  { key: "futura", label: "Futuros" },
  { key: "atrasada", label: "Atrasados" },
];

export default function DashCronograma({ turmas }) {
  const [visao, setVisao] = useState("semana");
  const itens = turmas
    .filter(t => turmaTempo(t)[visao])
    .sort((a, b) => (getTurmaPeriodo(a).inicio || "") < (getTurmaPeriodo(b).inicio || "") ? -1 : 1);

  return (
    <DashBloco titulo="Cronograma Operacional" icone={CalendarRange}
      acoes={
        <div className="flex items-center gap-1">
          {VISOES.map(v => (
            <button key={v.key} onClick={() => setVisao(v.key)}
              className={`text-[11px] px-2 py-1 rounded-full border ${visao === v.key ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}>
              {v.label}
            </button>
          ))}
          <Link to="/Schedule" className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5 ml-2">
            Cronograma completo <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      }>
      {itens.length === 0 ? <VazioBloco /> : (
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b text-gray-500">
            <tr>
              <th className="text-left px-3 py-1.5 font-medium">Início</th>
              <th className="text-left px-3 py-1.5 font-medium">Término</th>
              <th className="text-left px-3 py-1.5 font-medium">Empresa</th>
              <th className="text-left px-3 py-1.5 font-medium">Curso / Turma</th>
              <th className="text-left px-3 py-1.5 font-medium">Instrutor</th>
              <th className="text-left px-3 py-1.5 font-medium">Local</th>
              <th className="text-left px-3 py-1.5 font-medium">CH</th>
              <th className="text-left px-3 py-1.5 font-medium">Modalidade</th>
              <th className="text-left px-3 py-1.5 font-medium">Status</th>
              <th className="px-3 py-1.5 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {itens.map(t => {
              const { inicio, fim } = getTurmaPeriodo(t);
              const atrasada = turmaTempo(t).atrasada;
              return (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-1.5">{fmt(inicio)}</td>
                  <td className="px-3 py-1.5">{fmt(fim)}</td>
                  <td className="px-3 py-1.5 max-w-[130px] truncate">{t.company_name}</td>
                  <td className="px-3 py-1.5 max-w-[170px] truncate font-medium text-gray-800">{t.training_name || "Sem curso"}</td>
                  <td className="px-3 py-1.5">{t.instructor_name || <DashStatusBadge status="Sem instrutor">Sem instrutor</DashStatusBadge>}</td>
                  <td className="px-3 py-1.5 max-w-[100px] truncate">{t.location || "—"}</td>
                  <td className="px-3 py-1.5">{t.duration_hours ? `${t.duration_hours}h` : "—"}</td>
                  <td className="px-3 py-1.5">{t.category || "—"}</td>
                  <td className="px-3 py-1.5">
                    <DashStatusBadge status={atrasada ? "Atrasada" : t.status}>{atrasada ? "Atrasada" : t.status}</DashStatusBadge>
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <Link to={`/ClassDetails?id=${t.id}`} className="text-blue-600 hover:underline">Abrir turma</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </DashBloco>
  );
}