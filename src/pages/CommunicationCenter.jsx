import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, Mail, Phone, Send, Loader2, 
  CheckCircle, Clock, AlertCircle, Users, Building2
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CommunicationCenter() {
  const queryClient = useQueryClient();
  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [messageType, setMessageType] = useState("whatsapp");
  const [messageContent, setMessageContent] = useState("");
  const [sending, setSending] = useState(false);

  const { data: classSchedules = [] } = useQuery({
    queryKey: ['classSchedules'],
    queryFn: () => base44.entities.ClassSchedule.list(),
    initialData: [],
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    initialData: [],
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => base44.entities.Instructor.list(),
    initialData: [],
  });

  // Filtrar apenas turmas agendadas ou em andamento
  const activeSchedules = classSchedules.filter(s => 
    s.status === 'Agendado' || s.status === 'Em Andamento'
  );

  const selectedScheduleData = classSchedules.find(s => s.id === selectedSchedule);
  const selectedCompany = companies.find(c => c.id === selectedScheduleData?.company_id);
  const selectedInstructor = instructors.find(i => i.id === selectedScheduleData?.instructor_id);

  // Gerar mensagem padrão baseado no cronograma selecionado
  const generateDefaultMessage = () => {
    if (!selectedScheduleData) return "";

    const recipient = selectedRecipient === 'instructor' ? selectedInstructor?.name : selectedCompany?.nome_fantasia;
    
    let message = `📋 *Notificação de Treinamento*\n\n`;
    message += `Curso: *${selectedScheduleData.training_name}*\n`;
    message += `Empresa: ${selectedScheduleData.company_name}\n`;
    message += `Local: ${selectedScheduleData.location || 'A definir'}\n`;
    message += `Data Início: ${new Date(selectedScheduleData.start_date).toLocaleDateString('pt-BR')}\n`;
    
    if (selectedScheduleData.end_date) {
      message += `Data Fim: ${new Date(selectedScheduleData.end_date).toLocaleDateString('pt-BR')}\n`;
    }
    
    message += `Horário: ${selectedScheduleData.training_schedule || 'A definir'}\n`;
    
    if (selectedRecipient === 'instructor') {
      message += `\n👨‍🏫 Olá, ${selectedInstructor?.name}!\n`;
      message += `Você foi designado como instrutor para este treinamento.\n`;
    } else if (selectedRecipient === 'company') {
      message += `\n🏢 Prezado(a),\n`;
      message += `Confirmamos o agendamento do treinamento.\n`;
    }
    
    message += `\nPara mais informações, entre em contato conosco.\n`;
    message += `\nAtenciosamente,\nEquipe CAT Treinamentos`;

    return message;
  };

  const handleSendMessage = async () => {
    if (!selectedSchedule || !selectedRecipient || !messageContent) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSending(true);
    try {
      let recipientData = {};
      
      if (selectedRecipient === 'instructor') {
        if (!selectedInstructor) {
          toast.error('Instrutor não encontrado para esta turma');
          setSending(false);
          return;
        }
        
        recipientData = {
          recipient_id: selectedInstructor.id,
          recipient_name: selectedInstructor.name,
          recipient_phone: selectedInstructor.phone,
          recipient_email: selectedInstructor.email
        };
        
        // Validar WhatsApp para instrutor
        if (messageType === 'whatsapp' && !recipientData.recipient_phone) {
          toast.error('Instrutor não possui telefone cadastrado');
          setSending(false);
          return;
        }
        
        // Validar email para instrutor
        if (messageType === 'email' && !recipientData.recipient_email) {
          toast.error('Instrutor não possui e-mail cadastrado');
          setSending(false);
          return;
        }
      } else if (selectedRecipient === 'company') {
        if (!selectedCompany) {
          toast.error('Empresa não encontrada para esta turma');
          setSending(false);
          return;
        }
        
        const mainContact = selectedCompany.contacts?.[0];
        recipientData = {
          recipient_id: selectedCompany.id,
          recipient_name: selectedCompany.nome_fantasia || selectedCompany.razao_social,
          recipient_phone: mainContact?.phone,
          recipient_email: mainContact?.email || selectedCompany.email_faturamento
        };
        
        // Validar WhatsApp para empresa
        if (messageType === 'whatsapp' && !recipientData.recipient_phone) {
          toast.error('Empresa não possui telefone de contato cadastrado');
          setSending(false);
          return;
        }
        
        // Validar email para empresa
        if (messageType === 'email' && !recipientData.recipient_email) {
          toast.error('Empresa não possui e-mail cadastrado');
          setSending(false);
          return;
        }
      }

      if (messageType === 'whatsapp') {
        console.log('Enviando WhatsApp com dados:', {
          recipient_type: selectedRecipient,
          ...recipientData,
          class_schedule_id: selectedSchedule,
          message_type: 'custom'
        });
        
        const response = await base44.functions.invoke('enviarNotificacaoWhatsApp', {
          recipient_type: selectedRecipient,
          ...recipientData,
          class_schedule_id: selectedSchedule,
          message_body: messageContent,
          message_type: 'custom'
        });

        console.log('Resposta do WhatsApp:', response.data);

        if (response.data.success) {
          toast.success(`✅ Mensagem enviada para ${response.data.recipient}!`);
          if (response.data.admin_copies && response.data.admin_copies.length > 0) {
            const enviados = response.data.admin_copies.filter(a => a.status === 'enviado').length;
            if (enviados > 0) {
              toast.success(`📋 Cópia enviada para ${enviados} administrador(es)`);
            }
          }
          setMessageContent("");
          setSelectedSchedule("");
          setSelectedRecipient("");
        } else {
          toast.error(response.data.error || 'Erro ao enviar mensagem');
        }
      } else if (messageType === 'email') {
        console.log('Enviando e-mail para:', recipientData.recipient_email);
        
        await base44.integrations.Core.SendEmail({
          to: recipientData.recipient_email,
          subject: `Notificação - ${selectedScheduleData.training_name}`,
          body: messageContent.replace(/\n/g, '<br>')
        });
        
        toast.success('✅ E-mail enviado com sucesso!');
        setMessageContent("");
        setSelectedSchedule("");
        setSelectedRecipient("");
      }
    } catch (error) {
      console.error('Erro completo ao enviar mensagem:', error);
      
      let errorMessage = 'Erro ao enviar mensagem';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-emerald-100 rounded-lg">
            <MessageCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-900">Central de Comunicação</h1>
            <p className="text-stone-600">Envie mensagens para instrutores, empresas e administradores</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Formulário de Envio */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-600" />
                Enviar Nova Mensagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Selecionar Turma/Cronograma *</Label>
                <Select value={selectedSchedule} onValueChange={(value) => {
                  setSelectedSchedule(value);
                  setMessageContent("");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeSchedules.map(schedule => (
                      <SelectItem key={schedule.id} value={schedule.id}>
                        📚 {schedule.training_name} - {schedule.company_name}
                        <Badge className="ml-2 text-xs" variant="outline">
                          {new Date(schedule.start_date).toLocaleDateString('pt-BR')}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedScheduleData && (
                <>
                  <div className="space-y-2">
                    <Label>Destinatário *</Label>
                    <Select value={selectedRecipient} onValueChange={(value) => {
                      setSelectedRecipient(value);
                      setTimeout(() => setMessageContent(generateDefaultMessage()), 100);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha o destinatário" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instructor">
                          👨‍🏫 Instrutor - {selectedInstructor?.name || 'Não definido'}
                        </SelectItem>
                        <SelectItem value="company">
                          🏢 Empresa - {selectedCompany?.nome_fantasia || selectedCompany?.razao_social}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Mensagem *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={messageType === 'whatsapp' ? 'default' : 'outline'}
                        onClick={() => setMessageType('whatsapp')}
                        className={messageType === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        WhatsApp
                      </Button>
                      <Button
                        type="button"
                        variant={messageType === 'email' ? 'default' : 'outline'}
                        onClick={() => setMessageType('email')}
                        className={messageType === 'email' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        E-mail
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Conteúdo da Mensagem *</Label>
                    <Textarea
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder="Digite a mensagem..."
                      rows={12}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-stone-500">
                      ⚠️ Uma cópia desta mensagem será enviada automaticamente para os Administradores Master
                    </p>
                  </div>

                  <Button
                    onClick={handleSendMessage}
                    disabled={sending || !messageContent}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Mensagem
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Informações da Turma Selecionada */}
          <div className="space-y-6">
            {selectedScheduleData ? (
              <>
                <Card className="border-none shadow-lg bg-gradient-to-br from-emerald-50 to-white">
                  <CardHeader>
                    <CardTitle className="text-lg">Detalhes da Turma</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-stone-500">Curso</p>
                      <p className="text-lg font-semibold text-stone-900">{selectedScheduleData.training_name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-stone-500">Empresa</p>
                        <p className="text-stone-900">{selectedScheduleData.company_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-500">Status</p>
                        <Badge className={
                          selectedScheduleData.status === 'Agendado' ? 'bg-blue-100 text-blue-700' :
                          selectedScheduleData.status === 'Em Andamento' ? 'bg-green-100 text-green-700' :
                          'bg-stone-100 text-stone-700'
                        }>
                          {selectedScheduleData.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-500">Data de Início</p>
                      <p className="text-stone-900">
                        {new Date(selectedScheduleData.start_date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    {selectedScheduleData.training_schedule && (
                      <div>
                        <p className="text-sm font-medium text-stone-500">Horário</p>
                        <p className="text-stone-900">{selectedScheduleData.training_schedule}</p>
                      </div>
                    )}
                    {selectedScheduleData.location && (
                      <div>
                        <p className="text-sm font-medium text-stone-500">Local</p>
                        <p className="text-stone-900">{selectedScheduleData.location}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedRecipient && (
                  <Card className="border-none shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {selectedRecipient === 'instructor' ? (
                          <>
                            <Users className="w-5 h-5 text-purple-600" />
                            Informações do Instrutor
                          </>
                        ) : (
                          <>
                            <Building2 className="w-5 h-5 text-blue-600" />
                            Informações da Empresa
                          </>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedRecipient === 'instructor' && selectedInstructor && (
                        <>
                          <div>
                            <p className="text-sm font-medium text-stone-500">Nome</p>
                            <p className="text-stone-900">{selectedInstructor.name}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-stone-500">Telefone</p>
                            <p className="text-stone-900">{selectedInstructor.phone || 'Não cadastrado'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-stone-500">E-mail</p>
                            <p className="text-stone-900">{selectedInstructor.email || 'Não cadastrado'}</p>
                          </div>
                        </>
                      )}
                      {selectedRecipient === 'company' && selectedCompany && (
                        <>
                          <div>
                            <p className="text-sm font-medium text-stone-500">Nome</p>
                            <p className="text-stone-900">{selectedCompany.nome_fantasia || selectedCompany.razao_social}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-stone-500">CNPJ</p>
                            <p className="text-stone-900">{selectedCompany.cnpj}</p>
                          </div>
                          {selectedCompany.contacts?.[0] && (
                            <>
                              <div>
                                <p className="text-sm font-medium text-stone-500">Contato Principal</p>
                                <p className="text-stone-900">{selectedCompany.contacts[0].name}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-stone-500">Telefone</p>
                                <p className="text-stone-900">{selectedCompany.contacts[0].phone || 'Não cadastrado'}</p>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="border-none shadow-lg">
                <CardContent className="py-12 text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-stone-300" />
                  <p className="text-stone-500">Selecione uma turma para começar</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}