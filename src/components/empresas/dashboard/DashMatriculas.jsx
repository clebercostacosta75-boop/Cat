import React from "react";
import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import DashBloco from "./DashBloco";

const Linha = ({ label, count, badgeCls, acao }) => (
  <li className="px-4 py-2 flex items-center gap-3 text-xs hover:bg-gray-50">
    <span className={`inline-flex items-center justify-center min-w-[28px] h-6 rounded-full text-[11px] font-bold ${badgeCls}`}>{count}</span>
    <span className="text-gray-700 flex-1">{label}</span>
    {acao}
  </li>
);

export default function DashMatriculas({ matriculas, aptosIds, bloqIds, finIds, onOpenTab }) {
  const res = (m) => m.resultado_academico || "Pendente";
  const abrirMat = (
    <button onClick={() => onOpenTab("matriculas")} className="text-blue-600 hover:underline">Abrir matrículas</button>
  );
  const abrirCert = <Link to="/Certificacoes" className="text-blue-600 hover:underline">Abrir Certificação</Link>;

  return (
    <DashBloco titulo="Situação Acadêmica das Matrículas" icone={GraduationCap}>
      <ul className="divide-y">
        <Linha label="Matrículas com resultado pendente" count={matriculas.filter(m => res(m) === "Pendente").length}
          badgeCls="bg-amber-100 text-amber-800" acao={abrirMat} />
        <Linha label="Matrículas aprovadas" count={matriculas.filter(m => res(m) === "Aprovado").length}
          badgeCls="bg-emerald-100 text-emerald-800" acao={abrirMat} />
        <Linha label="Matrículas reprovadas" count={matriculas.filter(m => res(m) === "Reprovado").length}
          badgeCls="bg-red-100 text-red-800" acao={abrirMat} />
        <Linha label='Matrículas "Não Concluiu"' count={matriculas.filter(m => res(m) === "Não Concluiu").length}
          badgeCls="bg-orange-100 text-orange-800" acao={abrirMat} />
        <Linha label="Aptas para certificação (motor central)" count={matriculas.filter(m => aptosIds.has(m.id)).length}
          badgeCls="bg-emerald-100 text-emerald-800" acao={abrirCert} />
        <Linha label="Bloqueadas para certificação (motor central)" count={matriculas.filter(m => bloqIds.has(m.id)).length}
          badgeCls="bg-red-100 text-red-800" acao={abrirCert} />
        <Linha label="Com pendência financeira (Gate Financeiro)" count={matriculas.filter(m => finIds.has(m.id)).length}
          badgeCls="bg-yellow-100 text-yellow-800" acao={abrirCert} />
      </ul>
    </DashBloco>
  );
}