import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { contratoAssinado, PAGAMENTOS_PENDENTES } from "./relatoriosUtils";

export default function RelatorioPendencias({ filtered, contractByEnrollment, preCadastros, onNavigate }) {
  const docsPend = preCadastros.filter((p) => (p.documentos || []).some((d) => ["Pendente de validação", "Nova foto solicitada"].includes(d.status_documento)));
  const docsRej = preCadastros.filter((p) => (p.documentos || []).some((d) => d.status_documento === "Rejeitado"));

  const linhas = [
    { label: "Aluno sem contrato assinado", itens: filtered.filter((e) => !contratoAssinado(contractByEnrollment[e.id])), aba: "contratos", cls: "text-blue-700" },
    { label: "Aluno com pagamento pendente", itens: filtered.filter((e) => PAGAMENTOS_PENDENTES.includes(e.status_pagamento)), aba: "financeiro", cls: "text-amber-700" },
    { label: "Aluno com documento pendente", itens: docsPend, aba: "precadastros", cls: "text-amber-700" },
    { label: "Aluno com documento rejeitado", itens: docsRej, aba: "precadastros", cls: "text-red-700" },
    { label: "Matrícula sem data de início/término", itens: filtered.filter((e) => !e.start_date || !e.end_date), aba: "matriculas", cls: "text-red-700" },
    { label: "Matrícula sem curso", itens: filtered.filter((e) => !e.course_id && !e.course_name), aba: "matriculas", cls: "text-red-700" },
    { label: "Matrícula sem resultado acadêmico", itens: filtered.filter((e) => !e.resultado_academico || e.resultado_academico === "Pendente"), aba: "matriculas", cls: "text-gray-700" },
    { label: "Aprovado com financeiro pendente", itens: filtered.filter((e) => e.resultado_academico === "Aprovado" && PAGAMENTOS_PENDENTES.includes(e.status_pagamento)), aba: "pendencias", cls: "text-red-700" },
    { label: "Apto para certificação", itens: filtered.filter((e) => e.apto_certificacao), aba: "matriculas", cls: "text-emerald-700" },
    { label: "Bloqueado para certificação", itens: filtered.filter((e) => e.bloqueio_certificacao), aba: "matriculas", cls: "text-red-700" },
  ];

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Relatório de Pendências
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {linhas.map((l) => (
            <div key={l.label} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`text-lg font-bold w-8 text-right ${l.itens.length > 0 ? l.cls : "text-gray-300"}`}>{l.itens.length}</span>
                <div className="min-w-0">
                  <p className="text-sm text-gray-800">{l.label}</p>
                  {l.itens.length > 0 && (
                    <p className="text-[11px] text-gray-400 truncate max-w-md">
                      {l.itens.slice(0, 3).map((i) => i.student_name || i.nome_completo).join(", ")}
                      {l.itens.length > 3 ? ` +${l.itens.length - 3}` : ""}
                    </p>
                  )}
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0" onClick={() => onNavigate(l.aba)}>
                Abrir <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}