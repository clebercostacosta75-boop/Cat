import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import ConviteLinkActions from "./ConviteLinkActions";
import HistoricoConvitesPortal from "./HistoricoConvitesPortal";

const CHANNELS = [
  { value: "Email", label: "E-mail" },
  { value: "WhatsApp", label: "WhatsApp (envio manual)" },
  { value: "SMS", label: "SMS — Integração não configurada", disabled: true },
  { value: "Manual", label: "Manual (copiar link)" },
];

export default function GerarAcessoPortalModal({ open, onClose, portalType, entityId, name, email, phone }) {
  const [form, setForm] = useState({
    recipient_email: email || "",
    recipient_phone: phone || "",
    channel: "Manual",
    validity_hours: 24,
  });
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);

  const preview = `Olá, ${name || ""}! Você recebeu um convite de acesso ao Portal ${portalType} da CAT Cursos e Treinamentos. Ative seu acesso pelo link seguro (uso único, expira em ${form.validity_hours}h): [LINK GERADO NA CRIAÇÃO]`;

  const handleCreate = async () => {
    if (!form.recipient_email) { toast.error("Informe o e-mail do destinatário."); return; }
    setCreating(true);
    try {
      const res = await base44.functions.invoke("createPortalInvite", {
        portal_type: portalType,
        recipient_name: name,
        recipient_email: form.recipient_email,
        recipient_phone: form.recipient_phone,
        linked_entity_id: entityId,
        channel: form.channel,
        validity_hours: Number(form.validity_hours),
        app_url: window.location.origin,
      });
      if (res.data?.success) setCreated(res.data);
      else toast.error(res.data?.error || "Erro ao gerar convite.");
    } catch (err) {
      const data = err?.response?.data;
      if (data?.duplicate) toast.error(data.error + " Veja a aba Histórico.");
      else toast.error(data?.error || "Erro ao gerar convite.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" /> Gerar acesso ao Portal {portalType}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="novo">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="novo">Novo Convite</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="novo" className="mt-4 space-y-4">
            <div className="bg-gray-50 border rounded-lg p-3 text-sm">
              <p className="font-medium text-gray-900">{name}</p>
              <p className="text-xs text-gray-500">Registro vinculado: {entityId}</p>
            </div>

            {created ? (
              <ConviteLinkActions
                invite={created}
                channel={form.channel}
                phone={form.recipient_phone}
                recipientName={name}
                portalType={portalType}
              />
            ) : (
              <>
                <div className="space-y-1">
                  <Label>E-mail do destinatário</Label>
                  <Input type="email" value={form.recipient_email} onChange={e => setForm(f => ({ ...f, recipient_email: e.target.value }))} placeholder="email@exemplo.com" />
                </div>
                <div className="space-y-1">
                  <Label>Telefone/WhatsApp (opcional)</Label>
                  <Input value={form.recipient_phone} onChange={e => setForm(f => ({ ...f, recipient_phone: e.target.value }))} placeholder="(00) 00000-0000" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Canal de envio</Label>
                    <select
                      value={form.channel}
                      onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                    >
                      {CHANNELS.map(c => <option key={c.value} value={c.value} disabled={c.disabled}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Validade</Label>
                    <select
                      value={form.validity_hours}
                      onChange={e => setForm(f => ({ ...f, validity_hours: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                    >
                      <option value={24}>24 horas (padrão)</option>
                      <option value={48}>48 horas</option>
                      <option value={168}>7 dias</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Pré-visualização da mensagem</Label>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 leading-relaxed">{preview}</div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={onClose}>Cancelar</Button>
                  <Button onClick={handleCreate} disabled={creating}>
                    {creating ? "Gerando..." : "Gerar convite seguro"}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            <HistoricoConvitesPortal entityId={entityId} portalType={portalType} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}