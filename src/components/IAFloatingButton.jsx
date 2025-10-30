import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, X, Send, Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";

export default function IAFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Olá! Sou a assistente inteligente do Sistema de Treinamentos.\n\nPosso ajudar com:\n• 📊 Consultar informações de treinamentos\n• 👨‍🏫 Dados de instrutores\n• 🏢 Informações de empresas\n• 📅 Status do cronograma\n• 💡 Sugestões de melhorias\n• 🐛 Reportar erros\n\nComo posso ajudar?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Buscar contexto do sistema
      const [classes, instructors, companies, courses] = await Promise.all([
        base44.entities.ClassSchedule.list(),
        base44.entities.Instructor.list(),
        base44.entities.Company.list(),
        base44.entities.Course.list()
      ]);

      const context = {
        total_treinamentos: classes.length,
        treinamentos_agendados: classes.filter(c => c.status === 'Agendado').length,
        treinamentos_concluidos: classes.filter(c => c.status === 'Concluído').length,
        total_instrutores: instructors.length,
        instrutores_ativos: instructors.filter(i => i.status === 'Ativo').length,
        total_empresas: companies.length,
        total_cursos: courses.length,
        ultimos_treinamentos: classes.slice(0, 5).map(c => ({
          nome: c.training_name,
          empresa: c.company_name,
          data: c.start_date,
          status: c.status
        }))
      };

      // Chamar IA com contexto
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é uma assistente especializada no Sistema de Treinamentos da empresa.

CONTEXTO DO SISTEMA:
${JSON.stringify(context, null, 2)}

FUNCIONALIDADES DO SISTEMA:
- Gestão de Cronograma de Treinamentos
- Cadastro de Instrutores (com perfil profissional gerado por IA)
- Cadastro de Empresas Clientes (com unidades e contatos)
- Cadastro de Empresas Contratadas (prestadoras de serviço)
- Cadastro de Cursos
- Geração de BMM (Boletim Mensal de Medição)
- Relatórios e Dashboards
- Importação de dados via Excel
- Notificações automáticas (Email, WhatsApp, SMS)

PERFIS DE USUÁRIO:
- Administrador Master: Acesso total
- Financeiro: Acesso total
- Coordenador de Operações: Acesso operacional (sem BMM)
- Instrutor: Apenas seus treinamentos

PERGUNTA DO USUÁRIO:
${userMessage}

INSTRUÇÕES:
1. Responda de forma amigável e profissional
2. Use os dados do contexto quando relevante
3. Se for pergunta sobre funcionalidade, explique claramente
4. Se for sobre dados, forneça números precisos
5. Se identificar erro ou problema, sugira solução
6. Use emojis para deixar a resposta mais amigável
7. Seja conciso mas completo

Responda em português do Brasil.`,
        add_context_from_internet: false
      });

      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: response 
      }]);

    } catch (error) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "❌ Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-2xl bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 z-50"
        size="icon"
      >
        <MessageCircle className="w-7 h-7" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col border-2 border-purple-200">
      <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-lg">Assistente IA</CardTitle>
              <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                Online
              </Badge>
            </div>
          </div>
          <Button
            onClick={() => setIsOpen(false)}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white'
                  : 'bg-white border border-stone-200 text-stone-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-stone-200 rounded-2xl px-4 py-3">
              <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            </div>
          </div>
        )}
      </CardContent>

      <div className="p-4 border-t border-stone-200 bg-white rounded-b-lg flex-shrink-0">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua pergunta..."
            className="resize-none"
            rows={2}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-2 text-center">
          Pressione Enter para enviar
        </p>
      </div>
    </Card>
  );
}