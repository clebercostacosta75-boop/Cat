import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, MessageCircle, Send, CheckCircle2, XCircle, Loader2, Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function NotificationCenter() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [notificationType, setNotificationType] = useState("all");
  const [recipients, setRecipients] = useState("all");

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => base44.entities.ClassSchedule.list('-created_date'),
    initialData: [],
  });

  const handleSendNotification = async () => {
    if (!selectedSchedule) {
      alert('Selecione um treinamento primeiro');
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const response = await base44.functions.invoke('enviarNotificacoes', {
        schedule_id: selectedSchedule,
        notification_type: notificationType,
        recipients: recipients
      });

      setResult({
        success: true,
        data: response.data
      });
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setSending(false);
    }
  };

  const handleTestAdminNotification = async () => {
    setSending(true);
    setResult(null);

    try {
      const response = await base44.functions.invoke('notificarAdmins', {
        action: 'created',
        entity_type: 'ClassSchedule',
        entity_id: 'test-123',
        entity_name: 'Treinamento de Teste',
        details: 'Este é um teste de notificação automática para administradores'
      });

      setResult({
        success: true,
        data: response.data
      });
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
          <div className="flex-shrink-0">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Bell className="w-10 h-10 text-white" />
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-stone-900">Central de Notificações</h1>
            <p className="text-stone-600 mt-1">Envie e-mails, WhatsApp e SMS automaticamente</p>
          </div>
        </div>

        {/* Alert de Resultado */}
        {result && (
          <Alert className={result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
            {result.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription>
              {result.success ? (
                <div>
                  <p className="font-semibold text-green-900 mb-2">✅ Notificações Enviadas com Sucesso!</p>
                  {result.data?.results && (
                    <div className="text-sm space-y-1">
                      {result.data.results.email?.sent && (
                        <p>📧 E-mail: {result.data.results.email.recipients.join(', ')}</p>
                      )}
                      {result.data.results.whatsapp?.sent && (
                        <p>💬 WhatsApp: {result.data.results.whatsapp.recipients.join(', ')}</p>
                      )}
                      {result.data.results.sms?.sent && (
                        <p>📱 SMS: {result.data.results.sms.recipients.join(', ')}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="font-semibold text-red-900">❌ Erro: {result.error}</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="send" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="send">
              <Send className="w-4 h-4 mr-2" />
              Enviar Notificações
            </TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* TAB: Enviar Notificações */}
          <TabsContent value="send" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-purple-600" />
                  Enviar Notificações de Treinamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Selecione o Treinamento</Label>
                  <Select value={selectedSchedule} onValueChange={setSelectedSchedule}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um treinamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {schedules.map((schedule) => (
                        <SelectItem key={schedule.id} value={schedule.id}>
                          {schedule.training_name} - {schedule.company_name} ({schedule.start_date})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Notificação</Label>
                    <Select value={notificationType} onValueChange={setNotificationType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center gap-2">
                            <Send className="w-4 h-4" />
                            Todos (E-mail + WhatsApp + SMS)
                          </div>
                        </SelectItem>
                        <SelectItem value="email">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Apenas E-mail
                          </div>
                        </SelectItem>
                        <SelectItem value="whatsapp">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            Apenas WhatsApp
                          </div>
                        </SelectItem>
                        <SelectItem value="sms">
                          <div className="flex items-center gap-2">
                            📱 Apenas SMS
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Destinatários</Label>
                    <Select value={recipients} onValueChange={setRecipients}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos (Instrutor + Empresa + Admins)</SelectItem>
                        <SelectItem value="instructor">Apenas Instrutor</SelectItem>
                        <SelectItem value="company">Apenas Empresa</SelectItem>
                        <SelectItem value="admins">Apenas Administradores</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleSendNotification}
                  disabled={sending || !selectedSchedule}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  size="lg"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Enviar Notificações
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange-600" />
                  Testar Notificação para Administradores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Esta função envia uma notificação de teste via WhatsApp para todos os administradores cadastrados.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleTestAdminNotification}
                  disabled={sending}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Bell className="w-5 h-5 mr-2" />
                      Enviar Notificação de Teste
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Configurações */}
          <TabsContent value="config" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  Status das Configurações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription>
                    <p className="font-semibold text-blue-900 mb-2">📋 Credenciais Necessárias (Twilio)</p>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>Para ativar WhatsApp e SMS, configure os seguintes segredos no painel Base44:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li><code className="bg-blue-100 px-2 py-1 rounded">TWILIO_ACCOUNT_SID</code></li>
                        <li><code className="bg-blue-100 px-2 py-1 rounded">TWILIO_AUTH_TOKEN</code></li>
                        <li><code className="bg-blue-100 px-2 py-1 rounded">TWILIO_WHATSAPP_NUMBER</code></li>
                        <li><code className="bg-blue-100 px-2 py-1 rounded">TWILIO_SMS_NUMBER</code></li>
                        <li><code className="bg-blue-100 px-2 py-1 rounded">ADMIN_WHATSAPP_NUMBERS</code></li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-900">E-mail</p>
                          <p className="text-sm text-green-700">Sempre Disponível</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Settings className="w-8 h-8 text-yellow-600" />
                        <div>
                          <p className="font-semibold text-yellow-900">WhatsApp & SMS</p>
                          <p className="text-sm text-yellow-700">Requer Configuração</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-purple-200">
                  <CardHeader>
                    <CardTitle className="text-base">Como Configurar Twilio</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Badge>1</Badge>
                      <p>Acesse <a href="https://console.twilio.com/" target="_blank" className="text-purple-600 underline">console.twilio.com</a> e crie uma conta</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge>2</Badge>
                      <p>Obtenha o <strong>Account SID</strong> e <strong>Auth Token</strong></p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge>3</Badge>
                      <p>Configure um número WhatsApp Business API</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge>4</Badge>
                      <p>Configure um número para SMS</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge>5</Badge>
                      <p>Adicione as credenciais como segredos no Base44</p>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Cards Informativos */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-blue-900">E-mail</p>
                  <p className="text-xs text-blue-600">Sempre ativo</p>
                </div>
              </div>
              <p className="text-sm text-stone-600">Envia notificações formatadas para instrutores e empresas</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-900">WhatsApp</p>
                  <p className="text-xs text-green-600">Requer Twilio</p>
                </div>
              </div>
              <p className="text-sm text-stone-600">Notificações instantâneas via WhatsApp Business</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-violet-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Bell className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-purple-900">SMS</p>
                  <p className="text-xs text-purple-600">Requer Twilio</p>
                </div>
              </div>
              <p className="text-sm text-stone-600">Mensagens de texto diretas para celulares</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}