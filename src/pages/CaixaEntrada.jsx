import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MessageSquare, Instagram, Facebook, Linkedin, Globe, PhoneCall, Mail,
  Send, Search, User, Bot, RefreshCw, UserCheck, Clock, CheckCheck, Filter, AtSign
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const CHANNEL_ICONS = {
  "Instagram": <Instagram className="w-4 h-4 text-pink-500" />,
  "Facebook": <Facebook className="w-4 h-4 text-blue-600" />,
  "LinkedIn": <Linkedin className="w-4 h-4 text-blue-700" />,
  "WhatsApp": <PhoneCall className="w-4 h-4 text-green-500" />,
  "TikTok": <Globe className="w-4 h-4 text-gray-800" />,
  "E-mail": <Mail className="w-4 h-4 text-red-400" />,
  "Outro": <Globe className="w-4 h-4 text-gray-400" />,
};

const CHANNEL_COLORS = {
  "Instagram": { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700", badge: "bg-pink-100 text-pink-800", button: "bg-pink-600 hover:bg-pink-700" },
  "Facebook": { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-100 text-blue-800", button: "bg-blue-600 hover:bg-blue-700" },
  "LinkedIn": { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", badge: "bg-sky-100 text-sky-800", button: "bg-sky-700 hover:bg-sky-800" },
  "WhatsApp": { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", badge: "bg-green-100 text-green-800", button: "bg-green-600 hover:bg-green-700" },
  "TikTok": { bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-800", badge: "bg-gray-100 text-gray-800", button: "bg-gray-800 hover:bg-gray-900" },
  "E-mail": { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-800", button: "bg-red-600 hover:bg-red-700" },
  "Outro": { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600", badge: "bg-gray-100 text-gray-700", button: "bg-gray-600 hover:bg-gray-700" },
};

const CHANNEL_ICONS_LG = {
  "Instagram": <Instagram className="w-5 h-5 text-pink-500" />,
  "Facebook": <Facebook className="w-5 h-5 text-blue-600" />,
  "LinkedIn": <Linkedin className="w-5 h-5 text-sky-700" />,
  "WhatsApp": <PhoneCall className="w-5 h-5 text-green-500" />,
  "TikTok": <Globe className="w-5 h-5 text-gray-800" />,
  "E-mail": <Mail className="w-5 h-5 text-red-500" />,
  "Outro": <Globe className="w-5 h-5 text-gray-400" />,
};

const STATUS_COLORS = {
  "Aberta": "bg-blue-100 text-blue-800",
  "Em Atendimento IA": "bg-purple-100 text-purple-800",
  "Aguardando Humano": "bg-yellow-100 text-yellow-800",
  "Em Atendimento Humano": "bg-orange-100 text-orange-800",
  "Resolvida": "bg-green-100 text-green-800",
  "Encerrada": "bg-gray-100 text-gray-600",
};

export default function CaixaEntrada() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [filterStatus, setFilterStatus] = useState("abertas");
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef(null);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => base44.entities.Conversation.list("-last_message_at", 100),
    refetchInterval: 10000,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list("-created_date", 200),
  });

  const selected = conversations.find(c => c.id === selectedId);
  const leadMap = leads.reduce((acc, l) => { acc[l.id] = l; return acc; }, {});

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Conversation.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages]);

  const [isSending, setIsSending] = useState(false);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selected) return;
    setIsSending(true);
    try {
      // Se for canal WhatsApp, envia de verdade via API
      if (selected.channel === "WhatsApp") {
        const res = await base44.functions.invoke("enviarRespostaWhatsApp", {
          conversation_id: selected.id,
          message: newMessage.trim(),
        });
        if (res.data?.error) throw new Error(res.data.error);
        toast.success("Mensagem enviada pelo WhatsApp!");
      } else {
        // Outros canais: salva só internamente
        const msg = {
          role: "human_agent",
          content: newMessage.trim(),
          timestamp: new Date().toISOString(),
        };
        const updatedMessages = [...(selected.messages || []), msg];
        await updateMutation.mutateAsync({
          id: selected.id,
          data: {
            messages: updatedMessages,
            last_message_at: new Date().toISOString(),
            last_message_preview: newMessage.trim(),
            status: "Em Atendimento Humano",
          },
        });
        toast.success("Mensagem registrada.");
      }
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch (err) {
      toast.error("Erro ao enviar: " + (err.message || "tente novamente"));
    } finally {
      setIsSending(false);
    }
  };

  const assumeConversation = (conv) => {
    updateMutation.mutate({
      id: conv.id,
      data: { status: "Em Atendimento Humano" },
    });
    toast.success("Você assumiu este atendimento.");
  };

  const closeConversation = (conv) => {
    updateMutation.mutate({
      id: conv.id,
      data: { status: "Resolvida" },
    });
    toast.success("Conversa marcada como resolvida.");
  };

  const filteredConversations = conversations.filter(c => {
    const isAberta = ["Aberta", "Em Atendimento IA", "Aguardando Humano", "Em Atendimento Humano"].includes(c.status);
    const matchFilter = filterStatus === "abertas" ? isAberta : filterStatus === "resolvidas" ? c.status === "Resolvida" || c.status === "Encerrada" : true;
    const matchSearch = !search || c.lead_name?.toLowerCase().includes(search.toLowerCase()) || c.social_account_name?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const pendingCount = conversations.filter(c => c.status === "Aguardando Humano").length;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50">
      {/* Lista de conversas */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Caixa de Entrada
            {pendingCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs">{pendingCount}</Badge>
            )}
          </h2>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-8 h-8 text-sm" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="abertas">Abertas</SelectItem>
              <SelectItem value="resolvidas">Resolvidas</SelectItem>
              <SelectItem value="todas">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && <div className="p-4 text-center text-xs text-gray-400">Carregando...</div>}
          {!isLoading && filteredConversations.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Nenhuma conversa</p>
            </div>
          )}
          {filteredConversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => setSelectedId(conv.id)}
              className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedId === conv.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                    {conv.lead_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{conv.lead_name || "Desconhecido"}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {(() => {
                        const ch = CHANNEL_COLORS[conv.channel] || CHANNEL_COLORS["Outro"];
                        return (
                          <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border font-medium ${ch.badge} ${ch.border}`}>
                            {CHANNEL_ICONS[conv.channel]}
                            {conv.channel}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                {conv.unread_count > 0 && (
                  <Badge className="bg-blue-500 text-white text-xs shrink-0">{conv.unread_count}</Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1 truncate pl-10">{conv.last_message_preview || "Sem mensagens"}</p>
              <div className="flex items-center justify-between mt-1 pl-10">
                <Badge className={`text-xs ${STATUS_COLORS[conv.status] || "bg-gray-100"}`}>{conv.status}</Badge>
                {conv.last_message_at && (
                  <span className="text-xs text-gray-400">{format(new Date(conv.last_message_at), "HH:mm")}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Área de conversa */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 mx-auto mb-3 text-gray-200" />
            <p className="text-lg font-medium">Selecione uma conversa</p>
            <p className="text-sm">para visualizar o histórico de mensagens</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Header da conversa — com faixa colorida do canal */}
          {(() => {
            const ch = CHANNEL_COLORS[selected.channel] || CHANNEL_COLORS["Outro"];
            return (
              <div className={`border-b px-6 py-3 flex items-center justify-between ${ch.bg} ${ch.border}`}>
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${ch.button.split(" ")[0]}`}>
                    {selected.lead_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selected.lead_name}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Badge do canal — destaque principal */}
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${ch.badge} ${ch.border}`}>
                        {CHANNEL_ICONS[selected.channel]}
                        {selected.channel}
                      </span>
                      {selected.social_account_name && (
                        <span className={`text-xs ${ch.text} flex items-center gap-1`}>
                          <AtSign className="w-3 h-3" />{selected.social_account_name}
                        </span>
                      )}
                      <Badge className={`text-xs ${STATUS_COLORS[selected.status]}`}>{selected.status}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selected.status !== "Em Atendimento Humano" && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => assumeConversation(selected)}>
                      <UserCheck className="w-3 h-3" /> Assumir
                    </Button>
                  )}
                  {selected.status !== "Resolvida" && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs text-green-700 border-green-300" onClick={() => closeConversation(selected)}>
                      <CheckCheck className="w-3 h-3" /> Resolver
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
            {/* Pill de origem centralizado */}
            {(() => {
              const ch = CHANNEL_COLORS[selected.channel] || CHANNEL_COLORS["Outro"];
              return (
                <div className="flex justify-center">
                  <div className={`inline-flex items-center gap-2 border rounded-full px-4 py-1.5 text-xs font-medium shadow-sm ${ch.bg} ${ch.border} ${ch.text}`}>
                    {CHANNEL_ICONS_LG[selected.channel]}
                    <span>Conversa via <strong>{selected.channel}</strong></span>
                    {selected.social_account_name && <><span className="opacity-40">•</span><span>{selected.social_account_name}</span></>}
                  </div>
                </div>
              );
            })()}

            {(!selected.messages || selected.messages.length === 0) ? (
              <div className="text-center text-gray-400 py-12">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p>Nenhuma mensagem nesta conversa</p>
              </div>
            ) : (
              selected.messages.map((msg, idx) => {
                const ch = CHANNEL_COLORS[selected.channel] || CHANNEL_COLORS["Outro"];
                return (
                  <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                    {msg.role === "user" && (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 ${ch.bg} border ${ch.border}`}>
                        {CHANNEL_ICONS[selected.channel]}
                      </div>
                    )}
                    <div className={`max-w-md rounded-2xl px-4 py-2.5 ${
                      msg.role === "user" ? `bg-white border ${ch.border} text-gray-900` :
                      msg.role === "assistant" ? "bg-purple-600 text-white" :
                      "bg-gray-800 text-white"
                    }`}>
                      {msg.role === "user" && (
                        <p className={`text-xs mb-1 flex items-center gap-1 font-semibold ${ch.text}`}>
                          {CHANNEL_ICONS[selected.channel]}
                          <span>{selected.channel}{selected.social_account_name ? ` · ${selected.social_account_name}` : ""}</span>
                        </p>
                      )}
                      {msg.role !== "user" && (
                        <p className="text-xs opacity-70 mb-1 flex items-center gap-1">
                          {msg.role === "assistant" ? <><Bot className="w-3 h-3" /> Agente IA</> : <><UserCheck className="w-3 h-3" /> Atendente Humano</>}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      {msg.timestamp && (
                        <p className={`text-xs mt-1 ${msg.role === "user" ? "text-gray-400" : "opacity-60"}`}>
                          {format(new Date(msg.timestamp), "HH:mm")}
                        </p>
                      )}
                    </div>
                    {msg.role !== "user" && (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === "assistant" ? "bg-purple-100" : "bg-gray-200"}`}>
                        {msg.role === "assistant" ? <Bot className="w-3.5 h-3.5 text-purple-600" /> : <UserCheck className="w-3.5 h-3.5 text-gray-700" />}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Caixa de envio — com indicação clara do canal de resposta */}
          {(() => {
            const ch = CHANNEL_COLORS[selected.channel] || CHANNEL_COLORS["Outro"];
            const isHuman = selected.status === "Em Atendimento Humano";
            return (
              <div className={`border-t p-4 ${isHuman ? ch.bg : "bg-white"} ${isHuman ? ch.border : "border-gray-200"}`}>
                {selected.status === "Resolvida" || selected.status === "Encerrada" ? (
                  <p className="text-center text-sm text-gray-400 py-2">Esta conversa foi encerrada.</p>
                ) : (
                  <div className="space-y-2">
                    {/* Banner do canal de resposta */}
                    <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border ${ch.bg} ${ch.border} ${ch.text}`}>
                      {CHANNEL_ICONS_LG[selected.channel]}
                      <span>Respondendo via <strong>{selected.channel}</strong></span>
                      {selected.social_account_name && <span className="opacity-60">· {selected.social_account_name}</span>}
                      {!isHuman && (
                        <span className="ml-auto text-yellow-600 font-normal flex items-center gap-1">
                          <UserCheck className="w-3 h-3" /> Clique em "Assumir" para ativar o envio
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Textarea
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder={`Digite sua resposta para ${selected.lead_name} via ${selected.channel}...`}
                        rows={2}
                        className="resize-none flex-1"
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || isSending}
                        className={`self-end gap-1.5 ${ch.button}`}
                      >
                        {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span className="text-xs">{selected.channel}</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}