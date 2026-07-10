import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, CheckCircle, AlertTriangle, Package, BookOpen, Zap, User } from "lucide-react";
import { toast } from "sonner";
import { validarCPF, formatarCPF, limparCPF } from "@/lib/cpf";
import { logVenda } from "@/lib/auditVendas";

const ORIGENS = ["Presencial", "WhatsApp", "Telefone", "Indicação", "QR Code", "QR Code do Atendente", "Instagram", "Facebook", "Site", "Outro"];
const STATUS_PGTO = ["Pendente", "Pago", "Aguardando Confirmação", "Cancelado", "Cortesia"];
const FORMA_LANC = { "Pix": "PIX", "Boleto": "Boleto", "Cartão de Crédito": "Cartão de Crédito", "Cartão de Débito": "Cartão de Débito", "Dinheiro": "Dinheiro", "Transferência Bancária": "Transferência", "Cortesia": "Outro" };

const EMPTY_ALUNO = { full_name: "", whatsapp: "", email: "", logradouro: "", cidade: "", estado: "", cep: "", notes: "" };
const EMPTY_PGTO = { desconto: "0", forma_pagamento: "", parcelas: "1", vencimento: "", status_pagamento: "Pendente", origem_inscricao: "Presencial", observacao_financeira: "" };

export default function MatriculaRapidaModal({ open, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState("cpf"); // cpf | confirmar_existente | form
  const [cpf, setCpf] = useState("");
  const [aluno, setAluno] = useState(null); // aluno existente
  const [novoAluno, setNovoAluno] = useState(EMPTY_ALUNO);
  const [tipo, setTipo] = useState("oferta"); // oferta | pacote
  const [ofertaId, setOfertaId] = useState("");
  const [pacoteId, setPacoteId] = useState("");
  const [datasPacote, setDatasPacote] = useState([]);
  const [pgto, setPgto] = useState(EMPTY_PGTO);
  const [atendenteNome, setAtendenteNome] = useState("");
  const [saving, setSaving] = useState(false);

  const isMaster = ["admin", "Administrador Master", "gestor_master"].includes(user?.role);

  const { data: students = [] } = useQuery({ queryKey: ["students-pf"], queryFn: () => base44.entities.Student.list("-created_date"), enabled: open });
  const { data: ofertas = [] } = useQuery({ queryKey: ["course-offers"], queryFn: () => base44.entities.CourseOffer.list("-created_date", 200), enabled: open });
  const { data: pacotes = [] } = useQuery({ queryKey: ["course-packages"], queryFn: () => base44.entities.CoursePackage.list("-created_date", 200), enabled: open });

  useEffect(() => {
    if (open) {
      base44.auth.me().then(u => { setUser(u); setAtendenteNome(u?.full_name || u?.email || ""); }).catch(() => {});
      setStep("cpf"); setCpf(""); setAluno(null); setNovoAluno(EMPTY_ALUNO);
      setTipo("oferta"); setOfertaId(""); setPacoteId(""); setDatasPacote([]); setPgto(EMPTY_PGTO);
    }
  }, [open]);

  const oferta = ofertas.find(o => o.id === ofertaId);
  const pacote = pacotes.find(p => p.id === pacoteId);
  const vagasDisp = (item) => Math.max(0, (item?.vagas_total || 0) - (item?.vagas_preenchidas || 0));
  const vendavel = (item) => ["Aberta", "Em divulgação"].includes(item.status);

  const valorOriginal = tipo === "oferta" ? (oferta?.valor || 0) : (pacote?.valor_final ?? pacote?.valor_total ?? 0);
  const valorFinal = Math.max(0, valorOriginal - (parseFloat(pgto.desconto) || 0));
  const formasAceitas = (tipo === "oferta" ? oferta?.formas_pagamento : pacote?.formas_pagamento) || [];

  // ── Passo 1: verificar CPF ──────────────────────────────────────────────
  const handleVerificarCpf = async () => {
    if (!validarCPF(cpf)) {
      toast.error("CPF inválido. Verifique os dígitos informados.");
      await logVenda("update", { entity_type: "Student", entity_name: formatarCPF(cpf), details: "FASE 1 Vendas: tentativa de matrícula rápida BLOQUEADA — CPF inválido" });
      return;
    }
    const digits = limparCPF(cpf);
    const existente = students.find(s => limparCPF(s.cpf) === digits);
    if (existente) {
      setAluno(existente);
      setStep("confirmar_existente");
      await logVenda("view", { entity_type: "Student", entity_id: existente.id, entity_name: existente.full_name, details: "FASE 1 Vendas: CPF já cadastrado detectado na matrícula rápida — cadastro existente será reutilizado (duplicidade evitada)" });
    } else {
      setAluno(null);
      setNovoAluno(EMPTY_ALUNO);
      setStep("form");
    }
  };

  const selecionarPacote = (id) => {
    setPacoteId(id);
    const p = pacotes.find(x => x.id === id);
    setDatasPacote((p?.cursos || []).map(c => ({ ...c })));
  };

  // ── Confirmação final ───────────────────────────────────────────────────
  const handleConfirmar = async () => {
    const item = tipo === "oferta" ? oferta : pacote;
    if (!item) { toast.error(tipo === "oferta" ? "Selecione a oferta de curso." : "Selecione o pacote."); return; }

    // Vagas
    if (vagasDisp(item) <= 0 && !isMaster) {
      toast.error("Curso sem vagas disponíveis.");
      await logVenda("update", { entity_type: tipo === "oferta" ? "CourseOffer" : "CoursePackage", entity_id: item.id, entity_name: item.nome_comercial || item.nome, details: "FASE 1 Vendas: tentativa de matrícula BLOQUEADA — sem vagas disponíveis" });
      return;
    }

    // Datas obrigatórias
    if (tipo === "oferta") {
      if (!item.data_inicio || !item.data_termino) { toast.error("Não é possível concluir a matrícula sem definir o período de realização do curso."); return; }
      if (item.data_inicio > item.data_termino) { toast.error("A data de início não pode ser posterior à data de término."); return; }
    } else {
      for (const c of datasPacote) {
        if (!c.data_inicio || !c.data_termino) { toast.error(`Não é possível concluir a matrícula sem definir o período de realização do curso "${c.course_name}".`); return; }
        if (c.data_inicio > c.data_termino) { toast.error(`Curso "${c.course_name}": data de início posterior ao término.`); return; }
      }
      if (datasPacote.length === 0) { toast.error("O pacote selecionado não possui cursos."); return; }
    }

    // Aluno novo: dados mínimos
    if (!aluno && !novoAluno.full_name.trim()) { toast.error("Informe o nome completo do aluno."); return; }
    if (!pgto.forma_pagamento) { toast.error("Selecione a forma de pagamento."); return; }

    setSaving(true);
    try {
      // 1. Aluno (sem duplicar)
      let alunoFinal = aluno;
      if (!alunoFinal) {
        alunoFinal = await base44.entities.Student.create({
          full_name: novoAluno.full_name.trim(),
          cpf: formatarCPF(cpf),
          whatsapp: novoAluno.whatsapp, email: novoAluno.email,
          logradouro: novoAluno.logradouro, cidade: novoAluno.cidade,
          estado: novoAluno.estado, cep: novoAluno.cep,
          notes: novoAluno.notes, status: "Ativo", origem: "CAT App",
        });
        await logVenda("create", { entity_type: "Student", entity_id: alunoFinal.id, entity_name: alunoFinal.full_name, details: "FASE 1 Vendas: aluno cadastrado via Matrícula Rápida (dados básicos)" });
      }

      // 2. Matrículas (uma por curso)
      const agora = new Date().toISOString();
      const cursosMatricula = tipo === "oferta"
        ? [{ course_id: item.course_id, course_name: item.course_name, carga_horaria: item.carga_horaria, data_inicio: item.data_inicio, data_termino: item.data_termino }]
        : datasPacote;

      const nCursos = cursosMatricula.length;
      const valorPorCurso = Math.round((valorFinal / nCursos) * 100) / 100;

      const base = {
        student_id: alunoFinal.id, student_name: alunoFinal.full_name,
        student_cpf: alunoFinal.cpf, student_email: alunoFinal.email || "", student_phone: alunoFinal.whatsapp || "",
        company_id: "individual", company_name: "Individual (PF)",
        status: "Aguardando Autorização", status_matricula: "Matriculado", resultado_academico: "Pendente",
        forma_pagamento: pgto.forma_pagamento, status_pagamento: pgto.status_pagamento,
        data_vencimento_pagamento: pgto.vencimento || "", parcelas_quantidade: parseInt(pgto.parcelas) || 1,
        desconto: parseFloat(pgto.desconto) || 0,
        atendente_id: user?.id || "", atendente_nome: atendenteNome,
        data_inscricao: agora, origem_inscricao: pgto.origem_inscricao,
        observacao_financeira: pgto.observacao_financeira,
        ...(tipo === "oferta"
          ? { oferta_id: item.id, oferta_nome: item.nome_comercial }
          : { pacote_id: item.id, pacote_nome: item.nome }),
      };

      const matriculas = [];
      for (const c of cursosMatricula) {
        const m = await base44.entities.StudentCourseEnrollment.create({
          ...base,
          course_id: c.course_id, course_name: c.course_name,
          course_duration: c.carga_horaria || "",
          start_date: c.data_inicio, end_date: c.data_termino,
          valor_original: Math.round((valorOriginal / nCursos) * 100) / 100,
          unit_value: valorPorCurso,
        });
        matriculas.push(m);
        await logVenda("create", {
          entity_type: "StudentCourseEnrollment", entity_id: m.id,
          entity_name: `${alunoFinal.full_name} — ${c.course_name}`,
          details: `FASE 1 Vendas: ${tipo === "pacote" ? "matrícula em pacote" : "inscrição/matrícula"} criada via Matrícula Rápida. Período: ${c.data_inicio} → ${c.data_termino}. Atendente: ${atendenteNome}. Origem: ${pgto.origem_inscricao}. Pagamento: ${pgto.forma_pagamento} (${pgto.status_pagamento})`,
        });
      }

      // 3. Baixa de vaga
      const novasVagas = (item.vagas_preenchidas || 0) + 1;
      const esgotou = novasVagas >= (item.vagas_total || 0);
      const entityName = tipo === "oferta" ? "CourseOffer" : "CoursePackage";
      await base44.entities[entityName].update(item.id, {
        vagas_preenchidas: novasVagas,
        ...(esgotou ? { status: "Esgotada" } : {}),
      });
      await logVenda("update", { entity_type: entityName, entity_id: item.id, entity_name: item.nome_comercial || item.nome, details: `FASE 1 Vendas: vaga consumida (${novasVagas}/${item.vagas_total})${esgotou ? " — oferta ESGOTADA" : ""}` });

      // 4. Financeiro (único por venda — sem duplicidade)
      const isCortesia = pgto.forma_pagamento === "Cortesia" || pgto.status_pagamento === "Cortesia";
      const lanc = await base44.entities.LancamentoFinanceiro.create({
        tipo: "Receita",
        natureza: pgto.status_pagamento === "Pago" ? "Realizado" : "Previsto",
        status: isCortesia ? "Cancelado" : pgto.status_pagamento === "Pago" ? "Recebido" : "Pendente",
        descricao: `Matrícula ${tipo === "pacote" ? `Pacote: ${item.nome}` : `Curso: ${item.course_name}`} — ${alunoFinal.full_name}${isCortesia ? " (CORTESIA)" : ""}`,
        valor: isCortesia ? 0 : valorFinal,
        valor_desconto: parseFloat(pgto.desconto) || 0,
        data_competencia: agora.split("T")[0],
        data_vencimento: pgto.vencimento || agora.split("T")[0],
        ...(pgto.status_pagamento === "Pago" ? { data_pagamento: agora.split("T")[0], valor_pago: valorFinal } : {}),
        forma_pagamento: FORMA_LANC[pgto.forma_pagamento] || "Outro",
        origem_modulo: "Matrícula",
        origem_receita: "Comunidade",
        origem_id: matriculas[0].id,
        cliente_id: alunoFinal.id, cliente_nome: alunoFinal.full_name,
        curso_id: tipo === "oferta" ? item.course_id : "", curso_nome: tipo === "pacote" ? item.nome : item.course_name,
        total_parcelas: parseInt(pgto.parcelas) || 1,
        observacoes: `Matrícula Rápida — Atendente: ${atendenteNome}. ${pgto.observacao_financeira || ""}`.trim(),
      });
      await logVenda("create", { entity_type: "LancamentoFinanceiro", entity_id: lanc.id, entity_name: lanc.descricao, details: `FASE 1 Vendas: financeiro criado — R$ ${valorFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${pgto.forma_pagamento}, ${pgto.parcelas}x, ${pgto.status_pagamento})` });

      toast.success(tipo === "pacote"
        ? `Aluno inscrito! ${matriculas.length} matrículas criadas (uma por curso do pacote).`
        : "Aluno inscrito no curso com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] });
      queryClient.invalidateQueries({ queryKey: ["students-pf"] });
      queryClient.invalidateQueries({ queryKey: ["course-offers"] });
      queryClient.invalidateQueries({ queryKey: ["course-packages"] });
      onSuccess?.();
      onClose();
    } catch (e) {
      toast.error("Erro ao concluir inscrição: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" /> Matrícula Rápida — Inscrever Aluno</DialogTitle>
        </DialogHeader>

        {/* Passo 1: CPF */}
        {step === "cpf" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Informe o CPF do aluno. O sistema verifica automaticamente se ele já está cadastrado.</p>
            <div className="flex gap-2">
              <Input
                value={cpf}
                onChange={e => setCpf(formatarCPF(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                onKeyDown={e => e.key === "Enter" && handleVerificarCpf()}
              />
              <Button className="bg-gray-900 hover:bg-gray-800" onClick={handleVerificarCpf}>Verificar CPF</Button>
            </div>
          </div>
        )}

        {/* Passo 1b: aluno já existe */}
        {step === "confirmar_existente" && aluno && (
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm font-semibold text-blue-900 flex items-center gap-1.5">
                <User className="w-4 h-4" /> Aluno já cadastrado. Deseja criar uma nova matrícula para este aluno?
              </p>
              <p className="text-sm text-blue-800 mt-1"><strong>{aluno.full_name}</strong> — CPF {aluno.cpf}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("cpf")}>Cancelar</Button>
              <Button className="bg-gray-900 hover:bg-gray-800" onClick={() => setStep("form")}>
                <CheckCircle className="w-4 h-4 mr-1" /> Sim, nova matrícula
              </Button>
            </div>
          </div>
        )}

        {/* Passo 2: formulário */}
        {step === "form" && (
          <div className="space-y-4">
            {/* Aluno */}
            {aluno ? (
              <div className="p-2.5 bg-gray-50 border rounded-md flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{aluno.full_name}</span>
                <span className="text-xs text-gray-400 font-mono">{aluno.cpf}</span>
                <Badge className="bg-blue-100 text-blue-700 ml-auto text-xs">Cadastro existente</Badge>
              </div>
            ) : (
              <div className="border rounded-md p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1"><UserPlus className="w-3.5 h-3.5" /> Dados básicos do aluno (novo) — CPF {formatarCPF(cpf)}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Nome Completo *</Label>
                    <Input value={novoAluno.full_name} onChange={e => setNovoAluno(a => ({ ...a, full_name: e.target.value }))} />
                  </div>
                  <div><Label className="text-xs">Telefone/WhatsApp</Label><Input value={novoAluno.whatsapp} onChange={e => setNovoAluno(a => ({ ...a, whatsapp: e.target.value }))} placeholder="(91) 99999-9999" /></div>
                  <div><Label className="text-xs">E-mail</Label><Input value={novoAluno.email} onChange={e => setNovoAluno(a => ({ ...a, email: e.target.value }))} /></div>
                  <div className="sm:col-span-2"><Label className="text-xs">Endereço</Label><Input value={novoAluno.logradouro} onChange={e => setNovoAluno(a => ({ ...a, logradouro: e.target.value }))} /></div>
                  <div><Label className="text-xs">Cidade</Label><Input value={novoAluno.cidade} onChange={e => setNovoAluno(a => ({ ...a, cidade: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">UF</Label><Input maxLength={2} value={novoAluno.estado} onChange={e => setNovoAluno(a => ({ ...a, estado: e.target.value.toUpperCase() }))} /></div>
                    <div><Label className="text-xs">CEP</Label><Input value={novoAluno.cep} onChange={e => setNovoAluno(a => ({ ...a, cep: e.target.value }))} /></div>
                  </div>
                  <div className="sm:col-span-2"><Label className="text-xs">Observação</Label><Input value={novoAluno.notes} onChange={e => setNovoAluno(a => ({ ...a, notes: e.target.value }))} /></div>
                </div>
              </div>
            )}

            {/* Curso ou Pacote */}
            <div className="border rounded-md p-3 space-y-2">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                <button onClick={() => setTipo("oferta")} className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 ${tipo === "oferta" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}><BookOpen className="w-3.5 h-3.5" /> Curso Avulso</button>
                <button onClick={() => setTipo("pacote")} className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 ${tipo === "pacote" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}><Package className="w-3.5 h-3.5" /> Pacote</button>
              </div>

              {tipo === "oferta" ? (
                <>
                  <Select value={ofertaId} onValueChange={setOfertaId}>
                    <SelectTrigger><SelectValue placeholder="Selecione a oferta de curso..." /></SelectTrigger>
                    <SelectContent>
                      {ofertas.filter(o => vendavel(o) || isMaster).map(o => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.nome_comercial} — {vagasDisp(o)} vaga(s) — R$ {(o.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {oferta && (
                    <div className="text-xs text-gray-600 bg-gray-50 rounded-md p-2 space-y-0.5">
                      <p>📅 Período (alimenta a Certificação): <strong>{oferta.data_inicio || "—"} → {oferta.data_termino || "—"}</strong></p>
                      <p>🎟 Vagas: {vagasDisp(oferta)} disponíveis de {oferta.vagas_total} • Status: {oferta.status}</p>
                      {vagasDisp(oferta) <= 0 && <p className="text-red-600 font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Curso sem vagas disponíveis.{isMaster ? " (Perfil master pode prosseguir)" : ""}</p>}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Select value={pacoteId} onValueChange={selecionarPacote}>
                    <SelectTrigger><SelectValue placeholder="Selecione o pacote..." /></SelectTrigger>
                    <SelectContent>
                      {pacotes.filter(p => vendavel(p) || isMaster).map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome} — {vagasDisp(p)} vaga(s) — R$ {(p.valor_final ?? p.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {pacote && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-gray-500">Uma matrícula será criada para cada curso, com o período abaixo:</p>
                      {datasPacote.map((c, i) => (
                        <div key={c.course_id} className="flex items-center gap-2 bg-gray-50 rounded-md p-2">
                          <span className="text-xs font-medium text-gray-800 flex-1">{c.course_name}</span>
                          <Input type="date" className="h-7 text-xs w-32" value={c.data_inicio} onChange={e => setDatasPacote(d => d.map((x, j) => j === i ? { ...x, data_inicio: e.target.value } : x))} />
                          <span className="text-xs text-gray-400">→</span>
                          <Input type="date" className="h-7 text-xs w-32" value={c.data_termino} onChange={e => setDatasPacote(d => d.map((x, j) => j === i ? { ...x, data_termino: e.target.value } : x))} />
                        </div>
                      ))}
                      {vagasDisp(pacote) <= 0 && <p className="text-xs text-red-600 font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Pacote sem vagas disponíveis.{isMaster ? " (Perfil master pode prosseguir)" : ""}</p>}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Pagamento */}
            <div className="border rounded-md p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pagamento</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Valor Original</Label>
                  <div className="h-9 px-2 flex items-center border rounded-md bg-gray-50 text-sm">R$ {valorOriginal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                </div>
                <div>
                  <Label className="text-xs">Desconto (R$)</Label>
                  <Input type="number" min="0" step="0.01" value={pgto.desconto} onChange={e => setPgto(p => ({ ...p, desconto: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Valor Final</Label>
                  <div className="h-9 px-2 flex items-center border rounded-md bg-emerald-50 text-emerald-800 font-bold text-sm">R$ {valorFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                </div>
                <div>
                  <Label className="text-xs">Parcelas</Label>
                  <Select value={pgto.parcelas} onValueChange={v => setPgto(p => ({ ...p, parcelas: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[1, 2, 3, 4, 5, 6].map(n => <SelectItem key={n} value={String(n)}>{n}x</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Forma de Pagamento *</Label>
                  <Select value={pgto.forma_pagamento} onValueChange={v => setPgto(p => ({ ...p, forma_pagamento: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(formasAceitas.length ? formasAceitas : ["Pix", "Boleto", "Dinheiro"]).map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Vencimento</Label>
                  <Input type="date" value={pgto.vencimento} onChange={e => setPgto(p => ({ ...p, vencimento: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Status Pagamento</Label>
                  <Select value={pgto.status_pagamento} onValueChange={v => setPgto(p => ({ ...p, status_pagamento: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_PGTO.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Origem da Inscrição</Label>
                  <Select value={pgto.origem_inscricao} onValueChange={v => setPgto(p => ({ ...p, origem_inscricao: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ORIGENS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Observação Financeira</Label>
                  <Input value={pgto.observacao_financeira} onChange={e => setPgto(p => ({ ...p, observacao_financeira: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Atendente */}
            <div className="flex items-center gap-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-md">
              <User className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <span className="text-xs text-indigo-800">Atendente responsável:</span>
              {isMaster ? (
                <Input className="h-7 text-xs flex-1" value={atendenteNome} onChange={e => setAtendenteNome(e.target.value)} />
              ) : (
                <strong className="text-xs text-indigo-900">{atendenteNome || "..."}</strong>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleConfirmar} disabled={saving}>
                {saving ? "Inscrevendo..." : <><CheckCircle className="w-4 h-4 mr-1" /> Inscrever Aluno no Curso</>}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}