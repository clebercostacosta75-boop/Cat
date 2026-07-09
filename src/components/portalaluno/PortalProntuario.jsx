import React from "react";
import { User } from "lucide-react";
import { formatDate } from "@/lib/portalAluno";

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-b-0 text-sm gap-4">
      <span className="text-gray-400 text-xs uppercase tracking-wide flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-gray-800 font-medium text-right">{value || "—"}</span>
    </div>
  );
}

export default function PortalProntuario({ student }) {
  if (!student) {
    return (
      <div className="text-center py-12 text-gray-400">
        <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>Cadastro do aluno não localizado.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm max-w-xl">
      <Row label="Nome completo" value={student.full_name} />
      {student.social_name && <Row label="Nome social" value={student.social_name} />}
      <Row label="CPF" value={student.cpf} />
      <Row label="Data de nascimento" value={formatDate(student.data_nascimento)} />
      <Row label="E-mail" value={student.email} />
      <Row label="WhatsApp" value={student.whatsapp} />
      <Row label="Cidade/UF" value={student.cidade ? `${student.cidade}${student.estado ? `/${student.estado}` : ""}` : ""} />
      <Row label="Status do cadastro" value={student.status} />
    </div>
  );
}