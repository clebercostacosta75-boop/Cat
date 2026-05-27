import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, PenLine, Trash2, Shield, AlertTriangle, FileText, Download, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function ContractSign() {
  const params = new URLSearchParams(window.location.search);
  const authCode = params.get("code");
  const signerParam = params.get("signer") || "student"; // student | resp_legal | resp_financeiro

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("view"); // view | sign | done
  const [cpfInput, setCpfInput] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [signing, setSigning] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [showFullContract, setShowFullContract] = useState(false);

  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);

  useEffect(() => {
    if (!authCode) { setError("Código de autenticação não informado."); setLoading(false); return; }
    base44.entities.Contract.filter({ auth_code: authCode })
      .then(results => {
        if (!results || results.length === 0) { setError("Contrato não encontrado ou link expirado."); setLoading(false); return; }
        setContract(results[0]);
        setLoading(false);
      })
      .catch(() => { setError("Erro ao carregar contrato."); setLoading(false); });
  }, [authCode]);

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

  const getSignerCpf = () => {
    if (signerParam === "student") return (contract?.student_cpf || "").replace(/\D/g, "");
    if (signerParam === "resp_legal") return (contract?.resp_legal_cpf || "").replace(/\D/g, "");
    if (signerParam === "resp_financeiro") return (contract?.resp_financeiro_cpf || "").replace(/\D/g, "");
    return "";
  };

  const getSignerName = () => {
    if (signerParam === "student") return contract?.student_name;
    if (signerParam === "resp_legal") return contract?.resp_legal_nome;
    if (signerParam === "resp_financeiro") return contract?.resp_financeiro_nome;
    return "";
  };

  const isAlreadySigned = () => {
    if (signerParam === "student") return !!contract?.student_signed_at;
    if (signerParam === "resp_legal") return !!contract?.resp_legal_signed_at;
    if (signerParam === "resp_financeiro") return !!contract?.resp_financeiro_signed_at;
    return false;
  };

  const handleConfirmIdentity = () => {
    const cleaned = cpfInput.replace(/\D/g, "");
    const expected = getSignerCpf();
    if (!expected) { setStep("sign"); return; }
    if (cleaned !== expected) {
      setCpfError("CPF não corresponde ao cadastrado. Verifique e tente novamente.");
      return;
    }
    setCpfError("");
    setStep("sign");
  };

  const handleSign = async () => {
    if (!hasDrawn) return;
    if (signerParam === "student" && !lgpdAccepted) {
      toast.error("Você precisa aceitar os termos da LGPD para prosseguir.");
      return;
    }
    setSigning(true);
    try {
      const canvas = canvasRef.current;
      const signatureDataUrl = canvas.toDataURL("image/png");
      const blob = await (await fetch(signatureDataUrl)).blob();
      const file = new File([blob], "assinatura-contrato.png", { type: "image/png" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const response = await base44.functions.invoke("assinarContrato", {
        contract_id: contract.id,
        signature_data_url: file_url,
        signer_type: signerParam,
        lgpd_accepted: lgpdAccepted,
        signer_name: getSignerName(),
        signer_cpf: getSignerCpf(),
      });

      setContract(prev => ({
        ...prev,
        ...(signerParam === "student" ? {
          student_signature_url: file_url,
          student_signed_at: new Date().toISOString(),
          student_lgpd_accepted_at: lgpdAccepted ? new Date().toISOString() : null,
        } : signerParam === "resp_legal" ? {
          resp_legal_signature_url: file_url,
          resp_legal_signed_at: new Date().toISOString(),
        } : {
          resp_financeiro_signature_url: file_url,
          resp_financeiro_signed_at: new Date().toISOString(),
        }),
        status: response.data?.status || prev.status,
      }));
      setStep("done");
    } catch (err) {
      toast.error("Erro ao registrar assinatura. Tente novamente.");
    } finally {
      setSigning(false);
    }
  };

  const formatMoney = (v) => v ? `R$ ${parseFloat(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-";

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Contrato não encontrado</h2>
        <p className="text-gray-500">{error}</p>
      </div>
    </div>
  );

  if (contract?.status === "Cancelado") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Contrato Cancelado</h2>
        <p className="text-gray-500">Este contrato foi cancelado e não está mais disponível para assinatura.</p>
      </div>
    </div>
  );

  const alreadySigned = isAlreadySigned();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png"
            alt="CAT Logo" className="h-12 mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold text-gray-800">Portal de Assinatura de Contrato</h1>
          <p className="text-gray-500 text-sm mt-1">CAT Cursos — Sistema de Contratos Digitais</p>
        </div>

        {/* STEP: VIEW */}
        {step === "view" && (
          <div className="space-y-6">
            {/* Status banner */}
            {alreadySigned ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-800">Você já assinou este contrato</p>
                    <p className="text-sm text-emerald-600">Obrigado! Sua assinatura foi registrada com sucesso.</p>
                  </div>
                </div>
                {contract?.html_content_filled && (
                  <Button
                    className="w-full bg-blue-700 hover:bg-blue-800 gap-2"
                    onClick={() => {
                      const w = window.open("", "_blank");
                      w.document.write(contract.html_content_filled);
                      w.document.close();
                      setTimeout(() => w.print(), 800);
                    }}
                  >
                    <Download className="w-4 h-4" /> Baixar / Imprimir Contrato Assinado (PDF)
                  </Button>
                )}
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                <PenLine className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-800">Aguardando sua assinatura digital</p>
                  <p className="text-sm text-amber-600">Revise os dados abaixo e assine para confirmar sua matrícula</p>
                </div>
              </div>
            )}

            {/* Resumo do Contrato */}
            <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-lg overflow-hidden">
              <div className="bg-blue-800 text-white p-4 text-center">
                <FileText className="w-8 h-8 mx-auto mb-1" />
                <h2 className="text-lg font-bold tracking-widest uppercase">Contrato de Prestação de Serviços</h2>
                <p className="text-blue-200 text-xs mt-1">Nº {contract?.contract_number} | Código: {contract?.auth_code}</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><span className="text-gray-400 text-xs block">Aluno</span><span className="font-semibold text-gray-900">{contract?.student_name}</span></div>
                  <div><span className="text-gray-400 text-xs block">CPF</span><span className="font-semibold text-gray-900">{contract?.student_cpf}</span></div>
                  <div><span className="text-gray-400 text-xs block">Curso</span><span className="font-semibold text-blue-700">{contract?.course_name}</span></div>
                  <div><span className="text-gray-400 text-xs block">Carga Horária</span><span className="font-semibold text-gray-900">{contract?.course_duration || "-"}</span></div>
                  <div><span className="text-gray-400 text-xs block">Valor do Curso</span><span className="font-semibold text-gray-900">{formatMoney(contract?.course_value)}</span></div>
                  <div><span className="text-gray-400 text-xs block">Forma de Pagamento</span><span className="font-semibold text-gray-900">{contract?.payment_method || "-"}</span></div>
                  {contract?.num_parcelas > 1 && <div><span className="text-gray-400 text-xs block">Parcelas</span><span className="font-semibold text-gray-900">{contract.num_parcelas}x de {formatMoney(contract.valor_parcela)}</span></div>}
                  {contract?.course_start_date && <div><span className="text-gray-400 text-xs block">Início do Curso</span><span className="font-semibold text-gray-900">{new Date(contract.course_start_date + "T00:00:00").toLocaleDateString("pt-BR")}</span></div>}
                </div>

                {/* Botão ver contrato completo */}
                <button
                  onClick={() => setShowFullContract(!showFullContract)}
                  className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900 underline"
                >
                  {showFullContract ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showFullContract ? "Ocultar contrato completo" : "Visualizar contrato completo"}
                </button>

                {showFullContract && contract?.html_content_filled && (
                  <div className="border rounded-lg overflow-hidden">
                    <iframe
                      srcDoc={contract.html_content_filled}
                      className="w-full h-[600px]"
                      title="Contrato Completo"
                    />
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-6 py-3 text-center">
                <p className="text-xs text-gray-400">CAT Cursos • CNPJ: 07.238.084/0001-45 • Barcarena/PA</p>
              </div>
            </div>

            {/* Confirmação de identidade */}
            {!alreadySigned && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
                  <Shield className="w-4 h-4 text-blue-600" />
                  Confirmação de Identidade
                </h3>
                <p className="text-sm text-gray-500">Para prosseguir com a assinatura, confirme seu CPF:</p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <input
                    type="text"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Digite seu CPF (apenas números)"
                    value={cpfInput}
                    onChange={e => setCpfInput(e.target.value)}
                    maxLength={14}
                  />
                  <Button onClick={handleConfirmIdentity} className="bg-blue-700 hover:bg-blue-800 sm:w-auto w-full">
                    Confirmar e Prosseguir
                  </Button>
                </div>
                {cpfError && <p className="text-sm text-red-500 flex items-center gap-1"><XCircle className="w-4 h-4" />{cpfError}</p>}
              </div>
            )}
          </div>
        )}

        {/* STEP: SIGN */}
        {step === "sign" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                <PenLine className="w-5 h-5 text-blue-600" />
                Assinatura Digital
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Assine abaixo para confirmar o <strong>Contrato Nº {contract?.contract_number}</strong>:
              </p>

              <div className="border-2 border-dashed border-blue-300 rounded-xl overflow-hidden bg-gray-50">
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

              <div className="flex items-center justify-between mt-3 gap-2">
                <p className="text-xs text-gray-400">
                  {hasDrawn ? "✓ Assinatura registrada" : "Desenhe sua assinatura acima"}
                </p>
                <Button variant="outline" size="sm" onClick={clearCanvas}>
                  <Trash2 className="w-3 h-3 mr-1" /> Limpar
                </Button>
              </div>
            </div>

            {/* LGPD (apenas para o aluno) */}
            {signerParam === "student" && (
              <div className="bg-white rounded-xl border border-blue-200 p-4 space-y-3">
                <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" /> Aceite dos Termos — LGPD
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Seus dados pessoais serão utilizados pela CAT Cursos exclusivamente para: cadastro, matrícula, execução do curso, controle financeiro, emissão de recibos e certificados, comunicação por WhatsApp/e-mail, e cumprimento de obrigações legais. Conforme Lei nº 13.709/2018 (LGPD).
                </p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lgpdAccepted}
                    onChange={e => setLgpdAccepted(e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-blue-700"
                  />
                  <span className="text-sm font-medium text-gray-800">
                    Li e aceito os termos do contrato, a cláusula de LGPD e confirmo que todas as informações estão corretas.
                  </span>
                </label>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 flex gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>Ao assinar, você confirma que leu e concorda com todos os termos do contrato. Esta ação possui validade jurídica (Lei nº 14.063/2020).</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button variant="outline" className="w-full sm:flex-1" onClick={() => setStep("view")}>Voltar</Button>
              <Button
                className="w-full sm:flex-1 bg-blue-700 hover:bg-blue-800"
                disabled={!hasDrawn || signing || (signerParam === "student" && !lgpdAccepted)}
                onClick={handleSign}
              >
                {signing ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Assinando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Assinar Contrato
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP: DONE */}
        {step === "done" && (
          <div className="text-center space-y-4 sm:space-y-6">
            <div className="bg-white rounded-2xl border border-blue-200 shadow-lg p-6 sm:p-10">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-blue-700" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Contrato Assinado com Sucesso!</h2>
              <p className="text-gray-500 text-sm mb-1">Sua assinatura digital foi registrada e o contrato está confirmado.</p>
              <div className="bg-blue-50 rounded-lg p-3 my-4 border border-blue-200">
                <p className="text-xs text-blue-600 mb-1 font-medium">Código de Autenticação:</p>
                <p className="font-mono text-sm font-bold text-blue-700 break-all">{contract?.auth_code}</p>
              </div>

              {/* BOTÃO BAIXAR PDF */}
              {contract?.html_content_filled && (
                <div className="my-4">
                  <Button
                    className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 gap-2"
                    onClick={() => {
                      const w = window.open("", "_blank");
                      w.document.write(contract.html_content_filled);
                      w.document.close();
                      setTimeout(() => w.print(), 800);
                    }}
                  >
                    <Download className="w-4 h-4" /> Baixar / Imprimir Contrato Assinado (PDF)
                  </Button>
                  <p className="text-xs text-gray-400 mt-1">Na janela de impressão, escolha "Salvar como PDF" para guardar uma cópia digital.</p>
                </div>
              )}

              <div className="mt-4 bg-emerald-50 rounded-xl p-4 text-xs sm:text-sm text-emerald-700 border border-emerald-200">
                <Shield className="w-4 h-4 inline mr-2 flex-shrink-0" />
                <span>Assinatura registrada em {new Date().toLocaleString("pt-BR")} — Dados armazenados com segurança.</span>
              </div>

              {signerParam === "student" && (
                <div className="mt-4 bg-blue-50 rounded-xl p-4 text-xs sm:text-sm text-blue-700 border border-blue-200 text-left space-y-1">
                  <p className="font-semibold text-blue-800">📩 Você também receberá uma cópia do contrato assinado:</p>
                  {contract?.student_email && <p>• Por <strong>e-mail</strong>: {contract.student_email}</p>}
                  {contract?.student_phone && <p>• Por <strong>WhatsApp</strong>: {contract.student_phone}</p>}
                  {!contract?.student_email && !contract?.student_phone && (
                    <p>Entre em contato com a CAT Cursos para obter uma cópia: (91) 98413-2527</p>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-4">Você pode fechar esta janela. O contrato assinado ficará disponível no sistema da CAT Cursos.</p>
          </div>
        )}
      </div>
    </div>
  );
}