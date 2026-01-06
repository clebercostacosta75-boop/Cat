import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2, Sparkles, Upload, FileText, History, Trash2 } from "lucide-react";
import MessageBubble from "@/components/MessageBubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AdvancedAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [historyRecordId, setHistoryRecordId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [user, setUser] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (isOpen && user) {
      loadConversationHistory();
    }
  }, [isOpen, user]);

  const loadConversationHistory = async () => {
    try {
      const history = await base44.entities.ConversationHistory.filter(
        { user_id: user.id },
        "-updated_date",
        10
      );
      setConversationHistory(history);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  };

  const createNewConversation = async (initialMessage = "Nova Conversa", initialFiles = []) => {
    try {
      const conversation = await base44.agents.createConversation({
        agent_name: "app_assistant",
        metadata: {
          name: "Nova Conversa",
          description: "Conversa com Assistente IA Avançado",
          user_name: user.full_name,
          user_email: user.email,
        },
      });
      
      const historyRecord = await base44.entities.ConversationHistory.create({
        user_id: user.id,
        conversation_id: conversation.id,
        title: initialMessage.substring(0, 50),
        message_count: 0,
        documents: initialFiles,
      });

      setConversationId(conversation.id);
      setHistoryRecordId(historyRecord.id);
      setMessages(conversation.messages || []);
      setUploadedFiles(initialFiles);
      loadConversationHistory();
      return { conversation, historyRecord };
    } catch (error) {
      console.error("Erro ao criar conversa:", error);
      toast.error("Erro ao criar nova conversa");
      throw error;
    }
  };

  const loadConversation = async (historyRecord) => {
    try {
      const conversation = await base44.agents.getConversation(historyRecord.conversation_id);
      setConversationId(historyRecord.conversation_id);
      setHistoryRecordId(historyRecord.id);
      setMessages(conversation.messages || []);
      setUploadedFiles(historyRecord.documents || []);
      setShowHistory(false);
    } catch (error) {
      console.error("Erro ao carregar conversa:", error);
      toast.error("Erro ao carregar conversa");
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return {
          name: file.name,
          url: file_url,
          uploaded_at: new Date().toISOString(),
        };
      });

      const newFiles = await Promise.all(uploadPromises);
      const updatedFiles = [...uploadedFiles, ...newFiles];
      setUploadedFiles(updatedFiles);

      // Atualizar histórico com documentos
      if (historyRecordId) {
        await base44.entities.ConversationHistory.update(historyRecordId, {
          documents: updatedFiles,
        });
      }

      toast.success(`${newFiles.length} arquivo(s) enviado(s)`);
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao enviar arquivo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && uploadedFiles.length === 0) || isSending) return;

    setIsSending(true);
    const userMessage = inputMessage;
    const filesUrls = uploadedFiles.map(f => f.url);
    setInputMessage("");

    try {
      let currentConversation = null;
      let currentHistoryRecordId = historyRecordId;

      if (!conversationId) {
        const { conversation, historyRecord } = await createNewConversation(userMessage, uploadedFiles);
        currentConversation = conversation;
        currentHistoryRecordId = historyRecord.id;
      } else {
        currentConversation = await base44.agents.getConversation(conversationId);
      }
      
      await base44.agents.addMessage(currentConversation, {
        role: "user",
        content: userMessage || "Analise os documentos enviados.",
        file_urls: filesUrls.length > 0 ? filesUrls : undefined,
      });

      if (currentHistoryRecordId) {
        const messageCount = messages.length + 1;
        
        await base44.entities.ConversationHistory.update(currentHistoryRecordId, {
          last_message: userMessage || "Análise de documentos",
          message_count: messageCount,
        });
        
        loadConversationHistory();
      }

      setUploadedFiles([]);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      setInputMessage(userMessage);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
    }
  };

  const deleteConversation = async (historyRecord) => {
    try {
      await base44.entities.ConversationHistory.delete(historyRecord.id);
      loadConversationHistory();
      
      if (historyRecord.id === historyRecordId) {
        setConversationId(null);
        setHistoryRecordId(null);
        setMessages([]);
        setUploadedFiles([]);
      }
      
      toast.success("Conversa excluída");
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir conversa");
    }
  };

  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = base44.agents.subscribeToConversation(
      conversationId,
      (data) => {
        setMessages(data.messages);
      }
    );

    return () => unsubscribe();
  }, [conversationId]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!user) return null;

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          size="icon"
        >
          <Sparkles className="w-6 h-6" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 right-6 z-50 w-[450px] h-[650px] shadow-2xl border-2 border-purple-200 flex flex-col">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <CardTitle className="text-base font-bold">
                  Assistente IA Avançado
                </CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Dialog open={showHistory} onOpenChange={setShowHistory}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Histórico de Conversas</DialogTitle>
                      <DialogDescription>
                        Suas conversas anteriores com o assistente
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-2">
                        {conversationHistory.map((record) => (
                          <div
                            key={record.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <button
                              onClick={() => loadConversation(record)}
                              className="flex-1 text-left"
                            >
                              <p className="text-sm font-medium text-black line-clamp-1">
                                {record.title || "Conversa sem título"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {record.message_count} mensagens
                              </p>
                            </button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteConversation(record);
                              }}
                              className="h-8 w-8"
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          </div>
                        ))}
                        {conversationHistory.length === 0 && (
                          <p className="text-center text-sm text-gray-500 py-8">
                            Nenhuma conversa anterior
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-white/90 mt-1">
              Pergunte, envie documentos ou peça ações no sistema
            </p>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {!conversationId ? (
              <div className="text-center text-gray-500 mt-8">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-400" />
                <p className="text-sm font-medium">Assistente IA Avançado</p>
                <p className="text-xs mt-2 mb-4">
                  • Respondo perguntas sobre o sistema<br />
                  • Analiso documentos que você enviar<br />
                  • Posso criar turmas, empresas e cursos
                </p>
                <Button
                  onClick={createNewConversation}
                  className="bg-gradient-to-r from-purple-600 to-blue-600"
                >
                  Iniciar Conversa
                </Button>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <MessageBubble key={idx} message={msg} />
                ))}
              </>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {conversationId && (
            <>
              {uploadedFiles.length > 0 && (
                <div className="px-4 py-2 border-t bg-purple-50">
                  <p className="text-xs text-purple-700 mb-2">
                    Documentos anexados:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1 bg-white px-2 py-1 rounded text-xs"
                      >
                        <FileText className="w-3 h-3" />
                        <span className="max-w-[100px] truncate">
                          {file.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 border-t bg-white rounded-b-lg">
                <div className="flex gap-2 mb-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    title="Anexar documento"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                  </Button>
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite ou envie documentos..."
                    disabled={isSending}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSending || (!inputMessage.trim() && uploadedFiles.length === 0)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={createNewConversation}
                  className="w-full text-xs"
                >
                  + Nova Conversa
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </>
  );
}