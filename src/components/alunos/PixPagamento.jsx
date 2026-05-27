import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, MessageCircle, Mail, Printer, CheckCircle, Clock, Zap, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

// ─── Configuração PIX fixa da instituição ────────────────────────────────────
const PIX_KEY = "07238084000145";
const PIX_BENEFICIARY = "V S NUNES CURSOS E TREINAMENTO";
const PIX_BENEFICIARY_FULL = "V.S.NUNES CURSOS E TREINAMENTO LTDA";
const PIX_CNPJ_FORMATTED = "07.238.084/0001-45";
const PIX_CITY = "BARCARENA";
const EMPRESA_WHATSAPP = "(91) 99999-0000"; // ajuste se necessário
const EMPRESA_EMAIL = "contato@catcursos.com.br"; // ajuste se necessário

// ─── Gerador de payload BR Code (padrão PIX oficial Banco Central) ────────────
function buildPixPayload(key, beneficiary, city, amount, txid, description) {
  const fmt = (id, val) => {
    const v = String(val);
    return `${id}${String(v.length).padStart(2, "0")}${v}`;
  };

  const merchantAccountInfo = fmt("00", "BR.GOV.BCB.PIX") + fmt("01", key) + (description ? fmt("02", description.substring(0, 72)) : "");
  const amountStr = amount > 0 ? amount.toFixed(2) : "";

  let payload =
    fmt("00", "01") +
    fmt("26", merchantAccountInfo) +
    fmt("52", "0000") +
    fmt("53", "986") +
    (amountStr ? fmt("54", amountStr) : "") +
    fmt("58", "BR") +
    fmt("59", beneficiary.substring(0, 25)) +
    fmt("60", city.substring(0, 15)) +
    fmt("62", fmt("05", txid.substring(0, 25))) +
    "6304";

  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return payload + (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

function generateTxid() {
  return "CAT" + Date.now().toString(36).toUpperCase().substring(0, 22).padEnd(22, "0");
}

function buildEmailHTML({ studentName, courseName, amount, pixCode, cnpjFormatted }) {
  const valor = amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#1a1a2e;padding:28px 32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:1px;">CAT Gestão de Cursos</h1>
            <p style="color:#a0aec0;margin:6px 0 0;font-size:13px;">Sistema de Gestão de Treinamentos</p>
          </td>
        </tr>
        <!-- Saudação -->
        <tr>
          <td style="padding:28px 32px 0;">
            <p style="font-size:16px;color:#2d3748;margin:0;">Olá, <strong>${studentName}</strong>! 👋</p>
            <p style="font-size:14px;color:#4a5568;margin:10px 0 0;">Sua matrícula no curso <strong>${courseName}</strong> foi realizada com sucesso! Abaixo estão os dados para realizar o pagamento via PIX.</p>
          </td>
        </tr>
        <!-- Dados PIX -->
        <tr>
          <td style="padding:24px 32px;">
            <div style="background:#f0fff4;border:2px solid #48bb78;border-radius:10px;padding:22px;">
              <p style="font-size:15px;font-weight:700;color:#276749;margin:0 0 16px;text-align:center;">💳 DADOS PARA PAGAMENTO PIX</p>
              <table width="100%" cellpadding="6" cellspacing="0">
                <tr>
                  <td style="font-size:13px;color:#718096;width:40%;">Beneficiário:</td>
                  <td style="font-size:13px;font-weight:600;color:#2d3748;">${PIX_BENEFICIARY_FULL}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#718096;">CNPJ:</td>
                  <td style="font-size:13px;font-weight:600;color:#2d3748;">${cnpjFormatted}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#718096;">Valor:</td>
                  <td style="font-size:18px;font-weight:700;color:#276749;">R$ ${valor}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#718096;">Descrição:</td>
                  <td style="font-size:13px;color:#2d3748;">Matrícula - ${courseName}</td>
                </tr>
              </table>

              <div style="margin-top:18px;padding-top:16px;border-top:1px dashed #9ae6b4;">
                <p style="font-size:13px;color:#276749;font-weight:700;margin:0 0 8px;">🔑 Chave PIX (CNPJ):</p>
                <div style="background:#ffffff;border:1px solid #48bb78;border-radius:6px;padding:10px 14px;font-family:monospace;font-size:16px;font-weight:700;color:#276749;text-align:center;">${PIX_KEY}</div>
              </div>

              <div style="margin-top:14px;">
                <p style="font-size:12px;color:#718096;margin:0 0 6px;font-weight:600;">Código Copia e Cola:</p>
                <div style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;font-family:monospace;font-size:10px;color:#4a5568;word-break:break-all;">${pixCode}</div>
              </div>
            </div>
          </td>
        </tr>
        <!-- Aviso -->
        <tr>
          <td style="padding:0 32px 24px;">
            <div style="background:#fffbeb;border:1px solid #f6e05e;border-radius:8px;padding:14px 16px;">
              <p style="margin:0;font-size:13px;color:#744210;">⚠️ <strong>Importante:</strong> Após realizar o pagamento, aguarde a confirmação da nossa equipe. Envie o comprovante assim que possível.</p>
            </div>
          </td>
        </tr>
        <!-- Contato -->
        <tr>
          <td style="padding:0 32px 28px;">
            <p style="font-size:13px;color:#718096;margin:0;">Dúvidas? Entre em contato:</p>
            <p style="font-size:13px;color:#4a5568;margin:6px 0 0;">📱 <a href="https://wa.me/55${EMPRESA_WHATSAPP.replace(/\D/g,"")}" style="color:#276749;font-weight:600;">${EMPRESA_WHATSAPP}</a> &nbsp;|&nbsp; 📧 <a href="mailto:${EMPRESA_EMAIL}" style="color:#276749;font-weight:600;">${EMPRESA_EMAIL}</a></p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f7fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
            <p style="font-size:12px;color:#a0aec0;margin:0;">CAT Gestão de Cursos — eadcatcursos.com.br | www.catcursos.com.br</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildWhatsAppMessage({ studentName, courseName, amount, cnpjFormatted }) {
  const valor = `R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  return (
    `Olá ${studentName}! 👋\n\n` +
    `Sua matrícula no curso *${courseName}* foi realizada!\n\n` +
    `💳 *DADOS PARA PAGAMENTO PIX*\n\n` +
    `Beneficiário:\n*${PIX_BENEFICIARY_FULL}*\n\n` +
    `CNPJ: *${cnpjFormatted}*\n\n` +
    `Valor: *${valor}*\n\n` +
    `Descrição:\nMatrícula - ${courseName}\n\n` +
    `*Chave PIX (CNPJ):*\n${PIX_KEY}\n\n` +
    `Após realizar o pagamento, envie o comprovante para confirmarmos sua matrícula! ✅\n\n` +
    `Dúvidas? Estamos à disposição! 😊\n*CAT Gestão de Cursos*`
  );
}

export default function PixPagamento({ value, courseName, studentName, studentPhone, studentEmail, enrollmentId, onPaymentConfirmed }) {
  const [pixCode, setPixCode] = useState("");
  const [txid] = useState(generateTxid);
  const [gerado, setGerado] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [expiresAt] = useState(() => new Date(Date.now() + 30 * 60 * 1000));
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const timerRef = useRef(null);

  // Estado dos envios para feedback visual
  const [emailSentAt, setEmailSentAt] = useState(null);
  const [whatsappSentAt, setWhatsappSentAt] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const amount = parseFloat(value) || 0;
  const description = `${courseName} - ${studentName}`.substring(0, 72);

  // Timer countdown
  useEffect(() => {
    if (!gerado || confirmado) return;
    timerRef.current = setInterval(() => {
      const diff = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff === 0) clearInterval(timerRef.current);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gerado, confirmado, expiresAt]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const sendEmail = async (code, showToast = true) => {
    if (!studentEmail) {
      if (showToast) toast.warning("Aluno sem e-mail cadastrado — envio de e-mail ignorado.");
      return false;
    }
    setSendingEmail(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: studentEmail,
        subject: `Dados para Pagamento PIX - ${courseName} - CAT Cursos`,
        body: buildEmailHTML({ studentName, courseName, amount, pixCode: code, cnpjFormatted: PIX_CNPJ_FORMATTED }),
      });
      const now = new Date().toLocaleString("pt-BR");
      setEmailSentAt(now);
      if (showToast) toast.success("📧 E-mail com dados do PIX enviado automaticamente!");
      return true;
    } catch (e) {
      if (showToast) toast.error("Erro ao enviar e-mail: " + e.message);
      return false;
    } finally {
      setSendingEmail(false);
    }
  };

  const handleGerar = async () => {
    if (amount <= 0) { toast.error("Informe o valor do curso antes de gerar o PIX."); return; }
    const code = buildPixPayload(PIX_KEY, PIX_BENEFICIARY, PIX_CITY, amount, txid, description);
    setPixCode(code);
    setGerado(true);
    setTimeLeft(30 * 60);
    // Auto-envio de e-mail ao gerar
    await sendEmail(code, true);
  };

  const handleCopiar = () => {
    navigator.clipboard.writeText(pixCode).then(() => toast.success("Código PIX copiado!")).catch(() => toast.error("Falha ao copiar"));
  };

  const handleCopiarChave = () => {
    navigator.clipboard.writeText(PIX_KEY).then(() => toast.success("Chave PIX copiada!")).catch(() => toast.error("Falha ao copiar"));
  };

  const handleWhatsApp = () => {
    const phone = (studentPhone || "").replace(/\D/g, "");
    if (!phone) { toast.error("Aluno sem WhatsApp cadastrado."); return; }
    const msg = encodeURIComponent(buildWhatsAppMessage({ studentName, courseName, amount, cnpjFormatted: PIX_CNPJ_FORMATTED }));
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
    const now = new Date().toLocaleString("pt-BR");
    setWhatsappSentAt(now);
    toast.success("📱 WhatsApp aberto com mensagem pronta!");
  };

  const handleEmail = () => sendEmail(pixCode, true);

  const handleReenviar = async () => {
    await sendEmail(pixCode, true);
    toast.success("Dados do PIX reenviados!");
  };

  const handleImprimir = () => {
    const svg = document.getElementById("pix-qrcode")?.innerHTML;
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>PIX - ${courseName}</title>
      <style>body{font-family:sans-serif;text-align:center;padding:30px}h2{margin-bottom:4px}p{margin:4px 0}svg{margin:16px 0}.code{font-size:10px;word-break:break-all;background:#f5f5f5;padding:10px;border-radius:6px;margin:10px 0}</style>
      </head><body>
        <h2>Pagamento via PIX</h2>
        <p><strong>${PIX_BENEFICIARY_FULL}</strong></p>
        <p>CNPJ: ${PIX_CNPJ_FORMATTED}</p>
        <p>Curso: ${courseName}</p>
        <p>Aluno: ${studentName}</p>
        <p style="font-size:20px;font-weight:bold">R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        <div id="svg">${svg}</div>
        <p>Chave PIX: <strong>${PIX_KEY}</strong></p>
        <p class="code">${pixCode}</p>
        <p><em>Válido por 30 minutos</em></p>
        <script>window.onload=()=>window.print()</script>
      </body></html>
    `);
    w.document.close();
  };

  const handleConfirmar = async () => {
    setConfirming(true);
    try {
      const now = new Date();
      await base44.functions.invoke("gerarRecibo", {
        enrollment_id: enrollmentId,
        payment_method: "Pix",
        amount,
        payment_date: now.toISOString().split("T")[0],
        description: `PIX - Chave CNPJ: ${PIX_CNPJ_FORMATTED} | TxID: ${txid}`,
      });
      setConfirmado(true);
      clearInterval(timerRef.current);
      toast.success("Pagamento PIX confirmado! Recibo gerado.");
      onPaymentConfirmed?.();
    } catch (e) {
      toast.error("Erro ao confirmar: " + e.message);
    } finally {
      setConfirming(false);
    }
  };

  const isExpired = timeLeft === 0 && gerado && !confirmado;

  return (
    <div className="space-y-3">
      {/* Botão Gerar PIX */}
      {!gerado && (
        <Button
          type="button"
          className="w-full bg-green-700 hover:bg-green-800 gap-2"
          onClick={handleGerar}
          disabled={amount <= 0}
        >
          <Zap className="w-4 h-4" /> Gerar QR Code PIX
        </Button>
      )}

      {/* Alerta sem e-mail / sem WhatsApp */}
      {!gerado && (
        <div className="space-y-1.5">
          {!studentEmail && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" /> Aluno sem e-mail cadastrado — o e-mail PIX não será enviado automaticamente.
            </div>
          )}
          {!studentPhone && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" /> Aluno sem WhatsApp cadastrado — o envio por WhatsApp não estará disponível.
            </div>
          )}
        </div>
      )}

      {/* Tela do PIX gerado */}
      {gerado && (
        <div className="border-2 border-green-300 rounded-xl p-4 bg-green-50 space-y-3">
          {/* Header */}
          <div className="text-center">
            <p className="text-base font-bold text-green-900">🏦 PAGAMENTO VIA PIX</p>
            {!confirmado && !isExpired && (
              <div className={`inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${timeLeft < 300 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                <Clock className="w-3 h-3" /> ⏱ Válido por: {formatTime(timeLeft)}
              </div>
            )}
            {isExpired && <Badge className="bg-red-100 text-red-700 mt-1">PIX Expirado — Gere um novo</Badge>}
            {confirmado && <Badge className="bg-green-200 text-green-800 mt-1"><CheckCircle className="w-3 h-3 mr-1 inline" /> Pagamento Confirmado</Badge>}
          </div>

          {/* Dados do beneficiário */}
          <div className="bg-white rounded-lg p-3 space-y-1 text-sm border border-green-200">
            <div className="flex justify-between"><span className="text-gray-500 text-xs">Beneficiário:</span><span className="font-semibold text-gray-900 text-xs text-right">{PIX_BENEFICIARY_FULL}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 text-xs">CNPJ:</span><span className="font-mono text-xs font-semibold text-gray-800">{PIX_CNPJ_FORMATTED}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 text-xs">Valor:</span><span className="font-bold text-green-700 text-base">R$ {amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between items-start gap-2"><span className="text-gray-500 text-xs flex-shrink-0">Descrição:</span><span className="text-xs text-gray-700 text-right">{description}</span></div>
          </div>

          {/* QR Code */}
          {!isExpired && !confirmado && (
            <div id="pix-qrcode" className="flex justify-center bg-white p-4 rounded-xl border border-green-200">
              <QRCodeSVG value={pixCode} size={200} level="M" includeMargin />
            </div>
          )}

          {/* Chave PIX + copiar */}
          <div className="bg-white rounded-lg p-3 border border-green-200 space-y-1">
            <p className="text-xs text-gray-500 font-semibold">Chave PIX (CNPJ):</p>
            <div className="flex items-center gap-2">
              <span className="flex-1 font-mono text-sm font-semibold text-gray-900">{PIX_KEY}</span>
              <Button size="sm" variant="outline" className="h-7 text-xs border-green-300 text-green-700" onClick={handleCopiarChave}>
                <Copy className="w-3 h-3 mr-1" /> Copiar
              </Button>
            </div>
          </div>

          {/* Código copia e cola */}
          {!isExpired && !confirmado && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-600">Código Copia e Cola:</p>
              <div className="flex gap-2">
                <Input readOnly value={pixCode} className="text-xs font-mono flex-1 bg-gray-50 h-8" />
                <Button size="sm" className="bg-green-700 hover:bg-green-800 h-8 flex-shrink-0" onClick={handleCopiar}>
                  <Copy className="w-3 h-3 mr-1" /> Copiar
                </Button>
              </div>
            </div>
          )}

          {/* Histórico de envios */}
          {(emailSentAt || whatsappSentAt) && (
            <div className="bg-white rounded-lg p-3 border border-green-200 space-y-1.5">
              <p className="text-xs font-semibold text-gray-600">📋 Histórico de Envios:</p>
              {emailSentAt && (
                <div className="flex items-center gap-2 text-xs text-green-700">
                  <CheckCircle className="w-3 h-3 flex-shrink-0" />
                  <span>📧 E-mail enviado em <strong>{emailSentAt}</strong></span>
                </div>
              )}
              {whatsappSentAt && (
                <div className="flex items-center gap-2 text-xs text-green-700">
                  <CheckCircle className="w-3 h-3 flex-shrink-0" />
                  <span>📱 WhatsApp aberto em <strong>{whatsappSentAt}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Botões de ação */}
          {!confirmado && !isExpired && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-green-300 text-green-700 hover:bg-green-50"
                onClick={handleWhatsApp}
                disabled={!studentPhone}
                title={!studentPhone ? "Aluno sem WhatsApp cadastrado" : ""}
              >
                <MessageCircle className="w-3 h-3 mr-1" /> 📱 WhatsApp
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                onClick={handleEmail}
                disabled={sendingEmail || !studentEmail}
                title={!studentEmail ? "Aluno sem e-mail cadastrado" : ""}
              >
                <Mail className="w-3 h-3 mr-1" />
                {sendingEmail ? "Enviando..." : "📧 E-mail"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                onClick={handleReenviar}
                disabled={sendingEmail || !studentEmail}
              >
                <RotateCcw className="w-3 h-3 mr-1" /> 🔄 Reenviar dados
              </Button>
              <Button size="sm" variant="outline" className="text-xs" onClick={handleImprimir}>
                <Printer className="w-3 h-3 mr-1" /> 🖨️ Imprimir
              </Button>
            </div>
          )}

          {/* Botão confirmar pagamento */}
          {!confirmado && !isExpired && (
            <Button
              className="w-full bg-emerald-700 hover:bg-emerald-800 mt-1 gap-2"
              onClick={handleConfirmar}
              disabled={confirming}
            >
              <CheckCircle className="w-4 h-4" />
              {confirming ? "Confirmando..." : "✅ Confirmar Pagamento PIX"}
            </Button>
          )}

          {/* Expirado: gerar novo */}
          {isExpired && (
            <Button
              className="w-full bg-gray-700 hover:bg-gray-800"
              onClick={() => { setGerado(false); setPixCode(""); setEmailSentAt(null); setWhatsappSentAt(null); }}
            >
              🔄 Gerar Novo PIX
            </Button>
          )}

          {/* Confirmado: sucesso */}
          {confirmado && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Pagamento PIX confirmado!</p>
                <p className="text-xs text-emerald-700">Recibo gerado automaticamente. Você pode continuar para concluir a matrícula.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}