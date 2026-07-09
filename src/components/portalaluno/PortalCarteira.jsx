import React from "react";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle } from "lucide-react";
import CertificateQRCode from "@/components/certificates/CertificateQRCode";
import { getDaysLeft, formatDate } from "@/lib/portalAluno";

export default function PortalCarteira({ certificates }) {
  const validos = certificates.filter((c) => {
    if (c.status === "revoked" || c.status === "pending_signature") return false;
    const days = getDaysLeft(c.valid_until);
    return days === null || days >= 0;
  });

  if (!validos.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        <CreditCard className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>Nenhum certificado válido para exibir na carteira.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {validos.map((cert) => (
        <div key={cert.id} className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight">{cert.course_name}</p>
              <p className="text-emerald-200 text-xs mt-1">Validade: {formatDate(cert.valid_until)}</p>
              <Badge className="bg-white/20 text-white border border-white/30 text-xs mt-2 flex items-center gap-1 w-fit">
                <CheckCircle className="w-3 h-3" /> Válido
              </Badge>
            </div>
            {cert.certificate_code && (
              <div className="bg-white rounded-lg p-1.5 flex-shrink-0">
                <CertificateQRCode certificateCode={cert.certificate_code} size={64} showLabel={false} />
              </div>
            )}
          </div>
          {cert.certificate_code && (
            <p className="text-xs font-mono text-emerald-300 mt-3">{cert.certificate_code}</p>
          )}
        </div>
      ))}
    </div>
  );
}