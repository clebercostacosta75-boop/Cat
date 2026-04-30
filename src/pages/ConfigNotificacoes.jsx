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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Mail, MessageSquare, Lock, CheckCircle, XCircle, Info, Bell, Power, RefreshCw, User, Building2 } from "lucide-react";
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

// ─── Configurações de Alertas (de AlertasConfig) ─────────────────────────────

const DEFAULT_ALERT_CONFIGS = [
  {
    dias_antecedencia: 30,
    ativo: true,
    assunto_aluno: "⚠️ Seu certificado de {nome_treinamento} vence em 30 dias",
    mensagem_aluno: `Olá, {nome_aluno}!\n\nSeu certificado do treinamento {nome_treinamento} vencerá em {dias_restantes} dias, no dia {data_vencimento}.\n\nPara manter sua conformidade, é necessário renovar o treinamento antes do vencimento.\n\nEmpresa: {empresa}\n\nAtenciosamente,\nCAT Cursos`,
    assunto_empresa: "⚠️ Certificado de colaborador vencendo em 30 dias — {nome_treinamento}",
    mensagem_empresa: `Prezado(a) Gestor(a) de {empresa},\n\nInformamos que o certificado do(a) colaborador(a) {nome_aluno} referente ao treinamento {nome_treinamento} vencerá em {dias_restantes} dias, no dia {data_vencimento}.\n\nAtenciosamente,\nCAT Cursos`,
  },
  {
    dias_antecedencia: 15,
    ativo: true,
    assunto_aluno: "🔔 Urgente: certificado de {nome_treinamento} vence em 15 dias",
    mensagem_aluno: `Atenção, {nome_aluno}!\n\nSeu certificado vencerá em apenas {dias_restantes} dias, no dia {data_vencimento}.\n\nEmpresa: {empresa}\n\nAtenciosamente,\nCAT Cursos`,
    assunto_empresa: "🔔 Urgente: certificado de colaborador vence em 15 dias — {nome_treinamento}",
    mensagem_empresa: `ATENÇÃO — {empresa},\n\nO certificado do(a) {nome_aluno} referente a {nome_treinamento} vencerá em {dias_restantes} dias ({data_vencimento}).\n\nAtenciosamente,\nCAT Cursos`,
  },
  {
    dias_antecedencia: 5,
    ativo: true,
    assunto_aluno: "🚨 CRÍTICO: certificado de {nome_treinamento} vence em 5 dias",
    mensagem_aluno: `URGENTE — {nome_aluno},\n\nSeu certificado vence em apenas {dias_restantes} dias ({data_vencimento}).\n\nEmpresa: {empresa}\n\nAtenciosamente,\nCAT Cursos`,
    assunto_empresa: "🚨 CRÍTICO: certificado de colaborador vence em 5 dias — {nome_treinamento}",
    mensagem_empresa: `CRÍTICO — {empresa},\n\nO certificado do(a) {nome_aluno} referente a {nome_treinamento} vence em {dias_restantes} dias ({data_vencimento}).\n\nAtenciosamente,\nCAT Cursos`,
  },
];

const URGENCY = {
  30: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", label: "30 dias" },
  15: { color: "bg-orange-100 text-orange-800 border-orange-300", label: "15 dias" },
  5:  { color: "bg-red-100 text-red-800 border-red-300", label: "5 dias" },
};

function AlertConfigCard({ config, onSave, onToggle, saving, testLoading, onTest }) {
  const [form, setForm] = useState(config);
  const u = URGENCY[config.dias_antecedencia] || URGENCY[30];
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  useEffect(() => { setForm(config); }, [config.id, config.dias_antecedencia]);

  return (
    <Card className={`border-2 ${form.ativo ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-500" />
            Alerta de <Badge className={u.color}>{u.label} antes do vencimento</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onTest(config.dias_antecedencia)} disabled={testLoading !== null} className="gap-1">
              {testLoading === config.dias_antecedencia ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
              Testar
            </Button>
            <Button variant="outline" size="sm" onClick={() => onToggle(form)} className={form.ativo ? "text-green-700 border-green-300" : "text-gray-500"}>
              <Power className="w-3 h-3 mr-1" />{form.ativo ? "Ativo" : "Inativo"}
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => onSave(form)} disabled={saving}>
              {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}Salvar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 border rounded-lg p-3 bg-blue-50">
          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider flex items-center gap-1">
            <User className="w-3 h-3" /> E-mail para o Aluno
          </p>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Assunto</Label>
            <Input value={form.assunto_aluno || ""} onChange={e => set("assunto_aluno", e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Mensagem</Label>
            <textarea value={form.mensagem_aluno || ""} onChange={e => set("mensagem_aluno", e.target.value)} rows={5}
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background resize-y" />
          </div>
        </div>
        <div className="space-y-2 border rounded-lg p-3 bg-emerald-50">
          <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <Building2 className="w-3 h-3" /> E-mail para a Empresa
          </p>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Assunto</Label>
            <Input value={form.assunto_empresa || ""} onChange={e => set("assunto_empresa", e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Mensagem</Label>
            <textarea value={form.mensagem_empresa || ""} onChange={e => set("mensagem_empresa", e.target.value)} rows={5}
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background resize-y" />
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 flex flex-wrap gap-2">
          <span className="font-medium text-gray-700">Variáveis:</span>
          {["{nome_aluno}", "{nome_treinamento}", "{data_vencimento}", "{empresa}", "{dias_restantes}"].map(v => (
            <code key={v} className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">{v}</code>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AbaAlertas() {
  const queryClient = useQueryClient();
  const [testLoading, setTestLoading] = useState(null);

  const { data: alertConfigs = [], isLoading } = useQuery({
    queryKey: ["configuracaoAlertas"],
    queryFn: () => base44.entities.ConfiguracaoAlertas.list("dias_antecedencia", 10),
  });

  const saveMutation = useMutation({
    mutationFn: (form) => form.id
      ? base44.entities.ConfiguracaoAlertas.update(form.id, form)
      : base44.entities.ConfiguracaoAlertas.create(form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["configuracaoAlertas"] }); toast.success("Configuração salva!"); },
    onError: () => toast.error("Erro ao salvar."),
  });

  const toggleMutation = useMutation({
    mutationFn: (form) => base44.entities.ConfiguracaoAlertas.update(form.id, { ativo: !form.ativo }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["configuracaoAlertas"] }); toast.success("Status atualizado!"); },
  });

  const handleInitDefaults = async () => {
    for (const def of DEFAULT_ALERT_CONFIGS) {
      const existing = alertConfigs.find(c => c.dias_antecedencia === def.dias_antecedencia);
      if (!existing) await base44.entities.ConfiguracaoAlertas.create(def);
    }
    queryClient.invalidateQueries({ queryKey: ["configuracaoAlertas"] });
    toast.success("Configurações padrão criadas!");
  };

  const handleTest = async (days) => {
    setTestLoading(days);
    try {
      const res = await base44.functions.invoke("enviarAlertasVencimentoEmail", { days });
      toast.success(`Teste enviado: ${res.data?.message || "OK"}`);
    } catch (e) {
      toast.error("Erro no teste: " + e.message);
    } finally {
      setTestLoading(null);
    }
  };

  const mergedConfigs = DEFAULT_ALERT_CONFIGS.map(def => {
    const saved = alertConfigs.find(c => c.dias_antecedencia === def.dias_antecedencia);
    return saved ? saved : def;
  });

  if (isLoading) return <div className="flex items-center justify-center h-40"><div className="w-6 h-6 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
        <div>
          <p className="font-semibold mb-1">Como funciona:</p>
          <p>O sistema verifica automaticamente todos os dias e envia e-mails nos marcos de <strong>30 dias</strong>, <strong>15 dias</strong> e <strong>5 dias</strong> antes do vencimento, para o aluno e para a empresa responsável.</p>
        </div>
      </div>
      {alertConfigs.length === 0 && (
        <Button onClick={handleInitDefaults} className="bg-emerald-600 hover:bg-emerald-700">
          Criar Configurações Padrão
        </Button>
      )}
      <div className="space-y-6">
        {mergedConfigs.map(config => (
          <AlertConfigCard
            key={config.dias_antecedencia}
            config={config}
            onSave={(form) => saveMutation.mutate(form)}
            onToggle={(form) => toggleMutation.mutate(form)}
            saving={saveMutation.isPending}
            testLoading={testLoading}
            onTest={handleTest}
          />
        ))}
      </div>
    </div>
  );
}

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="w-6 h-6 text-orange-500" /> Configurações de Notificações
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie canais, textos e regras de alertas automáticos</p>
      </div>

      <Tabs defaultValue="canais">
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="canais" className="gap-2"><Mail className="w-4 h-4" /> Canais e Templates</TabsTrigger>
          <TabsTrigger value="alertas" className="gap-2"><Bell className="w-4 h-4" /> Regras de Alerta</TabsTrigger>
        </TabsList>

        <TabsContent value="canais" className="mt-5 space-y-5">
          <div className="flex justify-end">
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
                  <Switch checked={form.twilio_ativo} onCheckedChange={(v) => set("twilio_ativo", v)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alertas" className="mt-5">
          <AbaAlertas />
        </TabsContent>
      </Tabs>
    </div>
  );
}