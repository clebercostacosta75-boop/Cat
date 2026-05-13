import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Automação agendada (diária) — bloqueia certificados cujo download_deadline expirou.
 * Também registra log de auditoria para cada bloqueio efetuado.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const nowISO = now.toISOString();

    // Buscar todos os certificados não bloqueados com prazo definido
    const certificados = await base44.asServiceRole.entities.Certificate.list();

    const expirados = certificados.filter(c =>
      c.download_deadline &&
      !c.is_blocked &&
      new Date(c.download_deadline) < now
    );

    let bloqueados = 0;
    const erros = [];

    for (const cert of expirados) {
      try {
        await base44.asServiceRole.entities.Certificate.update(cert.id, { is_blocked: true });

        // Registrar no AuditLog
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: "sistema@catcursos.com.br",
          user_name: "Sistema Automático",
          action: "update",
          entity_type: "Certificate",
          entity_id: cert.id,
          entity_name: `${cert.course_name} — ${cert.student_name}`,
          details: `Download bloqueado automaticamente. Prazo expirado em ${cert.download_deadline}. Tipo: ${cert.recipient_type || "não definido"}.`,
          company_id: cert.client_id || "",
          company_name: cert.client_name || "",
        });

        bloqueados++;
        console.log(`[BLOQUEADO] Cert ${cert.id} — ${cert.student_name} — deadline: ${cert.download_deadline}`);
      } catch (e) {
        erros.push({ id: cert.id, erro: e.message });
      }
    }

    return Response.json({
      success: true,
      timestamp: nowISO,
      total_verificados: certificados.length,
      total_expirados: expirados.length,
      total_bloqueados: bloqueados,
      erros,
    });

  } catch (error) {
    console.error('[bloquearCertificadosExpirados] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});