/**
 * SPR-2C-2 — Histórico de impressões de um certificado,
 * montado a partir do AuditLog existente (registros IMPRESSAO_CERTIFICADO).
 * Nenhuma entidade nova.
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Printer } from "lucide-react";
import { format } from "date-fns";

const TIPO_LABEL = {
  sem_assinatura_digital: "Sem assinatura digital",
  com_assinatura_digital: "Com assinatura digital",
  certificado_com_comprovante: "Certificado + comprovante",
  comprovante_assinatura: "Comprovante de assinatura",
};

export default function HistoricoImpressoesModal({ cert, open, onClose }) {
  const [logs, setLogs] = useState(null);

  useEffect(() => {
    if (!open || !cert) return;
    setLogs(null);
    base44.entities.AuditLog.filter(
      { entity_type: "Certificate", entity_id: cert.id, action: "export" },
      "-created_date",
      200
    )
      .then((rows) => {
        const parsed = rows
          .map((r) => {
            let d = {};
            try { d = JSON.parse(r.details); } catch { d = {}; }
            return { ...r, d };
          })
          .filter((r) => r.d?.acao === "IMPRESSAO_CERTIFICADO");
        setLogs(parsed);
      })
      .catch(() => setLogs([]));
  }, [open, cert]);

  const permitidas = (logs || []).filter((l) => l.d.resultado === "permitido").length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-4 h-4" /> Histórico de Impressões
          </DialogTitle>
        </DialogHeader>
        {cert && (
          <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1 border-b pb-2">
            <span className="font-semibold text-gray-900">{cert.student_name}</span>
            <span>{cert.course_name}</span>
            <span>{cert.client_name || "Individual (PF)"}</span>
            <Badge variant="secondary">Impresso {permitidas}x</Badge>
          </div>
        )}
        {logs === null ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : logs.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            Nenhuma impressão registrada para este certificado.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600">Data/Hora</th>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600">Usuário</th>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600">Status no momento</th>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600">Resultado</th>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b">
                    <td className="px-2 py-1.5 text-gray-700 whitespace-nowrap">
                      {format(new Date(l.created_date), "dd/MM/yyyy HH:mm")}
                    </td>
                    <td className="px-2 py-1.5 text-gray-600">{l.user_name || l.user_email}</td>
                    <td className="px-2 py-1.5 text-gray-700">
                      {TIPO_LABEL[l.d.tipo_impressao] || l.d.tipo_impressao || "—"}
                    </td>
                    <td className="px-2 py-1.5 text-gray-500">{l.d.status_no_momento || "—"}</td>
                    <td className="px-2 py-1.5">
                      {l.d.resultado === "permitido" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">✅ Permitido</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">🚫 Bloqueado</Badge>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-gray-500 max-w-[160px] truncate" title={l.d.motivo || ""}>
                      {l.d.motivo || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}