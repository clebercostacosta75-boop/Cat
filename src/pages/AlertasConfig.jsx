import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Save, RefreshCw, Info, Mail, Building2, User, CheckCircle, Power } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_CONFIGS = [
  {
    dias_antecedencia: 30,
    ativo: true,
    assunto_aluno: "⚠️ Seu certificado de {nome_treinamento} vence em 30 dias",
    mensagem_aluno: `Olá, {nome_aluno}!

Seu certificado do treinamento {nome_treinamento} vencerá em {dias_restantes} dias, no dia {data_vencimento}.

Para manter sua conformidade com as normas de segurança do trabalho, é necessário renovar o treinamento antes do vencimento.

Entre em contato com seu RH ou com a CAT Cursos para agendar a renovação.

Empresa: {empresa}

Atenciosamente,
CAT Cursos — Capacitação Profissional`,
    assunto_empresa: "⚠️ Certificado de colaborador vencendo em 30 dias — {nome_treinamento}",
    mensagem_empresa: `Prezado(a) Gestor(a) de {empresa},

Informamos que o certificado do(a) colaborador(a) {nome_aluno} referente ao treinamento {nome_treinamento} vencerá em {dias_restantes} dias, no dia {data_vencimento}.

A renovação do treinamento é necessária para manter a conformidade com as Normas Regulamentadoras vigentes.

Entre em contato conosco para agendar o treinamento de renovação.

Atenciosamente,
CAT Cursos — Capacitação Profissional`,
  },
  {
    dias_antecedencia: 15,
    ativo: true,
    assunto_aluno: "🔔 Urgente: certificado de {nome_treinamento} vence em 15 dias",
    mensagem_aluno: `Atenção, {nome_aluno}!

Seu certificado do treinamento {nome_treinamento} vencerá em apenas {dias_restantes} dias, no dia {data_vencimento}.

É necessário providenciar a renovação urgentemente para manter sua conformidade.

Entre em contato com seu RH ou com a CAT Cursos imediatamente.

Empresa: {empresa}

Atenciosamente,
CAT Cursos — Capacitação Profissional`,
    assunto_empresa: "🔔 Urgente: certificado de colaborador vence em 15 dias — {nome_treinamento}",
    mensagem_empresa: `ATENÇÃO — {empresa},

O certificado do(a) colaborador(a) {nome_aluno} referente ao treinamento {nome_treinamento} vencerá em apenas {dias_restantes} dias, no dia {data_vencimento}.

Providencie a renovação urgentemente para evitar irregularidades com as Normas Regulamentadoras.

Entre em contato conosco o quanto antes.

Atenciosamente,
CAT Cursos — Capacitação Profissional`,
  },
  {
    dias_antecedencia: 5,
    ativo: true,
    assunto_aluno: "🚨 CRÍTICO: certificado de {nome_treinamento} vence em 5 dias",
    mensagem_aluno: `URGENTE — {nome_aluno},

Seu certificado do treinamento {nome_treinamento} vence em apenas {dias_restantes} dias, no dia {data_vencimento}.

Você está em risco de irregularidade. Entre em contato com seu RH ou com a CAT Cursos IMEDIATAMENTE para regularizar sua situação.

Empresa: {empresa}

Atenciosamente,
CAT Cursos — Capacitação Profissional`,
    assunto_empresa: "🚨 CRÍTICO: certificado de colaborador vence em 5 dias — {nome_treinamento}",
    mensagem_empresa: `CRÍTICO — {empresa},

O certificado do(a) colaborador(a) {nome_aluno} referente ao treinamento {nome_treinamento} vence em apenas {dias_restantes} dias, no dia {data_vencimento}.

Esta situação requer ação IMEDIATA para evitar irregularidades graves com as Normas Regulamentadoras.

Entre em contato com a CAT Cursos urgentemente.

Atenciosamente,
CAT Cursos — Capacitação Profissional`,
  },
];

const URGENCY = {
  30: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", label: "30 dias" },
  15: { color: "bg-orange-100 text-orange-800 border-orange-300", label: "15 dias" },
  5:  { color: "bg-red-100 text-red-800 border-red-300", label: "5 dias" },
};

function ConfigCard({ config, onSave, onToggle, saving }) {
  const [form, setForm] = useState(config);
  const u = URGENCY[config.dias_antecedencia] || URGENCY[30];
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { setForm(config); }, [config.id]);

  return (
    <Card className={`border-2 ${form.ativo ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-500" />
            Alerta de
            <Badge className={u.color}>{u.label} antes do vencimento</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggle(form)}
              className={form.ativo ? "text-green-700 border-green-300" : "text-gray-500"}
            >
              <Power className="w-3 h-3 mr-1" />
              {form.ativo ? "Ativo" : "Inativo"}
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => onSave(form)}
              disabled={saving}
            >
              {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
              Salvar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Aluno */}
        <div className="space-y-2 border rounded-lg p-3 bg-blue-50">
          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider flex items-center gap-1">
            <User className="w-3 h-3" /> E-mail para o Aluno
          </p>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Assunto</Label>
            <Input
              value={form.assunto_aluno || ""}
              onChange={e => set("assunto_aluno", e.target.value)}
              className="text-sm"
              placeholder="Assunto do e-mail"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Mensagem</Label>
            <textarea
              value={form.mensagem_aluno || ""}
              onChange={e => set("mensagem_aluno", e.target.value)}
              rows={6}
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background resize-y"
              placeholder="Corpo do e-mail para o aluno..."
            />
          </div>
        </div>

        {/* Empresa */}
        <div className="space-y-2 border rounded-lg p-3 bg-emerald-50">
          <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <Building2 className="w-3 h-3" /> E-mail para a Empresa
          </p>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Assunto</Label>
            <Input
              value={form.assunto_empresa || ""}
              onChange={e => set("assunto_empresa", e.target.value)}
              className="text-sm"
              placeholder="Assunto do e-mail"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Mensagem</Label>
            <textarea
              value={form.mensagem_empresa || ""}
              onChange={e => set("mensagem_empresa", e.target.value)}
              rows={6}
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background resize-y"
            />
          </div>
        </div>

        {/* Variáveis disponíveis */}
        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 flex flex-wrap gap-2">
          <span className="font-medium text-gray-700">Variáveis disponíveis:</span>
          {["{nome_aluno}", "{nome_treinamento}", "{data_vencimento}", "{empresa}", "{dias_restantes}"].map(v => (
            <code key={v} className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">{v}</code>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AlertasConfig() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [testLoading, setTestLoading] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["configuracaoAlertas"],
    queryFn: () => base44.entities.ConfiguracaoAlertas.list("dias_antecedencia", 10),
  });

  const saveMutation = useMutation({
    mutationFn: (form) =>
      form.id
        ? base44.entities.ConfiguracaoAlertas.update(form.id, form)
        : base44.entities.ConfiguracaoAlertas.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuracaoAlertas"] });
      toast.success("Configuração salva!");
    },
    onError: () => toast.error("Erro ao salvar."),
  });

  const toggleMutation = useMutation({
    mutationFn: (form) =>
      base44.entities.ConfiguracaoAlertas.update(form.id, { ativo: !form.ativo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuracaoAlertas"] });
      toast.success("Status atualizado!");
    },
  });

  const handleInitDefaults = async () => {
    for (const def of DEFAULT_CONFIGS) {
      const existing = configs.find(c => c.dias_antecedencia === def.dias_antecedencia);
      if (!existing) {
        await base44.entities.ConfiguracaoAlertas.create(def);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["configuracaoAlertas"] });
    toast.success("Configurações padrão criadas!");
  };

  const handleTestSend = async (days) => {
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

  // Merge: pra cada período padrão, usa o salvo ou o default
  const mergedConfigs = DEFAULT_CONFIGS.map(def => {
    const saved = configs.find(c => c.dias_antecedencia === def.dias_antecedencia);
    return saved ? saved : def;
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-orange-500" />
            Configuração de Alertas Automáticos
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Defina as mensagens enviadas automaticamente por e-mail quando certificados estiverem prestes a vencer.
          </p>
        </div>
        {configs.length === 0 && (
          <Button onClick={handleInitDefaults} className="bg-emerald-600 hover:bg-emerald-700">
            Criar Configurações Padrão
          </Button>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
        <div>
          <p className="font-semibold mb-1">Como funciona:</p>
          <p>O sistema verifica automaticamente todos os dias e envia e-mails nos marcos de <strong>30 dias</strong>, <strong>15 dias</strong> e <strong>5 dias</strong> antes do vencimento. Os e-mails são enviados para o aluno (se houver e-mail cadastrado no certificado) e para a empresa responsável (e-mail de faturamento ou contato cadastrado).</p>
        </div>
      </div>

      {/* Botões de teste */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-gray-500 self-center">Testar envio agora:</span>
        {[30, 15, 5].map(d => (
          <Button
            key={d}
            variant="outline"
            size="sm"
            onClick={() => handleTestSend(d)}
            disabled={testLoading !== null}
            className="gap-1"
          >
            {testLoading === d ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
            Testar {d} dias
          </Button>
        ))}
      </div>

      {/* Cards de configuração */}
      <div className="space-y-6">
        {mergedConfigs.map(config => (
          <ConfigCard
            key={config.dias_antecedencia}
            config={config}
            onSave={(form) => saveMutation.mutate(form)}
            onToggle={(form) => toggleMutation.mutate(form)}
            saving={saveMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}