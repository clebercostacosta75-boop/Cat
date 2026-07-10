import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, MessageCircle, Mail, RotateCcw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { montarWaLink, auditarComunicacao } from "@/lib/comunicacao";

const STATUS_STYLE = {
  "Preparada": "bg-blue-100 text-blue-800",
  "Enviada": "bg-green-100 text-green-800",
  "Entregue": "bg-green-100 text-green-800",
  "Visualizada": "bg-emerald-100 text-emerald-800",
  "Falha no envio": "bg-red-100 text-red-700",
  "Cancelada": "bg-gray-100 text-gray-600",
  "Aguardando confirmação do operador": "bg-amber-100 text-amber-800",
  "WhatsApp aberto para envio manual": "bg-teal-100 text-teal-800",
};

// FASE 6 — item do histórico de comunicações com ações (copiar, WhatsApp, e-mail, reenviar, resolver)
export default function MensagemItem({ msg, user, onRefresh }) {
  const [expanded, setExpanded] = React.useState(false);

  const copiar = async () => {
    navigator.clipboard.writeText(msg.mensagem);
    toast.success("Mensagem copiada!");
    await auditarComunicacao({ user, acao: "view", registro: msg, detalhes: "mensagem COPIADA pelo operador" });
  };

  const abrirWhatsApp = async () => {
    const link = montarWaLink(msg.destinatario, msg.mensagem);
    if (!link) { toast.error("Sem telefone válido para WhatsApp."); return; }
    window.open(link, "_blank");
    await base44.entities.MensagemComunicacao.update(msg.id, { status: "WhatsApp aberto para envio manual" });
    await auditarComunicacao({ user, acao: "send_whatsapp", registro: { ...msg, status: "WhatsApp aberto para envio manual" }, detalhes: "WhatsApp ABERTO para envio manual pelo operador" });
    onRefresh();
  };

  const enviarEmail = async () => {
    if (!msg.destinatario || !msg.destinatario.includes("@")) { toast.error("Sem e-mail válido."); return; }
    if (!window.confirm(`Enviar e-mail REAL para ${msg.destinatario}?`)) return;
    try {
      await base44.integrations.Core.SendEmail({
        to: msg.destinatario,
        subject: `CAT Cursos — ${msg.evento_label || "Comunicação"}`,
        body: msg.mensagem,
        from_name: "CAT Cursos",
      });
      await base44.entities.MensagemComunicacao.update(msg.id, { status: "Enviada" });
      await auditarComunicacao({ user, acao: "create", registro: { ...msg, status: "Enviada" }, detalhes: "e-mail ENVIADO pelo operador" });
      toast.success("E-mail enviado!");
    } catch (e) {
      await base44.entities.MensagemComunicacao.update(msg.id, { status: "Falha no envio", erro: e.message });
      await auditarComunicacao({ user, acao: "create", registro: { ...msg, status: "Falha no envio", erro: e.message }, detalhes: "FALHA no envio de e-mail" });
      toast.error("Falha no envio: " + e.message);
    }
    onRefresh();
  };

  const reenviar = async () => {
    const novo = await base44.entities.MensagemComunicacao.create({
      ...["enrollment_id", "student_id", "student_name", "curso_nome", "pacote_nome", "evento", "evento_label", "canal", "destinatario", "mensagem", "atendente_nome"].reduce((a, k) => ({ ...a, [k]: msg[k] || "" }), {}),
      status: "Preparada", origem: "operador", operador: user?.email || "sistema",
    });
    await auditarComunicacao({ user, acao: "create", registro: novo, detalhes: "mensagem REENVIADA (nova preparação a partir do histórico)" });
    toast.success("Mensagem preparada novamente!");
    onRefresh();
  };

  const resolver = async () => {
    await base44.entities.MensagemComunicacao.update(msg.id, { resolvido: true });
    onRefresh();
  };

  return (
    <div className={`border rounded-lg p-2.5 ${msg.status === "Falha no envio" ? "border-red-200 bg-red-50/50" : "bg-white"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className={`text-[10px] ${STATUS_STYLE[msg.status] || "bg-gray-100 text-gray-700"}`}>{msg.status}</Badge>
            <Badge variant="outline" className="text-[10px]">{msg.canal}</Badge>
            {msg.resolvido && <Badge className="text-[10px] bg-gray-100 text-gray-500">Resolvida</Badge>}
          </div>
          <p className="text-xs font-semibold text-gray-800 mt-1">{msg.evento_label || msg.evento}</p>
          <p className="text-[10px] text-gray-400">
            {new Date(msg.created_date).toLocaleString("pt-BR")} • {msg.destinatario || "sem contato"} • {msg.operador}
            {msg.origem !== "operador" ? ` • origem: ${msg.origem}` : ""}
          </p>
          {msg.erro && <p className="text-[10px] text-red-600 mt-0.5">⚠ {msg.erro}</p>}
          {expanded && <pre className="text-[11px] text-gray-700 whitespace-pre-wrap mt-2 p-2 bg-gray-50 rounded border font-sans">{msg.mensagem}</pre>}
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={copiar}><Copy className="w-3 h-3 mr-1" />Copiar</Button>
        {msg.canal === "WhatsApp" && (
          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-green-300 text-green-700" onClick={abrirWhatsApp}><MessageCircle className="w-3 h-3 mr-1" />Abrir WhatsApp</Button>
        )}
        {msg.canal === "E-mail" && (
          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-blue-300 text-blue-700" onClick={enviarEmail}><Mail className="w-3 h-3 mr-1" />Enviar E-mail</Button>
        )}
        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={reenviar}><RotateCcw className="w-3 h-3 mr-1" />Reenviar</Button>
        {!msg.resolvido && (
          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-gray-500" onClick={resolver}><CheckCircle2 className="w-3 h-3 mr-1" />Resolver</Button>
        )}
      </div>
    </div>
  );
}