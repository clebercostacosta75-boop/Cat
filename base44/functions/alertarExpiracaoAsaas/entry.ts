import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EXPIRACAO = new Date("2026-07-07T10:00:00-03:00"); // Horário de Brasília
const ALERTAS_DIAS = [30, 15, 7, 3, 1]; // Dias antes para alertar

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const hoje = new Date();
    const diffMs = EXPIRACAO - hoje;
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Só dispara nos dias configurados
    if (!ALERTAS_DIAS.includes(diffDias)) {
      return Response.json({ skipped: true, dias_restantes: diffDias, message: "Nenhum alerta necessário hoje." });
    }

    // Busca todos os admins
    const users = await base44.asServiceRole.entities.User.list();
    const admins = users.filter(u => u.role === "admin" || u.role === "Administrador Master");

    if (admins.length === 0) {
      return Response.json({ error: "Nenhum administrador encontrado." }, { status: 404 });
    }

    const urgencia = diffDias <= 3 ? "🚨 URGENTE" : diffDias <= 7 ? "⚠️ ATENÇÃO" : "📢 AVISO";
    const assunto = `${urgencia} — API Key Asaas expira em ${diffDias} dia(s)!`;
    const dataFormatada = "07/07/2026 às 10:00";

    const corpo = `
Olá, Administrador Master,

${urgencia}: A chave de API do Asaas (sistema de pagamentos) irá expirar em ${diffDias} dia(s).

📅 Data de expiração: ${dataFormatada}
🔑 Chave atual: ASAAS_API_KEY (configurada nos Secrets do sistema)

⚡ AÇÃO NECESSÁRIA:
1. Acesse o painel do Asaas: https://app.asaas.com
2. Gere uma nova API Key antes da data de expiração
3. Acesse o painel Base44 → Configurações → Secrets
4. Substitua o valor de ASAAS_API_KEY pela nova chave

⚠️ Se a chave não for renovada, os pagamentos (Pix, Boleto, Cartão) deixarão de funcionar automaticamente.

Data de expiração: ${dataFormatada}
Dias restantes: ${diffDias}

Sistema CAT Cursos — Alerta Automático
    `.trim();

    const resultados = [];
    for (const admin of admins) {
      if (!admin.email) continue;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: assunto,
        body: corpo,
      });
      resultados.push(admin.email);
    }

    return Response.json({
      success: true,
      dias_restantes: diffDias,
      admins_notificados: resultados,
      message: `Alerta enviado para ${resultados.length} administrador(es).`,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});