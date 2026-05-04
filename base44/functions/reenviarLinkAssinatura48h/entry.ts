import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Buscar todos os certificados pendentes de assinatura
    const certificates = await base44.asServiceRole.entities.Certificate.filter({ status: "pending_signature" });

    const now = new Date();
    let reenvios = 0;
    let expirados = 0;

    for (const cert of certificates) {
      const issuedAt = cert.issue_date ? new Date(cert.issue_date) : null;
      const expiresAt = cert.signature_link_expires_at ? new Date(cert.signature_link_expires_at) : null;
      const reminderSentAt = cert.signature_reminder_sent_at ? new Date(cert.signature_reminder_sent_at) : null;

      if (!issuedAt) continue;

      // Link expirado (7 dias) — marcar como expirado
      if (expiresAt && now > expiresAt) {
        await base44.asServiceRole.entities.Certificate.update(cert.id, { status: "expired" });
        expirados++;
        continue;
      }

      // 48h sem assinatura e ainda não foi feito reenvio
      const hours48 = new Date(issuedAt.getTime() + 48 * 60 * 60 * 1000);
      if (now > hours48 && !reminderSentAt && cert.student_phone) {
        try {
          const signUrl = `${Deno.env.get("APP_URL") || "https://app.base44.app"}/CertificateSign?code=${cert.certificate_code}`;
          await base44.asServiceRole.functions.invoke("enviarCertificadoWhatsApp", {
            phone: cert.student_phone,
            studentName: cert.student_name,
            courseName: cert.course_name,
            signUrl,
            certificateCode: cert.certificate_code
          });
          await base44.asServiceRole.entities.Certificate.update(cert.id, {
            signature_reminder_sent_at: now.toISOString()
          });
          reenvios++;
        } catch (e) {
          console.error(`Erro ao reenviar para ${cert.student_name}:`, e.message);
        }
      }
    }

    return Response.json({
      success: true,
      message: `Processado: ${reenvios} reenvios realizados, ${expirados} links expirados marcados.`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});