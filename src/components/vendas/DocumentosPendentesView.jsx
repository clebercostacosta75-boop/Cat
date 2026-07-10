import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Eye, CheckCircle, XCircle, Camera } from "lucide-react";
import { toast } from "sonner";
import { logVenda } from "@/lib/auditVendas";

const DOC_STATUS_COLOR = {
  "Pendente de validação": "bg-yellow-100 text-yellow-800",
  "Validado": "bg-green-100 text-green-700",
  "Rejeitado": "bg-red-100 text-red-700",
  "Nova foto solicitada": "bg-orange-100 text-orange-700",
};

export default function DocumentosPendentesView() {
  const queryClient = useQueryClient();
  const [fStatus, setFStatus] = useState("Pendente de validação");
  const [busy, setBusy] = useState(false);

  const { data: preCadastros = [], isLoading } = useQuery({
    queryKey: ["pre-cadastros"],
    queryFn: () => base44.entities.PreCadastro.list("-created_date", 300),
  });

  const docs = preCadastros.flatMap(pc =>
    (pc.documentos || []).map((d, idx) => ({ pc, doc: d, idx }))
  ).filter(x => fStatus === "all" || (x.doc.status_documento || "Pendente de validação") === fStatus);

  const handleVer = async (doc) => {
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: doc.file_uri });
      window.open(signed_url, "_blank");
    } catch {
      toast.error("Não foi possível abrir o documento.");
    }
  };

  const atualizarDoc = async (pc, idx, novoStatus, detalhe) => {
    setBusy(true);
    try {
      const documentos = (pc.documentos || []).map((d, i) => i === idx ? { ...d, status_documento: novoStatus } : d);
      await base44.entities.PreCadastro.update(pc.id, { documentos });
      await logVenda("update", {
        entity_type: "PreCadastro", entity_id: pc.id, entity_name: pc.nome_completo,
        details: `FASE 2 QR Code: documento ${pc.documentos?.[idx]?.tipo || ""}/${pc.documentos?.[idx]?.lado || ""} ${detalhe}`,
      });
      queryClient.invalidateQueries({ queryKey: ["pre-cadastros"] });
      toast.success(`Documento marcado: ${novoStatus}`);
    } catch (e) {
      toast.error("Erro: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Pendente de validação">🟡 Pendentes de validação</SelectItem>
            <SelectItem value="Validado">🟢 Validados</SelectItem>
            <SelectItem value="Rejeitado">🔴 Rejeitados</SelectItem>
            <SelectItem value="Nova foto solicitada">🟠 Nova foto solicitada</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-500">{docs.length} documento(s)</span>
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-gray-400">Carregando...</div>
          ) : docs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhum documento neste status.</p>
            </div>
          ) : (
            <div className="divide-y">
              {docs.map(({ pc, doc, idx }) => (
                <div key={`${pc.id}-${idx}`} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-gray-50">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{pc.nome_completo}</p>
                    <p className="text-xs text-gray-500 font-mono">{pc.cpf}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge className="bg-gray-100 text-gray-700 text-xs">{doc.tipo} — {doc.lado}</Badge>
                      <Badge className={`text-xs ${DOC_STATUS_COLOR[doc.status_documento] || "bg-gray-100 text-gray-600"}`}>{doc.status_documento || "Pendente de validação"}</Badge>
                      <span className="text-xs text-gray-400">Origem: {pc.origem} • {new Date(pc.created_date).toLocaleString("pt-BR")}</span>
                    </div>
                    {doc.tipo === "CNH" && (doc.cnh_numero || doc.cnh_categoria) && (
                      <p className="text-xs text-gray-500 mt-1">CNH: {doc.cnh_numero || "—"} • Cat. {doc.cnh_categoria || "—"} • Val. {doc.cnh_validade || "—"}{doc.cnh_renach ? ` • RENACH ${doc.cnh_renach}` : ""}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => handleVer(doc)}>
                      <Eye className="w-3.5 h-3.5 mr-1" /> Ver
                    </Button>
                    <Button size="sm" className="text-xs h-8 bg-green-600 hover:bg-green-700" disabled={busy}
                      onClick={() => atualizarDoc(pc, idx, "Validado", "validado pelo operador")}>
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Validar
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-8 border-red-300 text-red-700 hover:bg-red-50" disabled={busy}
                      onClick={() => atualizarDoc(pc, idx, "Rejeitado", "rejeitado pelo operador")}>
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Rejeitar
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-8 border-orange-300 text-orange-700 hover:bg-orange-50" disabled={busy}
                      onClick={() => atualizarDoc(pc, idx, "Nova foto solicitada", "nova foto solicitada pelo operador")}>
                      <Camera className="w-3.5 h-3.5 mr-1" /> Nova foto
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}