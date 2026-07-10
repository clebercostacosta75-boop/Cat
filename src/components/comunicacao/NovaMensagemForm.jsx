import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  EVENTOS, CANAIS, montarVariaveis, preencherTemplate, templateEvento, templateResultado,
  prepararMensagem, montarWaLink, auditarComunicacao,
} from "@/lib/comunicacao";

// FASE 6 — Preparar nova mensagem: evento + canal → texto preenchido automaticamente (zero digitação)
export default function NovaMensagemForm({ enrollment, contrato, lancamento, modelos = [], user, onCreated }) {
  const [evento, setEvento] = useState("inscricao_confirmada");
  const [canal, setCanal] = useState("WhatsApp");
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);

  const vars = montarVariaveis({ enrollment, contrato, lancamento, extras: { resultado: enrollment.resultado_academico } });
  const destinatario = canal === "E-mail" ? enrollment.student_email : enrollment.student_phone;
  const modeloAtivo = modelos.find((m) => m.evento === evento && m.canal === canal && m.ativo);

  useEffect(() => {
    const base = modeloAtivo?.texto
      || (evento === "resultado_academico" ? templateResultado(enrollment.resultado_academico) : templateEvento(evento));
    setTexto(preencherTemplate(base, vars));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evento, canal]);

  const preparar = async (extra = {}) => {
    setSaving(true);
    const registro = await prepararMensagem({
      enrollment, evento, canal, mensagem: texto, user,
      modeloId: modeloAtivo?.id || "", ...extra,
    });
    setSaving(false);
    onCreated();
    return registro;
  };

  const handlePreparar = async () => {
    await preparar();
    toast.success("Mensagem preparada e registrada no histórico!");
  };

  const handleCopiar = async () => {
    navigator.clipboard.writeText(texto);
    const registro = await preparar();
    await auditarComunicacao({ user, acao: "view", registro, enrollment, detalhes: "mensagem preparada e COPIADA pelo operador" });
    toast.success("Mensagem copiada e registrada!");
  };

  const handleWhatsApp = async () => {
    const link = montarWaLink(enrollment.student_phone, texto);
    if (!link) {
      await preparar(); // registra a falha (sem contato)
      toast.error("Aluno sem WhatsApp válido cadastrado — falha registrada.");
      return;
    }
    window.open(link, "_blank");
    const registro = await preparar({ status: "WhatsApp aberto para envio manual" });
    await auditarComunicacao({ user, acao: "send_whatsapp", registro, enrollment, detalhes: "WhatsApp ABERTO para envio manual" });
    toast.success("WhatsApp aberto com a mensagem preenchida!");
  };

  return (
    <div className="border rounded-lg p-3 bg-indigo-50/50 border-indigo-200 space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Evento</Label>
          <Select value={evento} onValueChange={setEvento}>
            <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EVENTOS.map((e) => <SelectItem key={e.key} value={e.key} className="text-xs">{e.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Canal</Label>
          <Select value={canal} onValueChange={setCanal}>
            <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CANAIS.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}{c === "SMS" ? " (sem integração — copiar)" : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-[10px] text-gray-500">
        Destinatário: <strong>{destinatario || "⚠ sem contato cadastrado"}</strong>
        {modeloAtivo ? <> • Modelo: <strong>{modeloAtivo.nome}</strong></> : " • Modelo padrão do sistema"}
        {" "}• CPF protegido (mascarado)
      </p>

      <Textarea rows={8} value={texto} onChange={(e) => setTexto(e.target.value)} className="text-xs bg-white font-mono" />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="h-7 text-xs bg-indigo-700 hover:bg-indigo-800" onClick={handlePreparar} disabled={saving}>
          {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null} Preparar Mensagem
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleCopiar} disabled={saving}>
          <Copy className="w-3 h-3 mr-1" /> Preparar + Copiar
        </Button>
        {canal === "WhatsApp" && (
          <Button size="sm" variant="outline" className="h-7 text-xs border-green-400 text-green-700 hover:bg-green-50" onClick={handleWhatsApp} disabled={saving}>
            <MessageCircle className="w-3 h-3 mr-1" /> Preparar + Abrir WhatsApp
          </Button>
        )}
      </div>
      <p className="text-[10px] text-gray-400 italic">Modo semiautomático: nenhuma mensagem é disparada sem confirmação do operador. O envio de e-mail real é feito pelo histórico, com confirmação.</p>
    </div>
  );
}