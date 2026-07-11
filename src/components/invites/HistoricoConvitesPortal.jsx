import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ban, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLE = {
  Pending: "bg-yellow-100 text-yellow-800",
  Sent: "bg-blue-100 text-blue-800",
  Used: "bg-green-100 text-green-800",
  Expired: "bg-gray-100 text-gray-600",
  Revoked: "bg-red-100 text-red-700",
  Failed: "bg-red-100 text-red-700",
  Draft: "bg-gray-100 text-gray-600",
};
const STATUS_LABEL = {
  Pending: "Gerado", Sent: "Enviado", Used: "Usado",
  Expired: "Expirado", Revoked: "Revogado", Failed: "Falha", Draft: "Rascunho",
};

export default function HistoricoConvitesPortal({ entityId, portalType }) {
  const queryClient = useQueryClient();
  const [newLink, setNewLink] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ["portal-invites", entityId],
    queryFn: async () => {
      const res = await base44.functions.invoke("gerenciarConvitesPortal", { action: "list", linked_entity_id: entityId });
      return res.data?.invites || [];
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["portal-invites", entityId] });

  const revoke = async (id) => {
    setBusyId(id);
    try {
      await base44.functions.invoke("gerenciarConvitesPortal", { action: "revoke", invite_id: id });
      toast.success("Convite revogado.");
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao revogar.");
    } finally { setBusyId(null); }
  };

  const resend = async (id) => {
    setBusyId(id);
    try {
      const res = await base44.functions.invoke("gerenciarConvitesPortal", {
        action: "resend", invite_id: id, app_url: window.location.origin,
      });
      if (res.data?.success) {
        setNewLink(res.data);
        toast.success("Novo convite gerado — o anterior foi invalidado.");
        refresh();
      } else toast.error(res.data?.error || "Erro ao reenviar.");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao reenviar.");
    } finally { setBusyId(null); }
  };

  if (isLoading) return <p className="text-sm text-gray-400 py-4 text-center">Carregando histórico...</p>;
  if (invites.length === 0) return <p className="text-sm text-gray-400 py-4 text-center">Nenhum convite gerado para este registro.</p>;

  return (
    <div className="space-y-2">
      {newLink && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
          <p className="text-xs font-semibold text-green-800">Novo link (exibido somente agora — uso único):</p>
          <p className="text-xs font-mono text-green-900 break-all">{newLink.activation_url}</p>
          <Button size="sm" variant="outline" className="gap-1 mt-1" onClick={async () => {
            await navigator.clipboard.writeText(newLink.activation_url);
            toast.success("Link copiado.");
          }}>
            <Copy className="w-3 h-3" /> Copiar
          </Button>
        </div>
      )}
      {invites.map(i => (
        <div key={i.id} className="border rounded-lg p-3 flex items-center justify-between gap-2 text-sm">
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{i.recipient_email}</p>
            <p className="text-xs text-gray-500">
              Canal {i.channel} • Criado {new Date(i.created_date).toLocaleString("pt-BR")}
              {i.sent_at && ` • Enviado ${new Date(i.sent_at).toLocaleString("pt-BR")}`}
              {i.used_at && ` • Usado ${new Date(i.used_at).toLocaleString("pt-BR")}`}
            </p>
            <p className="text-xs text-gray-400">Expira {new Date(i.expires_at).toLocaleString("pt-BR")}{i.last_error ? ` • ${i.last_error}` : ""}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge className={STATUS_STYLE[i.status] || "bg-gray-100 text-gray-600"}>{STATUS_LABEL[i.status] || i.status}</Badge>
            {["Pending", "Sent"].includes(i.status) && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600" disabled={busyId === i.id} onClick={() => revoke(i.id)} title="Revogar">
                <Ban className="w-3.5 h-3.5" />
              </Button>
            )}
            {["Pending", "Sent", "Expired", "Revoked", "Failed"].includes(i.status) && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-600" disabled={busyId === i.id} onClick={() => resend(i.id)} title="Reenviar (novo token)">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}