import React from "react";
import { Link } from "react-router-dom";
import { BookOpen, ExternalLink } from "lucide-react";
import DashBloco, { VazioBloco } from "./DashBloco";
import DashStatusBadge from "./DashStatusBadge";
import { uniq } from "./dashDataEmpresas";

export default function DashCursos({ turmas, matriculas, certModels }) {
  const porCurso = {};
  turmas.forEach(t => {
    const nome = t.training_name || "— Sem curso —";
    (porCurso[nome] ||= { turmas: [], nome }).turmas.push(t);
  });
  const linhas = Object.values(porCurso).sort((a, b) => a.nome.localeCompare(b.nome));
  const temModelo = (nome) => certModels.some(m => (m.name || "").toLowerCase().includes(nome.toLowerCase().slice(0, 12)));

  return (
    <DashBloco titulo="Cursos Programados" icone={BookOpen}
      acoes={
        <Link to="/Courses" className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5">
          Abrir cursos <ExternalLink className="w-3 h-3" />
        </Link>
      }>
      {linhas.length === 0 ? <VazioBloco /> : (
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b text-gray-500">
            <tr>
              <th className="text-left px-3 py-1.5 font-medium">Curso</th>
              <th className="text-left px-3 py-1.5 font-medium">CH</th>
              <th className="text-left px-3 py-1.5 font-medium">Modalidade</th>
              <th className="text-left px-3 py-1.5 font-medium">Turmas</th>
              <th className="text-left px-3 py-1.5 font-medium">Alunos</th>
              <th className="text-left px-3 py-1.5 font-medium">Empresas</th>
              <th className="text-left px-3 py-1.5 font-medium">Status</th>
              <th className="text-left px-3 py-1.5 font-medium">Modelo certificado</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ nome, turmas: ts }) => {
              const ch = ts.find(t => t.duration_hours)?.duration_hours;
              const modalidades = uniq(ts.map(t => t.category));
              const alunos = matriculas.filter(m => m.course_name === nome).length;
              const empresas = uniq(ts.map(t => t.company_name));
              const emAndamento = ts.some(t => t.status === "Em Andamento");
              const modelo = nome !== "— Sem curso —" && temModelo(nome);
              return (
                <tr key={nome} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-1.5 font-medium text-gray-800 max-w-[180px] truncate">{nome}</td>
                  <td className="px-3 py-1.5">{ch ? `${ch}h` : <span className="text-amber-600">⚠ sem CH</span>}</td>
                  <td className="px-3 py-1.5">{modalidades.join(", ") || "—"}</td>
                  <td className="px-3 py-1.5">{ts.length}</td>
                  <td className="px-3 py-1.5">{alunos}</td>
                  <td className="px-3 py-1.5 max-w-[160px] truncate">{empresas.join(", ")}</td>
                  <td className="px-3 py-1.5">
                    <DashStatusBadge status={emAndamento ? "Em Andamento" : "Agendado"}>{emAndamento ? "Em andamento" : "Programado"}</DashStatusBadge>
                  </td>
                  <td className="px-3 py-1.5">
                    {modelo
                      ? <DashStatusBadge status="Aprovado">Vinculado</DashStatusBadge>
                      : <DashStatusBadge status="Pendente">⚠ Sem modelo</DashStatusBadge>}
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