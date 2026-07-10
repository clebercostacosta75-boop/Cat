// FASE 6 — Lembretes automáticos de curso (Gestão Acadêmica Individual)
// Roda diariamente: prepara mensagens de "curso inicia amanhã" e "curso inicia hoje"
// para matrículas individuais (PF). Modo SEMIAUTOMÁTICO: mensagens ficam "Preparada"
// no histórico da matrícula — nenhum disparo real automático.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    // Execução manual só por admin/gestor; execução via automação roda sem usuário
    if (user && !["admin", "gestor_master", "Administrador Master"].includes(user.role)) {
      return Response.json({ error: "Sem permissão" }, { status: 403 });
    }
    const db = base44.asServiceRole.entities;

    const fmt = (d) => d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const hoje = fmt(new Date());
    const amanha = fmt(new Date(Date.now() + 86400000));

    const matriculas = await db.StudentCourseEnrollment.filter({ start_date: { $in: [hoje, amanha] } }, "-created_date", 200);
    const individuais = (matriculas || []).filter((m) =>
      (m.company_id === "individual" || (m.company_name || "").toLowerCase().includes("individual")) &&
      m.status_matricula !== "Cancelado" && m.status !== "Revogado"
    );

    const mascarar = (cpf) => {
      const d = (cpf || "").replace(/\D/g, "");
      return d.length === 11 ? `${d.slice(0, 3)}.***.***-${d.slice(9)}` : "***";
    };
    const fmtBR = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—");

    let criadas = 0, puladas = 0, semContato = 0;
    for (const m of individuais) {
      const evento = m.start_date === hoje ? "curso_hoje" : "curso_amanha";
      const eventoLabel = evento === "curso_hoje" ? "Curso inicia hoje" : "Curso inicia amanhã";

      // Anti-duplicidade: não repete o mesmo lembrete para a mesma matrícula
      const existentes = await db.MensagemComunicacao.filter({ enrollment_id: m.id, evento });
      if (existentes && existentes.length > 0) { puladas++; continue; }

      const prefixo = evento === "curso_hoje" ? "Seu curso começa HOJE!" : "Seu curso começa AMANHÃ!";
      const mensagem = `Olá, ${m.student_name}.\n\n${prefixo}\n\nCurso:\n${m.course_name}\n\nData:\n${fmtBR(m.start_date)}\n\nHorário:\nconforme orientação da CAT Cursos\n\nLocal:\nconforme orientação da CAT Cursos\n\nCAT Cursos`;

      const destinatario = m.student_phone || "";
      const registro = await db.MensagemComunicacao.create({
        enrollment_id: m.id, student_id: m.student_id || "", student_name: m.student_name || "",
        curso_nome: m.course_name || "", pacote_nome: m.pacote_nome || "",
        evento, evento_label: eventoLabel, canal: "WhatsApp", destinatario,
        mensagem, status: destinatario ? "Preparada" : "Falha no envio",
        origem: "lembrete", operador: "automação (lembretes diários)",
        atendente_nome: m.atendente_nome || "",
        erro: destinatario ? "" : "Sem contato válido cadastrado (WhatsApp)",
      });
      if (!destinatario) semContato++; else criadas++;

      await db.AuditLog.create({
        user_email: "sistema",
        user_name: "Automação Lembretes FASE 6",
        action: "send_whatsapp",
        entity_type: "MensagemComunicacao",
        entity_id: registro.id,
        entity_name: `${m.student_name} — ${eventoLabel}`,
        details: `FASE 6 Comunicação: lembrete automático ${destinatario ? "PREPARADO" : "BLOQUEADO (sem contato válido)"} | evento: ${eventoLabel} | canal: WhatsApp | destinatário: ${destinatario || "SEM CONTATO"} | aluno: ${m.student_name} (CPF ${mascarar(m.student_cpf)}) | matrícula: ${m.id} | curso: ${m.course_name} | origem: automação diária`,
      }).catch(() => {});
    }

    return Response.json({ hoje, amanha, matriculas_encontradas: individuais.length, lembretes_criados: criadas, ja_existiam: puladas, sem_contato: semContato });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});