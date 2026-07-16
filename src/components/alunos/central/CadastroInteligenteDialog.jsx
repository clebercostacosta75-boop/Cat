import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function CadastroInteligenteDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState("entrada"); // entrada | previa
  const [texto, setTexto] = useState("");
  const [analisando, setAnalisando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [previa, setPrevia] = useState(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => base44.entities.Course.list("-name", 200),
    enabled: open,
  });

  const set = (field, value) => setPrevia((p) => ({ ...p, [field]: value }));

  const analisar = async () => {
    if (!texto.trim()) { toast.error("Cole o texto de divulgação do curso."); return; }
    setAnalisando(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um assistente de cadastro de ofertas de cursos de um centro de treinamento em segurança do trabalho (CAT Cursos, Pará, Brasil).
Analise o texto de divulgação abaixo e extraia os campos da oferta. Não invente dados: deixe em branco o que não estiver no texto.
Datas no formato YYYY-MM-DD. Valores numéricos sem "R$".

TEXTO:
${texto}`,
        response_json_schema: {
          type: "object",
          properties: {
            nome_comercial: { type: "string" },
            carga_horaria: { type: "string" },
            valor: { type: "number" },
            vagas_total: { type: "number" },
            data_inicio: { type: "string" },
            data_termino: { type: "string" },
            horario: { type: "string" },
            local: { type: "string" },
            modalidade: { type: "string", enum: ["Presencial", "Online", "Híbrido"] },
            sales_description: { type: "string" },
            enrollment_instructions: { type: "string" },
          },
        },
      });
      setPrevia({ course_id: "", ...result });
      setStep("previa");
    } catch (err) {
      toast.error("Erro na análise: " + err.message);
    } finally {
      setAnalisando(false);
    }
  };

  const salvarRascunho = async () => {
    if (!previa?.course_id) { toast.error("Selecione o curso-base vinculado."); return; }
    if (!previa?.nome_comercial) { toast.error("Informe o nome comercial da oferta."); return; }
    setSalvando(true);
    try {
      const course = courses.find((c) => c.id === previa.course_id);
      const offer = await base44.entities.CourseOffer.create({
        course_id: previa.course_id,
        course_name: course?.name || "",
        nome_comercial: previa.nome_comercial,
        carga_horaria: previa.carga_horaria || "",
        valor: Number(previa.valor) || 0,
        vagas_total: Number(previa.vagas_total) || 0,
        data_inicio: previa.data_inicio || undefined,
        data_termino: previa.data_termino || undefined,
        horario: previa.horario || "",
        local: previa.local || "",
        modalidade: previa.modalidade || undefined,
        sales_description: previa.sales_description || "",
        enrollment_instructions: previa.enrollment_instructions || "",
        publication_status: "Draft",
        created_from_ai: true,
        ai_source_text: texto,
        ai_review_status: "Revisado",
        status: "Aberta",
      });

      let user = null;
      try { user = await base44.auth.me(); } catch { /* ignore */ }
      await base44.entities.AuditLog.create({
        user_email: user?.email || "desconhecido",
        user_name: user?.full_name || user?.email || "Operador",
        action: "create",
        entity_type: "CourseOffer",
        entity_id: offer.id,
        entity_name: previa.nome_comercial,
        details: `Oferta criada via Cadastro Inteligente (IA sugeriu, operador revisou e confirmou). Salva como RASCUNHO — não publicada. ${new Date().toLocaleString("pt-BR")}`,
      });

      toast.success("Oferta salva como rascunho (não publicada). Revise e publique quando desejar.");
      queryClient.invalidateQueries({ queryKey: ["central-offers"] });
      setStep("entrada"); setTexto(""); setPrevia(null);
      onClose();
    } catch (err) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-violet-600" /> Cadastro Inteligente de Oferta</DialogTitle>
        </DialogHeader>

        {step === "entrada" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Cole o texto de divulgação do curso (post, panfleto, mensagem). A IA apenas <strong>sugere</strong> os campos — você revisa e confirma antes de salvar. Nada é publicado automaticamente.</p>
            <Textarea rows={8} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex: Curso NR-35 Trabalho em Altura — 8h — dias 20 e 21/08 — R$ 250,00 — Local: CAT Belém..." />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button className="bg-violet-700 hover:bg-violet-800" onClick={analisar} disabled={analisando}>
                {analisando ? "Analisando..." : "Analisar com IA"}
              </Button>
            </div>
          </div>
        )}

        {step === "previa" && previa && (
          <div className="space-y-3">
            <p className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-md p-2.5">✨ Prévia sugerida pela IA. Revise e ajuste os campos antes de confirmar. A oferta será salva como <strong>Rascunho</strong>.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>Curso-base vinculado *</Label>
                <Select value={previa.course_id} onValueChange={(v) => set("course_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o curso-base" /></SelectTrigger>
                  <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Nome comercial *</Label>
                <Input value={previa.nome_comercial || ""} onChange={(e) => set("nome_comercial", e.target.value)} />
              </div>
              <div><Label>Carga horária</Label><Input value={previa.carga_horaria || ""} onChange={(e) => set("carga_horaria", e.target.value)} /></div>
              <div><Label>Valor (R$)</Label><Input type="number" value={previa.valor ?? ""} onChange={(e) => set("valor", e.target.value)} /></div>
              <div><Label>Vagas</Label><Input type="number" value={previa.vagas_total ?? ""} onChange={(e) => set("vagas_total", e.target.value)} /></div>
              <div>
                <Label>Modalidade</Label>
                <Select value={previa.modalidade || ""} onValueChange={(v) => set("modalidade", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Presencial">Presencial</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="Híbrido">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Data início</Label><Input type="date" value={previa.data_inicio || ""} onChange={(e) => set("data_inicio", e.target.value)} /></div>
              <div><Label>Data término</Label><Input type="date" value={previa.data_termino || ""} onChange={(e) => set("data_termino", e.target.value)} /></div>
              <div><Label>Horário</Label><Input value={previa.horario || ""} onChange={(e) => set("horario", e.target.value)} /></div>
              <div><Label>Local</Label><Input value={previa.local || ""} onChange={(e) => set("local", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Descrição comercial</Label><Textarea rows={2} value={previa.sales_description || ""} onChange={(e) => set("sales_description", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Instruções de matrícula</Label><Textarea rows={2} value={previa.enrollment_instructions || ""} onChange={(e) => set("enrollment_instructions", e.target.value)} /></div>
            </div>
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("entrada")}>← Voltar</Button>
              <Button className="bg-gray-900 hover:bg-gray-800" onClick={salvarRascunho} disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar como Rascunho"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}