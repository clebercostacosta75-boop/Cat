import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Clock, Send, RefreshCw, Mail, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const STATUS = {
  SENT: "sent",
  FAILED: "failed",
  PENDING: "pending",
  SENDING: "sending",
};

function statusIcon(s) {
  if (s === STATUS.SENT) return <CheckCircle className="w-4 h-4 text-green-600" />;
  if (s === STATUS.FAILED) return <XCircle className="w-4 h-4 text-red-500" />;
  if (s === STATUS.SENDING) return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
  return <Clock className="w-4 h-4 text-orange-400" />;
}

function statusBadge(s) {
  if (s === STATUS.SENT) return <Badge className="bg-green-100 text-green-800">Enviado</Badge>;
  if (s === STATUS.FAILED) return <Badge className="bg-red-100 text-red-800">Falhou</Badge>;
  if (s === STATUS.SENDING) return <Badge className="bg-blue-100 text-blue-800">Enviando…</Badge>;
  return <Badge className="bg-orange-100 text-orange-800">Pendente</Badge>;
}

export default function EmailDeliveryPanel({ profiles, onRefresh }) {
  const [deliveryMap, setDeliveryMap] = useState({});
  const [sendingAll, setSendingAll] = useState(false);

  // Deriva status de cada perfil com base nos dados salvos + estado local de envio
  const rows = profiles.map((p) => {
    const local = deliveryMap[p.id];
    let status;
    if (local) {
      status = local.status;
    } else if (p.credentials_sent_at) {
      status = STATUS.SENT;
    } else {
      status = STATUS.PENDING;
    }
    return { ...p, deliveryStatus: status, sentAt: local?.sentAt || p.credentials_sent_at, error: local?.error };
  });

  const pendingCount = rows.filter((r) => r.deliveryStatus === STATUS.PENDING).length;
  const sentCount = rows.filter((r) => r.deliveryStatus === STATUS.SENT).length;
  const failedCount = rows.filter((r) => r.deliveryStatus === STATUS.FAILED).length;

  const sendInvite = async (profile) => {
    setDeliveryMap((prev) => ({ ...prev, [profile.id]: { status: STATUS.SENDING } }));
    try {
      const res = await base44.functions.invoke("convidarUsuario", {
        email: profile.user_email,
        role: "user",
      });
      const ok = res.data?.success || res.data?.already_exists;
      const sentAt = new Date().toISOString();
      if (ok) {
        // Persiste no UserProfile
        await base44.entities.UserProfile.update(profile.id, {
          credentials_sent_at: sentAt,
          credentials_sent_via: "email",
          credentials_sent_by: "sistema",
        });
        setDeliveryMap((prev) => ({ ...prev, [profile.id]: { status: STATUS.SENT, sentAt } }));
        toast.success(`Convite enviado para ${profile.user_email}`);
      } else {
        const errMsg = res.data?.message || "Falha no envio";
        setDeliveryMap((prev) => ({ ...prev, [profile.id]: { status: STATUS.FAILED, error: errMsg } }));
        toast.error(`${profile.user_email}: ${errMsg}`);
      }
    } catch (e) {
      setDeliveryMap((prev) => ({ ...prev, [profile.id]: { status: STATUS.FAILED, error: e.message } }));
      toast.error(`Erro ao enviar para ${profile.user_email}`);
    }
    onRefresh?.();
  };

  const sendAllPending = async () => {
    const pending = rows.filter((r) => r.deliveryStatus === STATUS.PENDING);
    if (!pending.length) return;
    setSendingAll(true);
    for (const p of pending) {
      await sendInvite(p);
    }
    setSendingAll(false);
  };

  return (
    <Card className="mb-6 border border-gray-200">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-gray-600" />
            <CardTitle className="text-base font-semibold text-gray-800">
              Status de Entrega — E-mails de Acesso
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Button size="sm" variant="outline" onClick={sendAllPending} disabled={sendingAll}>
                <Send className="w-3 h-3 mr-1" />
                {sendingAll ? "Enviando…" : `Enviar ${pendingCount} pendente(s)`}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onRefresh}>
              <RefreshCw className="w-3 h-3 mr-1" /> Atualizar
            </Button>
          </div>
        </div>

        {/* Resumo */}
        <div className="flex gap-4 mt-3 text-sm">
          <span className="flex items-center gap-1 text-green-700">
            <CheckCircle className="w-4 h-4" /> {sentCount} enviado(s)
          </span>
          <span className="flex items-center gap-1 text-orange-600">
            <Clock className="w-4 h-4" /> {pendingCount} pendente(s)
          </span>
          {failedCount > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="w-4 h-4" /> {failedCount} falhou
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 p-4">Nenhum usuário cadastrado.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3 min-w-0">
                  {statusIcon(row.deliveryStatus)}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{row.user_name || "—"}</p>
                    <p className="text-xs text-gray-500 truncate">{row.user_email}</p>
                    {row.sentAt && (
                      <p className="text-xs text-gray-400">
                        Último envio: {format(new Date(row.sentAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                    {row.error && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3" /> {row.error}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {statusBadge(row.deliveryStatus)}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => sendInvite(row)}
                    disabled={row.deliveryStatus === STATUS.SENDING}
                    title="Reenviar convite"
                  >
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}