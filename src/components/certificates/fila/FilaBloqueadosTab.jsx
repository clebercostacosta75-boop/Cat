import React from "react";
import { Ban } from "lucide-react";
import OrigemBadge from "./OrigemBadge";
import { maskCPF } from "@/lib/filaVisual";

function classificarBloqueio(b) {
  if (b.includes("sem modelo")) return { tipo: "Curso sem modelo", acao: "Cadastre/vincule o modelo no Designer de Modelos" };
  if (b.startsWith("Dados obrigatórios")) return { tipo: "Dados incompletos", acao: "Complete os dados na Gestão Acadêmica" };
  if (b.startsWith("Duplicidade")) return { tipo: "Duplicidade", acao: "Verifique o certificado já emitido antes de reemitir" };
  if (b.includes("cancelada")) return { tipo: "Matrícula cancelada", acao: "Reative a matrícula na Gestão Acadêmica, se aplicável" };
  return { tipo: "Bloqueio manual", acao: "Contate o responsável pelo bloqueio de certificação" };
}

export default function FilaBloqueadosTab({ items }) {
  return (
    <div className="border rounded-lg overflow-hidden border-red-200">
      <div className="bg-red-50 border-b px-4 py-3">
        <h2 className="font-semibold text-red-800 flex items-center gap-2 text-sm">
          <Ban className="w-4 h-4" /> Bloqueados / Não Aptos ({items.length})
        </h2>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">Nenhum bloqueio operacional.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Aluno</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Curso</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Origem</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Bloqueios e Ação Recomendada</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-b align-top">
                <td className="px-4 py-2">
                  <div className="font-medium text-gray-900">{e.student_name}</div>
                  <div className="text-xs text-gray-400 font-mono">{maskCPF(e.student_cpf)}</div>
                </td>
                <td className="px-4 py-2 text-gray-600 max-w-[150px] truncate">{e.course_name}</td>
                <td className="px-4 py-2"><OrigemBadge enrollment={e} /></td>
                <td className="px-4 py-2">
                  <div className="space-y-1.5">
                    {(e.aptidao?.bloqueios || []).map((b, i) => {
                      const { tipo, acao } = classificarBloqueio(b);
                      return (
                        <div key={i} className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{tipo}</span>
                          <span className="text-xs text-gray-600">{b}</span>
                          <span className="text-xs text-gray-400 italic">→ {acao}</span>
                        </div>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}