import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, XCircle, UserPlus, Edit, AlertTriangle, Shield } from "lucide-react";
import { toast } from "sonner";
import { validarCPF, formatarCPF, limparCPF } from "@/lib/cpf";

const AUDIT = "FASE 4 Ações";
const FORMAS = ["Pix", "Boleto", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Transferência Bancária", "Cortesia"];

const MODOS = [
  { key: "trocar", label: "Trocar Curso", icon: RefreshCw, color: "text-purple-700 border-purple-300" },
  { key: "alterar", label: "Alterar Datas / Valor / Pagamento", icon: Edit, color: "text-blue-700 border-blue-300" },
  { key: "transferir", label: "Transferir para Outro Aluno", icon: UserPlus, color: "text-cyan-700 border-cyan-300" },
  { key: "cancelar", label: "Cancelar Inscrição", icon: XCircle, color: "text-red-700 border-red-300" },
];

export default function AcoesMatriculaModal({ enrollment, onClose, onDone }) {
  const [user, setUser] = useState(null);
  const [modo, setModo] = useState(null);
  const [justificativa, setJustificativa] = useState("");
  const [saving, setSaving] = useState(false);
  const [novoCurso, setNovoCurso] = useState({ course_id: "", data_inicio: "", data_termino: "", valor: "" });
  const [cpfNovo, setCpfNovo] = useState("");
  const [cpfVerificado, setCpfVerificado] = useState(false);
  const [novoAlunoTransf, setNovoAlunoTransf] = useState(null);
  const [novoAlunoForm, setNovoAlunoForm] = useState({ full_name: "", whatsapp: "", email: "" });
  const [alt, setAlt] = useState({
    start_date: enrollment.start_date || "", end_date: enrollment.end_date || "",
    unit_value: enrollment.unit_value ?? "", desconto: enrollment.desconto ?? 0,
    forma_pagamento: enrollment.forma_pagamento || "", data_vencimento_pagamento: enrollment.data_vencimento_pagamento || "",
  });

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: courses = [] } = useQuery({ queryKey: ["courses"], queryFn: () => base44.entities.Course.list("-name", 200) });

  const temCertificado = !!enrollment.certificate_id || ["Certificado Gerado", "Assinado"].includes(enrollment.status);
  const jaCancelada = enrollment.status_matricula === "Cancelado";

  const audit = (action, details) =>
    base44.entities.AuditLog.create({
      user_email: user?.email || "sistema", user_name: user?.full_name || user?.email || "",
      action, entity_type: "StudentCourseEnrollment", entity_id: enrollment.id,
      entity_name: `${enrollment.student_name} — ${enrollment.course_name}`,
      details: `${AUDIT}: ${details}`,
    }).catch(() => {});

  const contratoAtivo = async (enrollmentId) => {
    const cs = await base44.entities.Contract.filter({ enrollment_id: enrollmentId });
    return cs.find(c => !["Cancelado", "Substituido_Aditivo"].includes(c.status)) || null;
  };

  // Contrato assinado nunca é alterado silenciosamente: vira Substituído por Aditivo
  const encerrarContrato = async (motivo) => {
    const c = await contratoAtivo(enrollment.id);
    if (!c) return null;
    const assinado = !!c.student_signed_at;
    await base44.entities.Contract.update(c.id, {
      status: assinado ? "Substituido_Aditivo" : "Cancelado",
      notes: [c.notes, `${AUDIT}: ${assinado ? "substituído por aditivo (contrato assinado preservado como histórico)" : "cancelado"} — ${motivo}`].filter(Boolean).join(" | "),
    });
    await audit("update", `contrato ${c.contract_number} ${assinado ? "marcado como Substituído por Aditivo — contrato assinado não é alterado silenciosamente" : "cancelado"} — ${motivo}`);
    return c;
  };

  const gerarNovoContrato = async (studentId, enrollmentId) => {
    try {
      const res = await base44.functions.invoke("gerarContrato", {
        student_id: studentId, enrollment_id: enrollmentId, skip_financeiro: true, force_regen: true,
      });
      if (res.data?.contract_number) await audit("create", `novo contrato ${res.data.contract_number} gerado automaticamente após a ação`);
      return res.data;
    } catch {
      await audit("update", "novo contrato NÃO pôde ser gerado após a ação — verificar dados obrigatórios (pendência registrada)");
      return null;
    }
  };

  const lancamentosMatricula = () => base44.entities.LancamentoFinanceiro.filter({ origem_modulo: "Matrícula", origem_id: enrollment.id });

  const liberarVaga = async () => {
    const entityName = enrollment.oferta_id ? "CourseOffer" : enrollment.pacote_id ? "CoursePackage" : null;
    if (!entityName) return;
    const id = enrollment.oferta_id || enrollment.pacote_id;
    const [item] = await base44.entities[entityName].filter({ id });
    if (!item) return;
    await base44.entities[entityName].update(id, {
      vagas_preenchidas: Math.max(0, (item.vagas_preenchidas || 0) - 1),
      ...(item.status === "Esgotada" ? { status: "Aberta" } : {}),
    });
    await audit("update", `vaga liberada em "${item.nome_comercial || item.nome}" (${Math.max(0, (item.vagas_preenchidas || 0) - 1)}/${item.vagas_total})`);
  };

  // ── CANCELAR ────────────────────────────────────────────────────────────
  const handleCancelar = async () => {
    await base44.entities.StudentCourseEnrollment.update(enrollment.id, {
      status_matricula: "Cancelado",
      ...(enrollment.status_pagamento !== "Pago" ? { status_pagamento: "Cancelado" } : {}),
      notes: [enrollment.notes, `Inscrição CANCELADA. Justificativa: ${justificativa}`].filter(Boolean).join(" | "),
    });
    const lancs = await lancamentosMatricula();
    for (const l of lancs) {
      if (["Pago", "Recebido"].includes(l.status)) {
        await base44.entities.LancamentoFinanceiro.update(l.id, {
          observacoes: [l.observacoes, `${AUDIT}: matrícula cancelada com pagamento realizado — histórico mantido, avaliar necessidade de reembolso. Justificativa: ${justificativa}`].filter(Boolean).join(" | "),
        });
        await audit("update", "financeiro já pago MANTIDO no histórico — marcado para avaliação de reembolso");
      } else if (l.status !== "Cancelado") {
        await base44.entities.LancamentoFinanceiro.update(l.id, {
          status: "Cancelado", natureza: "Cancelado",
          observacoes: [l.observacoes, `${AUDIT}: cobrança cancelada junto com a inscrição. Justificativa: ${justificativa}`].filter(Boolean).join(" | "),
        });
        await audit("update", "cobrança pendente cancelada");
      }
    }
    await liberarVaga();
    await encerrarContrato(`inscrição cancelada — ${justificativa}`);
    await audit("update", `inscrição CANCELADA (matrícula preservada, histórico não excluído). Justificativa: ${justificativa}`);
    return true;
  };

  // ── TROCAR CURSO ────────────────────────────────────────────────────────
  const handleTrocar = async () => {
    const c = courses.find(x => x.id === novoCurso.course_id);
    if (!c) { toast.error("Selecione o novo curso."); return false; }
    if (!novoCurso.data_inicio || !novoCurso.data_termino) {
      toast.error("Não é possível concluir a inscrição sem definir o período de realização do curso.");
      return false;
    }
    const valorAnterior = parseFloat(enrollment.unit_value) || 0;
    const novoValor = novoCurso.valor !== "" ? parseFloat(novoCurso.valor) || 0 : valorAnterior;
    const agora = new Date().toISOString();

    const nova = await base44.entities.StudentCourseEnrollment.create({
      student_id: enrollment.student_id, student_name: enrollment.student_name, student_cpf: enrollment.student_cpf,
      student_email: enrollment.student_email || "", student_phone: enrollment.student_phone || "",
      company_id: "individual", company_name: "Individual (PF)",
      course_id: c.id, course_name: c.name, course_duration: c.carga_horaria || "",
      start_date: novoCurso.data_inicio, end_date: novoCurso.data_termino,
      status: "Aguardando Autorização", status_matricula: "Matriculado", resultado_academico: "Pendente",
      forma_pagamento: enrollment.forma_pagamento || "", status_pagamento: enrollment.status_pagamento || "Pendente",
      data_vencimento_pagamento: enrollment.data_vencimento_pagamento || "", parcelas_quantidade: enrollment.parcelas_quantidade || 1,
      desconto: enrollment.desconto || 0, unit_value: novoValor, valor_original: novoValor,
      atendente_id: enrollment.atendente_id || "", atendente_nome: enrollment.atendente_nome || "",
      data_inscricao: agora, origem_inscricao: enrollment.origem_inscricao || "Presencial",
      notes: `Criada por TROCA DE CURSO (curso anterior: ${enrollment.course_name}, matrícula ${enrollment.id}). Justificativa: ${justificativa}`,
    });

    await base44.entities.StudentCourseEnrollment.update(enrollment.id, {
      status_matricula: "Cancelado",
      notes: [enrollment.notes, `Substituída por TROCA DE CURSO → ${c.name} (nova matrícula ${nova.id}). Justificativa: ${justificativa}`].filter(Boolean).join(" | "),
    });

    const lancs = await lancamentosMatricula();
    for (const l of lancs) {
      if (!["Pago", "Recebido", "Cancelado"].includes(l.status)) {
        await base44.entities.LancamentoFinanceiro.update(l.id, {
          valor: novoValor, origem_id: nova.id, curso_nome: c.name,
          descricao: `Matrícula Curso: ${c.name} — ${enrollment.student_name} (troca de curso)`,
          observacoes: [l.observacoes, `${AUDIT}: financeiro recalculado na troca de curso — R$ ${valorAnterior.toFixed(2)} → R$ ${novoValor.toFixed(2)}. Justificativa: ${justificativa}`].filter(Boolean).join(" | "),
        });
        await audit("update", `financeiro recalculado: R$ ${valorAnterior.toFixed(2)} → R$ ${novoValor.toFixed(2)} e vinculado à nova matrícula`);
      } else if (["Pago", "Recebido"].includes(l.status) && novoValor !== valorAnterior) {
        await audit("update", `diferença de valor na troca com pagamento já realizado (R$ ${valorAnterior.toFixed(2)} → R$ ${novoValor.toFixed(2)}) — avaliar cobrança adicional/crédito`);
      }
    }

    await encerrarContrato(`troca de curso para ${c.name} — ${justificativa}`);
    await gerarNovoContrato(enrollment.student_id, nova.id);
    await audit("update", `TROCA DE CURSO: "${enrollment.course_name}" → "${c.name}". Período novo: ${novoCurso.data_inicio} → ${novoCurso.data_termino}. Valor anterior: R$ ${valorAnterior.toFixed(2)} | novo: R$ ${novoValor.toFixed(2)}. Responsável: ${user?.email || ""}. Justificativa: ${justificativa}`);
    return true;
  };

  // ── TRANSFERIR ──────────────────────────────────────────────────────────
  const verificarCpfNovo = async () => {
    if (!validarCPF(cpfNovo)) { toast.error("CPF do novo aluno inválido. Verifique os dígitos."); return; }
    const todos = await base44.entities.Student.list("-created_date", 1000);
    const found = (todos || []).find(s => limparCPF(s.cpf) === limparCPF(cpfNovo));
    setNovoAlunoTransf(found || null);
    setCpfVerificado(true);
  };

  const handleTransferir = async () => {
    if (!cpfVerificado) { toast.error("Verifique o CPF do novo aluno antes de transferir."); return false; }
    let novo = novoAlunoTransf;
    if (!novo) {
      if (!novoAlunoForm.full_name.trim()) { toast.error("Informe o nome completo do novo aluno."); return false; }
      novo = await base44.entities.Student.create({
        full_name: novoAlunoForm.full_name.trim(), cpf: formatarCPF(cpfNovo),
        whatsapp: novoAlunoForm.whatsapp || "", email: novoAlunoForm.email || "",
        status: "Ativo", origem: "CAT App",
      });
      await audit("create", `novo aluno criado para transferência de inscrição: ${novo.full_name} (CPF ${novo.cpf})`);
    }
    const agora = new Date().toISOString();
    const nova = await base44.entities.StudentCourseEnrollment.create({
      student_id: novo.id, student_name: novo.full_name, student_cpf: novo.cpf,
      student_email: novo.email || "", student_phone: novo.whatsapp || "",
      company_id: "individual", company_name: "Individual (PF)",
      course_id: enrollment.course_id, course_name: enrollment.course_name, course_duration: enrollment.course_duration || "",
      start_date: enrollment.start_date, end_date: enrollment.end_date,
      status: "Aguardando Autorização", status_matricula: "Matriculado", resultado_academico: "Pendente",
      forma_pagamento: enrollment.forma_pagamento || "", status_pagamento: enrollment.status_pagamento || "Pendente",
      data_vencimento_pagamento: enrollment.data_vencimento_pagamento || "", parcelas_quantidade: enrollment.parcelas_quantidade || 1,
      desconto: enrollment.desconto || 0, unit_value: enrollment.unit_value || 0, valor_original: enrollment.valor_original || enrollment.unit_value || 0,
      oferta_id: enrollment.oferta_id || "", oferta_nome: enrollment.oferta_nome || "",
      pacote_id: enrollment.pacote_id || "", pacote_nome: enrollment.pacote_nome || "",
      atendente_id: enrollment.atendente_id || "", atendente_nome: enrollment.atendente_nome || "",
      data_inscricao: agora, origem_inscricao: enrollment.origem_inscricao || "Presencial",
      notes: `Criada por TRANSFERÊNCIA DE INSCRIÇÃO (aluno anterior: ${enrollment.student_name}, matrícula ${enrollment.id}). Justificativa: ${justificativa}`,
    });

    await base44.entities.StudentCourseEnrollment.update(enrollment.id, {
      status_matricula: "Cancelado",
      notes: [enrollment.notes, `Inscrição TRANSFERIDA para ${novo.full_name} (nova matrícula ${nova.id}). Justificativa: ${justificativa}`].filter(Boolean).join(" | "),
    });

    const lancs = await lancamentosMatricula();
    for (const l of lancs) {
      if (!["Pago", "Recebido", "Cancelado"].includes(l.status)) {
        await base44.entities.LancamentoFinanceiro.update(l.id, {
          cliente_id: novo.id, cliente_nome: novo.full_name, origem_id: nova.id,
          descricao: `Matrícula Curso: ${enrollment.course_name} — ${novo.full_name} (transferência de inscrição)`,
          observacoes: [l.observacoes, `${AUDIT}: financeiro transferido de ${enrollment.student_name} para ${novo.full_name}. Justificativa: ${justificativa}`].filter(Boolean).join(" | "),
        });
        await audit("update", `financeiro pendente transferido para o novo aluno ${novo.full_name}`);
      }
    }

    await encerrarContrato(`transferência de inscrição para ${novo.full_name} — ${justificativa}`);
    await gerarNovoContrato(novo.id, nova.id);
    await audit("update", `TRANSFERÊNCIA DE INSCRIÇÃO: ${enrollment.student_name} → ${novo.full_name} (CPF ${formatarCPF(cpfNovo)}). Curso: ${enrollment.course_name}. Vínculo anterior cancelado, histórico completo preservado. Responsável: ${user?.email || ""}. Justificativa: ${justificativa}`);
    return true;
  };

  // ── ALTERAR DADOS ───────────────────────────────────────────────────────
  const handleAlterar = async () => {
    const mudancas = [];
    const upd = {};
    if (alt.start_date !== (enrollment.start_date || "")) { upd.start_date = alt.start_date; mudancas.push(`início ${enrollment.start_date || "—"} → ${alt.start_date || "—"}`); }
    if (alt.end_date !== (enrollment.end_date || "")) { upd.end_date = alt.end_date; mudancas.push(`término ${enrollment.end_date || "—"} → ${alt.end_date || "—"}`); }
    const novoValor = alt.unit_value === "" ? null : parseFloat(alt.unit_value);
    if (novoValor !== null && novoValor !== (parseFloat(enrollment.unit_value) || 0)) { upd.unit_value = novoValor; mudancas.push(`valor R$ ${(parseFloat(enrollment.unit_value) || 0).toFixed(2)} → R$ ${novoValor.toFixed(2)}`); }
    const novoDesc = parseFloat(alt.desconto) || 0;
    if (novoDesc !== (parseFloat(enrollment.desconto) || 0)) { upd.desconto = novoDesc; mudancas.push(`desconto R$ ${(parseFloat(enrollment.desconto) || 0).toFixed(2)} → R$ ${novoDesc.toFixed(2)}`); }
    if (alt.forma_pagamento && alt.forma_pagamento !== (enrollment.forma_pagamento || "")) { upd.forma_pagamento = alt.forma_pagamento; mudancas.push(`forma de pagamento ${enrollment.forma_pagamento || "—"} → ${alt.forma_pagamento}`); }
    if (alt.data_vencimento_pagamento !== (enrollment.data_vencimento_pagamento || "")) { upd.data_vencimento_pagamento = alt.data_vencimento_pagamento; mudancas.push(`vencimento ${enrollment.data_vencimento_pagamento || "—"} → ${alt.data_vencimento_pagamento || "—"}`); }

    if (mudancas.length === 0) { toast.error("Nenhuma alteração informada."); return false; }
    if ((upd.start_date === "" || upd.end_date === "")) {
      toast.error("Não é possível concluir a inscrição sem definir o período de realização do curso.");
      return false;
    }

    upd.notes = [enrollment.notes, `Alteração controlada: ${mudancas.join("; ")}. Justificativa: ${justificativa}`].filter(Boolean).join(" | ");
    await base44.entities.StudentCourseEnrollment.update(enrollment.id, upd);

    if (upd.unit_value !== undefined || upd.data_vencimento_pagamento !== undefined || upd.forma_pagamento !== undefined) {
      const lancs = await lancamentosMatricula();
      for (const l of lancs) {
        if (!["Pago", "Recebido", "Cancelado"].includes(l.status)) {
          await base44.entities.LancamentoFinanceiro.update(l.id, {
            ...(upd.unit_value !== undefined ? { valor: upd.unit_value } : {}),
            ...(upd.data_vencimento_pagamento ? { data_vencimento: upd.data_vencimento_pagamento } : {}),
            observacoes: [l.observacoes, `${AUDIT}: financeiro ajustado — ${mudancas.join("; ")}. Justificativa: ${justificativa}`].filter(Boolean).join(" | "),
          });
          await audit("update", "financeiro pendente ajustado conforme alteração da matrícula");
        }
      }
    }

    const c = await contratoAtivo(enrollment.id);
    if (c) {
      await encerrarContrato(`dados da matrícula alterados — ${mudancas.join("; ")}`);
      await gerarNovoContrato(enrollment.student_id, enrollment.id);
    }
    await audit("update", `ALTERAÇÃO CONTROLADA: ${mudancas.join("; ")}. Responsável: ${user?.email || ""}. Justificativa: ${justificativa}`);
    return true;
  };

  // ── EXECUÇÃO ────────────────────────────────────────────────────────────
  const handleExecutar = async () => {
    if (!justificativa.trim()) { toast.error("Justificativa obrigatória para esta ação."); return; }
    if ((modo === "trocar" || modo === "transferir") && temCertificado) {
      toast.error("Matrícula com certificado emitido: utilize o fluxo de reemissão/revogação da Certificação.");
      await audit("update", `ação "${modo}" BLOQUEADA — matrícula possui certificado emitido (exige fluxo de reemissão/revogação)`);
      return;
    }
    setSaving(true);
    try {
      let ok = true;
      if (modo === "cancelar") ok = await handleCancelar();
      else if (modo === "trocar") ok = await handleTrocar();
      else if (modo === "transferir") ok = await handleTransferir();
      else if (modo === "alterar") ok = await handleAlterar();
      if (ok !== false) {
        toast.success("Ação executada e registrada com histórico completo.");
        onDone?.();
        onClose();
      }
    } catch (e) {
      toast.error("Erro ao executar ação: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-gray-700" /> Ações da Inscrição</DialogTitle>
        </DialogHeader>

        <div className="p-2.5 bg-gray-50 border rounded-md text-sm">
          <p><strong>{enrollment.student_name}</strong> — {enrollment.course_name}</p>
          <p className="text-xs text-gray-500">{enrollment.start_date} → {enrollment.end_date} • R$ {(parseFloat(enrollment.unit_value) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} • {enrollment.status_pagamento || "—"}</p>
        </div>

        {jaCancelada && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0" /> Esta inscrição já está cancelada. Nenhuma ação adicional é permitida.
          </div>
        )}

        {!jaCancelada && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {MODOS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setModo(m.key)}
                  className={`flex items-center gap-2 p-2.5 border rounded-md text-xs font-medium transition-colors ${modo === m.key ? `${m.color} bg-gray-50 ring-1 ring-gray-300` : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  <m.icon className="w-3.5 h-3.5" /> {m.label}
                </button>
              ))}
            </div>

            {temCertificado && (modo === "trocar" || modo === "transferir") && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Esta matrícula possui certificado emitido. A troca/transferência simples é bloqueada — utilize o fluxo de reemissão/revogação da Certificação.
              </div>
            )}

            {modo === "trocar" && (
              <div className="border rounded-md p-3 space-y-2">
                <Label className="text-xs">Novo Curso *</Label>
                <Select value={novoCurso.course_id} onValueChange={v => setNovoCurso(n => ({ ...n, course_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o novo curso..." /></SelectTrigger>
                  <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">Início *</Label><Input type="date" value={novoCurso.data_inicio} onChange={e => setNovoCurso(n => ({ ...n, data_inicio: e.target.value }))} /></div>
                  <div><Label className="text-xs">Término *</Label><Input type="date" value={novoCurso.data_termino} onChange={e => setNovoCurso(n => ({ ...n, data_termino: e.target.value }))} /></div>
                  <div><Label className="text-xs">Novo Valor (R$)</Label><Input type="number" min="0" step="0.01" placeholder={String(enrollment.unit_value || 0)} value={novoCurso.valor} onChange={e => setNovoCurso(n => ({ ...n, valor: e.target.value }))} /></div>
                </div>
                <p className="text-xs text-gray-500">A matrícula anterior será substituída com segurança, o financeiro pendente recalculado e um novo contrato gerado automaticamente.</p>
              </div>
            )}

            {modo === "alterar" && (
              <div className="border rounded-md p-3 grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Data Início</Label><Input type="date" value={alt.start_date} onChange={e => setAlt(a => ({ ...a, start_date: e.target.value }))} /></div>
                <div><Label className="text-xs">Data Término</Label><Input type="date" value={alt.end_date} onChange={e => setAlt(a => ({ ...a, end_date: e.target.value }))} /></div>
                <div><Label className="text-xs">Valor (R$)</Label><Input type="number" min="0" step="0.01" value={alt.unit_value} onChange={e => setAlt(a => ({ ...a, unit_value: e.target.value }))} /></div>
                <div><Label className="text-xs">Desconto (R$)</Label><Input type="number" min="0" step="0.01" value={alt.desconto} onChange={e => setAlt(a => ({ ...a, desconto: e.target.value }))} /></div>
                <div>
                  <Label className="text-xs">Forma de Pagamento</Label>
                  <Select value={alt.forma_pagamento} onValueChange={v => setAlt(a => ({ ...a, forma_pagamento: v }))}>
                    <SelectTrigger><SelectValue placeholder="Manter" /></SelectTrigger>
                    <SelectContent>{FORMAS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Vencimento</Label><Input type="date" value={alt.data_vencimento_pagamento} onChange={e => setAlt(a => ({ ...a, data_vencimento_pagamento: e.target.value }))} /></div>
              </div>
            )}

            {modo === "transferir" && (
              <div className="border rounded-md p-3 space-y-2">
                <div className="p-2 bg-cyan-50 border border-cyan-200 rounded text-xs text-cyan-800">
                  Esta ação transferirá a inscrição para outro aluno e será registrada com histórico completo.
                </div>
                <div className="flex gap-2">
                  <Input placeholder="CPF do novo aluno" value={cpfNovo} maxLength={14} onChange={e => { setCpfNovo(formatarCPF(e.target.value)); setCpfVerificado(false); }} />
                  <Button variant="outline" onClick={verificarCpfNovo}>Verificar</Button>
                </div>
                {cpfVerificado && novoAlunoTransf && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                    ✓ Aluno existente será utilizado (sem duplicidade): <strong>{novoAlunoTransf.full_name}</strong> — {novoAlunoTransf.cpf}
                  </div>
                )}
                {cpfVerificado && !novoAlunoTransf && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">CPF não cadastrado — informe os dados básicos do novo aluno:</p>
                    <Input placeholder="Nome completo *" value={novoAlunoForm.full_name} onChange={e => setNovoAlunoForm(f => ({ ...f, full_name: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="WhatsApp" value={novoAlunoForm.whatsapp} onChange={e => setNovoAlunoForm(f => ({ ...f, whatsapp: e.target.value }))} />
                      <Input placeholder="E-mail" value={novoAlunoForm.email} onChange={e => setNovoAlunoForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {modo === "cancelar" && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                A matrícula será marcada como <strong>Cancelada</strong> (sem exclusão): a vaga é liberada, cobranças pendentes são canceladas, pagamentos realizados são mantidos no histórico (com marcação de possível reembolso) e o contrato é cancelado.
              </div>
            )}

            {modo && (
              <div>
                <Label className="text-xs">Justificativa obrigatória *</Label>
                <Textarea rows={2} placeholder="Descreva o motivo desta ação..." value={justificativa} onChange={e => setJustificativa(e.target.value)} />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={onClose}>Fechar</Button>
              {modo && (
                <Button className="bg-gray-900 hover:bg-gray-800" onClick={handleExecutar} disabled={saving}>
                  {saving ? "Executando..." : "Executar Ação"}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}