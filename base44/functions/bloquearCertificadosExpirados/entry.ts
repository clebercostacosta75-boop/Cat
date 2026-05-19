import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Automação agendada (diária) — bloqueia certificados cujo:
 * 1. download_deadline expirou (bloqueia download PDF)
 * 2. valid_until expirou (bloqueia certificado completamente e notifica aluno/empresa)
 * Registra log de auditoria para cada bloqueio efetuado.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const nowISO = now.toISOString();

    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    const sendWhatsApp = async (phone, message) => {
      if (!accessToken || !phoneNumberId || !phone) return false;
      let formattedPhone = phone.replace(/\D/g, '');
      if (!formattedPhone.startsWith('55')) formattedPhone = '55' + formattedPhone;
      const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: formattedPhone, type: 'text', text: { body: message } }),
      });
      return res.ok;
    };

    // Buscar todos os certificados
    const certificados = await base44.asServiceRole.entities.Certificate.list('-created_date', 500);

    // 1. Certificados com download_deadline expirado (não bloqueados ainda)
    const expiradosDownload = certificados.filter(c =>
      c.download_deadline &&
      !c.is_blocked &&
      new Date(c.download_deadline) < now
    );

    // 2. Certificados com valid_until expirado (status não revoked)
    const expiradosValidade = certificados.filter(c =>
      c.valid_until &&
      c.status !== 'revoked' &&
      c.status !== 'expired' &&
      new Date(c.valid_until) < now
    );

    let bloqueadosDownload = 0;
    let bloqueadosValidade = 0;
    let notificacoes = 0;
    const erros = [];

    // Processar bloqueio de download
    for (const cert of expiradosDownload) {
      try {
        await base44.asServiceRole.entities.Certificate.update(cert.id, { is_blocked: true });

        await base44.asServiceRole.entities.AuditLog.create({
          user_email: "sistema@catcursos.com.br",
          user_name: "Sistema Automático",
          action: "update",
          entity_type: "Certificate",
          entity_id: cert.id,
          entity_name: `${cert.course_name} — ${cert.student_name}`,
          details: `Download bloqueado automaticamente. Prazo expirado em ${cert.download_deadline}.`,
          company_id: cert.client_id || "",
          company_name: cert.client_name || "",
        });

        // Notificar aluno via WhatsApp
        if (cert.student_phone) {
          const msg = `Olá, *${cert.student_name}*! 📋

O prazo para download do seu certificado do curso *${cert.course_name}* expirou.

O download em PDF foi *bloqueado*, porém a autenticidade continua válida até ${cert.valid_until ? new Date(cert.valid_until).toLocaleDateString('pt-BR') : 'a data de vencimento'}.

Para mais informações, entre em contato com a CAT Cursos.

*CAT Cursos* — Sistema de Certificação Digital`;
          const sent = await sendWhatsApp(cert.student_phone, msg);
          if (sent) notificacoes++;
        }

        bloqueadosDownload++;
        console.log(`[DOWNLOAD BLOQUEADO] ${cert.student_name} — ${cert.course_name} — deadline: ${cert.download_deadline}`);
      } catch (e) {
        erros.push({ id: cert.id, tipo: 'download', erro: e.message });
      }
    }

    // Processar expiração de validade
    for (const cert of expiradosValidade) {
      try {
        await base44.asServiceRole.entities.Certificate.update(cert.id, {
          status: 'expired',
          is_blocked: true,
        });

        await base44.asServiceRole.entities.AuditLog.create({
          user_email: "sistema@catcursos.com.br",
          user_name: "Sistema Automático",
          action: "update",
          entity_type: "Certificate",
          entity_id: cert.id,
          entity_name: `${cert.course_name} — ${cert.student_name}`,
          details: `Certificado expirado automaticamente. Validade encerrada em ${cert.valid_until}. Aluno notificado.`,
          company_id: cert.client_id || "",
          company_name: cert.client_name || "",
        });

        // Notificar aluno via WhatsApp
        if (cert.student_phone) {
          const msg = `⚠️ Olá, *${cert.student_name}*!

Seu certificado do curso *${cert.course_name}* está *VENCIDO*.

📅 Data de vencimento: ${new Date(cert.valid_until).toLocaleDateString('pt-BR')}
📋 Código: ${cert.certificate_code || 'N/A'}

Para continuar trabalhando com segurança, é necessário realizar a *atualização/reciclagem* deste treinamento.

Entre em contato com a CAT Cursos para agendar seu novo treinamento.

*CAT Cursos* — (seu contato aqui)`;
          const sent = await sendWhatsApp(cert.student_phone, msg);
          if (sent) notificacoes++;
        }

        // Notificar empresa via AuditLog (empresa pode ver no portal)
        if (cert.client_id) {
          await base44.asServiceRole.entities.Notification?.create?.({
            title: `Certificado Vencido — ${cert.student_name}`,
            message: `O certificado de ${cert.student_name} para o curso ${cert.course_name} venceu em ${new Date(cert.valid_until).toLocaleDateString('pt-BR')}. É necessário realizar a atualização do treinamento.`,
            type: 'warning',
            entity_type: 'Certificate',
            entity_id: cert.id,
            company_id: cert.client_id,
          }).catch(() => {});
        }

        bloqueadosValidade++;
        console.log(`[VALIDADE EXPIRADA] ${cert.student_name} — ${cert.course_name} — valid_until: ${cert.valid_until}`);
      } catch (e) {
        erros.push({ id: cert.id, tipo: 'validade', erro: e.message });
      }
    }

    return Response.json({
      success: true,
      timestamp: nowISO,
      total_verificados: certificados.length,
      bloqueados_download: bloqueadosDownload,
      expirados_validade: bloqueadosValidade,
      notificacoes_enviadas: notificacoes,
      erros,
    });

  } catch (error) {
    console.error('[bloquearCertificadosExpirados] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});