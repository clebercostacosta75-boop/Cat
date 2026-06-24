import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { differenceInDays, parseISO, format } from "date-fns";
import { FileText, Eye } from "lucide-react";

function docStatus(vigencia_fim) {
  if (!vigencia_fim) return { label: "Sem Vigência", color: "bg-gray-100 text-gray-600" };
  const d = differenceInDays(parseISO(vigencia_fim), new Date());
  if (d < 0) return { label: "Vencido", color: "bg-red-100 text-red-700" };
  if (d <= 90) return { label: `Vencendo em ${d}d`, color: "bg-yellow-100 text-yellow-700" };
  return { label: "Vigente", color: "bg-green-100 text-green-700" };
}

function DocCard({ doc, campos }) {
  const [open, setOpen] = useState(false);
  const venc = doc.vigencia_fim || doc.data_validade;
  const st = docStatus(venc);
  return (
    <div className={`bg-white border rounded-xl p-4 ${st.label === "Vencido" ? "border-red-300" : st.label.includes("Vencendo") ? "border-yellow-300" : "border-gray-200"}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-400" />
          <p className="font-semibold text-gray-800">{doc.empresa_nome || "—"}</p>
        </div>
        <Badge className={`text-xs ${st.color}`}>{st.label}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
        {venc && <div><span className="text-gray-400">Vigência:</span> {format(parseISO(venc), "dd/MM/yyyy")}</div>}
        {doc.responsavel_tecnico && <div><span className="text-gray-400">Resp.:</span> {doc.responsavel_tecnico}</div>}
        {doc.medico_responsavel && <div><span className="text-gray-400">Médico:</span> {doc.medico_responsavel}</div>}
      </div>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5 w-full">
        <Eye className="w-3.5 h-3.5" /> Ver Detalhes
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalhes do Documento</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {campos.map(([label, key]) => doc[key] ? (
              <div key={key}><p className="text-xs text-gray-400">{label}</p><p className="text-sm font-medium">{doc[key]}</p></div>
            ) : null)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function C360DocumentosSST({ pgrs, pcmsos, ltcats, asos }) {
  return (
    <Tabs defaultValue="pgr">
      <TabsList className="mb-4">
        <TabsTrigger value="pgr">PGR ({pgrs?.length || 0})</TabsTrigger>
        <TabsTrigger value="pcmso">PCMSO ({pcmsos?.length || 0})</TabsTrigger>
        <TabsTrigger value="ltcat">LTCAT ({ltcats?.length || 0})</TabsTrigger>
        <TabsTrigger value="aso">ASO ({asos?.length || 0})</TabsTrigger>
      </TabsList>

      <TabsContent value="pgr">
        {pgrs?.length === 0 ? <p className="text-center py-10 text-gray-400">Nenhum PGR encontrado para esta empresa</p> : (
          <div className="grid sm:grid-cols-2 gap-3">
            {(pgrs || []).map(d => <DocCard key={d.id} doc={d} campos={[["Empresa","empresa_nome"],["CNPJ","cnpj"],["Resp. Técnico","responsavel_tecnico"],["CREA","registro_crea"],["Elaboração","data_elaboracao"],["Vigência Início","vigencia_inicio"],["Vigência Fim","vigencia_fim"],["Nº Funcionários","numero_funcionarios"],["Status","status"]]} />)}
          </div>
        )}
      </TabsContent>

      <TabsContent value="pcmso">
        {pcmsos?.length === 0 ? <p className="text-center py-10 text-gray-400">Nenhum PCMSO encontrado</p> : (
          <div className="grid sm:grid-cols-2 gap-3">
            {(pcmsos || []).map(d => <DocCard key={d.id} doc={d} campos={[["Empresa","empresa_nome"],["CNPJ","cnpj"],["Médico","medico_responsavel"],["CRM","crm"],["Elaboração","data_elaboracao"],["Vigência Início","vigencia_inicio"],["Vigência Fim","vigencia_fim"],["Status","status"]]} />)}
          </div>
        )}
      </TabsContent>

      <TabsContent value="ltcat">
        {ltcats?.length === 0 ? <p className="text-center py-10 text-gray-400">Nenhum LTCAT encontrado</p> : (
          <div className="grid sm:grid-cols-2 gap-3">
            {(ltcats || []).map(d => <DocCard key={d.id} doc={d} campos={[["Empresa","empresa_nome"],["CNPJ","cnpj"],["Resp. Técnico","responsavel_tecnico"],["Reg. Profissional","registro_profissional"],["Elaboração","data_elaboracao"],["Vigência Início","vigencia_inicio"],["Vigência Fim","vigencia_fim"],["Status","status"]]} />)}
          </div>
        )}
      </TabsContent>

      <TabsContent value="aso">
        {asos?.length === 0 ? <p className="text-center py-10 text-gray-400">Nenhum ASO encontrado</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead><tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Colaborador</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Data Exame</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimento</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Resultado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr></thead>
              <tbody>
                {(asos || []).map(a => {
                  const st = docStatus(a.data_vencimento);
                  return (
                    <tr key={a.id} className={`border-b hover:bg-gray-50 ${st.label === "Vencido" ? "bg-red-50/30" : ""}`}>
                      <td className="px-4 py-3 font-medium">{a.nome_colaborador || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{a.tipo_exame || "—"}</td>
                      <td className="px-4 py-3">{a.data_exame ? format(parseISO(a.data_exame), "dd/MM/yyyy") : "—"}</td>
                      <td className="px-4 py-3">{a.data_vencimento ? format(parseISO(a.data_vencimento), "dd/MM/yyyy") : "—"}</td>
                      <td className="px-4 py-3"><Badge className={`text-xs ${a.resultado === "Apto" ? "bg-green-100 text-green-700" : a.resultado === "Inapto" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{a.resultado || "—"}</Badge></td>
                      <td className="px-4 py-3"><Badge className={`text-xs ${st.color}`}>{st.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}