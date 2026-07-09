import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import parseModelText from "./parseModelText";

const EXAMPLE = `CURSO: NR-35 – Trabalho em Altura
CARGA HORÁRIA: 8 horas
MODALIDADE: Presencial
VALIDADE: 12 meses
CONTEÚDO PROGRAMÁTICO:
- Normas e regulamentos - 2h
- Análise de risco - 2h
- EPIs e sistemas de ancoragem - 4h
RESPONSÁVEL TÉCNICO:
Nome do responsável`;

export default function SmartModelTextDialog({ open, onOpenChange, onApply }) {
  const [text, setText] = useState("");
  const parsed = useMemo(() => parseModelText(text), [text]);
  const hasData = parsed.name || parsed.duration || parsed.modality ||
    parsed.programmatic_content.length > 0 || parsed.technical_responsibles.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preencher modelo com texto</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Cole as informações do curso abaixo:</p>
            <textarea
              className="w-full border border-input rounded-md px-3 py-2 text-xs min-h-[260px] resize-y bg-background font-mono"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={EXAMPLE}
            />
          </div>
          <div className="space-y-2 text-xs bg-gray-50 border rounded-lg p-3">
            <p className="font-semibold text-gray-600 uppercase text-[10px] tracking-wider">Prévia interpretada</p>
            {!hasData ? (
              <p className="text-gray-400">Cole o texto para ver a prévia...</p>
            ) : (
              <>
                {parsed.name && <p><span className="text-gray-400">Curso:</span> <strong>{parsed.name}</strong></p>}
                {parsed.duration && <p><span className="text-gray-400">Carga Horária:</span> {parsed.duration}</p>}
                {parsed.modality && <p><span className="text-gray-400">Modalidade:</span> {parsed.modality}</p>}
                {parsed.validity_period_months != null && <p><span className="text-gray-400">Validade:</span> {parsed.validity_period_months} meses</p>}
                {parsed.programmatic_content.length > 0 && (
                  <div>
                    <p className="text-gray-400 mb-1">Conteúdo Programático:</p>
                    <ul className="space-y-0.5 pl-1">
                      {parsed.programmatic_content.map((c, i) => (
                        <li key={i}>• {c.module} {c.hours && <Badge variant="secondary" className="text-[9px] px-1 py-0">{c.hours}</Badge>}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {parsed.technical_responsibles.length > 0 && (
                  <p><span className="text-gray-400">Responsáveis:</span> {parsed.technical_responsibles.map(r => r.name).join(", ")}</p>
                )}
              </>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={!hasData}
            onClick={() => { onApply(parsed); setText(""); onOpenChange(false); }}
          >
            Aplicar ao modelo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}