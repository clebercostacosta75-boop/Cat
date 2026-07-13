import React from "react";
import { EVENTOS, VARIAVEIS_DISPONIVEIS } from "@/lib/comunicacao";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AbaTemplates() {
  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Variáveis disponíveis</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-1.5">
          {VARIAVEIS_DISPONIVEIS.map((v) => (
            <Badge key={v} variant="secondary" className="font-mono text-xs">{v}</Badge>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Templates de eventos ({EVENTOS.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {EVENTOS.map((ev) => (
            <details key={ev.key} className="border rounded-md px-3 py-2">
              <summary className="text-sm font-medium text-gray-800 cursor-pointer">
                {ev.label} <span className="text-xs text-gray-400 font-mono ml-1">({ev.key})</span>
              </summary>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap mt-2 bg-gray-50 rounded p-2">{ev.template}</pre>
            </details>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}