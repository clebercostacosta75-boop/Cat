import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, UserCheck, BookOpen, Trophy } from "lucide-react";

function RankItem({ position, name, sub1, sub2 }) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-lg w-6 text-center">{medals[position] || `${position + 1}º`}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
        <p className="text-xs text-gray-500">{sub1}</p>
      </div>
      {sub2 && <span className="text-xs text-gray-500 whitespace-nowrap">{sub2}</span>}
    </div>
  );
}

export default function OpRankings({ schedules }) {
  // TOP 5 Empresas
  const byEmpresa = {};
  schedules.forEach(s => {
    if (!s.company_name) return;
    if (!byEmpresa[s.company_name]) byEmpresa[s.company_name] = { turmas: 0, alunos: 0 };
    byEmpresa[s.company_name].turmas++;
    byEmpresa[s.company_name].alunos += (s.students_count || 0);
  });
  const topEmpresas = Object.entries(byEmpresa)
    .sort((a, b) => b[1].turmas - a[1].turmas).slice(0, 5);

  // TOP 5 Instrutores
  const byInstrutor = {};
  schedules.forEach(s => {
    if (!s.instructor_name) return;
    if (!byInstrutor[s.instructor_name]) byInstrutor[s.instructor_name] = { turmas: 0, horas: 0 };
    byInstrutor[s.instructor_name].turmas++;
    byInstrutor[s.instructor_name].horas += (s.duration_hours || 0);
  });
  const topInstrutores = Object.entries(byInstrutor)
    .sort((a, b) => b[1].turmas - a[1].turmas).slice(0, 5);

  // TOP 5 Cursos
  const byCurso = {};
  schedules.forEach(s => {
    if (!s.training_name) return;
    if (!byCurso[s.training_name]) byCurso[s.training_name] = { turmas: 0, alunos: 0 };
    byCurso[s.training_name].turmas++;
    byCurso[s.training_name].alunos += (s.students_count || 0);
  });
  const topCursos = Object.entries(byCurso)
    .sort((a, b) => b[1].turmas - a[1].turmas).slice(0, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Top Empresas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-500" /> TOP 5 Empresas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {topEmpresas.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Sem dados</p>
          ) : topEmpresas.map(([name, d], i) => (
            <RankItem key={name} position={i} name={name} sub1={`${d.turmas} turma(s)`} sub2={`${d.alunos} alunos`} />
          ))}
        </CardContent>
      </Card>

      {/* Top Instrutores */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-purple-500" /> TOP 5 Instrutores
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {topInstrutores.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Sem dados</p>
          ) : topInstrutores.map(([name, d], i) => (
            <RankItem key={name} position={i} name={name} sub1={`${d.turmas} turma(s)`} sub2={`${d.horas}h`} />
          ))}
        </CardContent>
      </Card>

      {/* Top Cursos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-500" /> TOP 5 Cursos
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {topCursos.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Sem dados</p>
          ) : topCursos.map(([name, d], i) => (
            <RankItem key={name} position={i} name={name} sub1={`${d.turmas} turma(s)`} sub2={`${d.alunos} alunos`} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}