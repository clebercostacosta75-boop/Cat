import React from "react";
import { AlertTriangle } from "lucide-react";
import OrigemBadge from "./OrigemBadge";
import { maskCPF } from "@/lib/filaVisual";

export default function FilaPendAcademicasTab({ items }) {
  return (
    <div className="border rounded-lg overflow-hidden border-amber-200">
      <div className="bg-amber-50 border-b px-4 py-3">
        <h2 className="font-semibold text-amber-800 flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4" /> Pendências Acadêmicas ({items.length})
        </h2>
        <p className="text-xs text-amber-700 mt-1">O resultado acadêmico é definido exclusivamente na <strong>Gestão Acadêmica</strong> — a Certificação apenas visualiza.</p>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">Nenhuma pendência acadêmica.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Aluno</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Curso</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Origem</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Empresa</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-b">
                <td className="px-4 py-2">
                  <div className="font-medium text-gray-900">{e.student_name}</div>
                  <div className="text-xs text-gray-400 font-mono">{maskCPF(e.student_cpf)}</div>
                </td>
                <td className="px-4 py-2 text-gray-600 max-w-[160px] truncate">{e.course_name}</td>
                <td className="px-4 py-2"><OrigemBadge enrollment={e} /></td>
                <td className="px-4 py-2 text-gray-500 text-xs max-w-[120px] truncate">{e.company_name || "—"}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {(e.aptidao?.bloqueios || []).map((b, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{b}</span>
                    ))}
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