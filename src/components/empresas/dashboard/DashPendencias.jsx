import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import DashBloco, { VazioBloco } from "./DashBloco";
import { turmaPendencias } from "./dashDataEmpresas";

export default function DashPendencias({ turmas, matriculas, matsByTurma, cursosSemModelo, onOpenTab }) {
  const pendencias = [];

  turmas.forEach(t => {
    turmaPendencias(t, matsByTurma[t.id] || []).forEach(p =>
      pendencias.push({
        texto: `${p} — Turma "${t.training_name || "?"}" (${t.company_name})`,
        acao: <Link to={`/ClassDetails?id=${t.id}`} className="text-blue-600 hover:underline">Abrir turma</Link>,
      })
    );
  });

  matriculas.forEach(m => {
    const res = m.resultado_academico || "Pendente";
    const abrirMat = (
      <button onClick={() => onOpenTab("matriculas")} className="text-blue-600 hover:underline">
        Lançar resultado
      </button>
    );
    if (res === "Pendente" && m.status_matricula === "Concluído") {
      pendencias.push({ texto: `Matrícula sem resultado acadêmico — ${m.student_name} (${m.course_name} · ${m.company_name})`, acao: abrirMat });
    }
    if (res === "Reprovado") {
      pendencias.push({ texto: `Aluno reprovado — ${m.student_name} (${m.course_name} · ${m.company_name})`, acao: abrirMat });
    }
    if (res === "Não Concluiu") {
      pendencias.push({ texto: `Aluno não concluiu — ${m.student_name} (${m.course_name} · ${m.company_name})`, acao: abrirMat });
    }
    if (res === "Aprovado" && !m.apto_certificacao && !m.certificate_id) {
      pendencias.push({
        texto: `Aluno sem liberação para certificação — ${m.student_name} (${m.course_name} · ${m.company_name})`,
        acao: <Link to="/Certificacoes" className="text-blue-600 hover:underline">Ver na Certificação</Link>,
      });
    }
  });

  cursosSemModelo.forEach(nome => {
    pendencias.push({
      texto: `Curso sem modelo de certificado — ${nome}`,
      acao: <Link to="/CertDesigner" className="text-blue-600 hover:underline">Abrir Designer</Link>,
    });
  });

  return (
    <DashBloco titulo={`Pendências Operacionais (${pendencias.length})`} icone={AlertTriangle}>
      {pendencias.length === 0 ? <VazioBloco msg="Nenhuma pendência operacional. 🎉" /> : (
        <ul className="divide-y max-h-72 overflow-y-auto">
          {pendencias.slice(0, 50).map((p, i) => (
            <li key={i} className="px-4 py-2 flex items-center gap-2 text-xs hover:bg-gray-50">
              <span className="text-amber-500">⚠</span>
              <span className="text-gray-700 flex-1">{p.texto}</span>
              {p.acao}
            </li>
          ))}
        </ul>
      )}
    </DashBloco>
  );
}