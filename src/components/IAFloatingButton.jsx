import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, X, Send, Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";

export default function IAFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Criar conversa ao abrir o chat
  React.useEffect(() => {
    if (isOpen && !conversation) {
      createConversation();
    }
  }, [isOpen]);

  const createConversation = async () => {
    try {
      const newConversation = await base44.agents.createConversation({
        agent_name: "app_assistant",
        metadata: {
          name: "Chat Assistente",
          created_at: new Date().toISOString()
        }
      });
      setConversation(newConversation);
      
      // Carregar mensagens existentes se houver
      if (newConversation.messages && newConversation.messages.length > 0) {
        setMessages(newConversation.messages);
      } else {
        // Mensagem de boas-vindas
        setMessages([{
          role: "assistant",
          content: "👋 Olá! Sou a assistente inteligente do Sistema de Treinamentos CAT.\n\nPosso ajudar com:\n• 📊 Consultar informações de treinamentos\n• 👨‍🏫 Dados de instrutores\n• 🏢 Informações de empresas e endereços\n• 📅 Status do cronograma e datas\n• 💡 Orientações sobre como usar o sistema\n• 🔍 Buscar qualquer informação no app\n\nComo posso ajudar?"
        }]);
      }
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !conversation) return;

    const userMessage = input.trim();
    setInput("");
    
    // Adicionar mensagem do usuário imediatamente
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Enviar mensagem para o agente
      await base44.agents.addMessage(conversation, {
        role: "user",
        content: userMessage
      });

      // Inscrever-se para receber atualizações da resposta do agente
      const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
        setMessages(data.messages);
      });

      // Aguardar um tempo para a resposta ser processada
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Cancelar inscrição após obter resposta
      unsubscribe();

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
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