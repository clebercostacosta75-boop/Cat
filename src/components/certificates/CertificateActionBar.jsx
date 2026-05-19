import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Send, Copy, Eye, XCircle, CheckCircle, Trash2, Calendar, Download,
  Lock, Unlock, AlertTriangle, MessageSquare
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { format, parseISO, differenceInDays } from "date-fns";
import CertificateExporter from "./CertificateExporter";

export default function CertificateActionBar({
  cert,
  model,
  canDelete,
  onRevoke,
  onUnrevoke,
  onDelete,
  onRefresh,
}) {
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [showDeadlineDialog, setShowDeadlineDialog] = useState(false);
  const [phoneInput, setPhoneInput] = useState(cert.student_phone || "");
  const [deadlineInput, setDeadlineInput] = useState(
    cert.download_deadline ? format(parseISO(cert.download_deadline), "yyyy-MM-dd") : ""
  );
  const [sendingWA, setSendingWA] = useState(false);
  const [savingDeadline, setSavingDeadline] = useState(false);

  const copySignLink = () => {
    const url = `${window.location.origin}/CertificateSign?code=${cert.certificate_code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link de assinatura copiado!");
  };

  const copyValidateLink = () => {
    const url = `${window.location.origin}/CertificateValidate?code=${cert.certificate_code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link de validação copiado!");
  };

  const handleSendWhatsApp = async () => {
    if (!phoneInput.trim()) {
      toast.error("Informe o número de WhatsApp do aluno.");
      return;
    }
    setSendingWA(true);
    try {
      // Salvar o telefone no certificado se mudou
      if (phoneInput !== cert.student_phone) {
        await base44.entities.Certificate.update(cert.id, { student_phone: phoneInput });
      }
      const res = await base44.functions.invoke("enviarCertificadoWhatsApp", {
        certificate_id: cert.id,
        phone: phoneInput,
        studentName: cert.student_name,
        courseName: cert.course_name,
        signUrl: `${window.location.origin}/CertificateSign?code=${cert.certificate_code}`,
        certificateCode: cert.certificate_code,
      });
      if (res.data?.success) {
        toast.success(`Link de assinatura enviado via WhatsApp para ${phoneInput}!`);
        setShowWhatsAppDialog(false);
        onRefresh();
      } else {
        toast.error("Erro ao enviar: " + (res.data?.error || res.data?.details || "Tente novamente"));
      }
    } catch (err) {
      toast.error("Erro ao enviar WhatsApp: " + (err?.message || "Tente novamente"));
    } finally {
      setSendingWA(false);
    }
  };

  const handleSaveDeadline = async () => {
    setSavingDeadline(true);
    try {
      const deadline = deadlineInput ? new Date(deadlineInput + "T23:59:59").toISOString() : null;
      await base44.entities.Certificate.update(cert.id, {
        download_deadline: deadline,
        is_blocked: deadline ? (new Date(deadline) < new Date()) : false,
      });
      toast.success("Prazo de download definido!");
      setShowDeadlineDialog(false);
      onRefresh();
    } catch (err) {
      toast.error("Erro ao salvar prazo: " + err.message);
    } finally {
      setSavingDeadline(false);
    }
  };

  // Calcular status de validade
  const isExpired = cert.valid_until && new Date(cert.valid_until) < new Date();
  const daysUntilExpiry = cert.valid_until
    ? differenceInDays(new Date(cert.valid_until), new Date())
    : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;

  const deadlineDate = cert.download_deadline ? new Date(cert.download_deadline) : null;
  const downloadExpired = deadlineDate && deadlineDate < new Date();
  const daysUntilDeadline = deadlineDate ? differenceInDays(deadlineDate, new Date()) : null;

  return (
    <>
      <div className="flex gap-1.5 flex-wrap items-center">

        {/* STATUS BLOQUEIO */}
        {cert.is_blocked && (
          <Badge className="bg-red-100 text-red-700 border-red-200 gap-1 text-xs">
            <Lock className="w-3 h-3" /> Download Bloqueado
          </Badge>
        )}

        {/* STATUS VALIDADE */}
        {isExpired && (
          <Badge className="bg-gray-100 text-gray-600 border-gray-200 gap-1 text-xs">
            <AlertTriangle className="w-3 h-3" /> Validade Expirada
          </Badge>
        )}
        {isExpiringSoon && !isExpired && (
          <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1 text-xs">
            <AlertTriangle className="w-3 h-3" /> Vence em {daysUntilExpiry}d
          </Badge>
        )}

        {/* PRAZO DOWNLOAD */}
        {deadlineDate && !cert.is_blocked && (
          <Badge className={`gap-1 text-xs ${downloadExpired ? "bg-red-100 text-red-700" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
            <Download className="w-3 h-3" />
            {downloadExpired ? "Download expirado" : `Download até ${format(deadlineDate, "dd/MM/yyyy")}`}
          </Badge>
        )}

        {/* BOTÃO WHATSAPP — sempre visível para pending_signature */}
        {cert.status === "pending_signature" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setPhoneInput(cert.student_phone || ""); setShowWhatsAppDialog(true); }}
            className="text-green-700 border-green-300 hover:bg-green-50 text-xs"
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            {cert.whatsapp_sent ? "Reenviar WhatsApp" : "Enviar WhatsApp"}
          </Button>
        )}

        {/* LINK ASSINATURA */}
        {cert.status === "pending_signature" && (
          <Button size="sm" variant="outline" onClick={copySignLink} className="text-xs">
            <Copy className="w-3 h-3 mr-1" /> Link Assinatura
          </Button>
        )}

        {/* LINK VALIDAÇÃO */}
        {cert.certificate_code && (
          <Button size="sm" variant="outline" onClick={copyValidateLink} className="text-xs">
            <Eye className="w-3 h-3 mr-1" /> Link Validação
          </Button>
        )}

        {/* PDF */}
        <CertificateExporter certificate={cert} model={model} />

        {/* PRAZO DOWNLOAD — botão configurar */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setDeadlineInput(cert.download_deadline ? format(parseISO(cert.download_deadline), "yyyy-MM-dd") : ""); setShowDeadlineDialog(true); }}
          className="text-blue-700 border-blue-300 hover:bg-blue-50 text-xs"
        >
          <Calendar className="w-3 h-3 mr-1" />
          {cert.download_deadline ? "Prazo Download" : "Definir Prazo"}
        </Button>

        {/* REVOGAR */}
        <Button
          size="sm"
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
          onClick={() => { if (confirm("Revogar este certificado?")) onRevoke(cert.id); }}
          disabled={cert.status === "revoked"}
        >
          <XCircle className="w-3 h-3 mr-1" /> Revogar
        </Button>

        {/* DESFAZER REVOGAÇÃO */}
        <Button
          size="sm"
          variant="outline"
          className="text-green-600 border-green-200 hover:bg-green-50 text-xs"
          onClick={() => { if (confirm("Desfazer a revogação?")) onUnrevoke(cert.id); }}
          disabled={cert.status !== "revoked"}
        >
          <CheckCircle className="w-3 h-3 mr-1" /> Desfazer Revogação
        </Button>

        {/* EXCLUIR */}
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-red-700 border-red-400 hover:bg-red-50 text-xs">
                <Trash2 className="w-3 h-3 mr-1" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Certificado</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este certificado?<br />
                  <strong>{cert.student_name}</strong> — {cert.course_name}<br /><br />
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => onDelete(cert.id)}>
                  Confirmar Exclusão
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* DIALOG: Enviar WhatsApp */}
      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <MessageSquare className="w-5 h-5" /> Enviar Link de Assinatura via WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm text-gray-600 mb-1">Aluno: <strong>{cert.student_name}</strong></p>
              <p className="text-sm text-gray-600 mb-3">Curso: <strong>{cert.course_name}</strong></p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                WhatsApp do Aluno (com DDD)
              </label>
              <Input
                placeholder="Ex: 91999998888"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">Informe apenas números com DDD. Ex: 91999998888</p>
            </div>
            {cert.whatsapp_sent && cert.whatsapp_sent_at && (
              <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-700">
                ✓ WhatsApp enviado anteriormente em {format(parseISO(cert.whatsapp_sent_at), "dd/MM/yyyy HH:mm")}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWhatsAppDialog(false)}>Cancelar</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSendWhatsApp}
              disabled={sendingWA}
            >
              <Send className="w-4 h-4 mr-1" />
              {sendingWA ? "Enviando..." : "Enviar Agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Prazo de Download */}
      <Dialog open={showDeadlineDialog} onOpenChange={setShowDeadlineDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700">
              <Calendar className="w-5 h-5" /> Prazo para Download do Certificado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Defina até quando o aluno poderá baixar o certificado em PDF.
              Após esse prazo, o download será bloqueado automaticamente.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-700 space-y-1">
              <p>📋 <strong>Validade do certificado:</strong> {cert.valid_until ? format(parseISO(cert.valid_until), "dd/MM/yyyy") : "Não definida"}</p>
              <p>🔒 A autenticidade (link de validação) permanece ativa até o vencimento da validade.</p>
              <p>📥 O download em PDF será bloqueado após o prazo abaixo.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Data Limite para Download
              </label>
              <Input
                type="date"
                value={deadlineInput}
                onChange={e => setDeadlineInput(e.target.value)}
              />
              {deadlineInput && (
                <p className="text-xs text-gray-400 mt-1">
                  O aluno terá até {format(new Date(deadlineInput + "T23:59:59"), "dd/MM/yyyy")} para baixar o PDF.
                </p>
              )}
            </div>
            {cert.is_blocked && (
              <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
                🔒 Este certificado está atualmente bloqueado. Definir uma nova data futura irá desbloqueá-lo.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeadlineDialog(false)}>Cancelar</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSaveDeadline}
              disabled={savingDeadline}
            >
              <Calendar className="w-4 h-4 mr-1" />
              {savingDeadline ? "Salvando..." : "Salvar Prazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}