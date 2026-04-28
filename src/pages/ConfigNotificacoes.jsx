import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, Mail, MessageSquare, Lock, CheckCircle, XCircle, Info } from "lucide-react";
import { toast } from "sonner";

const DEFAULTS = {
  chave: "global",
  email_ativo: true,
  whatsapp_ativo: false,
  sms_ativo: false,
  twilio_ativo: false,
  email_assunto_padrao: "⚠️ Certificado próximo do vencimento – CAT Cursos",
  email_30dias: "Olá {nome_aluno},\n\nSeu certificado de <b>{curso}</b> na empresa <b>{empresa}</b> vence em <b>30 dias</b> (dia {data_vencimento}).\n\nRecomendamos agendar sua reciclagem com antecedência.\n\nAtenciosamente,\nEquipe CAT Cursos",
  email_15dias: "Olá {nome_aluno},\n\nAtenção! Seu certificado de <b>{curso}</b> vence em apenas <b>15 dias</b> ({data_vencimento}).\n\nAgende sua reciclagem o quanto antes para evitar irregularidades.\n\nAtenciosamente,\nEquipe CAT Cursos",
  email_5dias: "⚠️ URGENTE — {nome_aluno},\n\nSeu certificado de <b>{curso}</b> vence em <b>5 dias</b> ({data_vencimento}).\n\nEntre em contato IMEDIATAMENTE para regularizar sua situação.\n\nEquipe CAT Cursos",
  email_assinatura: "Olá {nome_aluno},\n\nSeu certificado de <b>{curso}</b> está disponível para assinatura digital.\n\nAcesse o link abaixo para assinar:\n{link_assinatura}\n\nAtenciosamente,\nEquipe CAT Cursos",
  whatsapp_30dias: "Olá {nome_aluno}! Seu certificado de {curso} vence em 30 dias ({data_vencimento}). Agende sua reciclagem – CAT Cursos.",
  whatsapp_15dias: "Atenção {nome_aluno}! Certificado de {curso} vence em 15 dias ({data_vencimento}). Contate-nos! – CAT Cursos.",
  whatsapp_5dias: "⚠️ URGENTE {nome_aluno}! Seu certificado de {curso} vence em 5 dias ({data_vencimento}). Ligue agora! – CAT Cursos.",
};

const VARIAVEIS = ["{nome_aluno}", "{empresa}", "{curso}", "{data_vencimento}", "{link_assinatura}", "{dias_restantes}"];

export default function ConfigNotificacoes() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(DEFAULTS);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["config-notificacoes"],
    queryFn: () => base44.entities.ConfigNotificacoes.filter({ chave: "global" }),
  });

  useEffect(() => {
    if (configs[0]) setForm({ ...DEFAULTS, ...configs[0] });
  }, [configs]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (configs[0]?.id) {
        return base44.entities.ConfigNotificacoes.update(configs[0].id, data);
      }
      return base44.entities.ConfigNotificacoes.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["config-notificacoes"]);
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (e) => toast.error("Erro ao salvar: " + e.message),
  });

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  if (isLoading) return <div className="flex items-center justify-center p-20"><div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" /></div>;

  const twilioConfigurado = form.twilio_ativo;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações de Notificações</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie os canais e textos de alertas automáticos</p>
        </div>
        <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="gap-2">
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>

      {/* VARIÁVEIS DISPONÍVEIS */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800 mb-1">Variáveis disponíveis nos textos:</p>
              <div className="flex flex-wrap gap-1.5">
                {VARIAVEIS.map((v) => (
                  <code key={v} className="text-xs bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">{v}</code>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO E-MAIL */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base">Notificações por E-mail</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-gray-600">Ativar e-mails</Label>
              <Switch checked={form.email_ativo} onCheckedChange={(v) => set("email_ativo", v)} />
            </div>
          </div>
          <CardDescription>Configurar assuntos e textos dos e-mails automáticos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Assunto padrão dos e-mails</Label>
            <Input className="mt-1" value={form.email_assunto_padrao} onChange={(e) => set("email_assunto_padrao", e.target.value)} />
          </div>
          {[
            { key: "email_30dias", label: "E-mail — 30 dias antes do vencimento" },
            { key: "email_15dias", label: "E-mail — 15 dias antes do vencimento" },
            { key: "email_5dias", label: "E-mail — 5 dias antes do vencimento" },
            { key: "email_assinatura", label: "E-mail — Solicitação de assinatura digital" },
          ].map(({ key, label }) => (
            <div key={key}>
              <Label className="text-sm font-medium">{label}</Label>
              <Textarea
                className="mt-1 text-sm"
                rows={4}
                value={form[key] || ""}
                onChange={(e) => set(key, e.target.value)}
                disabled={!form.email_ativo}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* SEÇÃO WHATSAPP/SMS */}
      <Card className={!twilioConfigurado ? "opacity-80" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              <CardTitle className="text-base">WhatsApp / SMS</CardTitle>
              {!twilioConfigurado && (
                <Badge variant="outline" className="text-xs gap-1 text-orange-600 border-orange-300 bg-orange-50">
                  <Lock className="w-3 h-3" /> Requer Twilio
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-600">WhatsApp</Label>
                <Switch checked={form.whatsapp_ativo} onCheckedChange={(v) => set("whatsapp_ativo", v)} disabled={!twilioConfigurado} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-600">SMS</Label>
                <Switch checked={form.sms_ativo} onCheckedChange={(v) => set("sms_ativo", v)} disabled={!twilioConfigurado} />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!twilioConfigurado && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-700 flex items-center gap-2">
              <Lock className="w-4 h-4 flex-shrink-0" />
              Para ativar WhatsApp e SMS, configure as credenciais Twilio na seção abaixo e ative o Twilio.
            </div>
          )}
          {[
            { key: "whatsapp_30dias", label: "WhatsApp — 30 dias antes" },
            { key: "whatsapp_15dias", label: "WhatsApp — 15 dias antes" },
            { key: "whatsapp_5dias", label: "WhatsApp — 5 dias antes" },
          ].map(({ key, label }) => (
            <div key={key}>
              <Label className="text-sm font-medium">{label}</Label>
              <Textarea
                className="mt-1 text-sm"
                rows={2}
                value={form[key] || ""}
                onChange={(e) => set(key, e.target.value)}
                disabled={!twilioConfigurado}
                placeholder={!twilioConfigurado ? "Configure o Twilio para editar" : ""}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* STATUS TWILIO */}
      <Card className={twilioConfigurado ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {twilioConfigurado
                ? <CheckCircle className="w-6 h-6 text-green-600" />
                : <XCircle className="w-6 h-6 text-red-500" />
              }
              <div>
                <p className={`font-semibold ${twilioConfigurado ? "text-green-800" : "text-red-700"}`}>
                  {twilioConfigurado ? "🟢 Twilio ativo" : "🔴 Twilio não configurado"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {twilioConfigurado
                    ? "WhatsApp e SMS estão disponíveis para uso."
                    : "Preencha os secrets TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_PHONE_NUMBER no painel Base44."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium">Ativar Twilio</Label>
              <Switch
                checked={form.twilio_ativo}
                onCheckedChange={(v) => set("twilio_ativo", v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}