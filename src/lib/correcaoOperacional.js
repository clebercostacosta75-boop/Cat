/**
 * SPR-2D-1 — Função central de Correção Operacional.
 * Toda correção de dado sensível (nome, CPF, datas, curso, empresa, turma, carga horária)
 * DEVE passar por aqui: justificativa obrigatória + AuditLog com antes/depois.
 * Nenhum certificado já emitido é alterado por este módulo.
 */
import { base44 } from "@/api/base44Client";

export const ORIGENS_PERMITIDAS = ["Gestão Acadêmica", "Certificação", "Financeiro"];

/** Valida dígitos verificadores do CPF. */
export function validarCPF(cpf) {
  const d = (cpf || "").replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len) => {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += parseInt(d[i]) * (len + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calc(9) === parseInt(d[9]) && calc(10) === parseInt(d[10]);
}

/** Verifica se o CPF já pertence a OUTRO aluno. Retorna o aluno duplicado ou null. */
export async function verificarCPFDuplicado(cpf, alunoIdAtual) {
  const digits = (cpf || "").replace(/\D/g, "");
  const formatado = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  const variantes = [...new Set([cpf, digits, formatado])].filter(Boolean);
  const resultados = await Promise.all(
    variantes.map((v) => base44.entities.Student.filter({ cpf: v }).catch(() => []))
  );
  const todos = resultados.flat();
  return todos.find((s) => s.id !== alunoIdAtual) || null;
}

/** Busca certificados relacionados a um aluno, matrícula ou turma (emitidos, assinados ou revogados). */
export async function buscarCertificadosRelacionados({ alunoId, matriculaId, turmaId } = {}) {
  const consultas = [];
  if (alunoId) consultas.push(base44.entities.Certificate.filter({ student_id: alunoId }));
  if (matriculaId) consultas.push(base44.entities.Certificate.filter({ enrollment_id: matriculaId }));
  if (turmaId) consultas.push(base44.entities.Certificate.filter({ class_schedule_id: turmaId }));
  if (!consultas.length) return [];
  const resultados = await Promise.all(consultas.map((p) => p.catch(() => [])));
  const vistos = new Set();
  return resultados.flat().filter((c) => (vistos.has(c.id) ? false : vistos.add(c.id)));
}

/**
 * Registra UMA correção operacional no AuditLog (padrão único SPR-2D-1).
 * Retorna { sucesso: true } ou { sucesso: false, erro }.
 * Não altera nenhuma entidade — o salvamento continua no fluxo chamador.
 */
export async function executarCorrecaoOperacional({
  origem,
  entidade,
  entidade_id,
  aluno_id = "",
  matricula_id = "",
  certificado_id = "",
  curso_id = "",
  empresa_id = "",
  campo,
  valor_anterior,
  valor_novo,
  justificativa,
  impacto = "",
  tipo = "",
  usuario = null,
}) {
  if (!justificativa || !justificativa.trim()) {
    return { sucesso: false, erro: "Justificativa obrigatória. A correção não pode ser registrada sem justificativa." };
  }
  if (!ORIGENS_PERMITIDAS.includes(origem)) {
    return { sucesso: false, erro: `Origem inválida: "${origem}". Permitidas: ${ORIGENS_PERMITIDAS.join(", ")}.` };
  }
  if (!entidade || !entidade_id || !campo) {
    return { sucesso: false, erro: "Dados incompletos para auditoria (entidade, entidade_id e campo são obrigatórios)." };
  }
  try {
    const user = usuario || (await base44.auth.me().catch(() => null));
    const agora = new Date();
    await base44.entities.AuditLog.create({
      user_email: user?.email || "desconhecido",
      user_name: user?.full_name || user?.email || "desconhecido",
      action: "update",
      entity_type: entidade,
      entity_id: entidade_id,
      entity_name: `Correção operacional — campo "${campo}"`,
      details: JSON.stringify({
        acao: "CORRECAO_OPERACIONAL",
        tipo,
        origem,
        entidade,
        entidade_id,
        campo,
        valor_anterior: valor_anterior ?? "—",
        valor_novo: valor_novo ?? "—",
        justificativa: justificativa.trim(),
        impacto,
        aluno_id,
        matricula_id,
        certificado_id,
        curso_id,
        empresa_id,
        usuario: user?.email || "desconhecido",
        data_hora: agora.toLocaleString("pt-BR"),
      }),
    });
    return { sucesso: true };
  } catch (e) {
    return { sucesso: false, erro: "Falha ao registrar auditoria: " + e.message };
  }
}

/**
 * Registra VÁRIAS correções (uma por campo alterado) com dados comuns.
 * alteracoes: [{ campo, valor_anterior, valor_novo }]
 * Retorna { sucesso, erros: [] }.
 */
export async function registrarCorrecoes(alteracoes, comum) {
  const erros = [];
  for (const alt of alteracoes) {
    const r = await executarCorrecaoOperacional({ ...comum, ...alt });
    if (!r.sucesso) erros.push(`${alt.campo}: ${r.erro}`);
  }
  return { sucesso: erros.length === 0, erros };
}