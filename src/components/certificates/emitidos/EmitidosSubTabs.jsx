import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Send, Ban, RotateCcw, RefreshCw, Clock, Copy, QrCode, Printer, History, FileCheck } from "lucide-react";
import { format, parseISO, isBefore } from "date-fns";
import { toast } from "sonner";
import { imprimirCertificado, imprimirComprovante, TIPO_SEM_ASSINATURA, TIPO_COM_ASSINATURA, TIPO_CERT_COM_COMPROVANTE } from "@/lib/imprimirCertificado";
import HistoricoImpressoesModal from "@/components/certificates/HistoricoImpressoesModal";
import ComprovanteAssinaturaDigital from "@/components/certificates/ComprovanteAssinaturaDigital";

const TABS = [
  { key: "aguardando", label: "⏳ Aguardando Assinatura" },
  { key: "assinados", label: "✅ Assinados" },
  { key: "impressao", label: "🖨️ Para Impressão" },
  { key: "revogados", label: "🚫 Revogados / Substituídos" },
];

const fmt = (d, p = "dd/MM/yyyy") => (d ? format(parseISO(d), p) : "—");

export default function EmitidosSubTabs({
  certificates, loading, canGenerate, search, setSearch,
  subTab, setSubTab, onResend, onEditSignDate, onRevoke, onRevalidate, onReissue,
}) {
  const [histCert, setHistCert] = useState(null);
  const [compCert, setCompCert] = useState(null);
  const bySearch = (c) =>
    [c.student_name, c.certificate_code, c.client_name, c.course_name]
      .some((v) => v && v.toLowerCase().includes(search.toLowerCase()));

  const signed = certificates.filter((c) => (c.status === "signed" || c.status === "active") && bySearch(c));
  const lists = {
    aguardando: certificates.filter((c) => c.status === "pending_signature" && bySearch(c)),
    assinados: signed,
    impressao: signed,
    revogados: certificates.filter((c) => (c.status === "revoked" || c.status === "substituido") && bySearch(c)),
  };

  const copiarLink = (c) => {
    navigator.clipboard.writeText(`${window.location.origin}/CertificateSign?code=${c.certificate_code}`);
    toast.success("Link de assinatura copiado!");
  };

  const items = lists[subTab] || [];

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-white border-b px-4 py-3 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                subTab === t.key ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}>
              {t.label} ({lists[t.key].length})
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar..." className="pl-9 h-8 text-sm w-44" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {subTab === "impressao" && (
        <div className="bg-indigo-50 border-b border-indigo-200 px-4 py-2 text-xs text-indigo-700 flex items-center gap-2">
          <Printer className="w-3.5 h-3.5" />
          Impressão blindada (SPR-2C-1): toda impressão é validada por status e registrada em auditoria. Certificados revogados, cancelados ou bloqueados não podem ser impressos como válidos.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Código</th>
              {subTab === "assinados" && <th className="text-left px-3 py-2 font-medium text-gray-600">Cód. Interno</th>}
              <th className="text-left px-3 py-2 font-medium text-gray-600">Aluno</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Curso</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Empresa</th>
              {subTab === "aguardando" && (<>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Emissão</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Link válido até</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Envio</th>
              </>)}
              {(subTab === "assinados" || subTab === "impressao") && (<>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Assinado em</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Vencimento</th>
              </>)}
              {subTab === "revogados" && (<>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Motivo</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Data</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Responsável</th>
              </>)}
              <th className="px-3 py-2 font-medium text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={10} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={10} className="text-center py-8 text-gray-400">Nenhum certificado nesta seção.</td></tr>}
            {items.map((c) => {
              const linkExpirado = c.signature_link_expires_at && isBefore(parseISO(c.signature_link_expires_at), new Date());
              const vencido = c.valid_until && isBefore(parseISO(c.valid_until), new Date());
              return (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">{c.certificate_code}</td>
                  {subTab === "assinados" && <td className="px-3 py-2 font-mono text-xs text-gray-500">{c.internal_control_code || "—"}</td>}
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{c.student_name}</div>
                    <div className="text-xs text-gray-400">{c.student_cpf}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-600 max-w-[140px] truncate">{c.course_name}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs max-w-[110px] truncate">{c.client_name || "—"}</td>
                  {subTab === "aguardando" && (<>
                    <td className="px-3 py-2 text-xs text-gray-600">{fmt(c.issue_date)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs ${linkExpirado ? "text-red-600 font-semibold" : "text-gray-600"}`}>
                        {fmt(c.signature_link_expires_at, "dd/MM/yyyy HH:mm")}{linkExpirado && " ⚠️ expirado"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {c.whatsapp_sent_at ? `WhatsApp ${fmt(c.whatsapp_sent_at)}` : "Não enviado"}
                    </td>
                  </>)}
                  {(subTab === "assinados" || subTab === "impressao") && (<>
                    <td className="px-3 py-2 text-xs text-gray-600">{fmt(c.signed_at, "dd/MM/yyyy HH:mm")}</td>
                    <td className="px-3 py-2"><span className={`text-xs ${vencido ? "text-red-600 font-semibold" : "text-gray-600"}`}>{fmt(c.valid_until)}</span></td>
                  </>)}
                  {subTab === "revogados" && (<>
                    <td className="px-3 py-2 text-xs text-red-700 max-w-[140px] truncate">
                      {c.status === "substituido"
                        ? <span className="text-blue-700">Substituído por reemissão (v{(c.version || 1) + 1} vigente)</span>
                        : (c.revocation_reason || "—")}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">{fmt(c.status === "substituido" ? c.updated_date : c.revoked_at, "dd/MM/yyyy HH:mm")}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{c.revoked_by || "—"}</td>
                  </>)}
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {subTab === "aguardando" && canGenerate && (<>
                        <Button size="sm" variant="outline" disabled={c.is_blocked} title={c.is_blocked ? "Impressão bloqueada: certificado bloqueado." : undefined}
                          className="h-7 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                          onClick={() => imprimirCertificado(c, TIPO_SEM_ASSINATURA)}>
                          <Printer className="w-3 h-3 mr-1" /> Imprimir s/ assinatura
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onResend(c)}>
                          <Send className="w-3 h-3 mr-1" /> Reenviar
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => copiarLink(c)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </>)}
                      {(subTab === "assinados" || subTab === "impressao") && canGenerate && (<>
                        <Button size="sm" variant="outline" disabled={c.is_blocked} title={c.is_blocked ? "Impressão bloqueada: certificado bloqueado." : undefined}
                          className="h-7 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                          onClick={() => imprimirCertificado(c, TIPO_COM_ASSINATURA)}>
                          <Printer className="w-3 h-3 mr-1" /> Imprimir c/ assinatura
                        </Button>
                        <Button size="sm" variant="outline" disabled={c.is_blocked} title={c.is_blocked ? "Impressão bloqueada: certificado bloqueado." : undefined}
                          className="h-7 text-xs text-teal-700 border-teal-200 hover:bg-teal-50"
                          onClick={() => imprimirCertificado(c, TIPO_CERT_COM_COMPROVANTE)}>
                          <Printer className="w-3 h-3 mr-1" /> + Comprovante
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          onClick={() => setCompCert(c)}>
                          <FileCheck className="w-3 h-3 mr-1" /> Ver comprovante
                        </Button>
                      </>)}
                      {(subTab === "assinados" || subTab === "impressao") && (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          onClick={() => window.open(`/CertificateValidate?code=${c.certificate_code}`, "_blank")}>
                          <QrCode className="w-3 h-3 mr-1" /> Validar
                        </Button>
                      )}
                      {subTab === "assinados" && canGenerate && (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-purple-600 border-purple-200 hover:bg-purple-50" onClick={() => onEditSignDate(c)}>
                          <Clock className="w-3 h-3 mr-1" /> Data
                        </Button>
                      )}
                      {(subTab === "aguardando" || subTab === "assinados") && canGenerate && (<>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => onReissue(c)}>
                          <RefreshCw className="w-3 h-3 mr-1" /> Reemitir
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => onRevoke(c)}>
                          <Ban className="w-3 h-3 mr-1" /> Revogar
                        </Button>
                      </>)}
                      {subTab === "revogados" && c.status === "revoked" && canGenerate && (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => onRevalidate(c)}>
                          <RotateCcw className="w-3 h-3 mr-1" /> Revalidar
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-500 hover:bg-gray-100" onClick={() => setHistCert(c)}>
                        <History className="w-3 h-3 mr-1" /> Histórico
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <HistoricoImpressoesModal cert={histCert} open={!!histCert} onClose={() => setHistCert(null)} />

      <Dialog open={!!compCert} onOpenChange={(o) => !o && setCompCert(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Comprovante de Assinatura Digital</DialogTitle></DialogHeader>
          {compCert && <ComprovanteAssinaturaDigital certificate={compCert} />}
          {compCert && canGenerate && (
            <Button size="sm" variant="outline" className="w-full text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              onClick={() => imprimirComprovante(compCert)}>
              <Printer className="w-3 h-3 mr-1" /> Imprimir comprovante
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}