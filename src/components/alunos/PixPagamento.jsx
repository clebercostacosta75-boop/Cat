import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, MessageCircle, Mail, Printer, CheckCircle, Clock, Zap } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

// ─── Configuração PIX fixa da instituição ────────────────────────────────────
const PIX_KEY = "07238084000145";
const PIX_BENEFICIARY = "V S NUNES CURSOS E TREINAMENTO";
const PIX_CITY = "BARCARENA";

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

  // CRC16-CCITT
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

export default function PixPagamento({ value, courseName, studentName, studentPhone, studentEmail, enrollmentId, onPaymentConfirmed }) {
  const [pixCode, setPixCode] = useState("");
  const [txid] = useState(generateTxid);
  const [gerado, setGerado] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [expiresAt] = useState(() => new Date(Date.now() + 30 * 60 * 1000));
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const timerRef = useRef(null);

  const amount = parseFloat(value) || 0;
  const description = `${courseName} - ${studentName}`.substring(0, 72);
  const cnpjFormatted = "07.238.084/0001-45";

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

  const handleGerar = () => {
    if (amount <= 0) { toast.error("Informe o valor do curso antes de gerar o PIX."); return; }
    const code = buildPixPayload(PIX_KEY, PIX_BENEFICIARY, PIX_CITY, amount, txid, description);
    setPixCode(code);
    setGerado(true);
    setTimeLeft(30 * 60);
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
    const msg = encodeURIComponent(
      `🏦 *PAGAMENTO VIA PIX*\n\n` +
      `Beneficiário: *${PIX_BENEFICIARY}*\n` +
      `CNPJ: ${cnpjFormatted}\n\n` +
      `Curso: ${courseName}\n` +
      `Valor: *R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}*\n\n` +
      `🔑 *Chave PIX (CNPJ):*\n${PIX_KEY}\n\n` +
      `📋 *Código Copia e Cola:*\n${pixCode}\n\n` +
      `⏱ Válido por 30 minutos.`
    );
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  };

  const handleEmail = async () => {
    if (!studentEmail) { toast.error("Aluno sem e-mail cadastrado."); return; }
    try {
      await base44.integrations.Core.SendEmail({
        to: studentEmail,
        subject: `Pagamento PIX — ${courseName}`,
        body: `
          <h2>Pagamento via PIX</h2>
          <p><strong>Beneficiário:</strong> ${PIX_BENEFICIARY}</p>
          <p><strong>CNPJ:</strong> ${cnpjFormatted}</p>
          <p><strong>Curso:</strong> ${courseName}</p>
          <p><strong>Valor:</strong> R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <h3>Chave PIX (CNPJ):</h3>
          <p style="font-size:18px;background:#f5f5f5;padding:10px;border-radius:6px">${PIX_KEY}</p>
          <h3>Código Copia e Cola:</h3>
          <p style="font-size:11px;background:#f5f5f5;padding:10px;border-radius:6px;word-break:break-all">${pixCode}</p>
          <p><em>Válido por 30 minutos.</em></p>
        `,
      });
      toast.success("E-mail enviado com sucesso!");
    } catch (e) {
      toast.error("Erro ao enviar e-mail: " + e.message);
    }
  };

  const handleImprimir = () => {
    const svg = document.getElementById("pix-qrcode")?.innerHTML;
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>PIX - ${courseName}</title>
      <style>body{font-family:sans-serif;text-align:center;padding:30px}h2{margin-bottom:4px}p{margin:4px 0}svg{margin:16px 0}.code{font-size:10px;word-break:break-all;background:#f5f5f5;padding:10px;border-radius:6px;margin:10px 0}</style>
      </head><body>
        <h2>Pagamento via PIX</h2>
        <p><strong>${PIX_BENEFICIARY}</strong></p>
        <p>CNPJ: ${cnpjFormatted}</p>
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
      // Gerar recibo
      const now = new Date();
      await base44.functions.invoke("gerarRecibo", {
        enrollment_id: enrollmentId,
        payment_method: "Pix",
        amount,
        payment_date: now.toISOString().split("T")[0],
        description: `PIX - Chave CNPJ: ${cnpjFormatted} | TxID: ${txid}`,
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
            <div className="flex justify-between"><span className="text-gray-500 text-xs">Beneficiário:</span><span className="font-semibold text-gray-900 text-xs text-right">{PIX_BENEFICIARY}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 text-xs">CNPJ:</span><span className="font-mono text-xs font-semibold text-gray-800">{cnpjFormatted}</span></div>
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

          {/* Botões de ação */}
          {!confirmado && !isExpired && (
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="text-xs border-green-300 text-green-700 hover:bg-green-50" onClick={handleWhatsApp}>
                <MessageCircle className="w-3 h-3 mr-1" /> 📱 WhatsApp
              </Button>
              <Button size="sm" variant="outline" className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50" onClick={handleEmail}>
                <Mail className="w-3 h-3 mr-1" /> 📧 E-mail
              </Button>
              <Button size="sm" variant="outline" className="text-xs col-span-2" onClick={handleImprimir}>
                <Printer className="w-3 h-3 mr-1" /> 🖨️ Imprimir QR Code
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
              onClick={() => { setGerado(false); setPixCode(""); }}
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