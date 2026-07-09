import React from "react";
import { Mail, MessageCircle, Shield } from "lucide-react";

export default function PortalComunicacao() {
  return (
    <div className="space-y-3 max-w-xl">
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-emerald-600" /> Fale com a CAT Cursos
        </h3>
        <p className="text-sm text-gray-600">
          Para dúvidas sobre cursos, certificados, prazos ou pagamentos, entre em contato
          com a nossa equipe de atendimento pelos canais oficiais informados no seu
          material de matrícula ou diretamente com o RH da sua empresa.
        </p>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-500">
          A CAT Cursos nunca solicita senhas ou dados bancários por telefone.
          Utilize sempre os canais oficiais de comunicação.
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
        <Mail className="w-4 h-4 text-gray-400" />
        <p className="text-sm text-gray-600">Notificações sobre certificados e prazos são enviadas por e-mail e WhatsApp cadastrados.</p>
      </div>
    </div>
  );
}