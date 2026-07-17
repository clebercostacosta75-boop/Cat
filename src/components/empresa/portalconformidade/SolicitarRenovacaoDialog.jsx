import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Info, RefreshCw } from "lucide-react";

export default function SolicitarRenovacaoDialog({ aberto, onFechar, certificados = [], companyId, onCriada, prazoOrigem = "" }) {
  const [titulo, setTitulo] = useState("");
  const [colaboradores, setColaboradores] = useState("");
  const [motivo, setMotivo] = useState("");
  const [prazo, setPrazo] = useState("");
  const [unidade, setUnidade] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!aberto) return;
    const cursos = [...new Set(certificados.map((c) => c.course_name).filter(Boolean))];
    setTitulo(cursos.join(" / "));
    setColaboradores([...new Set(certificados.map((c) => c.student_name).filter(Boolean))].join(", "));
    setMotivo("");
    setPrazo("");
    setUnidade("");
    setMsg(null);
  }, [aberto, certificados]);

  const enviar = async () => {
    if (!titulo.trim() || !motivo.trim()) {
      setMsg({ erro: true, texto: "Informe o curso/treinamento e o motivo da solicitação." });
      return;
    }
    setEnviando(true);
    setMsg(null);
    try {
      const nomes = colaboradores.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await base44.functions.invoke("portalEmpresaConformidade", {
        action: "solicitar_renovacao",
        company_id: companyId,
        titulo: titulo.trim(),
        descricao: `Motivo: ${motivo.trim()}${unidade ? `\nUnidade: ${unidade}` : ""}\nSolicitado via Portal da Empresa — Central de Conformidade.`,
        colaboradores_nomes: colaboradores,
        numero_participantes: nomes.length || undefined,
        data_preferencial: prazo || undefined,
        course_name: titulo.trim(),
        student_ids: [...new Set(certificados.map((c) => c.student_id).filter(Boolean))],
        student_names: nomes,
        certificate_ids: certificados.map((c) => c.id),
        motivo_renovacao: motivo.trim(),
        prazo_alerta_origem: prazoOrigem,
      });
      if (res.data?.duplicada) {
        setMsg({ erro: true, texto: "Já existe uma solicitação idêntica em aberto. Acompanhe na aba Solicitações." });
      } else {
        setMsg({ erro: false, texto: "Solicitação enviada para análise da CAT." });
        onCriada?.();
        setTimeout(onFechar, 1200);
      }
    } catch (e) {
      setMsg({ erro: true, texto: e?.response?.data?.error || "Erro ao enviar a solicitação. Tente novamente." });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Solicitar renovação/reciclagem à CAT</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Esta solicitação é enviada apenas para análise interna da CAT. Nenhuma matrícula, turma, cobrança ou certificado é criado automaticamente. A aprovação é feita exclusivamente pela equipe CAT.</span>
          </div>
          <div><Label className="text-xs">Curso/Treinamento *</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: NR-35 – Trabalho em Altura" /></div>
          <div><Label className="text-xs">Colaborador(es)</Label><Textarea rows={2} value={colaboradores} onChange={(e) => setColaboradores(e.target.value)} placeholder="Nomes separados por vírgula" /></div>
          <div><Label className="text-xs">Motivo *</Label><Textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: certificados vencendo em 30 dias" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Prazo desejado</Label><Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></div>
            <div><Label className="text-xs">Unidade (opcional)</Label><Input value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="Ex.: Matriz" /></div>
          </div>
          {msg && <p className={`text-xs ${msg.erro ? "text-red-600" : "text-green-600"}`}>{msg.texto}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onFechar} disabled={enviando}>Cancelar</Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={enviar} disabled={enviando}>
              {enviando && <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />} Enviar solicitação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}