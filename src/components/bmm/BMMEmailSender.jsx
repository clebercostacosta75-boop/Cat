import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, Send, User, FileText, Loader2, CheckCircle, 
  AlertCircle, ArrowLeft, Eye 
} from "lucide-react";
import { toast } from "sonner";
import ReactQuill from "react-quill";

export default function BMMEmailSender({ content, previewRef, onBack }) {
  const queryClient = useQueryClient();
  const [selectedContact, setSelectedContact] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const { data: emailTemplates = [] } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => base44.entities.EmailTemplate.list(),
    initialData: [],
  });

  const updateBMMRecordMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BMMRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bmmRecords'] });
    },
  });

  const { company, period, totals } = content || {};

  // Contatos da empresa com email
  const companyContacts = (company?.contacts || []).filter(c => c.email);

  // Placeholders disponíveis
  const placeholders = {
    '{{empresa}}': company?.nome_fantasia || company?.razao_social || '',
    '{{periodo}}': period || '',
    '{{total_turmas}}': totals?.classes?.toString() || '0',
    '{{total_alunos}}': totals?.students?.toString() || '0',
    '{{total_valor}}': new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals?.value || 0),
    '{{contato_nome}}': '',
    '{{data_atual}}': new Date().toLocaleDateString('pt-BR')
  };

  // Substituir placeholders no texto
  const replacePlaceholders = (text) => {
    let result = text;
    const contact = companyContacts.find(c => c.email === selectedContact);
    const placeholdersWithContact = {
      ...placeholders,
      '{{contato_nome}}': contact?.name || ''
    };
    
    Object.entries(placeholdersWithContact).forEach(([key, value]) => {
      result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    return result;
  };

  // Carregar template selecionado
  useEffect(() => {
    if (selectedTemplate) {
      const template = emailTemplates.find(t => t.id === selectedTemplate);
      if (template) {
        setSubject(template.subject);
        setBody(template.body);
      }
    }
  }, [selectedTemplate, emailTemplates]);

  // Definir valores padrão
  useEffect(() => {
    if (company && period && !subject) {
      setSubject(`BMM - ${company.nome_fantasia || company.razao_social} - ${period}`);
      setBody(`
        <p>Prezado(a),</p>
        <p>Segue em anexo o Boletim Mensal de Medição (BMM) referente ao período de <strong>${period}</strong>.</p>
        <p><strong>Resumo:</strong></p>
        <ul>
          <li>Total de Turmas: ${totals?.classes || 0}</li>
          <li>Total de Alunos: ${totals?.students || 0}</li>
          <li>Valor Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals?.value || 0)}</li>
        </ul>
        <p>Qualquer dúvida, estamos à disposição.</p>
        <p>Atenciosamente,<br/>Equipe CAT Treinamentos</p>
      `);
    }

    // Pré-selecionar email de faturamento
    if (company?.email_faturamento && !selectedContact) {
      setCustomEmail(company.email_faturamento);
    }
  }, [company, period, totals]);

  const handleSendEmail = async () => {
    const recipientEmail = selectedContact || customEmail;
    
    if (!recipientEmail) {
      toast.error('Informe o e-mail do destinatário');
      return;
    }

    if (!subject || !body) {
      toast.error('Preencha assunto e corpo do e-mail');
      return;
    }

    setIsSending(true);
    try {
      // Preparar corpo do email com placeholders substituídos
      const finalSubject = replacePlaceholders(subject);
      const finalBody = replacePlaceholders(body);

      // Enviar email
      await base44.integrations.Core.SendEmail({
        to: recipientEmail,
        subject: finalSubject,
        body: finalBody,
        from_name: 'CAT Treinamentos'
      });

      toast.success(`E-mail enviado para ${recipientEmail}!`);
      
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      toast.error('Erro ao enviar e-mail');
    } finally {
      setIsSending(false);
    }
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h2 className="text-xl font-bold text-stone-900">Enviar BMM por E-mail</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Configuração do Email */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-emerald-600" />
              Configurar E-mail
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Seleção de Destinatário */}
            <div className="space-y-2">
              <Label>Destinatário</Label>
              {companyContacts.length > 0 && (
                <Select value={selectedContact} onValueChange={(value) => {
                  setSelectedContact(value);
                  setCustomEmail('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar contato da empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyContacts.map((contact, idx) => (
                      <SelectItem key={idx} value={contact.email}>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {contact.name} ({contact.role || 'Contato'})
                          <span className="text-stone-500 text-xs">{contact.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Input
                type="email"
                placeholder="Ou digite o e-mail manualmente"
                value={customEmail}
                onChange={(e) => {
                  setCustomEmail(e.target.value);
                  setSelectedContact('');
                }}
              />
              {company?.email_faturamento && (
                <p className="text-xs text-stone-500">
                  E-mail de faturamento: {company.email_faturamento}
                </p>
              )}
            </div>

            {/* Seleção de Template */}
            <div className="space-y-2">
              <Label>Modelo de E-mail</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Usar modelo salvo (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates.filter(t => t.type === 'BMM' || t.type === 'Personalizado').map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {template.name}
                        {template.is_default && (
                          <Badge className="bg-emerald-100 text-emerald-700 text-xs">Padrão</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assunto */}
            <div className="space-y-2">
              <Label>Assunto *</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Assunto do e-mail"
              />
            </div>

            {/* Corpo do Email */}
            <div className="space-y-2">
              <Label>Corpo do E-mail *</Label>
              <div className="border rounded-lg overflow-hidden">
                <ReactQuill
                  theme="snow"
                  value={body}
                  onChange={setBody}
                  modules={quillModules}
                  className="bg-white"
                  style={{ minHeight: '200px' }}
                />
              </div>
            </div>

            {/* Placeholders disponíveis */}
            <div className="bg-stone-50 rounded-lg p-3">
              <p className="text-xs font-medium text-stone-700 mb-2">Placeholders disponíveis:</p>
              <div className="flex flex-wrap gap-1">
                {Object.keys(placeholders).map(key => (
                  <Badge 
                    key={key} 
                    variant="outline" 
                    className="text-xs cursor-pointer hover:bg-emerald-50"
                    onClick={() => setBody(body + ' ' + key)}
                  >
                    {key}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? 'Ocultar' : 'Visualizar'}
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSendEmail}
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar E-mail
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview do Email */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Pré-visualização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-stone-50 rounded-lg p-4 space-y-4">
              <div className="border-b pb-3">
                <p className="text-sm text-stone-500">Para:</p>
                <p className="font-medium">{selectedContact || customEmail || 'Não definido'}</p>
              </div>
              <div className="border-b pb-3">
                <p className="text-sm text-stone-500">Assunto:</p>
                <p className="font-medium">{replacePlaceholders(subject)}</p>
              </div>
              <div>
                <p className="text-sm text-stone-500 mb-2">Corpo:</p>
                <div 
                  className="prose prose-sm max-w-none bg-white p-4 rounded border"
                  dangerouslySetInnerHTML={{ __html: replacePlaceholders(body) }}
                />
              </div>
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <FileText className="w-4 h-4" />
                  <span>Anexo: BMM_{company?.nome_fantasia}_{period?.replace('/', '-')}.pdf</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}