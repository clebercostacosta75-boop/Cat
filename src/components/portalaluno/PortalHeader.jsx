import React from "react";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";

const maskCpf = (cpf) => {
  const d = (cpf || "").replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.***-**` : cpf;
};

export default function PortalHeader({ student, perfil, onSair }) {
  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{student?.full_name || "Aluno"}</p>
            <p className="text-xs text-gray-500">
              CPF: {maskCpf(student?.cpf)}{student?.email ? ` • ${student.email}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`border ${perfil.color}`}>{perfil.label}</Badge>
          <button onClick={onSair} className="text-xs text-gray-400 hover:text-gray-600 underline">Sair</button>
        </div>
      </div>
    </div>
  );
}