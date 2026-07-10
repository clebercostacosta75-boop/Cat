import React from "react";

const Card = ({ label, value, color = "text-gray-900" }) => (
  <div className="bg-white border rounded-lg px-3 py-2.5">
    <p className={`text-xl font-bold leading-none ${color}`}>{value}</p>
    <p className="text-[11px] text-gray-500 mt-1 leading-tight">{label}</p>
  </div>
);

export default function DashIndicadores({ ind }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      <Card label="Turmas programadas" value={ind.turmasProgramadas} color="text-blue-700" />
      <Card label="Turmas em andamento" value={ind.turmasAndamento} color="text-amber-600" />
      <Card label="Turmas concluídas" value={ind.turmasConcluidas} color="text-emerald-700" />
      <Card label="Turmas canceladas" value={ind.turmasCanceladas} color="text-red-600" />
      <Card label="Alunos matriculados" value={ind.alunosMatriculados} />
      <Card label="Alunos aprovados" value={ind.aprovados} color="text-emerald-700" />
      <Card label="Alunos reprovados" value={ind.reprovados} color="text-red-600" />
      <Card label="Resultado pendente" value={ind.pendentes} color="text-amber-600" />
      <Card label="Aptos p/ certificação" value={ind.aptos} color="text-emerald-700" />
      <Card label="Bloqueados p/ certificação" value={ind.bloqueados} color="text-red-600" />
      <Card label="Instrutores escalados" value={ind.instrutores} color="text-indigo-700" />
      <Card label="Cursos programados" value={ind.cursos} color="text-indigo-700" />
      <Card label="Empresas atendidas" value={ind.empresas} color="text-blue-700" />
    </div>
  );
}