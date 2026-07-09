import React from "react";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Building2, Users } from "lucide-react";
import { origemMatricula, ORIGEM_EMPRESA, formatDate } from "@/lib/portalAluno";

export default function PortalCursos({ enrollments }) {
  if (!enrollments.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>Nenhuma matrícula encontrada.</p>
      </div>
    );
  }

  const sorted = [...enrollments].sort((a, b) => (b.start_date || "").localeCompare(a.start_date || ""));

  return (
    <div className="space-y-3">
      {sorted.map((e) => {
        const origem = origemMatricula(e);
        const isEmpresa = origem === ORIGEM_EMPRESA;
        return (
          <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{e.course_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDate(e.start_date)} → {formatDate(e.end_date)}
                  {e.course_duration ? ` • ${e.course_duration}` : ""}
                </p>
                {isEmpresa && e.company_name && (
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {e.company_name}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge className={isEmpresa
                  ? "bg-blue-100 text-blue-800 border border-blue-300"
                  : "bg-emerald-100 text-emerald-800 border border-emerald-300"}>
                  {isEmpresa ? <><Building2 className="w-3 h-3 mr-1" />Empresa</> : <><Users className="w-3 h-3 mr-1" />Comunidade</>}
                </Badge>
                <Badge className="bg-gray-100 text-gray-700 text-xs">{e.status || "—"}</Badge>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}