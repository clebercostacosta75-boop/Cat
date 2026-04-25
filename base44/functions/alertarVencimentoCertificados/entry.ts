import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Função automática que verifica certificados vencendo em ~30 dias
 * e gera os links wa.me para notificação do aluno e do RH da empresa.
 * Registra os alertas no AuditLog para rastreabilidade.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Permite chamada tanto por automação (sem user) quanto por admin manualmente
    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      isAdmin = user?.role === 'admin';
      if (user && !isAdmin) {
        return Response.json({ error: 'Apenas administradores podem executar esta função' }, { status: 403 });
      }
    } catch {
      // Chamada via automação agendada sem usuário autenticado — permitido
    }

    const body = await req.json().catch(() => ({}));
    const daysAhead = body.days_ahead ?? 30;
    const dryRun = body.dry_run ?? false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + daysAhead);

    // Buscar todos os certificados ativos com data de vencimento
    const allCerts = await base44.asServiceRole.entities.Certificate.list('-valid_until', 500);

    const expiring = allCerts.filter(cert => {
      if (!cert.valid_until) return false;
      if (cert.status === 'revoked') return false;

      const validUntil = new Date(cert.valid_until);
      validUntil.setHours(0, 0, 0, 0);

      // Vence exatamente no período alvo (entre hoje e targetDate, inclusive)
      const diffDays = Math.round((validUntil - today) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= daysAhead;
    });

    if (expiring.length === 0) {
      return Response.json({
        success: true,
        message: `Nenhum certificado vencendo nos próximos ${daysAhead} dias.`,
        count: 0,
        alerts: [],
      });
    }

    const appUrl = req.headers.get('origin') || 'https://app.base44.com';
    const alerts = [];

    for (const cert of expiring) {
      const validUntil = new Date(cert.valid_until);
      const diffDays = Math.round((validUntil - today) / (1000 * 60 * 60 * 24));
      const validUntilFormatted = validUntil.toLocaleDateString('pt-BR');
      const validateLink = `${appUrl}/CertificateValidate?code=${cert.certificate_code}`;

      const alertEntry = {
        certificate_id: cert.id,
        certificate_code: cert.certificate_code,
        student_name: cert.student_name,
        student_phone: cert.student_phone,
        course_name: cert.course_name,
        client_name: cert.client_name,
        valid_until: cert.valid_until,
        days_remaining: diffDays,
        student_whatsapp_url: null,
        hr_whatsapp_url: null,
        student_message: null,
        hr_message: null,
      };

      // --- Mensagem para o ALUNO ---
      if (cert.student_phone) {
        let phoneAluno = cert.student_phone.replace(/\D/g, '');
        if (!phoneAluno.startsWith('55')) phoneAluno = '55' + phoneAluno;

        const msgAluno =
          `Olá, *${cert.student_name}*! 👋\n\n` +
          `⚠️ Seu certificado do curso *${cert.course_name}* vence em *${diffDays} dia(s)*, no dia *${validUntilFormatted}*.\n\n` +
          `Para manter sua conformidade com as normas de segurança, é necessário renovar o treinamento antes do vencimento.\n\n` +
          `📄 Consulte seu certificado atual:\n${validateLink}\n\n` +
          `Entre em contato com seu RH ou com a *CAT Cursos* para agendar a renovação.\n\n` +
          `*CAT Cursos* — Capacitação Profissional ✅`;

        alertEntry.student_message = msgAluno;
        alertEntry.student_whatsapp_url = `https://wa.me/${phoneAluno}?text=${encodeURIComponent(msgAluno)}`;
      }

      // --- Mensagem para o RH da Empresa ---
      // Buscar contato da empresa pelo client_id ou client_name
      if (cert.client_id || cert.client_name) {
        let companies = [];
        if (cert.client_id) {
          companies = await base44.asServiceRole.entities.Company.filter({ id: cert.client_id });
        }
        if (companies.length === 0 && cert.client_name) {
          const all = await base44.asServiceRole.entities.Company.list();
          companies = all.filter(c =>
            c.nome_fantasia === cert.client_name || c.razao_social === cert.client_name
          );
        }

        if (companies.length > 0) {
          const company = companies[0];
          const hrContact = company.contacts?.find(c => c.is_whatsapp && c.phone) || company.contacts?.find(c => c.phone);
          const hrPhone = hrContact?.phone;
          const hrName = hrContact?.name || 'RH';

          if (hrPhone) {
            let phoneRH = hrPhone.replace(/\D/g, '');
            if (!phoneRH.startsWith('55')) phoneRH = '55' + phoneRH;

            const msgRH =
              `Prezado(a) *${hrName}* — *${company.nome_fantasia || company.razao_social}*, 👋\n\n` +
              `⚠️ Informamos que o certificado do colaborador *${cert.student_name}* referente ao curso *${cert.course_name}* vence em *${diffDays} dia(s)*, no dia *${validUntilFormatted}*.\n\n` +
              `A renovação do treinamento é necessária para manter a conformidade com as Normas Regulamentadoras.\n\n` +
              `📄 Certificado atual:\n${validateLink}\n\n` +
              `Entre em contato conosco para agendar o treinamento de renovação.\n\n` +
              `*CAT Cursos* — Capacitação Profissional ✅`;

            alertEntry.hr_whatsapp_url = `https://wa.me/${phoneRH}?text=${encodeURIComponent(msgRH)}`;
            alertEntry.hr_message = msgRH;
            alertEntry.hr_contact_name = hrName;
            alertEntry.hr_phone = hrPhone;
          }
        }
      }

      alerts.push(alertEntry);

      // Registrar no AuditLog para rastreabilidade (se não for dry run)
      if (!dryRun) {
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: 'sistema@catcursos.com.br',
          user_name: 'Sistema Automático',
          action: 'send_whatsapp',
          entity_type: 'Certificate',
          entity_id: cert.id,
          entity_name: `${cert.student_name} — ${cert.course_name}`,
          details: `Alerta de vencimento gerado (${diffDays} dias restantes). Vencimento: ${validUntilFormatted}. Aluno notificável: ${!!alertEntry.student_whatsapp_url}. RH notificável: ${!!alertEntry.hr_whatsapp_url}.`,
          company_id: cert.client_id || '',
          company_name: cert.client_name || '',
        });
      }
    }

    return Response.json({
      success: true,
      message: `${alerts.length} certificado(s) vencendo nos próximos ${daysAhead} dias.`,
      count: alerts.length,
      days_ahead: daysAhead,
      dry_run: dryRun,
      alerts,
    });

  } catch (error) {
    console.error('Erro ao verificar vencimentos:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});