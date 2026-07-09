import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { REQUIRED_FIELDS_BY_TYPE } from "./courseTypeFields";

function Row({ label, value }) {
  return (
    <div className="flex gap-2 text-xs py-1 border-b border-gray-100 last:border-0">
      <span className="text-gray-400 w-36 flex-shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value || <em className="text-gray-300 font-normal">— não preenchido —</em>}</span>
    </div>
  );
}

export default function ModelReviewDialog({ open, onOpenChange, form, onConfirm, saving }) {
  const courseType = form.course_type || "Outro";
  const requiredFields = REQUIRED_FIELDS_BY_TYPE[courseType] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisão antes de salvar</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Row label="Nome do Modelo" value={form.name} />
            <Row label="Curso vinculado" value={form.name} />
            <Row label="Carga Horária" value={form.duration} />
            <Row label="Modalidade" value={form.modality} />
            <Row label="Tipo do Curso" value={courseType} />
            <Row label="Validade" value={form.validity_period_months ? `${form.validity_period_months} meses` : ""} />
            <Row
              label="Conteúdo Program."
              value={(form.programmatic_content || []).length > 0
                ? `${form.programmatic_content.length} módulo(s): ${form.programmatic_content.map(c => c.module).filter(Boolean).join("; ")}`
                : ""}
            />
            <Row
              label="Resp. Técnicos"
              value={(form.technical_responsibles || []).length > 0
                ? form.technical_responsibles.map(r => r.name).filter(Boolean).join(", ")
                : ""}
            />
          </div>
          <div className="bg-gray-50 border rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Campos obrigatórios detectados ({courseType})</p>
            <div className="flex flex-wrap gap-1">
              {requiredFields.map(f => <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>)}
            </div>
          </div>
          <p className="text-[11px] text-gray-400">A pré-visualização da frente e do verso está visível no painel à direita do editor.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Voltar e editar</Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={onConfirm} disabled={saving}>
            {saving ? "Salvando..." : "Confirmar e Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}