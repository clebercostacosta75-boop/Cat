import React from "react";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { formatDate } from "@/lib/portalAluno";

const STATUS_CLS = {
  "Aprovado": "bg-green-100 text-green-800",
  "Pendente_Revisao": "bg-yellow-100 text-yellow-800",
  "Rejeitado": "bg-red-100 text-red-800",
};

export default function PortalDocumentos({ documents }) {
  if (!documents?.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>Nenhum documento enviado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((d) => (
        <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900 text-sm">{(d.document_type || "").replace(/_/g, " ")}</p>
              <p className="text-xs text-gray-400">{d.file_name || "—"} • Enviado em {formatDate(d.created_date)}</p>
            </div>
          </div>
          <Badge className={`text-xs ${STATUS_CLS[d.status] || "bg-gray-100 text-gray-700"}`}>
            {(d.status || "—").replace(/_/g, " ")}
          </Badge>
        </div>
      ))}
    </div>
  );
}