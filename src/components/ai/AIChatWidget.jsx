import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Minimize2, Bot, User, Loader2, Paperclip } from "lucide-react";
import ReactMarkdown from "react-markdown";

const PAGE_CONTEXT_MAP = {
  "/": "Dashboard Principal",
  "/Dashboard": "Dashboard Master",
  "/DashboardFinanceiro": "Dashboard Financeiro",
  "/DashboardOperacional": "Dashboard Operacional",
  "/DashboardCertificacao": "Dashboard de Certificação",
  "/DashboardComercial": "Dashboard Comercial",
  "/DashboardInstrutor": "Dashboard do Instrutor",
  "/Certificacoes": "Gestão de Certificações",
  "/CertificateEmissao": "Emissão de Certificados",
  "/CertificateAuditPanel": "Auditoria de Certificados",
  "/GestaoAlunosIndividuais": "Gestão de Alunos Individuais (PF)",
  "/GestaoLeads": "Gestão de Leads",
  "/CaixaEntrada": "Caixa de Entrada / Atendimento",
  "/BaseConhecimento": "Base de Conhecimento IA",
  "/ContasSociais": "Contas Sociais",
  "/GestaoBMM": "Gestão de BMM",
  "/ProposalEntry": "Entrada de Propostas",
  "/AgendaTreinamentos": "Agenda de Treinamentos",
  "/AlertasConfig": "Configuração de Alertas",
  "/ConfigNotificacoes": "Configuração de Notificações",
  "/LogNotificacoes": "Log de Notificações",
  "/DigitalSignatures": "Assinaturas Digitais",
  "/AdminDashboard": "Dashboard Administrativo",
};

const PUBLIC_ROUTES = ["/CertificateSign", "/CertificateValidate", "/StudentPortal", "/AttendanceConfirm", "/CompanyPortal", "/AcessoNegado"];

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-2 mb-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isUser ? "bg-gray-900 text-white rounded-br-sm" : "bg-gray-100 text-gray-900 rounded-bl-sm"}`}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <ReactMarkdown
            className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            components={{
              p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="my-1 ml-3 list-disc">{children}</ul>,
              ol: ({ children }) => <ol className="my-1 ml-3 list-decimal">{children}</ol>,
              li: ({ children }) => <li className="my-0.5">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              code: ({ children }) => <code className="bg-gray-200 px-1 rounded text-xs">{children}</code>,
            }}
          >
            {message.content || ""}
          </ReactMarkdown>
        )}
        {message.tool_calls?.length > 0 && (
          <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
            <Loader2 className="w-3 h-3 animate-spin" /> Consultando dados...
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
          <User className="w-4 h-4 text-gray-600" />
        </div>
      )}
    </div>
  );
}

export default function AIChatWidget() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [fileUrl, setFileUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // Todos os hooks ANTES de qualquer return condicional
  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => { if (unsubscribeRef.current) unsubscribeRef.current(); };
  }, []);

  useEffect(() => {
    if (!isOpen || isMinimized) {
      if (messages.filter(m => m.role === "assistant").length > 0) {
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [messages.length]);

  const currentPageName = PAGE_CONTEXT_MAP[location.pathname] || location.pathname;

  // Return condicional DEPOIS de todos os hooks
  if (PUBLIC_ROUTES.includes(location.pathname)) return null;

  const initConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: "central_inteligencia_cat",
        metadata: { name: `Suporte CAT — ${new Date().toLocaleDateString("pt-BR")}` }
      });

      const userRole = user?.role || user?.custom_role || "usuário";
      const welcomeMsg = {
        role: "user",
        content: `[CONTEXTO INTERNO]\nUsuário: ${user?.full_name || "Usuário"}\nRole: ${userRole}\nTela atual: ${currentPageName}\nHorário: ${new Date().toLocaleString("pt-BR")}\n[FIM DO CONTEXTO]\n\nOlá! Preciso de ajuda.`
      };

      const updatedConv = await base44.agents.addMessage(conv, welcomeMsg);

      if (unsubscribeRef.current) unsubscribeRef.current();
      const unsub = base44.agents.subscribeToConversation(updatedConv.id, (data) => {
        setMessages(data.messages.filter(m => !(m.role === "user" && m.content?.includes("[CONTEXTO INTERNO]"))));
      });
      unsubscribeRef.current = unsub;
      setConversation(updatedConv);
    } catch (err) {
      console.error("Erro ao iniciar conversa:", err);
    }
  };

  const closeChat = () => {
    setIsOpen(false);
    // Reseta a conversa ao fechar para evitar IDs inválidos na próxima abertura
    setConversation(null);
    setMessages([]);
    if (unsubscribeRef.current) { unsubscribeRef.current(); unsubscribeRef.current = null; }
  };

  const openChat = async () => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
    if (!conversation) await initConversation();
  };

  const handleSend = async () => {
    if (!input.trim() && !fileUrl) return;
    if (!conversation) return;
    const userInput = input.trim();
    setInput("");
    setIsLoading(true);
    try {
      const msg = {
        role: "user",
        content: `[Tela: ${currentPageName}] ${userInput}`,
        ...(fileUrl ? { file_urls: [fileUrl] } : {})
      };
      await base44.agents.addMessage(conversation, msg);
      setFileUrl(null);
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
      // Se a conversa for inválida (ID antigo), reinicia
      if (err?.message?.includes("Object not found") || err?.message?.includes("Invalid id")) {
        setConversation(null);
        setMessages([]);
        await initConversation();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(file_url);
    } catch (err) {
      console.error("Erro no upload:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const lastMessages = messages.slice(-50);
  const isStreaming = isLoading || (messages.length > 0 && messages[messages.length - 1]?.role === "user");

  if (!isOpen) {
    return (
      <button onClick={openChat} className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gray-900 hover:bg-gray-800 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 group" title="Central de Inteligência CAT">
        <Bot className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{unreadCount}</span>
        )}
        <span className="absolute right-16 bg-gray-900 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">CAT IA — Preciso de Ajuda</span>
      </button>
    );
  }

  if (isMinimized) {
    return (
      <button onClick={() => { setIsMinimized(false); setUnreadCount(0); }} className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gray-900 text-white px-4 py-3 rounded-full shadow-2xl hover:bg-gray-800 transition-all">
        <Bot className="w-5 h-5" />
        <span className="text-sm font-medium">CAT IA</span>
        {unreadCount > 0 && <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{unreadCount}</span>}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-gray-200 bg-white" style={{ height: "520px" }}>
      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">CAT IA</p>
            <p className="text-xs text-gray-400">{currentPageName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => { setIsMinimized(true); setUnreadCount(0); }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <Minimize2 className="w-4 h-4" />
          </button>
          <button onClick={closeChat} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {lastMessages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">Olá! Sou a CAT IA 👋</p>
            <p className="text-xs text-gray-500 mt-1">Estou aqui para apoiar todas as suas operações. Como posso ajudar?</p>
            <div className="mt-4 space-y-2">
              {["Como gerar um certificado?", "Como cadastrar um novo aluno?", "Como funciona o BMM?"].map(q => (
                <button key={q} onClick={() => setInput(q)} className="block w-full text-left text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 transition-colors">{q}</button>
              ))}
            </div>
          </div>
        )}
        {lastMessages.map((msg, idx) => <MessageBubble key={idx} message={msg} />)}
        {isStreaming && lastMessages[lastMessages.length - 1]?.role === "user" && (
          <div className="flex gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3 py-2">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {fileUrl && (
        <div className="px-3 py-2 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
          <span className="text-xs text-blue-700">📎 Imagem anexada</span>
          <button onClick={() => setFileUrl(null)} className="text-xs text-red-500 hover:text-red-700">Remover</button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-100 p-3 flex gap-2 flex-shrink-0 bg-white">
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
        <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0" title="Anexar imagem">
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
        </button>
        <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Digite sua dúvida..." className="text-sm flex-1 border-gray-200" disabled={isLoading} />
        <Button onClick={handleSend} disabled={isLoading || (!input.trim() && !fileUrl)} size="sm" className="bg-gray-900 hover:bg-gray-800 px-3 flex-shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}