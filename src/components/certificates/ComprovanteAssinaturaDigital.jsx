import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldCheck, Loader2 } from "lucide-react";
import { format } from "date-fns";

function maskCpf(cpf) {
  const d = (cpf || "").replace(/\D/g, "");
  if (d.length !== 11) return "***.***.***-**";
  return `***.***.${d.slice(6, 9)}-**`;
}

// Extrai navegador e sistema operacional do user-agent
function parseUserAgent(ua = "") {
  let browser = "Desconhecido";
  if (/edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/opr\/|opera/i.test(ua)) browser = "Opera";
  else if (/chrome|crios/i.test(ua)) browser = "Google Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Mozilla Firefox";
  else if (/safari/i.test(ua)) browser = "Safari";

  let os = "Desconhecido";
  if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/mac os/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  return { browser, os };
}

const Row = ({ label, value, mono }) => (
  <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 py-1.5 border-b border-emerald-100 last:border-0">
    <span className="text-xs uppercase tracking-wider text-emerald-600 font-medium sm:w-44 flex-shrink-0">{label}</span>
    <span className={`text-sm text-gray-800 break-all ${mono ? "font-mono text-xs" : "font-medium"}`}>{value || "-"}</span>
  </div>
);

export default function ComprovanteAssinaturaDigital({ certificate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke("certificadoPublico", { action: "comprovante", code: certificate.certificate_code })
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [certificate.certificate_code]);

  if (loading) return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-2 text-sm text-emerald-700">
      <Loader2 className="w-4 h-4 animate-spin" /> Carregando comprovante da assinatura...
    </div>
  );
  if (!data) return null;

  const { browser, os } = parseUserAgent(data.signed_device);
  const signedDate = data.signed_at ? new Date(data.signed_at) : null;

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-5">
      <p className="font-bold text-emerald-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
        <ShieldCheck className="w-5 h-5" /> Certificado Digital
      </p>
      <div>
        <Row label="Aluno" value={certificate.student_name} />
        <Row label="CPF" value={maskCpf(certificate.student_cpf)} />
        <Row label="Curso" value={certificate.course_name} />
        <Row label="Data da assinatura" value={signedDate ? format(signedDate, "dd/MM/yyyy") : "-"} />
        <Row label="Hora" value={signedDate ? format(signedDate, "HH:mm:ss") : "-"} />
        <Row label="IP" value={data.signed_ip} mono />
        <Row label="Navegador" value={browser} />
        <Row label="Sistema Operacional" value={os} />
        <Row label="Código interno" value={data.internal_control_code} mono />
        <Row label="Hash da assinatura" value={data.signature_hash} mono />
        <Row label="ID da auditoria" value={data.audit_id} mono />
      </div>
      {certificate.signature_url && (
        <img src={certificate.signature_url} alt="Assinatura" className="h-10 mt-4 object-contain mx-auto" />
      )}
    </div>
  );
}