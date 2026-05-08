import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, Loader } from 'lucide-react';

export default function AssistenteCadastros() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  // Inicializar conversa
  useEffect(() => {
    const initConversation = async () => {
      try {
        const conv = await base44.agents.createConversation({
          agent_name: 'assistente_cadastros',
          metadata: {
            name: 'Cadastro de Dados',
            description: 'Conversa para cadastro automático de registros'
          }
        });
        setConversationId(conv.id);
        setMessages(conv.messages || []);
      } catch (e) {
        console.error('Erro ao inicializar:', e);
      }
    };
    initConversation();
  }, []);

  // Subscribe para atualizações em tempo real
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages || []);
    });

    return unsubscribe;
  }, [conversationId]);

  const sendMessage = async () => {
    if (!inputValue.trim() || !conversationId) return;

    setLoading(true);
    const userMessage = inputValue;
    setInputValue('');

    try {
      await base44.agents.addMessage(
        { id: conversationId },
        {
          role: 'user',
          content: userMessage
        }
      );
    } catch (e) {
      console.error('Erro ao enviar mensagem:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-8 h-8 text-indigo-600" />
          Assistente de Cadastros
        </h1>
        <p className="text-gray-600 mt-1">
          Envie os dados e a IA realizará os cadastros automaticamente
        </p>
      </div>

      {/* Chat Container */}
      <div className="flex-1 bg-white rounded-lg shadow-lg p-6 mb-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                Inicie uma conversa enviando os dados que deseja cadastrar
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-gray-200 text-gray-900 rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {msg.role === 'assistant' && msg.tool_calls?.length > 0 && (
                  <div className="mt-2 text-xs opacity-80 border-t border-gray-300 pt-2">
                    {msg.tool_calls.map((tc, i) => (
                      <div key={i} className="mb-1">
                        ✓ {tc.name}: {tc.status}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-900 px-4 py-3 rounded-lg rounded-bl-none">
              <Loader className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Cadastre um aluno chamado João Silva com CPF 123.456.789-00..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={loading || !conversationId}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={loading || !conversationId || !inputValue.trim()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Dica: Envie "cadastre um aluno com...", "crie uma matrícula...", "registre um curso..."
          </p>
        </CardContent>
      </Card>
    </div>
  );
}