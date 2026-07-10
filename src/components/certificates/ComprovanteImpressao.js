/**
 * SPR-2C-2 — Comprovante de Assinatura Digital (versão de impressão A4).
 * Gera o HTML da página adicional anexada à impressão "certificado + comprovante".
 * Não altera o componente de tela ComprovanteAssinaturaDigital.
 */

const maskCpf = (cpf) => {
  const d = (cpf || "").replace(/\D/g, "");
  if (d.length !== 11) return "***.***.***-**";
  return `***.***.${d.slice(6, 9)}-**`;
};

const parseUA = (ua = "") => {
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
};

const esc = (v) => String(v ?? "—").replace(/</g, "&lt;");

export function buildComprovanteHTML(cert, data) {
  const d = data || {};
  const signed = cert.signed_at ? new Date(cert.signed_at) : null;
  const ua = d.signed_device || cert.signed_device || "";
  const { browser, os } = parseUA(ua);
  const validateUrl = `${window.location.origin}/CertificateValidate?code=${cert.certificate_code}`;

  const row = (label, value, mono = false) => `
    <tr>
      <td style="padding:6px 10px; font-size:8pt; text-transform:uppercase; letter-spacing:.5px; color:#047857; width:200px; border-bottom:1px solid #d1fae5; vertical-align:top;">${label}</td>
      <td style="padding:6px 10px; font-size:${mono ? "8.5pt" : "10pt"}; ${mono ? "font-family:monospace;" : "font-weight:600;"} color:#1f2937; border-bottom:1px solid #d1fae5; word-break:break-all;">${esc(value)}</td>
    </tr>`;

  return `
  <div style="page-break-before:always; font-family:Arial,Helvetica,sans-serif; padding:15mm 18mm; box-sizing:border-box;">
    <div style="max-width:190mm; margin:0 auto; border:2px solid #10b981; border-radius:10px; padding:9mm;">
      <div style="text-align:center; margin-bottom:7mm;">
        <div style="font-size:16pt; font-weight:bold; color:#065f46;">COMPROVANTE DE ASSINATURA DIGITAL</div>
        <div style="font-size:9pt; color:#6b7280; margin-top:2mm;">Documento complementar ao certificado ${esc(cert.certificate_code)}</div>
      </div>
      <table style="width:100%; border-collapse:collapse;">
        ${row("Aluno", cert.student_name)}
        ${row("CPF", maskCpf(cert.student_cpf))}
        ${row("Curso", cert.course_name)}
        ${row("Empresa / Origem", cert.client_name || "Individual (PF)")}
        ${row("Data da assinatura", signed ? signed.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—")}
        ${row("Hora da assinatura", signed ? signed.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—")}
        ${row("IP", d.signed_ip || cert.signed_ip || "—", true)}
        ${row("Navegador / Sistema", ua ? `${browser} / ${os}` : "—")}
        ${row("Código interno", d.internal_control_code || cert.internal_control_code || "—", true)}
        ${row("Código público", cert.certificate_code, true)}
        ${row("Hash da assinatura (SHA-256)", d.signature_hash || "—", true)}
        ${row("ID da auditoria", d.audit_id || "—", true)}
      </table>
      ${cert.signature_url ? `
      <div style="text-align:center; margin-top:6mm;">
        <img src="${cert.signature_url}" style="height:14mm; object-fit:contain;" alt="Assinatura" />
        <div style="font-size:8pt; color:#6b7280;">Assinatura digital registrada</div>
      </div>` : ""}
      <div style="display:flex; align-items:center; gap:8mm; margin-top:7mm;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(validateUrl)}" style="width:26mm; height:26mm;" alt="QR Code" />
        <div style="font-size:8.5pt; color:#374151; line-height:1.5;">
          <strong>Validação:</strong> a autenticidade deste comprovante e do certificado pode ser verificada pelo QR Code ao lado ou em:<br/>
          <span style="font-family:monospace; font-size:8pt;">${esc(validateUrl)}</span><br/><br/>
          Este documento comprova a assinatura digital realizada pelo aluno e integra a trilha de auditoria do sistema CAT.
        </div>
      </div>
    </div>
  </div>`;
}