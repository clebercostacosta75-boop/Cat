import React from "react";
import { CheckCircle2, Clock, XCircle, Ban, Send } from "lucide-react";
import { format, parseISO } from "date-fns";

const CONFIG = {
  pending_signature: {
    label: "⏳ Pendente",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock
  },
  signed: {
    label: "✅ Assinado",
    className: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle2
  },
  active: {
    label: "✅ Assinado",
    className: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle2
  },
  revoked: {
    label: "🚫 Revogado",
    className: "bg-gray-100 text-gray-700 border-gray-200",
    icon: Ban
  },
  expired: {
    label: "❌ Vencido",
    className: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle
  },
  not_sent: {
    label: "📨 Não enviado",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Send
  }
};

export default function CertificateStatusBadge({ status, signedAt, revokedReason }) {
  const cfg = CONFIG[status] || CONFIG["pending_signature"];
  const Icon = cfg.icon;

  return (
    <div>
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.className}`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </span>
      {status === "signed" && signedAt && (
        <div className="text-xs text-gray-400 mt-0.5">
          {format(parseISO(signedAt), "dd/MM/yyyy HH:mm")}
        </div>
      )}
      {status === "revoked" && revokedReason && (
        <div className="text-xs text-gray-400 mt-0.5 max-w-[160px] truncate" title={revokedReason}>
          {revokedReason}
        </div>
      )}
    </div>
  );
}