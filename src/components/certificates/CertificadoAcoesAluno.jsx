/**
 * CertificadoAcoesAluno — diálogo com os certificados do aluno:
 * - Visualizar certificado (preview antes de encaminhar)
 * - Encaminhar para assinatura via e-mail (usa o e-mail do cadastro/planilha)
 */
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Mail, ArrowLeft, Loader2, Award, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import CertificatePreview from "./CertificatePreview";

const STATUS_LABEL = {
  pending_signature: { label: "Aguardando Assinatura", cls: "bg-amber-100 text-amber-800" },
  signed: { label: "Assinado", cls: "bg-green-100 text-green-800" },
  active: { label: "Ativo", cls: "bg-green-100 text-green-800" },
  revoked: { label: "Revogado", cls: "bg-red-100 text-red-700" },
  expired: { label: "Expirado", cls: "bg-gray-100 text-gray-600" },
  substituido: { label: "Substituído", cls: "bg-gray-100 text-gray-600" },
};

export default function CertificadoAcoesAluno({ student, onClose }) {
  const [previewCert, setPreviewCert] = useState(null);
  const [sendingId, setSendingId] = useState(null);

  const { data: certs = [], isLoading } = useQuery({
    queryKey: ["certs-aluno", student.id],
    queryFn: async () => {
      const byId = await base44.entities.Certificate.filter({ student_id: student.id }, "-created_date", 50);
      if (byId.length > 0) return byId;
      if (student.cpf) return base44.entities.Certificate.filter({ student_cpf: student.cpf }, "-created_date", 50);
      return [];
    },
  });

  const { data: models = [] } = useQuery({
    queryKey: ["certificateModels"],
    queryFn: () => base44.entities.CertificateModel.list("-created_date", 100),
  });

  const emailAluno = student.email || certs.find(c => c.student_email)?.student_email || "";

  const handleEnviarEmail = async (cert) => {
    if (!emailAluno && !cert.student_email) {
      toast.error("Aluno não possui e-mail cadastrado.");
      return;
    }
    setSendingId(cert.id);
    try {
      const res = await base44.functions.invoke("enviarCertificadoEmail", {
        certificate_id: cert.id,
        app_url: window.location.origin,
      });
      if (res.data?.success) {
        toast.success(`✅ Certificado encaminhado para assinatura: ${res.data.email_sent_to}`);
      } else {
        toast.error(res.data?.error || "Falha no envio do e-mail.");
      }
    } catch (e) {
      toast.error("Erro ao enviar: " + (e?.response?.data?.error || e.message));
    } finally {
      setSendingId(null);
    }
  };

  const modelForCert = (cert) => models.find(m => m.id === cert.certificate_model_id) || null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            {previewCert ? "Visualizar Certificado" : `Certificados de ${student.full_name}`}
          </DialogTitle>
          {!previewCert && (
            <p className="text-sm text-gray-500">
              {emailAluno ? <>E-mail para envio: <strong>{emailAluno}</strong></> : "⚠️ Aluno sem e-mail cadastrado — o envio para assinatura não estará disponível."}
            </p>
          )}
        </DialogHeader>

        {previewCert ? (
          <div className="space-y-3">
            <Button variant="outline" size="sm" onClick={() => setPreviewCert(null)} className="gap-1">
              <ArrowLeft className="w-4 h-4" /> Voltar à lista
            </Button>
            <CertificatePreview model={modelForCert(previewCert)} cert={previewCert} scale={0.5} />
            <Button
              className="w-full bg-blue-700 hover:bg-blue-800 gap-2"
              disabled={sendingId === previewCert.id || (!emailAluno && !previewCert.student_email)}
              onClick={() => handleEnviarEmail(previewCert)}
            >
              {sendingId === previewCert.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Encaminhar para Assinatura via E-mail
            </Button>
          </div>
        ) : isLoading ? (
          <div className="py-10 text-center text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Carregando certificados...
          </div>
        ) : certs.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
            <p className="text-sm">Nenhum certificado emitido para este aluno.</p>
            <p className="text-xs text-gray-400 mt-1">Emita o certificado pela Fila de Certificação ou pela emissão individual.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {certs.map(cert => {
              const st = STATUS_LABEL[cert.status] || { label: cert.status, cls: "bg-gray-100 text-gray-600" };
              return (
                <div key={cert.id} className="flex flex-wrap items-center justify-between gap-2 border border-gray-200 rounded-lg p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{cert.course_name}</p>
                    <p className="text-xs text-gray-500">
                      {cert.certificate_code || "—"}
                      {cert.issue_date ? ` • Emitido em ${new Date(cert.issue_date).toLocaleDateString("pt-BR")}` : ""}
                    </p>
                    <Badge className={`${st.cls} text-xs mt-1`}>{st.label}</Badge>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-8 px-3 text-xs gap-1"
                      onClick={() => setPreviewCert(cert)}>
                      <Eye className="w-3.5 h-3.5" /> Visualizar
                    </Button>
                    <Button size="sm" className="h-8 px-3 text-xs gap-1 bg-blue-700 hover:bg-blue-800"
                      disabled={sendingId === cert.id || (!emailAluno && !cert.student_email)}
                      onClick={() => handleEnviarEmail(cert)}>
                      {sendingId === cert.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                      Enviar E-mail
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}