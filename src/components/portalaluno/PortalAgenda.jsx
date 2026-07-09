import React from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { origemMatricula, ORIGEM_EMPRESA, formatDate } from "@/lib/portalAluno";

export default function PortalAgenda({ enrollments }) {
  const todayStr = new Date().toISOString().split("T")[0];
  const proximos = enrollments
    .filter((e) => e.end_date && e.end_date >= todayStr)
    .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));

  if (!proximos.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>Nenhum curso em andamento ou agendado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {proximos.map((e) => {
        const emAndamento = e.start_date && e.start_date <= todayStr;
        return (
          <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-semibold text-gray-900 text-sm">{e.course_name}</p>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {formatDate(e.start_date)} → {formatDate(e.end_date)}
              </p>
              {origemMatricula(e) === ORIGEM_EMPRESA && e.company_name && (
                <p className="text-xs text-gray-400 mt-0.5">{e.company_name}</p>
              )}
            </div>
            <Badge className={emAndamento ? "bg-indigo-100 text-indigo-800" : "bg-blue-100 text-blue-800"}>
              {emAndamento ? "Em andamento" : "Agendado"}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}