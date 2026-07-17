import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Building2, Mail, MessageCircle, RefreshCw, CheckCircle, AlertTriangle, Search, CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { processarFilaAgora } from "@/lib/filaComunicacao";

const fmtBR = (d) => (d ? String(d).slice(0, 10).split("-").reverse().join("/") : "—");

const MARCO_STYLE = {
  5: "bg-red-100 text-red-700 border-red-200",
  15: "bg-orange-100 text-orange-700 border-orange-200",
  30: "bg-yellow-100 text-yellow-700 border-yellow-200",
  45: "bg-blue-100 text-blue-700 border-blue-200",
};

function LinhaAlerta({ a, onSend, sending }) {
  const btn = (canal, sentAt) => {
    const isSending = sending === `${a.certificate_id}|${canal}`;
    const Icon = canal === "email" ? Mail : MessageCircle;
    return (
      <Button
        size="sm" variant={sentAt ? "outline" : "default"}
        className={`text-xs h-7 px-2 gap-1 ${sentAt ? "" : canal === "email" ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}`}
        disabled={isSending}
        onClick={() => onSend(a, canal, !!sentAt)}
        title={sentAt ? `Enviado em ${new Date(sentAt).toLocaleString("pt-BR")} — clique para reenviar` : `Enviar ${canal === "email" ? "e-mail" : "WhatsApp"}`}
      >
        {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : sentAt ? <CheckCircle className="w-3 h-3 text-green-600" /> : <Icon className="w-3 h-3" />}
        {sentAt ? "Reenviar" : canal === "email" ? "E-mail" : "WhatsApp"}
      </Button>
    );
  };
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-3 py-2">
        <p className="text-sm font-medium text-gray-900">{a.student_name}</p>
        <p className="text-xs text-gray-500">{a.student_cpf}</p>
      </td>
      <td className="px-3 py-2 text-xs text-gray-600">{a.client_name || "—"}</td>
      <td className="px-3 py-2 text-xs text-gray-600">{a.course_name}</td>
      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{fmtBR(a.end_date)}</td>
      <td className="px-3 py-2 text-xs font-medium text-gray-800 whitespace-nowrap">{fmtBR(a.valid_until)}</td>
      <td className="px-3 py-2 whitespace-nowrap">
        <Badge className={MARCO_STYLE[a.marco] || "bg-gray-100 text-gray-700"}>{a.days_remaining} dia(s)</Badge>
      </td>
      <td className="px-3 py-2 text-xs text-gray-500">
        <div>{a.student_email || "sem e-mail"}</div>
        <div>{a.student_phone || "sem WhatsApp"}</div>
      </td>
      <td className="px-3 py-2 text-xs">
        {a.sent_email || a.sent_whatsapp ? (
          <span className="text-green-700 font-medium">Notificado</span>
        ) : (
          <span className="text-gray-400">Pendente</span>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">{btn("email", a.sent_email)}{btn("whatsapp", a.sent_whatsapp)}</div>
      </td>
    </tr>
  );
}

function TabelaMarco({ marco, items, onSend, sending }) {
  if (items.length === 0) return null;
  return (
    <Card className={`border ${MARCO_STYLE[marco] || ""}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <CalendarClock className="w-4 h-4" /> Marco de {marco} dias
          <Badge variant="secondary">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
              <th className="px-3 py-2 font-medium">Aluno / CPF</th>
              <th className="px-3 py-2 font-medium">Empresa</th>
              <th className="px-3 py-2 font-medium">Curso</th>
              <th className="px-3 py-2 font-medium">Término</th>
              <th className="px-3 py-2 font-medium">Vencimento</th>
              <th className="px-3 py-2 font-medium">Restam</th>
              <th className="px-3 py-2 font-medium">Contatos</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => <LinhaAlerta key={a.certificate_id} a={a} onSend={onSend} sending={sending} />)}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default function AlertasVencimentoEmpresas() {
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(null);
  const [confirming, setConfirming] = useState(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["alertasVencimentoEmpresas"],
    queryFn: async () => (await base44.functions.invoke("alertasVencimentoEmpresas", { action: "list" })).data,
    staleTime: 60000,
  });

  const q = search.toLowerCase();
  const match = (a) => !q || a.student_name?.toLowerCase().includes(q) || a.client_name?.toLowerCase().includes(q) || a.course_name?.toLowerCase().includes(q) || a.student_cpf?.includes(q);
  const alerts = (data?.alerts || []).filter(match);
  const pendencias = (data?.pendencias || []).filter(match);
  const vencidos = (data?.vencidos || []).filter(match);
  const marcos = [...(data?.marcos || [])].sort((a, b) => a - b);

  const handleSend = async (a, canal, isResend) => {
    if (isResend && !window.confirm(`Este alerta de ${a.marco} dias já foi enviado por ${canal === "email" ? "e-mail" : "WhatsApp"}. Confirmar REENVIO manual? (ficará registrado na auditoria)`)) return;
    setSending(`${a.certificate_id}|${canal}`);
    try {
      const res = await base44.functions.invoke("alertasVencimentoEmpresas", {
        action: "enviar", canal, marco: a.marco, certificate_ids: [a.certificate_id], resend: isResend,
      });
      const r = res.data;
      if (r.enfileirados > 0) {
        toast.success(`Alerta enfileirado na fila oficial de ${canal === "email" ? "e-mail" : "WhatsApp"}.`);
        processarFilaAgora().catch(() => {});
      } else if (r.duplicados > 0) {
        toast.warning("Já enviado para este certificado, prazo e canal. Use o reenvio explícito.");
      } else if (r.sem_contato > 0) {
        toast.error("Sem contato disponível (aluno e empresa) para este canal.");
      } else {
        toast.warning("Certificado ignorado (revogado, substituído ou sem validade).");
      }
      refetch();
    } catch (e) {
      toast.error("Erro ao enviar: " + (e.response?.data?.error || e.message));
    } finally {
      setSending(null);
    }
  };

  const handleConfirmarValidade = async (p) => {
    if (!p.sugestao_valid_until) { toast.error("Sem sugestão calculável — vincule o modelo/período no Designer de Certificados."); return; }
    if (!window.confirm(`Confirmar validade de ${p.student_name} — ${p.course_name} como ${fmtBR(p.sugestao_valid_until)}?\n\nBase: ${p.sugestao_origem}`)) return;
    setConfirming(p.certificate_id);
    try {
      await base44.functions.invoke("alertasVencimentoEmpresas", {
        action: "confirmar_validade", certificate_id: p.certificate_id,
        valid_until: p.sugestao_valid_until, base_calculo: p.sugestao_origem,
      });
      toast.success("Validade confirmada e registrada na auditoria.");
      refetch();
    } catch (e) {
      toast.error("Erro: " + (e.response?.data?.error || e.message));
    } finally {
      setConfirming(null);
    }
  };

  if (isLoading) return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-500" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input placeholder="Filtrar por aluno, CPF, curso ou empresa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          {isFetching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {marcos.map((m) => (
          <Card key={m} className={`border ${MARCO_STYLE[m] || ""}`}>
            <CardContent className="pt-3 pb-2">
              <div className="text-2xl font-bold">{alerts.filter((a) => a.marco === m).length}</div>
              <div className="text-xs font-medium">Marco {m} dias</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {alerts.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
          <p>Nenhum certificado de empresa nos marcos de {marcos.join(", ")} dias.</p>
        </div>
      )}
      {marcos.map((m) => (
        <TabelaMarco key={m} marco={m} items={alerts.filter((a) => a.marco === m)} onSend={handleSend} sending={sending} />
      ))}

      {pendencias.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Pendências — validade não definida <Badge variant="secondary">{pendencias.length}</Badge>
            </CardTitle>
            <p className="text-xs text-amber-700">A validade nunca é inventada: confirme a sugestão do modelo oficial ou complete o cadastro do certificado.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendencias.map((p) => (
              <div key={p.certificate_id} className="flex flex-wrap items-center justify-between gap-2 p-2 rounded border border-amber-100 bg-amber-50">
                <div className="text-xs">
                  <p className="font-medium text-gray-900">{p.student_name} <span className="text-gray-500">({p.student_cpf})</span> — {p.course_name}</p>
                  <p className="text-gray-600">{p.client_name || "—"} · Término: {fmtBR(p.end_date)} · <span className="text-amber-700">{p.motivo}</span></p>
                  {p.sugestao_valid_until && <p className="text-gray-500">Sugestão: <strong>{fmtBR(p.sugestao_valid_until)}</strong> — {p.sugestao_origem}</p>}
                </div>
                <Button size="sm" variant="outline" className="text-xs h-7" disabled={!p.sugestao_valid_until || confirming === p.certificate_id} onClick={() => handleConfirmarValidade(p)}>
                  {confirming === p.certificate_id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirmar validade"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {vencidos.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-red-800 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Vencidos <Badge className="bg-red-600 text-white">{vencidos.length}</Badge>
            </CardTitle>
            <p className="text-xs text-red-700">Exibidos apenas para controle — os avisos prévios não se repetem após o vencimento.</p>
          </CardHeader>
          <CardContent className="space-y-1">
            {vencidos.map((v) => (
              <div key={v.certificate_id} className="flex flex-wrap justify-between gap-2 p-2 rounded border border-red-100 bg-red-50 text-xs">
                <span className="font-medium text-gray-900">{v.student_name} ({v.student_cpf}) — {v.course_name} · {v.client_name || "—"}</span>
                <span className="text-red-700 font-medium">Venceu em {fmtBR(v.valid_until)} ({Math.abs(v.days_remaining)} dia(s) atrás)</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}