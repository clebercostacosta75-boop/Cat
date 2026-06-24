import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { differenceInDays, parseISO, format } from "date-fns";
import { FileText, Download } from "lucide-react";

const RELATORIOS = [
  { id: "sst", label: "Relatório de Conformidade SST", desc: "Todos os documentos PGR, PCMSO, LTCAT com status" },
  { id: "asos", label: "Relatório de Colaboradores e ASOs", desc: "Lista de colaboradores com status de ASO" },
  { id: "epis", label: "Relatório de EPIs", desc: "Estoque, entregas e vencimentos de EPI" },
  { id: "treinamentos", label: "Relatório de Treinamentos e Certificados", desc: "Cursos realizados, certificados e validades" },
  { id: "alertas", label: "Relatório de Alertas e Pendências", desc: "Todos os alertas ativos e pendências" },
];

export default function C360Relatorios({ empresa, pgrs, pcmsos, ltcats, colaboradores, asos, entregas, certificados, alertas }) {
  const [open, setOpen] = useState(null);

  const docStatus = (vf) => {
    if (!vf) return "Sem Vigência";
    const d = differenceInDays(parseISO(vf), new Date());
    if (d < 0) return "Vencido";
    if (d <= 90) return `Vencendo (${d}d)`;
    return "Vigente";
  };

  const renderRelatorio = () => {
    if (open === "sst") return (
      <div className="space-y-3 text-sm">
        <h3 className="font-semibold">PGR ({pgrs?.length || 0})</h3>
        {(pgrs || []).map(d => <div key={d.id} className="border rounded p-2 flex justify-between"><span>{d.empresa_nome}</span><Badge className="text-xs">{docStatus(d.vigencia_fim)}</Badge></div>)}
        <h3 className="font-semibold mt-3">PCMSO ({pcmsos?.length || 0})</h3>
        {(pcmsos || []).map(d => <div key={d.id} className="border rounded p-2 flex justify-between"><span>{d.empresa_nome}</span><Badge className="text-xs">{docStatus(d.vigencia_fim)}</Badge></div>)}
        <h3 className="font-semibold mt-3">LTCAT ({ltcats?.length || 0})</h3>
        {(ltcats || []).map(d => <div key={d.id} className="border rounded p-2 flex justify-between"><span>{d.empresa_nome}</span><Badge className="text-xs">{docStatus(d.vigencia_fim)}</Badge></div>)}
      </div>
    );
    if (open === "asos") return (
      <div className="space-y-2 text-sm">
        {(colaboradores || []).map(c => {
          const meuAso = (asos || []).filter(a => a.colaborador_sst_id === c.id);
          return (
            <div key={c.id} className="border rounded p-2">
              <p className="font-medium">{c.nome} — {c.funcao || c.cargo}</p>
              <p className="text-xs text-gray-500">ASOs: {meuAso.length} | Último: {meuAso[0]?.data_exame || "—"}</p>
            </div>
          );
        })}
        {(colaboradores || []).length === 0 && <p className="text-gray-400">Sem colaboradores</p>}
      </div>
    );
    if (open === "epis") return (
      <div className="space-y-2 text-sm">
        <p className="font-semibold">Entregas ({entregas?.length || 0})</p>
        {(entregas || []).slice(0, 30).map(e => (
          <div key={e.id} className="border rounded p-2 flex justify-between">
            <span>{e.nome_colaborador} — {e.epi_nome}</span>
            <span className="text-xs text-gray-500">{e.data_entrega}</span>
          </div>
        ))}
      </div>
    );
    if (open === "treinamentos") return (
      <div className="space-y-2 text-sm">
        {(certificados || []).map(c => (
          <div key={c.id} className="border rounded p-2 flex justify-between">
            <div><p className="font-medium">{c.student_name}</p><p className="text-xs text-gray-500">{c.course_name}</p></div>
            <Badge className="text-xs">{docStatus(c.valid_until)}</Badge>
          </div>
        ))}
        {(certificados || []).length === 0 && <p className="text-gray-400">Sem certificados</p>}
      </div>
    );
    if (open === "alertas") return (
      <div className="space-y-2 text-sm">
        {(alertas || []).map(a => (
          <div key={a.id} className="border rounded p-2 flex justify-between">
            <div><p className="font-medium">{a.descricao}</p><p className="text-xs text-gray-500">{a.tipo_alerta}</p></div>
            <Badge className="text-xs">{a.prioridade}</Badge>
          </div>
        ))}
        {(alertas || []).length === 0 && <p className="text-gray-400">Nenhum alerta</p>}
      </div>
    );
    return null;
  };

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {RELATORIOS.map(r => (
        <div key={r.id} className="bg-white border rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{r.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setOpen(r.id)} className="flex-1">Visualizar</Button>
            <Button size="sm" variant="ghost" className="gap-1"><Download className="w-3.5 h-3.5" /> PDF</Button>
          </div>
        </div>
      ))}

      <Dialog open={!!open} onOpenChange={() => setOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{RELATORIOS.find(r => r.id === open)?.label}</DialogTitle>
          </DialogHeader>
          <div className="py-2">{renderRelatorio()}</div>
          <div className="flex justify-end pt-2">
            <Button variant="outline" className="gap-1.5"><Download className="w-4 h-4" /> Exportar PDF</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}