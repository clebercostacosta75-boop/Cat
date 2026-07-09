import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, CheckCircle, XCircle, Search, Shield, AlertTriangle, Download } from "lucide-react";
import CertificateDownloader from "@/components/certificates/CertificateDownloader";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Máscara de CPF — nunca exibir CPF completo em página pública
function maskCpf(cpf) {
  const d = (cpf || "").replace(/\D/g, "");
  if (d.length !== 11) return "***.***.***-**";
  return `***.***.${d.slice(6, 9)}-**`;
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR });
  } catch { return dateStr; }
}

export default function CertificateValidate() {
  const params = new URLSearchParams(window.location.search);
  const codeParam = params.get("code");

  const [code, setCode] = useState(codeParam || "");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (codeParam) handleSearch(codeParam);
  }, []);

  const handleSearch = async (searchCode) => {
    const q = (searchCode || code).trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    try {
      const results = await base44.entities.Certificate.filter({ certificate_code: q });
      setResult(results && results.length > 0 ? results[0] : null);
      if (results && results.length > 0) {
        base44.functions.invoke("certificadoPublico", { action: "log", code: q, event: "validacao_publica" }).catch(() => {});
      }
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const isExpired = result && result.valid_until && new Date(result.valid_until) < new Date();
  const isValid = result && result.status !== "revoked" && !isExpired;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png"
            alt="CAT Logo" className="h-12 mx-auto mb-4 object-contain"
          />
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-800">Validação de Certificado</h1>
          </div>
          <p className="text-gray-500 text-sm">Digite o código do certificado ou escaneie o QR Code para validar a autenticidade.</p>
        </div>

        {/* Search box */}
         <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4 sm:p-6 mb-6">
           <label className="block text-sm font-medium text-gray-700 mb-2">Código do Certificado</label>
           <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
             <input
               type="text"
               className="flex-1 border border-gray-300 rounded-lg px-3 sm:px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
               placeholder="Ex: CAT-2025-XXXXXXXX"
               value={code}
               onChange={e => setCode(e.target.value)}
               onKeyDown={e => e.key === "Enter" && handleSearch()}
             />
             <Button
               onClick={() => handleSearch()}
               className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
               disabled={loading}
             >
               {loading ? (
                 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
               ) : (
                 <Search className="w-4 h-4" />
               )}
             </Button>
           </div>
         </div>

        {/* Result */}
        {searched && !loading && (
          <>
            {!result ? (
              <div className="bg-white rounded-2xl shadow border border-red-200 p-6 sm:p-8 text-center">
                <XCircle className="w-12 sm:w-14 h-12 sm:h-14 text-red-400 mx-auto mb-3" />
                <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-1">Certificado não encontrado</h2>
                <p className="text-gray-500 text-sm">O código informado não corresponde a nenhum certificado em nosso sistema.</p>
                <Badge className="bg-red-100 text-red-700 mt-3">INVÁLIDO</Badge>
              </div>
            ) : (
              <div className={`bg-white rounded-2xl shadow border-2 ${isValid ? "border-emerald-300" : "border-red-300"} overflow-hidden`}>
                {/* Status banner */}
                <div className={`p-4 flex items-center gap-3 ${isValid ? "bg-emerald-600" : "bg-red-500"} text-white`}>
                  {isValid ? (
                    <CheckCircle className="w-7 h-7 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-7 h-7 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-bold text-lg">
                      {result.status === "revoked" ? "CERTIFICADO REVOGADO" : isExpired ? "CERTIFICADO VENCIDO" : "CERTIFICADO VÁLIDO"}
                    </p>
                    <p className="text-sm opacity-80">
                      {result.status === "revoked" ? "Este certificado foi revogado pelo emissor." :
                        isExpired ? `Venceu em ${formatDate(result.valid_until)}` :
                        result.status === "signed" ? "Assinado digitalmente pelo aluno" :
                        "Emitido pelo sistema CAT Cursos"}
                    </p>
                  </div>
                </div>

                <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                  {/* Main info */}
                  <div className="text-center border-b pb-4">
                    <Award className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-lg sm:text-xl font-bold text-gray-900">{result.student_name}</p>
                    <p className="text-xs sm:text-sm text-gray-500">CPF: {maskCpf(result.student_cpf)}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                    <div className="col-span-2">
                      <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Curso</span>
                      <span className="font-semibold text-emerald-700 text-base">{result.course_name}</span>
                    </div>
                    {result.course_duration && (
                      <div>
                        <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Carga Horária</span>
                        <span className="font-medium">{result.course_duration}</span>
                      </div>
                    )}
                    {result.end_date && (
                      <div>
                        <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Conclusão</span>
                        <span className="font-medium">{formatDate(result.end_date)}</span>
                      </div>
                    )}
                    {result.instructor_name && (
                      <div>
                        <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Instrutor</span>
                        <span className="font-medium">{result.instructor_name}</span>
                      </div>
                    )}
                    {result.client_name && (
                      <div>
                        <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Empresa</span>
                        <span className="font-medium">{result.client_name}</span>
                      </div>
                    )}
                    {result.valid_until && (
                      <div>
                        <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Válido até</span>
                        <span className={`font-medium ${isExpired ? "text-red-500" : "text-emerald-600"}`}>{formatDate(result.valid_until)}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Código</span>
                      <span className="font-mono font-medium text-xs">{result.certificate_code}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Status</span>
                      <Badge className={
                        result.status === "signed" ? "bg-emerald-100 text-emerald-700" :
                        result.status === "pending_signature" ? "bg-amber-100 text-amber-700" :
                        result.status === "revoked" ? "bg-red-100 text-red-700" :
                        "bg-blue-100 text-blue-700"
                      }>
                        {result.status === "signed" ? "Assinado" :
                         result.status === "pending_signature" ? "Aguardando Assinatura" :
                         result.status === "revoked" ? "Revogado" : "Ativo"}
                      </Badge>
                    </div>
                  </div>

                  {/* Signature info */}
                  {result.status === "signed" && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm">
                      <p className="font-semibold text-emerald-800 mb-2 flex items-center gap-1">
                        <Shield className="w-4 h-4" /> Assinatura Digital Verificada
                      </p>
                      <p className="text-emerald-700 text-xs sm:text-sm">Assinado em: {result.signed_at ? format(new Date(result.signed_at), "dd/MM/yyyy 'às' HH:mm") : "-"}</p>
                      {result.signature_url && (
                        <img src={result.signature_url} alt="Assinatura" className="h-8 sm:h-10 mt-3 object-contain mx-auto" />
                      )}
                    </div>
                  )}

                  {/* Botão de download para certificados assinados */}
                  {result.status === "signed" && (
                    <div className="pt-2">
                      <CertificateDownloader
                        certificate={result}
                        className="w-full"
                      />
                    </div>
                  )}
                  </div>

                  <div className="bg-gray-50 px-4 sm:px-6 py-3 text-center">
                  <p className="text-xs text-gray-400">Consulta realizada em {new Date().toLocaleString("pt-BR")} • CAT Cursos</p>
                  </div>
              </div>
            )}
          </>
        )}

        {!searched && (
          <div className="text-center py-10 text-gray-400">
            <Award className="w-12 sm:w-14 h-12 sm:h-14 mx-auto mb-3 text-gray-200" />
            <p className="text-xs sm:text-sm px-4">Digite o código e clique em pesquisar para validar o certificado.</p>
          </div>
        )}
      </div>
    </div>
  );
}