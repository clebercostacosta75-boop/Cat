import React from "react";
import { AlertTriangle, Ban } from "lucide-react";

function Section({ title, items, headerCls, borderCls, Icon, badgeCls }) {
  if (items.length === 0) return null;
  return (
    <div className={`border rounded-lg overflow-hidden ${borderCls}`}>
      <div className={`border-b px-4 py-3 ${headerCls}`}>
        <h2 className="font-semibold flex items-center gap-2 text-sm">
          <Icon className="w-4 h-4" /> {title} ({items.length})
        </h2>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-4 py-2 font-medium text-gray-600">Aluno</th>
            <th className="text-left px-4 py-2 font-medium text-gray-600">Curso</th>
            <th className="text-left px-4 py-2 font-medium text-gray-600">Motivo</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => (
            <tr key={e.id} className="border-b">
              <td className="px-4 py-2">
                <div className="font-medium text-gray-900">{e.student_name}</div>
                <div className="text-xs text-gray-400">{e.student_cpf}</div>
              </td>
              <td className="px-4 py-2 text-gray-600 max-w-[160px] truncate">{e.course_name}</td>
              <td className="px-4 py-2">
                <div className="flex flex-wrap gap-1">
                  {(e.aptidao?.bloqueios || []).map((b, i) => (
                    <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${badgeCls}`}>{b}</span>
                  ))}
                  {(e.aptidao?.alertas || []).map((a, i) => (
                    <span key={`a${i}`} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">⚠ {a}</span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FilaPendenciasBloqueados({ pendencias = [], bloqueados = [] }) {
  return (
    <>
      <Section
        title="Pendências — aprovados que não podem emitir ainda"
        items={pendencias}
        headerCls="bg-amber-50 text-amber-800"
        borderCls="border-amber-200"
        Icon={AlertTriangle}
        badgeCls="bg-amber-100 text-amber-800"
      />
      <Section
        title="Bloqueados / Não Aptos"
        items={bloqueados}
        headerCls="bg-red-50 text-red-800"
        borderCls="border-red-200"
        Icon={Ban}
        badgeCls="bg-red-100 text-red-700"
      />
    </>
  );
}