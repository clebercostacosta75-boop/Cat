import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Endpoint público do fluxo de certificados (assinatura + auditoria).
 * Ações:
 *  - "sign": valida CPF + expiração do link e grava a assinatura (com IP e dispositivo).
 *  - "log":  registra eventos de auditoria (acesso ao link, validação, download, etc).
 * Sem autenticação de usuário (páginas públicas) — todas as validações são feitas aqui.
 */

const EVENTS = {
  link_acesso: { action: "view", label: "Acesso ao link de assinatura" },
  link_expirado: { action: "sign", label: "Tentativa de acesso/assinatura com link expirado" },
  cpf_incorreto: { action: "sign", label: "Tentativa de assinatura com CPF incorreto" },
  validacao_publica: { action: "view", label: "Validação pública do certificado" },
  download_permitido: { action: "export", label: "Download do certificado permitido" },
  download_bloqueado: { action: "export", label: "Tentativa de download bloqueada" },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, code, cpf, signature_file_url, event, details } = body;

    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      req.headers.get("x-real-ip") || "";
    const userAgent = req.headers.get("user-agent") || "";

    if (!code) return Response.json({ error: "Código do certificado não informado" }, { status: 400 });

    const certs = await base44.asServiceRole.entities.Certificate.filter({ certificate_code: code });
    const cert = certs?.[0];
    if (!cert) return Response.json({ error: "Certificado não encontrado" }, { status: 404 });

    const audit = async (auditAction, det) => {
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: "publico@certificado",
          user_name: cert.student_name || "Acesso Público",
          action: auditAction,
          entity_type: "Certificate",
          entity_id: cert.id,
          entity_name: `${cert.certificate_code} — ${cert.student_name} — ${cert.course_name}`,
          details: `${det} | ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} | Navegador: ${userAgent.slice(0, 150)}`,
          ip_address: ip,
          company_id: cert.client_id || "",
          company_name: cert.client_name || "",
        });
      } catch (e) {
        console.error("Falha ao registrar auditoria:", e.message);
      }
    };

    // ── Registro de eventos de auditoria ──
    if (action === "log") {
      const ev = EVENTS[event];
      if (!ev) return Response.json({ error: "Evento inválido" }, { status: 400 });
      await audit(ev.action, `${ev.label}${details ? ` — ${String(details).slice(0, 200)}` : ""}`);
      return Response.json({ success: true });
    }

    // ── Comprovante público da assinatura digital ──
    if (action === "comprovante") {
      if (cert.status !== "signed" || !cert.signed_at) {
        return Response.json({ error: "nao_assinado" }, { status: 404 });
      }
      // Hash determinístico da assinatura (SHA-256 dos dados imutáveis do ato)
      const payload = `${cert.certificate_code}|${(cert.student_cpf || "").replace(/\D/g, "")}|${cert.signed_at}|${cert.signature_url || ""}`;
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
      const hash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");

      // ID do registro de auditoria da assinatura
      let auditId = null;
      try {
        const logs = await base44.asServiceRole.entities.AuditLog.filter(
          { entity_id: cert.id, action: "sign" }, "-created_date", 50
        );
        const signLog = (logs || []).find(l => (l.details || "").includes("concluída com sucesso"));
        auditId = signLog?.id || null;
      } catch (e) {
        console.error("Falha ao buscar auditoria:", e.message);
      }

      return Response.json({
        signed_at: cert.signed_at,
        signed_ip: cert.signed_ip || null,
        signed_device: cert.signed_device || null,
        internal_control_code: cert.internal_control_code || null,
        signature_hash: hash,
        audit_id: auditId,
      });
    }

    // ── Assinatura digital ──
    if (action === "sign") {
      if (cert.status === "revoked") {
        await audit("sign", "Tentativa de assinatura em certificado revogado — bloqueada");
        return Response.json({ error: "certificado_revogado" }, { status: 403 });
      }
      if (cert.status === "signed") {
        return Response.json({ error: "ja_assinado" }, { status: 409 });
      }
      // Expiração do link de assinatura
      if (cert.signature_link_expires_at && new Date(cert.signature_link_expires_at) < new Date()) {
        await audit("sign", "Tentativa de assinatura com link expirado — bloqueada");
        return Response.json({ error: "link_expirado" }, { status: 410 });
      }
      // Confirmação de CPF (obrigatória)
      const cpfInformado = (cpf || "").replace(/\D/g, "");
      const cpfCert = (cert.student_cpf || "").replace(/\D/g, "");
      if (!cpfInformado || cpfInformado.length !== 11 || cpfInformado !== cpfCert) {
        await audit("sign", "Tentativa de assinatura com CPF incorreto — bloqueada");
        return Response.json({ error: "cpf_incorreto" }, { status: 403 });
      }
      if (!signature_file_url) {
        return Response.json({ error: "Assinatura não enviada" }, { status: 400 });
      }

      const signedAt = new Date().toISOString();
      await base44.asServiceRole.entities.Certificate.update(cert.id, {
        status: "signed",
        signature_url: signature_file_url,
        signed_at: signedAt,
        signed_device: userAgent,
        signed_ip: ip,
      });
      await audit("sign", "Assinatura digital concluída com sucesso");

      return Response.json({ success: true, signed_at: signedAt, signature_url: signature_file_url });
    }

    return Response.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});