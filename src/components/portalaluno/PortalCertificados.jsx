import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, ExternalLink, CheckCircle, Clock, AlertTriangle, XCircle, PenLine } from "lucide-react";
import CertificateDownloader from "@/components/certificates/CertificateDownloader";
import { getDaysLeft, formatDate } from "@/lib/portalAluno";

function situacao(cert) {
  if (cert.status === "revoked") return { label: "Revogado", cls: "bg-red-100 text-red-700 border-red-300", Icon: XCircle };
  if (cert.status === "pending_signature") return { label: "Pendente de assinatura", cls: "bg-yellow-100 text-yellow-800 border-yellow-300", Icon: PenLine };
  const days = getDaysLeft(cert.valid_until);
  if (days !== null && days < 0) return { label: "Vencido", cls: "bg-red-100 text-red-700 border-red-300", Icon: AlertTriangle };
  if (days !== null && days <= 30) return { label: `Vence em ${days}d`, cls: "bg-orange-100 text-orange-700 border-orange-300", Icon: Clock };
  return { label: "Válido", cls: "bg-green-100 text-green-700 border-green-300", Icon: CheckCircle };
}

export default function PortalCertificados({ certificates }) {
  if (!certificates.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Award className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>Nenhum certificado encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {certificates.map((cert) => {
        const s = situacao(cert);
        return (
          <div key={cert.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{cert.course_name}</p>
                {cert.client_name && <p className="text-xs text-gray-500 mt-0.5">Empresa: {cert.client_name}</p>}
                <div className="flex gap-4 mt-1.5 text-xs text-gray-500 flex-wrap">
                  <span>Emissão: {formatDate(cert.issue_date || cert.end_date)}</span>
                  <span>Validade: {formatDate(cert.valid_until)}</span>
                </div>
                {cert.certificate_code && (
                  <p className="text-xs font-mono text-gray-400 mt-1">{cert.certificate_code}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={`border ${s.cls} flex items-center gap-1`}>
                  <s.Icon className="w-3 h-3" />{s.label}
                </Badge>
                <div className="flex gap-2">
                  {cert.certificate_code && (
                    <Button size="sm" variant="outline" className="text-xs h-8 gap-1"
                      onClick={() => window.open(`${window.location.origin}/CertificateValidate?code=${cert.certificate_code}`, "_blank")}>
                      <ExternalLink className="w-3 h-3" /> Visualizar
                    </Button>
                  )}
                  <CertificateDownloader certificate={cert} size="sm" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}