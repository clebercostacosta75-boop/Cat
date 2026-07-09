import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, CheckCircle, XCircle, PenLine, Trash2, Download, Shield, AlertTriangle, Copy } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import CertificateDownloader from "@/components/certificates/CertificateDownloader";

// Máscara de CPF — nunca exibir CPF completo em página pública
function maskCpf(cpf) {
  const d = (cpf || "").replace(/\D/g, "");
  if (d.length !== 11) return "***.***.***-**";
  return `***.***.${d.slice(6, 9)}-**`;
}

// Registro de eventos de auditoria pública (fire-and-forget)
function logEvent(code, event, details) {
  base44.functions.invoke("certificadoPublico", { action: "log", code, event, details }).catch(() => {});
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch { return dateStr; }
}

export default function CertificateSign() {
  const params = new URLSearchParams(window.location.search);
  const certCode = params.get("code");

  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("view"); // view | sign | done
  const [cpfInput, setCpfInput] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [signing, setSigning] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);

  useEffect(() => {
    if (!certCode) { setError("Código do certificado não informado."); setLoading(false); return; }
    base44.entities.Certificate.filter({ certificate_code: certCode })
      .then(results => {
        if (!results || results.length === 0) { setError("Certificado não encontrado."); setLoading(false); return; }
        const c = results[0];
        setCert(c);
        setLoading(false);
        const expired = c.status === "pending_signature" && c.signature_link_expires_at && new Date(c.signature_link_expires_at) < new Date();
        logEvent(certCode, expired ? "link_expirado" : "link_acesso");
      })
      .catch(() => { setError("Erro ao carregar certificado."); setLoading(false); });
  }, [certCode]);

  // Canvas drawing
  useEffect(() => {
    if (step !== "sign") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [step]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e, canvasRef.current);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasDrawn(true);
  };

  const endDraw = () => { isDrawing.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleConfirmIdentity = () => {
    const cleaned = cpfInput.replace(/\D/g, "");
    const certCpf = (cert.student_cpf || "").replace(/\D/g, "");
    if (cleaned !== certCpf) {
      setCpfError("CPF não corresponde ao cadastrado. Verifique e tente novamente.");
      logEvent(certCode, "cpf_incorreto");
      return;
    }
    setCpfError("");
    setStep("sign");
  };

  const linkExpired = cert && cert.status === "pending_signature" &&
    cert.signature_link_expires_at && new Date(cert.signature_link_expires_at) < new Date();

  const handleSign = async () => {
    if (!hasDrawn) return;
    setSigning(true);
    try {
      const canvas = canvasRef.current;
      const signatureDataUrl = canvas.toDataURL("image/png");

      // Upload da assinatura
      const blob = await (await fetch(signatureDataUrl)).blob();
      const file = new File([blob], "assinatura.png", { type: "image/png" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Assinatura validada e gravada no backend (CPF, expiração, IP, dispositivo, auditoria)
      const res = await base44.functions.invoke("certificadoPublico", {
        action: "sign",
        code: certCode,
        cpf: cpfInput,
        signature_file_url: file_url,
      });

      setCert(prev => ({ ...prev, status: "signed", signature_url: file_url, signed_at: res.data?.signed_at || new Date().toISOString() }));
      setStep("done");
    } catch (err) {
      const code = err?.response?.data?.error;
      if (code === "link_expirado") alert("Este link de assinatura expirou. Solicite um novo link à CAT Cursos.");
      else if (code === "cpf_incorreto") alert("CPF não confere com o certificado. Assinatura bloqueada.");
      else if (code === "certificado_revogado") alert("Este certificado foi revogado e não pode ser assinado.");
      else alert("Erro ao registrar assinatura. Tente novamente.");
    } finally {
      setSigning(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Certificado não encontrado</h2>
        <p className="text-gray-500">{error}</p>
      </div>
    </div>
  );

  if (linkExpired) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Link de Assinatura Expirado</h2>
        <p className="text-gray-500">Este link de assinatura expirou e não pode mais ser utilizado. Entre em contato com a CAT Cursos para solicitar um novo link.</p>
      </div>
    </div>
  );

  if (cert.status === "revoked") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Certificado Revogado</h2>
        <p className="text-gray-500">Este certificado foi revogado e não é mais válido.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-gray-100 py-8 px-4">
      {/* Header */}
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png"
            alt="CAT Logo" className="h-12 mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold text-gray-800">Portal de Assinatura de Certificado</h1>
          <p className="text-gray-500 text-sm mt-1">CAT Cursos — Sistema de Certificação Digital</p>
        </div>

        {/* Step: View Certificate */}
        {step === "view" && (
          <div className="space-y-6">
            {/* Status banner */}
            {cert.status === "signed" ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-800">Certificado já assinado</p>
                  <p className="text-sm text-emerald-600">Assinado em {cert.signed_at ? format(new Date(cert.signed_at), "dd/MM/yyyy 'às' HH:mm") : "-"}</p>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                <PenLine className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-800">Aguardando sua assinatura</p>
                  <p className="text-sm text-amber-600">Confira os dados abaixo e assine digitalmente</p>
                </div>
              </div>
            )}

            {/* Certificate Preview */}
            <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-lg overflow-hidden">
              <div className="bg-emerald-700 text-white p-4 text-center">
                <Award className="w-8 h-8 mx-auto mb-1" />
                <h2 className="text-lg font-bold tracking-widest uppercase">Certificado de Conclusão</h2>
                <p className="text-emerald-200 text-xs mt-1">Código: {cert.certificate_code}</p>
              </div>

              <div className="p-6 space-y-5">
                <div className="text-center py-4 border-b border-gray-100">
                  <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">Certificamos que</p>
                  <p className="text-2xl font-bold text-gray-900">{cert.student_name}</p>
                  <p className="text-gray-500 text-sm mt-1">CPF: {maskCpf(cert.student_cpf)}</p>
                </div>

                <div className="text-center py-2 border-b border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">concluiu com êxito o curso</p>
                  <p className="text-xl font-bold text-emerald-700">{cert.course_name}</p>
                  {cert.course_duration && <p className="text-sm text-gray-500 mt-1">Carga horária: {cert.course_duration}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {cert.start_date && <div><span className="text-gray-400 block text-xs">Início</span><span className="font-medium text-gray-900">{formatDate(cert.start_date)}</span></div>}
                    {cert.end_date && <div><span className="text-gray-400 block text-xs">Término</span><span className="font-medium text-gray-900">{formatDate(cert.end_date)}</span></div>}
                    {cert.client_name && <div><span className="text-gray-400 block text-xs">Empresa</span><span className="font-medium text-gray-900">{cert.client_name}</span></div>}
                    {cert.instructor_name && <div><span className="text-gray-400 block text-xs">Instrutor</span><span className="font-medium text-gray-900">{cert.instructor_name}</span></div>}
                    {cert.location_and_date && <div className="col-span-1 sm:col-span-2"><span className="text-gray-400 block text-xs">Local</span><span className="font-medium text-gray-900">{cert.location_and_date}</span></div>}
                    {cert.valid_until && <div><span className="text-gray-400 block text-xs">Válido até</span><span className="font-medium text-amber-600">{formatDate(cert.valid_until)}</span></div>}
                  </div>

                {/* Programmatic content */}
                {cert.programmatic_content?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Conteúdo Programático</p>
                    <div className="space-y-1">
                      {cert.programmatic_content.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm bg-gray-50 rounded px-3 py-1.5">
                          <span className="text-gray-700">{item.module}</span>
                          {item.hours && <span className="text-gray-400">{item.hours}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Signature if signed */}
                {cert.status === "signed" && cert.signature_url && (
                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Assinatura Digital do Aluno</p>
                    <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-4">
                      <img src={cert.signature_url} alt="Assinatura" className="h-12 object-contain" />
                      <div className="text-xs text-gray-400">
                        <CheckCircle className="w-4 h-4 text-emerald-500 inline mr-1" />
                        Assinado em {cert.signed_at ? format(new Date(cert.signed_at), "dd/MM/yyyy 'às' HH:mm") : "-"}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-6 py-3 text-center">
                <p className="text-xs text-gray-400">CAT Cursos • CNPJ: informado no certificado oficial • {window.location.hostname}</p>
              </div>
            </div>

            {/* Action buttons */}
            {cert.status !== "signed" && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Confirmação de Identidade
                </h3>
                <p className="text-sm text-gray-500">Para prosseguir com a assinatura, confirme seu CPF:</p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <input
                    type="text"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="Digite seu CPF"
                    value={cpfInput}
                    onChange={e => setCpfInput(e.target.value)}
                    maxLength={14}
                  />
                  <Button onClick={handleConfirmIdentity} className="bg-emerald-600 hover:bg-emerald-700 sm:w-auto w-full">
                    Confirmar
                  </Button>
                </div>
                {cpfError && <p className="text-sm text-red-500 flex items-center gap-1"><XCircle className="w-4 h-4" />{cpfError}</p>}
              </div>
            )}
          </div>
        )}

        {/* Step: Sign */}
         {step === "sign" && (
           <div className="space-y-6">
             <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-4 sm:p-6">
               <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                 <PenLine className="w-5 h-5 text-emerald-600" />
                 Assinatura Digital
               </h3>
               <p className="text-sm text-gray-500 mb-4">
                 Desenhe sua assinatura no campo abaixo usando o dedo ou mouse:
               </p>

               <div className="border-2 border-dashed border-emerald-300 rounded-xl overflow-hidden bg-gray-50">
                 <canvas
                   ref={canvasRef}
                   width={600}
                   height={180}
                   className="w-full touch-none cursor-crosshair"
                   style={{ display: "block", background: "#fff" }}
                   onMouseDown={startDraw}
                   onMouseMove={draw}
                   onMouseUp={endDraw}
                   onMouseLeave={endDraw}
                   onTouchStart={startDraw}
                   onTouchMove={draw}
                   onTouchEnd={endDraw}
                 />
               </div>

               <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-3 gap-2">
                 <p className="text-xs text-gray-400">
                   {hasDrawn ? "✓ Assinatura registrada" : "Área em branco — desenhe sua assinatura"}
                 </p>
                 <Button variant="outline" size="sm" onClick={clearCanvas} className="w-full sm:w-auto">
                   <Trash2 className="w-3 h-3 mr-1" />
                   Limpar
                 </Button>
               </div>
             </div>

             <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 flex gap-2">
               <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
               <p>Ao assinar, você confirma que as informações do certificado estão corretas. Esta ação não pode ser desfeita.</p>
             </div>

             <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
               <Button variant="outline" className="w-full sm:flex-1" onClick={() => setStep("view")}>Voltar</Button>
               <Button
                 className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700"
                 disabled={!hasDrawn || signing}
                 onClick={handleSign}
               >
                 {signing ? (
                   <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Assinando...</span>
                 ) : (
                   <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" />Assinar</span>
                 )}
               </Button>
             </div>
           </div>
         )}

        {/* Step: Done */}
         {step === "done" && (
           <div className="text-center space-y-4 sm:space-y-6">
             <div className="bg-white rounded-2xl border border-emerald-200 shadow-lg p-6 sm:p-10">
               <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600" />
               </div>
               <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Certificado Assinado!</h2>
               <p className="text-gray-500 text-sm mb-1">Seu certificado foi assinado digitalmente com sucesso.</p>
               <div className="bg-blue-50 rounded-lg p-3 my-4 border border-blue-200">
                 <p className="text-xs text-blue-600 mb-1 font-medium">Código de Validação:</p>
                 <p className="font-mono text-sm font-bold text-blue-700 break-all">{cert.certificate_code}</p>
               </div>
               <div className="mt-4 sm:mt-6 bg-emerald-50 rounded-xl p-4 text-xs sm:text-sm text-emerald-700 border border-emerald-200">
                 <Shield className="w-4 h-4 inline mr-2 flex-shrink-0" />
                 <span>Assinatura registrada em {new Date().toLocaleString("pt-BR")} • Dados armazenados com segurança.</span>
               </div>
             </div>

             <div className="flex flex-col gap-2 sm:gap-3">
               <CertificateDownloader certificate={cert} className="w-full" />
               <Button
                 className="w-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                 onClick={() => {
                   navigator.clipboard.writeText(cert.certificate_code);
                   toast.success("Código copiado para a área de transferência!");
                 }}
               >
                 <Copy className="w-4 h-4" />
                 Copiar Código de Validação
               </Button>
               <Button
                 variant="outline"
                 className="w-full flex items-center justify-center gap-2"
                 onClick={() => {
                   window.location.href = `/CertificateValidate?code=${cert.certificate_code}`;
                 }}
               >
                 <CheckCircle className="w-4 h-4" />
                 Verificar Autenticidade
               </Button>
             </div>

             <p className="text-xs text-gray-400 mt-4">Você pode fechar esta janela. O certificado assinado ficará disponível no sistema.</p>
           </div>
         )}
      </div>
    </div>
  );
}