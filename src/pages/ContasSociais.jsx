import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Instagram, Facebook, Linkedin, Youtube, Globe, Plus, Edit, Trash2, Wifi, WifiOff, Bot, Send, Webhook, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import EnvioMassaWhatsApp from "@/components/social/EnvioMassaWhatsApp";
import WebhookConfigInstrucoes from "@/components/social/WebhookConfigInstrucoes";
import CaixaEntrada from "@/pages/CaixaEntrada";

const PLATFORM_OPTIONS = ["Instagram", "Facebook", "WhatsApp Business", "LinkedIn", "TikTok", "YouTube"];

const PLATFORM_ICONS = {
  "Instagram": <Instagram className="w-5 h-5 text-pink-500" />,
  "Facebook": <Facebook className="w-5 h-5 text-blue-600" />,
  "WhatsApp Business": <Globe className="w-5 h-5 text-green-500" />,
  "LinkedIn": <Linkedin className="w-5 h-5 text-blue-700" />,
  "TikTok": <Globe className="w-5 h-5 text-gray-800" />,
  "YouTube": <Youtube className="w-5 h-5 text-red-600" />,
};

const STATUS_COLORS = {
  "Ativa": "bg-green-100 text-green-800",
  "Inativa": "bg-gray-100 text-gray-600",
  "Pendente Conexão": "bg-yellow-100 text-yellow-800",
  "Erro de Conexão": "bg-red-100 text-red-800",
};

const EMPTY_FORM = {
  name: "", username: "", platform: "Instagram", account_number: 1,
  purpose: "", status: "Pendente Conexão", is_primary: false,
  auto_reply_enabled: true, notes: "", external_account_id: "",
};

export default function ContasSociais() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["socialAccounts"],
    queryFn: () => base44.entities.SocialAccount.list("-created_date", 100),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingAccount
      ? base44.entities.SocialAccount.update(editingAccount.id, data)
      : base44.entities.SocialAccount.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["socialAccounts"] });
      toast.success(editingAccount ? "Conta atualizada!" : "Conta cadastrada!");
      setModalOpen(false);
      setEditingAccount(null);
      setForm(EMPTY_FORM);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SocialAccount.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["socialAccounts"] });
      toast.success("Conta removida.");
    },
  });

  const openCreate = () => {
    setEditingAccount(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (account) => {
    setEditingAccount(account);
    setForm({ ...EMPTY_FORM, ...account });
    setModalOpen(true);
  };

  // Agrupar por plataforma
  const grouped = PLATFORM_OPTIONS.reduce((acc, platform) => {
    acc[platform] = accounts.filter(a => a.platform === platform);
    return acc;
  }, {});

  const activeCount = accounts.filter(a => a.status === "Ativa").length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Instagram className="w-7 h-7 text-pink-500" />
            Contas Sociais
          </h1>
          <p className="text-sm text-gray-500 mt-1">{accounts.length} contas cadastradas · {activeCount} ativas</p>
        </div>
        <Button onClick={openCreate} className="bg-pink-600 hover:bg-pink-700 gap-2">
          <Plus className="w-4 h-4" /> Nova Conta
        </Button>
      </div>

      {/* Cards de info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total de Contas", value: accounts.length },
          { label: "Ativas", value: activeCount },
          { label: "Pendentes", value: accounts.filter(a => a.status === "Pendente Conexão").length },
          { label: "Com IA ativa", value: accounts.filter(a => a.auto_reply_enabled).length },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Abas */}
      <Tabs defaultValue="contas">
        <TabsList>
          <TabsTrigger value="contas" className="flex items-center gap-2">
            <Instagram className="w-4 h-4" /> Contas Cadastradas
          </TabsTrigger>
          <TabsTrigger value="envio" className="flex items-center gap-2">
            <Send className="w-4 h-4" /> Envio em Massa (WhatsApp)
          </TabsTrigger>
          <TabsTrigger value="webhook" className="flex items-center gap-2">
            <Webhook className="w-4 h-4" /> Receber Mensagens (Webhook)
          </TabsTrigger>
          <TabsTrigger value="caixa" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Caixa de Entrada
          </TabsTrigger>
        </TabsList>

        {/* Aba Contas */}
        <TabsContent value="contas" className="mt-4">
          {isLoading ? (
            <div className="text-center py-12 text-gray-400">Carregando...</div>
          ) : (
            <div className="space-y-6">
              {PLATFORM_OPTIONS.map(platform => {
                const platformAccounts = grouped[platform] || [];
                if (platformAccounts.length === 0) return null;
                return (
                  <div key={platform}>
                    <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                      {PLATFORM_ICONS[platform]}
                      {platform}
                      <span className="text-gray-400 font-normal">({platformAccounts.length}/3)</span>
                    </h2>
                    <div className="grid md:grid-cols-3 gap-3">
                      {platformAccounts.map(account => (
                        <Card key={account.id} className="hover:shadow-sm transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {PLATFORM_ICONS[account.platform]}
                                <div>
                                  <p className="font-semibold text-sm text-gray-900">{account.name}</p>
                                  <p className="text-xs text-gray-500">{account.username || "sem username"}</p>
                                </div>
                              </div>
                              <Badge className={`text-xs ${STATUS_COLORS[account.status] || "bg-gray-100"}`}>
                                {account.status === "Ativa" ? <Wifi className="w-2.5 h-2.5 inline mr-1" /> : <WifiOff className="w-2.5 h-2.5 inline mr-1" />}
                                {account.status}
                              </Badge>
                            </div>

                            {account.purpose && (
                              <p className="text-xs text-gray-500 mb-2 bg-gray-50 rounded px-2 py-1">{account.purpose}</p>
                            )}

                            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                              <span className="flex items-center gap-1">
                                <Bot className="w-3 h-3" />
                                IA: {account.auto_reply_enabled ? "Ativada" : "Desativada"}
                              </span>
                              {account.is_primary && <Badge variant="outline" className="text-xs">Principal</Badge>}
                              <span>Conta #{account.account_number}</span>
                            </div>

                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="flex-1 text-xs gap-1" onClick={() => openEdit(account)}>
                                <Edit className="w-3 h-3" /> Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => { if (confirm("Remover conta?")) deleteMutation.mutate(account.id); }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}

              {accounts.length === 0 && (
                <Card className="border-2 border-dashed border-gray-200">
                  <CardContent className="p-12 text-center">
                    <Instagram className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">Nenhuma conta cadastrada</p>
                    <p className="text-gray-400 text-sm mt-1">Cadastre suas contas sociais para organizar o atendimento</p>
                    <Button onClick={openCreate} className="mt-4 bg-pink-600 hover:bg-pink-700">Cadastrar Primeira Conta</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Aba Envio em Massa */}
        <TabsContent value="envio" className="mt-4">
          <EnvioMassaWhatsApp />
        </TabsContent>

        {/* Aba Webhook */}
        <TabsContent value="webhook" className="mt-4">
          <WebhookConfigInstrucoes />
        </TabsContent>

        {/* Aba Caixa de Entrada */}
        <TabsContent value="caixa" className="mt-0 -mx-6">
          <CaixaEntrada />
        </TabsContent>
      </Tabs>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Editar Conta Social" : "Nova Conta Social"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label>Nome Amigável *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: CAT Cursos Oficial" />
              </div>
              <div className="space-y-1">
                <Label>Plataforma *</Label>
                <Select value={form.platform} onValueChange={v => setForm({...form, platform: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Nº da Conta (1, 2 ou 3)</Label>
                <Select value={String(form.account_number)} onValueChange={v => setForm({...form, account_number: Number(v)})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Conta 1</SelectItem>
                    <SelectItem value="2">Conta 2</SelectItem>
                    <SelectItem value="3">Conta 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Username / Handle</Label>
                <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="@catcursos_oficial" />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativa">Ativa</SelectItem>
                    <SelectItem value="Inativa">Inativa</SelectItem>
                    <SelectItem value="Pendente Conexão">Pendente Conexão</SelectItem>
                    <SelectItem value="Erro de Conexão">Erro de Conexão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Finalidade / Foco</Label>
                <Input value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} placeholder="Ex: Cursos NR, Atendimento Geral, Promoções" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notas sobre esta conta..." rows={2} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={!!form.auto_reply_enabled} onCheckedChange={v => setForm({...form, auto_reply_enabled: v})} />
                <Label>IA responde automaticamente</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={!!form.is_primary} onCheckedChange={v => setForm({...form, is_primary: v})} />
                <Label>Conta Principal</Label>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button
                className="bg-pink-600 hover:bg-pink-700"
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending || !form.name}
              >
                {saveMutation.isPending ? "Salvando..." : editingAccount ? "Atualizar" : "Cadastrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}