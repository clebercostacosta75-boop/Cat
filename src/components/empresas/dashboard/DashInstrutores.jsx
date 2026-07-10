import React from "react";
import { Link } from "react-router-dom";
import { Users, ExternalLink } from "lucide-react";
import DashBloco, { VazioBloco } from "./DashBloco";
import DashStatusBadge from "./DashStatusBadge";
import { getTurmaPeriodo, turmaPendencias, uniq } from "./dashDataEmpresas";

const fmt = (d) => (d ? d.split("-").reverse().join("/") : "—");

export default function DashInstrutores({ turmas, matsByTurma }) {
  const porInstrutor = {};
  turmas.forEach(t => {
    const nome = t.instructor_name || "— Sem instrutor —";
    (porInstrutor[nome] ||= []).push(t);
  });
  const linhas = Object.entries(porInstrutor).sort(([a], [b]) => a.localeCompare(b));

  return (
    <DashBloco titulo="Instrutores Escalados" icone={Users}
      acoes={
        <Link to="/Instructors" className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5">
          Abrir instrutores <ExternalLink className="w-3 h-3" />
        </Link>
      }>
      {linhas.length === 0 ? <VazioBloco /> : (
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b text-gray-500">
            <tr>
              <th className="text-left px-3 py-1.5 font-medium">Instrutor</th>
              <th className="text-left px-3 py-1.5 font-medium">Turmas</th>
              <th className="text-left px-3 py-1.5 font-medium">Cursos</th>
              <th className="text-left px-3 py-1.5 font-medium">Próxima data</th>
              <th className="text-left px-3 py-1.5 font-medium">Atuação</th>
              <th className="text-left px-3 py-1.5 font-medium">Pendências</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(([nome, ts]) => {
              const cursos = uniq(ts.map(t => t.training_name));
              const proximas = ts.map(t => getTurmaPeriodo(t).inicio).filter(Boolean).sort();
              const emAndamento = ts.some(t => t.status === "Em Andamento");
              const pend = ts.flatMap(t => turmaPendencias(t, matsByTurma[t.id] || []));
              const semInstrutor = nome === "— Sem instrutor —";
              return (
                <tr key={nome} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-1.5 font-medium text-gray-800">
                    {semInstrutor ? <DashStatusBadge status="Sem instrutor">Turmas sem instrutor</DashStatusBadge> : nome}
                  </td>
                  <td className="px-3 py-1.5">{ts.length}</td>
                  <td className="px-3 py-1.5 max-w-[200px] truncate">{cursos.join(", ") || "—"}</td>
                  <td className="px-3 py-1.5">{fmt(proximas[0])}</td>
                  <td className="px-3 py-1.5">
                    <DashStatusBadge status={emAndamento ? "Em Andamento" : "Agendado"}>{emAndamento ? "Em atuação" : "Escalado"}</DashStatusBadge>
                  </td>
                  <td className="px-3 py-1.5 text-amber-700 max-w-[220px] truncate">{pend.length ? `⚠ ${uniq(pend).slice(0, 2).join("; ")}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </DashBloco>
  );
}