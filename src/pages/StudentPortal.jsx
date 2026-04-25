/**
 * Portal do Aluno — página pública (sem necessidade de login no sistema).
 * O aluno busca seus certificados pelo CPF.
 * Permite: visualizar status, baixar PDF, copiar link de validação.
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Award, Search, Download, Link2, CheckCircle, Clock,
  AlertTriangle, XCircle, Shield, Copy, ExternalLink, BookOpen, Calendar
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { buildCertificateHTMLFromModel } from "@/components/certificates/CertificatePreview";

function formatDate(d) {
  if (!d) return "—";
  try { return format(new Date(d + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }); } catch { return d; }
}

function getDaysLeft(dateStr) {
  if (!dateStr) return null;
  return Math.round((new Date(dateStr) - new Date()) / 86400000);
}

function StatusBadge({ status, validUntil }) {
  if (status === "revoked")
    return <Badge className="bg-red-100 text-red-700 border border-red-300 flex items-center gap-1"><XCircle className="w-3 h-3" />Revogado</Badge>;

  if (!validUntil) {
    if (status === "signed" || status === "active")
      return <Badge className="bg-green-100 text-green-700 border border-green-300 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Válido</Badge>;
    return <Badge className="bg-gray-100 text-gray-600 border border-gray-300 flex items-center gap-1"><Clock className="w-3 h-3" />Emitido</Badge>;
  }

  const days = getDaysLeft(validUntil);
  if (days < 0)
    return <Badge className="bg-red-100 text-red-700 border border-red-300 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Vencido</Badge>;
  if (days <= 30)
    return <Badge className="bg-orange-100 text-orange-700 border border-orange-300 flex items-center gap-1"><Clock className="w-3 h-3" />Vence em {days}d</Badge>;
  return <Badge className="bg-green-100 text-green-700 border border-green-300 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Válido</Badge>;
}

function downloadPDF(cert) {
  const html = buildCertificateHTMLFromModel(null, {
    student_name: cert.student_name,
    student_cpf: cert.student_cpf,
    course_name: cert.course_name,
    course_duration: cert.course_duration,
    course_modality: cert.course_modality,
    start_date: cert.start_date,
    end_date: cert.end_date,
    valid_until: cert.valid_until,
    location_and_date: cert.location_and_date,
    client_name: cert.client_name,
    instructor_name: cert.instructor_name,
    certificate_code: cert.certificate_code,
    signature_url: cert.signature_url,
    programmatic_content: cert.programmatic_content || [],
    technical_responsibles: cert.technical_responsibles || [],
    show_programmatic_hours: cert.show_programmatic_hours !== false,
  });
  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 800);
}

export default function StudentPortal() {
  const [cpf, setCpf] = useState("");
  const [certs, setCerts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const handleSearch = async () => {
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length !== 11) { setError("Digite um CPF válido com 11 dígitos."); return; }
    setError("");
    setLoading(true);
    setCerts(null);
    try {
      const results = await base44.entities.Certificate.filter({ student_cpf: cpf });
      // Tentar também sem formatação
      let all = results;
      if (results.length === 0) {
        const r2 = await base44.entities.Certificate.filter({ student_cpf: cleaned });
        all = r2;
      }
      // Ordenar: válidos primeiro, depois vencidos
      all.sort((a, b) => {
        const da = getDaysLeft(a.valid_until) ?? 9999;
        const db = getDaysLeft(b.valid_until) ?? 9999;
        if (da < 0 && db >= 0) return 1;
        if (da >= 0 && db < 0) return -1;
        return db - da;
      });
      setCerts(all);
    } catch {
      setError("Erro ao buscar certificados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const copyValidationLink = (cert) => {
    const url = `${window.location.origin}/CertificateValidate?code=${cert.certificate_code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(cert.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatCpf = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
      .replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3")
      .replace(/(\d{3})(\d{3})/, "$1.$2")
      .replace(/(\d{3})/, "$1");
  };

  // Separar certificados ativos e vencidos
  const activeCerts = certs?.filter(c => {
    if (c.status === "revoked") return false;
    const days = getDaysLeft(c.valid_until);
    return days === null || days >= 0;
  }) ?? [];

  const expiredCerts = certs?.filter(c => {
    if (c.status === "revoked") return true;
    const days = getDaysLeft(c.valid_until);
    return days !== null && days < 0;
  }) ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center gap-4">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png"
            alt="CAT Logo" className="h-10 object-contain"
          />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Portal do Aluno</h1>
            <p className="text-xs text-gray-500">CAT Cursos — Consulta de Certificados</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Busca por CPF */}
        <Card className="border border-emerald-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-600" />
              Consultar meus certificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Digite seu CPF para visualizar seus certificados, baixar o PDF e acessar o link de validação.
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={cpf}
                onChange={e => setCpf(formatCpf(e.target.value))}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="000.000.000-00"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                maxLength={14}
              />
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 px-6"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Buscando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2"><Search className="w-4 h-4" />Buscar</span>
                )}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1 mt-2">
                <XCircle className="w-4 h-4" />{error}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Resultados */}
        {certs !== null && (
          <>
            {certs.length === 0 ? (
              <div className="text-center py-12">
                <Award className="w-14 h-14 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Nenhum certificado encontrado para este CPF.</p>
                <p className="text-gray-400 text-sm mt-1">Verifique o CPF ou entre em contato com o RH.</p>
              </div>
            ) : (
              <>
                {/* Resumo */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-800">{activeCerts.length}</p>
                    <p className="text-xs text-green-600 mt-0.5">Certificado{activeCerts.length !== 1 ? "s" : ""} Válido{activeCerts.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-red-800">{expiredCerts.length}</p>
                    <p className="text-xs text-red-600 mt-0.5">Vencido{expiredCerts.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-800">{certs.length}</p>
                    <p className="text-xs text-blue-600 mt-0.5">Total de Cursos</p>
                  </div>
                </div>

                {/* Certificados ativos */}
                {activeCerts.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Certificados Válidos
                    </h2>
                    <div className="space-y-3">
                      {activeCerts.map(cert => <CertCard key={cert.id} cert={cert} onDownload={downloadPDF} onCopy={copyValidationLink} copiedId={copiedId} />)}
                    </div>
                  </div>
                )}

                {/* Histórico / vencidos */}
                {expiredCerts.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      Histórico — Vencidos / Revogados
                    </h2>
                    <div className="space-y-3 opacity-80">
                      {expiredCerts.map(cert => <CertCard key={cert.id} cert={cert} onDownload={downloadPDF} onCopy={copyValidationLink} copiedId={copiedId} expired />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Info de segurança */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-gray-600">Autenticidade garantida</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Todos os certificados emitidos pela CAT Cursos possuem código único de validação.
              Use o link de validação para verificar a autenticidade em qualquer dispositivo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CertCard({ cert, onDownload, onCopy, copiedId, expired = false }) {
  const days = getDaysLeft(cert.valid_until);
  const validationUrl = `${window.location.origin}/CertificateValidate?code=${cert.certificate_code}`;

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${expired ? "border-gray-200" : "border-emerald-200"}`}>
      {/* Top bar */}
      <div className={`px-4 py-3 flex items-center justify-between ${expired ? "bg-gray-50" : "bg-emerald-50"}`}>
        <div className="flex items-center gap-2">
          <Award className={`w-5 h-5 ${expired ? "text-gray-400" : "text-emerald-600"}`} />
          <span className="font-semibold text-gray-900 text-sm">{cert.course_name}</span>
        </div>
        <StatusBadge status={cert.status} validUntil={cert.valid_until} />
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
          {cert.client_name && (
            <div>
              <span className="text-xs text-gray-400 block">Empresa</span>
              <span className="text-gray-700 font-medium">{cert.client_name}</span>
            </div>
          )}
          {cert.course_duration && (
            <div>
              <span className="text-xs text-gray-400 block">Carga Horária</span>
              <span className="text-gray-700 font-medium">{cert.course_duration}h</span>
            </div>
          )}
          {cert.start_date && (
            <div>
              <span className="text-xs text-gray-400 block flex items-center gap-1"><Calendar className="w-3 h-3" />Realização</span>
              <span className="text-gray-700">{formatDate(cert.start_date)}{cert.end_date && cert.end_date !== cert.start_date ? ` — ${formatDate(cert.end_date)}` : ""}</span>
            </div>
          )}
          {cert.valid_until && (
            <div>
              <span className="text-xs text-gray-400 block">Validade</span>
              <span className={`font-medium ${days !== null && days < 0 ? "text-red-600" : days !== null && days <= 30 ? "text-orange-600" : "text-emerald-600"}`}>
                {formatDate(cert.valid_until)}
                {days !== null && days >= 0 && <span className="text-xs text-gray-400 ml-1">({days}d restantes)</span>}
                {days !== null && days < 0 && <span className="text-xs ml-1">(vencido há {Math.abs(days)}d)</span>}
              </span>
            </div>
          )}
          {cert.instructor_name && (
            <div className="col-span-2">
              <span className="text-xs text-gray-400 block">Instrutor</span>
              <span className="text-gray-700">{cert.instructor_name}</span>
            </div>
          )}
        </div>

        {/* Conteúdo programático resumido */}
        {cert.programmatic_content?.length > 0 && (
          <details className="mb-4">
            <summary className="text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer flex items-center gap-1 mb-1 select-none">
              <BookOpen className="w-3 h-3" /> Conteúdo programático ({cert.programmatic_content.length} módulos)
            </summary>
            <div className="mt-2 space-y-1">
              {cert.programmatic_content.map((item, i) => (
                <div key={i} className="flex justify-between text-xs bg-gray-50 rounded px-3 py-1.5">
                  <span className="text-gray-600">{item.module}</span>
                  {item.hours && <span className="text-gray-400">{item.hours}</span>}
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Código + ações */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-400 font-mono">{cert.certificate_code || "—"}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Link de validação */}
            {cert.certificate_code && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 gap-1.5"
                onClick={() => onCopy(cert)}
              >
                {copiedId === cert.id ? (
                  <><CheckCircle className="w-3 h-3 text-green-600" />Copiado!</>
                ) : (
                  <><Copy className="w-3 h-3" />Copiar link</>
                )}
              </Button>
            )}
            {/* Abrir validação */}
            {cert.certificate_code && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 gap-1.5"
                onClick={() => window.open(validationUrl, "_blank")}
              >
                <ExternalLink className="w-3 h-3" />Validar
              </Button>
            )}
            {/* Download PDF */}
            <Button
              size="sm"
              className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => onDownload(cert)}
            >
              <Download className="w-3 h-3" />Baixar PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}