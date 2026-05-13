import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Função acionada pela automação de entidade Certificate (create/update).
 * - Quando signed_at é definido: calcula download_deadline (30 dias para aluno, 45 para empresa)
 * - Quando download_deadline é passado: define is_blocked = true
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;
    const certId = event?.entity_id;

    if (!certId || !data) {
      return Response.json({ skipped: true, reason: "Sem dados suficientes" });
    }

    const now = new Date();
    const updates = {};

    // Calcular download_deadline quando signed_at é preenchido e ainda não há deadline
    if (data.signed_at && data.recipient_type && !data.download_deadline) {
      const signedAt = new Date(data.signed_at);
      const days = data.recipient_type === "empresa" ? 45 : 30;
      const deadline = new Date(signedAt);
      deadline.setDate(deadline.getDate() + days);
      updates.download_deadline = deadline.toISOString();
      console.log(`[${certId}] download_deadline calculado: ${deadline.toISOString()} (${days} dias para ${data.recipient_type})`);
    }

    // Bloquear download se prazo expirou e ainda não está bloqueado
    const deadline = updates.download_deadline || data.download_deadline;
    if (deadline && !data.is_blocked && new Date(deadline) < now) {
      updates.is_blocked = true;
      console.log(`[${certId}] Download bloqueado — prazo expirado em ${deadline}`);
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ skipped: true, reason: "Nenhuma atualização necessária" });
    }

    await base44.asServiceRole.entities.Certificate.update(certId, updates);
    console.log(`[${certId}] Certificado atualizado:`, updates);

    return Response.json({ success: true, certId, updates });

  } catch (error) {
    console.error('[gerenciarPrazoDownloadCertificado] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});