/**
 * FASE 6 — Comunicação automática/semiautomática da Gestão Acadêmica Individual.
 * Motor central: eventos, modelos padrão, preenchimento de variáveis a partir da
 * matrícula/financeiro/contrato, CPF mascarado (LGPD), registro no histórico
 * (MensagemComunicacao) e auditoria (AuditLog).
 */
import { base44 } from "@/api/base44Client";

export const CANAIS = ["WhatsApp", "E-mail", "SMS"];

const ASS = "\n\nCAT Cursos";

export const EVENTOS = [
  { key: "inscricao_confirmada", label: "Inscrição/Matrícula confirmada", template: `Olá, [NOME_ALUNO].\n\nSua inscrição no curso/pacote [CURSO_PACOTE] foi registrada com sucesso.\n\nPeríodo do curso:\n[DATA_INICIO] a [DATA_TERMINO]\n\nForma de pagamento:\n[FORMA_PAGAMENTO]\n\nValor:\n[VALOR]\n\nEm breve você receberá as orientações do curso.${ASS}` },
  { key: "contrato_gerado", label: "Contrato gerado", template: `Olá, [NOME_ALUNO].\n\nO contrato referente à sua matrícula no curso/pacote [CURSO_PACOTE] foi gerado.\n\nEm breve você receberá o link para conferência e assinatura eletrônica.${ASS}` },
  { key: "contrato_link", label: "Link de contrato disponível", template: `Olá, [NOME_ALUNO].\n\nSegue o contrato referente à sua matrícula no curso/pacote [CURSO_PACOTE].\n\nAcesse o link abaixo para conferir e assinar eletronicamente:\n\n[LINK_CONTRATO]${ASS}\n\nApós assinatura, o contrato ficará salvo em seu prontuário.` },
  { key: "contrato_assinado", label: "Contrato assinado", template: `Olá, [NOME_ALUNO].\n\nRecebemos a assinatura do seu contrato do curso/pacote [CURSO_PACOTE].\n\nO contrato assinado está salvo em seu prontuário.${ASS}` },
  { key: "pagamento_pendente", label: "Pagamento pendente", template: `Olá, [NOME_ALUNO].\n\nSegue a informação de pagamento referente à sua matrícula no curso/pacote [CURSO_PACOTE].\n\nValor:\n[VALOR]\n\nForma de pagamento:\n[FORMA_PAGAMENTO]\n\nVencimento:\n[VENCIMENTO]${ASS}\n\nSe o pagamento já foi realizado, desconsidere esta mensagem.` },
  { key: "link_pagamento", label: "Link de pagamento gerado", template: `Olá, [NOME_ALUNO].\n\nSegue a informação de pagamento referente à sua matrícula no curso/pacote [CURSO_PACOTE].\n\nValor:\n[VALOR]\n\nForma de pagamento:\n[FORMA_PAGAMENTO]\n\nVencimento:\n[VENCIMENTO]\n\nLink/QR Code:\n[LINK_PAGAMENTO]${ASS}\n\nSe o pagamento já foi realizado, desconsidere esta mensagem.` },
  { key: "pagamento_confirmado", label: "Pagamento confirmado", template: `Olá, [NOME_ALUNO].\n\nConfirmamos o pagamento referente à sua matrícula no curso/pacote [CURSO_PACOTE].\n\nSeu recibo estará disponível no sistema.${ASS}` },
  { key: "recibo_disponivel", label: "Recibo disponível", template: `Olá, [NOME_ALUNO].\n\nSeu recibo de pagamento do curso/pacote [CURSO_PACOTE] está disponível no sistema.${ASS}` },
  { key: "documento_pendente", label: "Documento pendente", template: `Olá, [NOME_ALUNO].\n\nIdentificamos que ainda existe pendência de documento em sua matrícula no curso/pacote [CURSO_PACOTE].\n\nPor favor, envie o documento solicitado pelo link abaixo:\n\n[LINK_DOCUMENTO]${ASS}` },
  { key: "documento_rejeitado", label: "Documento rejeitado", template: `Olá, [NOME_ALUNO].\n\nO documento enviado para sua matrícula no curso/pacote [CURSO_PACOTE] precisa ser reenviado.\n\nMotivo:\n[MOTIVO_REJEICAO]\n\nEnvie uma nova foto/documento pelo link:\n\n[LINK_DOCUMENTO]${ASS}` },
  { key: "documento_validado", label: "Documento validado", template: `Olá, [NOME_ALUNO].\n\nO documento enviado para sua matrícula no curso/pacote [CURSO_PACOTE] foi validado com sucesso.${ASS}` },
  { key: "lembrete_curso", label: "Lembrete de curso", template: `Olá, [NOME_ALUNO].\n\nLembrete do seu curso:\n\nCurso:\n[CURSO]\n\nData:\n[DATA_INICIO]\n\nHorário:\n[HORARIO]\n\nLocal:\n[LOCAL]${ASS}` },
  { key: "curso_amanha", label: "Curso inicia amanhã", template: `Olá, [NOME_ALUNO].\n\nSeu curso começa AMANHÃ!\n\nCurso:\n[CURSO]\n\nData:\n[DATA_INICIO]\n\nHorário:\n[HORARIO]\n\nLocal:\n[LOCAL]${ASS}` },
  { key: "curso_hoje", label: "Curso inicia hoje", template: `Olá, [NOME_ALUNO].\n\nSeu curso começa HOJE!\n\nCurso:\n[CURSO]\n\nData:\n[DATA_INICIO]\n\nHorário:\n[HORARIO]\n\nLocal:\n[LOCAL]${ASS}` },
  { key: "resultado_academico", label: "Resultado acadêmico lançado", template: `Olá, [NOME_ALUNO].\n\nSeu resultado no curso [CURSO] foi registrado como [RESULTADO].\n\nEntre em contato com a CAT Cursos para mais informações.${ASS}` },
  { key: "certificado_disponivel", label: "Certificado disponível", template: `Olá, [NOME_ALUNO].\n\nSeu certificado do curso [CURSO] está disponível.\n\nAcesse pelo link:\n\n[LINK_CERTIFICADO]${ASS}` },
  { key: "certificado_aguardando_assinatura", label: "Certificado aguardando assinatura", template: `Olá, [NOME_ALUNO].\n\nSeu certificado do curso [CURSO] está aguardando sua assinatura.\n\nAcesse pelo link:\n\n[LINK_CERTIFICADO]${ASS}` },
  { key: "certificado_assinado", label: "Certificado assinado/disponível para download", template: `Olá, [NOME_ALUNO].\n\nSeu certificado do curso [CURSO] foi assinado e está disponível para download.\n\nAcesse pelo link:\n\n[LINK_CERTIFICADO]${ASS}` },
  { key: "matricula_cancelada", label: "Matrícula cancelada", template: `Olá, [NOME_ALUNO].\n\nSua matrícula no curso/pacote [CURSO_PACOTE] foi cancelada.\n\nEm caso de dúvidas, entre em contato com a CAT Cursos.${ASS}` },
  { key: "curso_remarcado", label: "Curso remarcado", template: `Olá, [NOME_ALUNO].\n\nO curso [CURSO] foi remarcado.\n\nNovo período:\n[DATA_INICIO] a [DATA_TERMINO]\n\nHorário:\n[HORARIO]\n\nLocal:\n[LOCAL]${ASS}` },
  { key: "troca_curso", label: "Troca de curso", template: `Olá, [NOME_ALUNO].\n\nSua inscrição foi transferida para o curso [CURSO].\n\nPeríodo:\n[DATA_INICIO] a [DATA_TERMINO]${ASS}` },
  { key: "transferencia_inscricao", label: "Transferência de inscrição para outro aluno", template: `Olá, [NOME_ALUNO].\n\nA inscrição no curso/pacote [CURSO_PACOTE] foi transferida de titularidade conforme solicitado.\n\nEm caso de dúvidas, entre em contato com a CAT Cursos.${ASS}` },
];

export const VARIAVEIS_DISPONIVEIS = [
  "[NOME_ALUNO]", "[CPF_MASCARADO]", "[CURSO]", "[PACOTE]", "[CURSO_PACOTE]", "[DATA_INICIO]", "[DATA_TERMINO]",
  "[HORARIO]", "[LOCAL]", "[VALOR]", "[FORMA_PAGAMENTO]", "[VENCIMENTO]", "[LINK_CONTRATO]", "[LINK_PAGAMENTO]",
  "[LINK_DOCUMENTO]", "[LINK_CERTIFICADO]", "[ATENDENTE]", "[EMPRESA]", "[STATUS_MATRICULA]", "[STATUS_PAGAMENTO]",
  "[RESULTADO]", "[MOTIVO_REJEICAO]",
];

export function templateEvento(key) {
  return EVENTOS.find((e) => e.key === key)?.template || "";
}

export function templateResultado(resultado) {
  if (resultado === "Aprovado") {
    return `Olá, [NOME_ALUNO].\n\nSeu resultado no curso [CURSO] foi registrado como APROVADO.\n\nA emissão do certificado seguirá conforme validação documental, acadêmica e financeira.${ASS}`;
  }
  return templateEvento("resultado_academico");
}

// LGPD: nunca enviar CPF completo por mensagem
export function mascararCPF(cpf) {
  const d = (cpf || "").replace(/\D/g, "");
  if (d.length !== 11) return "***";
  return `${d.slice(0, 3)}.***.***-${d.slice(9)}`;
}

const fmtData = (d) => (d ? new Date(String(d).split("T")[0] + "T00:00:00").toLocaleDateString("pt-BR") : "—");
const fmtValor = (v) => (v || v === 0 ? `R$ ${parseFloat(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—");

export function montarVariaveis({ enrollment = {}, contrato = null, lancamento = null, extras = {} }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return {
    NOME_ALUNO: enrollment.student_name || "",
    CPF_MASCARADO: mascararCPF(enrollment.student_cpf),
    CURSO: enrollment.course_name || "",
    PACOTE: enrollment.pacote_nome || "",
    CURSO_PACOTE: enrollment.pacote_nome || enrollment.oferta_nome || enrollment.course_name || "",
    DATA_INICIO: fmtData(enrollment.start_date),
    DATA_TERMINO: fmtData(enrollment.end_date),
    HORARIO: extras.horario || "conforme orientação da CAT Cursos",
    LOCAL: extras.local || "conforme orientação da CAT Cursos",
    VALOR: fmtValor(lancamento?.valor ?? enrollment.unit_value),
    FORMA_PAGAMENTO: enrollment.forma_pagamento || lancamento?.forma_pagamento || "—",
    VENCIMENTO: fmtData(lancamento?.data_vencimento || enrollment.data_vencimento_pagamento),
    LINK_CONTRATO: contrato?.auth_code ? `${origin}/ContractSign?code=${contrato.auth_code}` : "(contrato ainda não gerado)",
    LINK_PAGAMENTO: lancamento?.link_pagamento || "(link de pagamento não gerado)",
    LINK_DOCUMENTO: `${origin}/PortalAluno`,
    LINK_CERTIFICADO: `${origin}/PortalAluno`,
    ATENDENTE: enrollment.atendente_nome || "CAT Cursos",
    EMPRESA: "CAT Cursos",
    STATUS_MATRICULA: enrollment.status_matricula || "",
    STATUS_PAGAMENTO: enrollment.status_pagamento || "",
    RESULTADO: extras.resultado || enrollment.resultado_academico || "",
    MOTIVO_REJEICAO: extras.motivo || "",
  };
}

export function preencherTemplate(texto, vars) {
  return (texto || "").replace(/\[([A-Z_]+)\]/g, (m, k) => (vars[k] !== undefined && vars[k] !== "" ? vars[k] : m));
}

export function montarWaLink(phone, message) {
  const digits = (phone || "").replace(/\D/g, "");
  const full = digits.length >= 12 ? digits : digits ? "55" + digits : "";
  return full ? `https://wa.me/${full}?text=${encodeURIComponent(message)}` : null;
}

/**
 * Registra uma mensagem no histórico da matrícula + AuditLog.
 * Se não houver contato válido, registra como "Falha no envio" (bloqueio auditado).
 */
export async function prepararMensagem({ enrollment, evento, canal = "WhatsApp", mensagem, status, origem = "operador", user = null, erro = "", modeloId = "" }) {
  const destinatario = canal === "E-mail" ? enrollment.student_email || "" : enrollment.student_phone || "";
  const semContato = !destinatario;
  const statusFinal = status || (semContato ? "Falha no envio" : "Preparada");
  const ev = EVENTOS.find((e) => e.key === evento);

  const registro = await base44.entities.MensagemComunicacao.create({
    enrollment_id: enrollment.id,
    student_id: enrollment.student_id || "",
    student_name: enrollment.student_name || "",
    curso_nome: enrollment.course_name || "",
    pacote_nome: enrollment.pacote_nome || "",
    evento, evento_label: ev?.label || evento, canal, destinatario,
    mensagem, status: statusFinal, origem,
    operador: user?.email || user?.full_name || "sistema",
    atendente_nome: enrollment.atendente_nome || "",
    modelo_id: modeloId,
    erro: semContato ? `Sem contato válido cadastrado para o canal ${canal}` : erro,
  });

  await auditarComunicacao({
    user, acao: canal === "WhatsApp" ? "send_whatsapp" : "create",
    registro, enrollment,
    detalhes: `mensagem ${statusFinal.toUpperCase()}${semContato ? " — ERRO: sem contato válido" : ""}`,
  });
  return registro;
}

export async function auditarComunicacao({ user, acao = "create", registro, enrollment = {}, detalhes = "" }) {
  await base44.entities.AuditLog.create({
    user_email: user?.email || "sistema",
    user_name: user?.full_name || user?.email || "Sistema",
    action: acao,
    entity_type: "MensagemComunicacao",
    entity_id: registro?.id || "",
    entity_name: `${registro?.student_name || enrollment.student_name || ""} — ${registro?.evento_label || ""}`,
    details: `FASE 6 Comunicação: ${detalhes} | evento: ${registro?.evento_label || registro?.evento || "—"} | canal: ${registro?.canal || "—"} | destinatário: ${registro?.destinatario || "SEM CONTATO"} | aluno: ${registro?.student_name || enrollment.student_name || "—"} (CPF ${mascararCPF(enrollment.student_cpf)}) | matrícula: ${registro?.enrollment_id || enrollment.id || "—"} | curso/pacote: ${registro?.pacote_nome || registro?.curso_nome || enrollment.course_name || "—"} | atendente: ${registro?.atendente_nome || "—"} | status: ${registro?.status || "—"}${registro?.erro ? ` | erro: ${registro.erro}` : ""}`,
  }).catch(() => {});
}