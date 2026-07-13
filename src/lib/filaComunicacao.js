/**
 * Helper para enfileirar mensagens (E-mail/WhatsApp) na fila oficial (FilaMensagem).
 * A fila é processada automaticamente a cada 5 minutos com retry/backoff (máx. 3 tentativas).
 */
import { base44 } from "@/api/base44Client";

export async function enfileirarMensagem({ canal, destinatario, assunto = "", mensagem, evento = "", enrollment_id = "", student_name = "", origem = "operador" }) {
  return base44.entities.FilaMensagem.create({
    canal,
    destinatario,
    assunto,
    mensagem,
    evento,
    enrollment_id,
    student_name,
    origem,
    status: "Pendente",
    tentativas: 0,
    max_tentativas: 3,
  });
}

export async function processarFilaAgora(messageId = null) {
  const payload = messageId ? { message_id: messageId } : {};
  const res = await base44.functions.invoke("processarFilaMensagens", payload);
  return res.data;
}