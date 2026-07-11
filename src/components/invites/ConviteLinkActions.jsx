import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

// Ações pós-criação do convite, por canal. O link só existe neste momento.
export default function ConviteLinkActions({ invite, channel, phone, recipientName, portalType, onStatusChange }) {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [waOpened, setWaOpened] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText(invite.activation_url);
    setCopied(true);
    toast.success("Link copiado. Válido até " + new Date(invite.expires_at).toLocaleString("pt-BR") + " — uso único.");
    setTimeout(() => setCopied(false), 2000);
  };

  const waMessage = `Olá, ${recipientName || ""}! Você recebeu um convite de acesso ao Portal ${portalType} da CAT Cursos e Treinamentos. Ative seu acesso pelo link seguro (uso único): ${invite.activation_url}`;

  const openWhatsApp = () => {
    const digits = String(phone || "").replace(/\D/g, "");
    const full = digits.length <= 11 ? `55${digits}` : digits;
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(waMessage)}`, "_blank");
    setWaOpened(true);
  };

  const confirmSent = async () => {
    setSending(true);
    try {
      await base44.functions.invoke("gerenciarConvitesPortal", { action: "mark_sent", invite_id: invite.invite_id });
      toast.success("Envio confirmado.");
      onStatusChange?.();
    } catch {
      toast.error("Erro ao confirmar envio.");
    } finally {
      setSending(false);
    }
  };

  const sendEmail = async () => {
    setSending(true);
    try {
      const res = await base44.functions.invoke("gerenciarConvitesPortal", {
        action: "send_email",
        invite_id: invite.invite_id,
        activation_url: invite.activation_url,
      });
      if (res.data?.success) { toast.success("E-mail com o botão de ativação enviado."); onStatusChange?.(); }
      else toast.error(res.data?.error || "Falha no envio.");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Falha no envio do e-mail.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <p className="text-xs font-semibold text-green-800 mb-1">Convite gerado — o link abaixo é exibido somente agora:</p>
        <p className="text-xs font-mono text-green-900 break-all">{invite.activation_url}</p>
        <p className="text-xs text-green-700 mt-1">Uso único • Expira em {new Date(invite.expires_at).toLocaleString("pt-BR")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={copyLink} className="gap-1">
          {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />} Copiar link
        </Button>

        {channel === "Email" && (
          <Button size="sm" onClick={sendEmail} disabled={sending} className="gap-1">
            <Mail className="w-3.5 h-3.5" /> {sending ? "Enviando..." : "Enviar e-mail"}
          </Button>
        )}

        {channel === "WhatsApp" && (
          <>
            <Button size="sm" onClick={openWhatsApp} className="gap-1 bg-green-600 hover:bg-green-700">
              <MessageCircle className="w-3.5 h-3.5" /> Abrir WhatsApp
            </Button>
            {waOpened && (
              <Button size="sm" variant="outline" onClick={confirmSent} disabled={sending} className="gap-1 text-green-700 border-green-300">
                <Check className="w-3.5 h-3.5" /> Confirmar que enviei
              </Button>
            )}
          </>
        )}

        {channel === "Manual" && (
          <Button size="sm" variant="outline" onClick={confirmSent} disabled={sending} className="gap-1">
            <Check className="w-3.5 h-3.5" /> Marcar como entregue
          </Button>
        )}
      </div>

      {channel === "WhatsApp" && (
        <p className="text-xs text-amber-600">O envio pelo WhatsApp é manual — o status só muda após a sua confirmação.</p>
      )}
    </div>
  );
}