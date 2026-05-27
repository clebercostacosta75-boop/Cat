import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Users, UserPlus, BookOpen, DollarSign, Shield, Search, Edit, Trash2,
  CheckCircle, Clock, Lock, Unlock, AlertTriangle, Plus, MapPin, User, CreditCard, FileText, Copy, Activity, LayoutDashboard, Bell, PenLine, TrendingUp, Calendar, XCircle
} from "lucide-react";
import { toast } from "sonner";
import PagamentosAsaas from "@/components/alunos/PagamentosAsaas";
import PainelPendenciasFinanceiras from "@/components/financeiro/PainelPendenciasFinanceiras";
import TimelineAluno from "@/components/alunos/TimelineAluno";
import GargalosDashboard from "@/components/alunos/GargalosDashboard";
import ContratoAssinaturaTab from "@/components/contratos/ContratoAssinaturaTab";
import ReciboPagamento from "@/components/financeiro/ReciboPagamento";

const EMPTY_STUDENT = {
  full_name: "", social_name: "", cpf: "", rg: "", rg_orgao_emissor: "", ra: "",
  data_nascimento: "", sexo: "", email: "", whatsapp: "", status: "Ativo", notes: "",
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
  resp_financeiro_nome: "", resp_financeiro_cpf: "", resp_financeiro_telefone: "", resp_financeiro_email: ""
};

const EMPTY_ENROLLMENT = {
  student_id: "", student_name: "", student_cpf: "", student_email: "", student_phone: "",
  course_id: "", course_name: "", company_id: "individual", company_name: "Individual (PF)",
  start_date: "", end_date: "", status: "Aguardando Autorização", notes: "",
  unit_value: "", forma_pagamento: "", status_pagamento: "Pendente", data_vencimento_pagamento: ""
};

// ─── Modal de Cadastro de Aluno (com abas) ───────────────────────────────────
function AlunoModal({ open, onClose, onSave, editingStudent }) {
  const [tab, setTab] = useState("pessoal");
  const [form, setForm] = useState(EMPTY_STUDENT);

  useEffect(() => {
    if (editingStudent) setForm({ ...EMPTY_STUDENT, ...editingStudent });
    else setForm(EMPTY_STUDENT);
    setTab("pessoal");
  }, [editingStudent, open]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = () => {
    if (!form.full_name || !form.cpf) { toast.error("Nome e CPF são obrigatórios"); return; }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingStudent ? "Editar Aluno" : "Novo Aluno (PF)"}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="pessoal" className="flex items-center gap-1 text-xs">
              <User className="w-3 h-3" /> Dados Pessoais
            </TabsTrigger>
            <TabsTrigger value="endereco" className="flex items-center gap-1 text-xs">
              <MapPin className="w-3 h-3" /> Endereço
            </TabsTrigger>
            <TabsTrigger value="responsavel" className="flex items-center gap-1 text-xs">
              <Shield className="w-3 h-3" /> Resp. Financeiro
            </TabsTrigger>
          </TabsList>

          {/* ABA: Dados Pessoais */}
          <TabsContent value="pessoal" className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>Nome Completo *</Label>
                <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Nome Social</Label>
                <Input value={form.social_name} onChange={e => set("social_name", e.target.value)} placeholder="Opcional" />
              </div>
              <div>
                <Label>CPF *</Label>
                <Input value={form.cpf} onChange={e => set("cpf", e.target.value)} placeholder="000.000.000-00" />
              </div>
              <div>
                <Label>Data de Nascimento</Label>
                <Input type="date" value={form.data_nascimento} onChange={e => set("data_nascimento", e.target.value)} />
              </div>
              <div>
                <Label>RG</Label>
                <Input value={form.rg} onChange={e => set("rg", e.target.value)} />
              </div>
              <div>
                <Label>Órgão Emissor RG</Label>
                <Input value={form.rg_orgao_emissor} onChange={e => set("rg_orgao_emissor", e.target.value)} placeholder="SSP/PA" />
              </div>
              <div>
                <Label>RA (Registro de Aluno)</Label>
                <Input value={form.ra} onChange={e => set("ra", e.target.value)} />
              </div>
              <div>
                <Label>Sexo</Label>
                <Select value={form.sexo} onValueChange={v => set("sexo", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                    <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>E-mail</Label>
                <Input value={form.email} onChange={e => set("email", e.target.value)} />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="(91) 99999-9999" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Observações</Label>
                <Input value={form.notes} onChange={e => set("notes", e.target.value)} />
              </div>
            </div>
          </TabsContent>

          {/* ABA: Endereço */}
          <TabsContent value="endereco" className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>CEP</Label>
                <Input value={form.cep} onChange={e => set("cep", e.target.value)} placeholder="00000-000" />
              </div>
              <div className="sm:col-span-2">
                <Label>Logradouro (Rua/Av.)</Label>
                <Input value={form.logradouro} onChange={e => set("logradouro", e.target.value)} />
              </div>
              <div>
                <Label>Número</Label>
                <Input value={form.numero} onChange={e => set("numero", e.target.value)} />
              </div>
              <div>
                <Label>Complemento</Label>
                <Input value={form.complemento} onChange={e => set("complemento", e.target.value)} placeholder="Apto, Bloco..." />
              </div>
              <div>
                <Label>Bairro</Label>
                <Input value={form.bairro} onChange={e => set("bairro", e.target.value)} />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={form.cidade} onChange={e => set("cidade", e.target.value)} />
              </div>
              <div>
                <Label>Estado (UF)</Label>
                <Input value={form.estado} onChange={e => set("estado", e.target.value)} placeholder="PA" maxLength={2} />
              </div>
            </div>
          </TabsContent>

          {/* ABA: Responsável Financeiro */}
          <TabsContent value="responsavel" className="space-y-3">
            <p className="text-xs text-gray-500">Preencha se o responsável financeiro for diferente do aluno.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>Nome do Responsável</Label>
                <Input value={form.resp_financeiro_nome} onChange={e => set("resp_financeiro_nome", e.target.value)} />
              </div>
              <div>
                <Label>CPF do Responsável</Label>
                <Input value={form.resp_financeiro_cpf} onChange={e => set("resp_financeiro_cpf", e.target.value)} placeholder="000.000.000-00" />
              </div>
              <div>
                <Label>Telefone do Responsável</Label>
                <Input value={form.resp_financeiro_telefone} onChange={e => set("resp_financeiro_telefone", e.target.value)} placeholder="(91) 99999-9999" />
              </div>
              <div className="sm:col-span-2">
                <Label>E-mail do Responsável</Label>
                <Input value={form.resp_financeiro_email} onChange={e => set("resp_financeiro_email", e.target.value)} />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-gray-900 hover:bg-gray-800" onClick={handleSave}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal de Nova Matrícula ──────────────────────────────────────────────────
function MatriculaModal({ open, onClose, onSave, isPending }) {
  const [form, setForm] = useState(EMPTY_ENROLLMENT);
  const [studentSearch, setStudentSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStudentLabel, setSelectedStudentLabel] = useState("");
  const [deepSearch, setDeepSearch] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null); // student to confirm
  const searchRef = useRef(null);

  const { data: allStudents = [] } = useQuery({
    queryKey: ["students-pf"],
    queryFn: () => base44.entities.Student.list("-created_date"),
  });

  const { data: allEnrollments = [] } = useQuery({
    queryKey: ["all-enrollments"],
    queryFn: () => base44.entities.StudentCourseEnrollment.list(),
  });

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["courses"],
    queryFn: () => base44.entities.Course.list("-name", 200),
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    if (open) {
      setForm(EMPTY_ENROLLMENT);
      setStudentSearch("");
      setSelectedStudentLabel("");
      setShowDropdown(false);
      setDeepSearch(false);
      setConfirmDialog(null);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const norm = (v) => (v || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "").trim();
  const today = new Date().toISOString().split("T")[0];

  // IDs de alunos que já têm matrícula
  const enrolledStudentIds = new Set(allEnrollments.map(e => e.student_id));

  // Alunos sem matrícula, priorizando cadastrados hoje
  const studentsWithoutEnrollment = allStudents
    .filter(s => !enrolledStudentIds.has(s.id))
    .sort((a, b) => {
      const aToday = (a.created_date || "").startsWith(today);
      const bToday = (b.created_date || "").startsWith(today);
      if (aToday && !bToday) return -1;
      if (!aToday && bToday) return 1;
      return (b.created_date || "").localeCompare(a.created_date || "");
    });

  const maskCpf = (cpf) => {
    if (!cpf) return "";
    const d = cpf.replace(/\D/g, "");
    if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.***-**`;
    return cpf;
  };

  const hasEnrollment = (studentId) => enrolledStudentIds.has(studentId);
  const countEnrollments = (studentId) => allEnrollments.filter(e => e.student_id === studentId).length;

  // Lista filtrada pelo campo de busca
  const sourceList = deepSearch ? allStudents : studentsWithoutEnrollment;
  const filteredStudents = studentSearch.length >= 3
    ? sourceList
        .filter(s => [s.full_name, s.cpf, s.email, s.whatsapp].some(f => norm(f).includes(norm(studentSearch))))
        .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""))
    : deepSearch
      ? [] // busca profunda exige digitar
      : studentsWithoutEnrollment.slice(0, 20); // padrão: mostra até 20 sem matrícula

  const doSelectStudent = (s) => {
    setForm(f => ({ ...f, student_id: s.id, student_name: s.full_name, student_cpf: s.cpf, student_email: s.email || "", student_phone: s.whatsapp || "" }));
    setSelectedStudentLabel(`${s.full_name} — ${maskCpf(s.cpf)}`);
    setStudentSearch("");
    setShowDropdown(false);
    setConfirmDialog(null);
  };

  const handleSelectStudent = (s) => {
    if (deepSearch && hasEnrollment(s.id)) {
      setConfirmDialog(s);
      setShowDropdown(false);
    } else {
      doSelectStudent(s);
    }
  };

  const handleClearStudent = () => {
    setForm(f => ({ ...f, student_id: "", student_name: "", student_cpf: "", student_email: "", student_phone: "" }));
    setSelectedStudentLabel("");
    setStudentSearch("");
  };

  const alreadyInCourse = !!(form.student_id && form.course_id &&
    allEnrollments.some(e => e.student_id === form.student_id && e.course_id === form.course_id));

  const handleCourseChange = (courseId) => {
    const c = courses.find(c => c.id === courseId);
    if (c) setForm(f => ({ ...f, course_id: c.id, course_name: c.name }));
  };

  const canSave = !!(form.student_id && form.course_id && form.start_date && form.end_date);

  const showList = showDropdown || (!form.student_id && !deepSearch && studentSearch.length === 0);

  return (
    <>
    {/* Diálogo de confirmação para aluno com matrícula anterior */}
    {confirmDialog && (
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-500" /> Aluno com matrícula anterior</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-700 mt-1">
            <strong>{confirmDialog.full_name}</strong> já possui {countEnrollments(confirmDialog.id)} matrícula(s) no sistema.
            Deseja continuar com uma nova inscrição?
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancelar</Button>
            <Button className="bg-gray-900 hover:bg-gray-800" onClick={() => doSelectStudent(confirmDialog)}>Continuar</Button>
          </div>
        </DialogContent>
      </Dialog>
    )}

    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova Matrícula Individual (PF)</DialogTitle></DialogHeader>
        <div className="space-y-3">

          {/* Campo Aluno */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Aluno *</Label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deepSearch}
                  onChange={e => { setDeepSearch(e.target.checked); setStudentSearch(""); setShowDropdown(false); }}
                  className="w-3.5 h-3.5 accent-gray-800"
                />
                <span className="text-xs font-medium text-blue-700 flex items-center gap-1">
                  <Search className="w-3 h-3" /> Busca Profunda
                </span>
              </label>
            </div>

            {form.student_id ? (
              <div className="flex items-center gap-2 p-2.5 border border-gray-300 rounded-md bg-gray-50">
                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="flex-1 text-sm font-medium text-gray-800">{selectedStudentLabel}</span>
                <button onClick={handleClearStudent} className="text-gray-400 hover:text-red-500 text-xs underline ml-1">Trocar</button>
              </div>
            ) : (
              <div ref={searchRef} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  className="pl-9"
                  placeholder={deepSearch
                    ? "Busca Profunda: digite nome, CPF, e-mail ou telefone..."
                    : "Buscar aluno sem matrícula por nome, CPF, e-mail..."}
                  value={studentSearch}
                  onChange={e => { setStudentSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  autoComplete="off"
                />

                {/* Dropdown de resultados */}
                {showList && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {/* Cabeçalho do modo */}
                    <div className={`px-3 py-1.5 text-xs font-semibold border-b ${deepSearch ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-500"}`}>
                      {deepSearch
                        ? `🔍 Busca Profunda — todos os alunos${studentSearch.length >= 3 ? "" : " (digite para buscar)"}`
                        : `⚡ Alunos sem matrícula${studentSearch.length === 0 ? " — cadastros recentes" : ""}`}
                    </div>

                    {filteredStudents.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500 text-center">
                        {studentSearch.length > 0 && studentSearch.length < 3
                          ? `Digite mais ${3 - studentSearch.length} caractere(s) para buscar...`
                          : deepSearch
                            ? "Digite para buscar em todos os alunos"
                            : "Nenhum aluno sem matrícula encontrado"}
                      </div>
                    ) : (
                      filteredStudents.map(s => {
                        const qty = countEnrollments(s.id);
                        const hasAny = hasEnrollment(s.id);
                        const isToday = (s.created_date || "").startsWith(today);
                        return (
                          <div
                            key={s.id}
                            className="flex items-start justify-between px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onMouseDown={() => handleSelectStudent(s)}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900 truncate">{s.full_name}</p>
                                {isToday && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">Hoje</span>}
                              </div>
                              <p className="text-xs text-gray-500">CPF: {maskCpf(s.cpf)}{s.whatsapp ? ` • ${s.whatsapp}` : ""}</p>
                              {deepSearch && (
                                <p className={`text-xs mt-0.5 font-medium ${hasAny ? "text-orange-600" : "text-green-600"}`}>
                                  {hasAny ? `⚠ Já possui ${qty} matrícula(s) anterior(es)` : "✓ Sem matrícula"}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {!deepSearch && !form.student_id && (
              <p className="text-xs text-gray-400 mt-1">
                Mostrando alunos <strong>sem matrícula</strong>. Para buscar todos, ative <strong>Busca Profunda</strong>.
              </p>
            )}
          </div>

          {/* Aviso: mesmo curso */}
          {alreadyInCourse && (
            <div className="flex items-start gap-2 p-2.5 bg-yellow-50 border border-yellow-300 rounded-md">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800">Este aluno já possui matrícula neste curso. Verifique se é uma renovação ou duplicidade.</p>
            </div>
          )}
          <div>
            <Label>Curso *</Label>
            <Select value={form.course_id} onValueChange={handleCourseChange}>
              <SelectTrigger>
                <SelectValue placeholder={loadingCourses ? "Carregando cursos..." : courses.length === 0 ? "Nenhum curso cadastrado" : "Selecione o curso"} />
              </SelectTrigger>
              <SelectContent>
                {courses.length === 0 && !loadingCourses && (
                  <div className="px-3 py-2 text-sm text-gray-500">Nenhum curso encontrado. Cadastre cursos primeiro.</div>
                )}
                {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data Início *</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <Label>Data Fim *</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Pagamento</p>
            <p className="text-xs text-gray-500 mb-3">O valor do curso será definido na geração do boleto/cobrança.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status Pagamento</Label>
                <Select value={form.status_pagamento} onValueChange={v => setForm(f => ({ ...f, status_pagamento: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Parcialmente Pago">Parcialmente Pago</SelectItem>
                    <SelectItem value="Inadimplente">Inadimplente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={form.forma_pagamento} onValueChange={v => setForm(f => ({ ...f, forma_pagamento: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="À Vista">À Vista</SelectItem>
                    <SelectItem value="Parcelado 2x">Parcelado 2x</SelectItem>
                    <SelectItem value="Parcelado 3x">Parcelado 3x</SelectItem>
                    <SelectItem value="Parcelado 4x">Parcelado 4x</SelectItem>
                    <SelectItem value="Parcelado 5x">Parcelado 5x</SelectItem>
                    <SelectItem value="Parcelado 6x">Parcelado 6x</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Pix">Pix</SelectItem>
                    <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                    <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                    <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                    <SelectItem value="Dinheiro em Espécie">💵 Dinheiro em Espécie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              className="bg-gray-900 hover:bg-gray-800"
              onClick={() => onSave(form)}
              disabled={!canSave || isPending}
            >
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
      </Dialog>
      </>
      );
      }

      // ─── Aba: Cadastro de Alunos ─────────────────────────────────────────────────
function AlunosCadastro() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => { setUserRole(u?.role || "user"); setUserEmail(u?.email || null); }).catch(() => {});
  }, []);

  const isMaster = userRole === "admin" || userRole === "Administrador Master" || userRole === "gestor_master";

  // Verifica se o usuário tem permissão de exclusão concedida pelo master
  const { data: userProfiles = [] } = useQuery({
    queryKey: ["user-profile-delete-perm", userEmail],
    queryFn: () => userEmail ? base44.entities.UserProfile.filter({ user_email: userEmail }) : [],
    enabled: !!userEmail && !isMaster,
  });
  const canDelete = isMaster || (userProfiles[0]?.permissions || []).includes("delete_students");

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students-pf"],
    queryFn: () => base44.entities.Student.list("-created_date"),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Student.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["students-pf"] }); toast.success("Aluno cadastrado!"); setModalOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Student.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["students-pf"] }); toast.success("Aluno atualizado!"); setModalOpen(false); },
  });

  const reativarMutation = useMutation({
    mutationFn: (id) => base44.entities.Student.update(id, { status: "Ativo" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["students-pf"] }); toast.success("Aluno reativado com sucesso!"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const enrollments = await base44.entities.StudentCourseEnrollment.filter({ student_id: id });
      await Promise.all(enrollments.map(e => base44.entities.StudentCourseEnrollment.delete(e.id)));
      await base44.entities.Student.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students-pf"] });
      queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] });
      toast.success("Aluno e matrículas removidos!");
    },
  });

  const handleSave = (form) => {
    if (editingStudent) updateMutation.mutate({ id: editingStudent.id, data: form });
    else createMutation.mutate(form);
  };

  const norm = (v) => (v || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "").trim();
  const searchNorm = norm(search);
  const filtered = !searchNorm ? students : students.filter(s =>
    [s.full_name, s.social_name, s.cpf, s.email, s.whatsapp, s.rg].some(f => norm(f).includes(searchNorm))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar por nome, CPF ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={() => { setEditingStudent(null); setModalOpen(true); }} className="bg-gray-900 hover:bg-gray-800">
          <UserPlus className="w-4 h-4 mr-2" /> Novo Aluno
        </Button>
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              {search ? (
                <>
                  <p className="font-medium">Nenhum resultado para "<span className="text-gray-800">{search}</span>"</p>
                  <p className="text-xs mt-1">Verifique a ortografia ou tente um termo diferente.</p>
                </>
              ) : (
                <p>Nenhum aluno cadastrado</p>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(student => (
                <div key={student.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div>
                    <p className="font-semibold text-gray-900">{student.full_name}</p>
                    {student.social_name && <p className="text-xs text-gray-400">Nome social: {student.social_name}</p>}
                    <p className="text-sm text-gray-500">CPF: {student.cpf} {student.email && `• ${student.email}`}</p>
                    {student.cidade && <p className="text-xs text-gray-400">{student.cidade}{student.estado ? `/${student.estado}` : ""}</p>}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    <Badge className={student.status === "Ativo" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}>
                      {student.status || "Ativo"}
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingStudent(student); setModalOpen(true); }}><Edit className="w-4 h-4" /></Button>
                    {isMaster && student.status === "Inativo" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-700 border-green-300 hover:bg-green-50 text-xs h-8"
                        onClick={() => { if (window.confirm(`Reativar o cadastro de "${student.full_name}"?`)) reativarMutation.mutate(student.id); }}
                        disabled={reativarMutation.isPending}
                      >
                        <Unlock className="w-3 h-3 mr-1" /> Reativar
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700"
                        onClick={() => { if (window.confirm(`Excluir permanentemente "${student.full_name}"? Esta ação não pode ser desfeita.`)) deleteMutation.mutate(student.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlunoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editingStudent={editingStudent}
      />
    </div>
  );
}

// ─── Aba: Matrículas em Cursos ───────────────────────────────────────────────
function MatriculasCursos() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [contratoGeradoInfo, setContratoGeradoInfo] = useState(null); // { enrollment, contractNumber }
  const [selectedEnrollmentForContract, setSelectedEnrollmentForContract] = useState(null);
  const [filterCourseId, setFilterCourseId] = useState("all");
  const [searchAluno, setSearchAluno] = useState("");

  useEffect(() => {
    base44.auth.me().then(u => setUserRole(u?.role || "user")).catch(() => {});
  }, []);

  const isMaster = userRole === "admin" || userRole === "Administrador Master" || userRole === "gestor_master";

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["enrollments-pf"],
    queryFn: async () => {
      const all = await base44.entities.StudentCourseEnrollment.list("-created_date", 500);
      return (all || []).filter(e => !e.company_id || e.company_id === "individual" || e.company_name === "Individual (PF)");
    },
    staleTime: 0,
    gcTime: 0,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-pf"],
    queryFn: () => base44.entities.Student.list("-created_date", 500),
    initialData: [],
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => base44.entities.Course.list("-name", 200),
    initialData: [],
    staleTime: 0,
    gcTime: 0,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const enrollment = await base44.entities.StudentCourseEnrollment.create(data);
      // Geração automática do contrato
      try {
        const result = await base44.functions.invoke("gerarContrato", {
          student_id: enrollment.student_id,
          enrollment_id: enrollment.id,
          force_regen: false,
        });
        if (result.data?.contract_number) {
          setContratoGeradoInfo({ enrollment, contractNumber: result.data.contract_number });
        }
      } catch (e) {
        console.warn("Contrato não gerado automaticamente:", e);
      }
      return enrollment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] });
      toast.success("Matrícula criada! Contrato gerado automaticamente.");
      setModalOpen(false);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.StudentCourseEnrollment.update(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] }); toast.success("Status atualizado!"); },
  });

  const deleteEnrollmentMutation = useMutation({
    mutationFn: (id) => base44.entities.StudentCourseEnrollment.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] }); toast.success("Matrícula excluída!"); },
  });

  const statusColors = {
    "Aguardando Autorização": "bg-yellow-100 text-yellow-800",
    "Autorizado": "bg-blue-100 text-blue-800",
    "Certificado Gerado": "bg-green-100 text-green-800",
    "Assinado": "bg-emerald-100 text-emerald-800",
    "Vencido": "bg-red-100 text-red-800",
    "Revogado": "bg-gray-100 text-gray-800",
  };

  const pagamentoColors = {
    "Pago": "bg-green-100 text-green-800",
    "Pendente": "bg-yellow-100 text-yellow-800",
    "Parcialmente Pago": "bg-blue-100 text-blue-800",
    "Inadimplente": "bg-red-100 text-red-800",
  };

  const norm = (v) => (v || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "").trim();

  // Filtros
  const filteredEnrollments = enrollments.filter(e => {
    const byCourse = filterCourseId === "all" || e.course_id === filterCourseId;
    const byAluno = !searchAluno || norm(e.student_name).includes(norm(searchAluno)) || norm(e.student_cpf).includes(norm(searchAluno));
    return byCourse && byAluno;
  });

  // Contagem por curso
  const countByCourse = {};
  enrollments.forEach(e => {
    if (e.course_id) countByCourse[e.course_id] = (countByCourse[e.course_id] || 0) + 1;
  });

  return (
    <div className="space-y-4">
      {/* Modal de contrato gerado automaticamente */}
      {contratoGeradoInfo && (
        <Dialog open={!!contratoGeradoInfo} onOpenChange={() => setContratoGeradoInfo(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-700">
                <CheckCircle className="w-5 h-5" /> Matrícula Finalizada com Sucesso!
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-emerald-800">
                  O contrato digital foi gerado automaticamente.
                </p>
                <p className="text-xs text-emerald-700 mt-1">Contrato Nº <strong>{contratoGeradoInfo.contractNumber}</strong> — Pronto para envio ao aluno.</p>
              </div>
              <p className="text-sm text-gray-600">O que deseja fazer agora?</p>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  className="bg-blue-700 hover:bg-blue-800 justify-start gap-2"
                  onClick={() => {
                    setSelectedEnrollmentForContract(contratoGeradoInfo.enrollment);
                    setContratoGeradoInfo(null);
                  }}
                >
                  <PenLine className="w-4 h-4" />Visualizar Contrato e Enviar para Assinatura
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => setContratoGeradoInfo(null)}>
                  <BookOpen className="w-4 h-4" />Voltar para Matrículas
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Painel de contrato da matrícula selecionada */}
      {selectedEnrollmentForContract && (
        <Card className="border-2 border-blue-300">
          <CardHeader className="pb-2 bg-blue-50">
            <CardTitle className="text-sm font-bold text-blue-900 flex items-center justify-between">
              <span className="flex items-center gap-2"><PenLine className="w-4 h-4" />Contrato e Assinatura — {selectedEnrollmentForContract.student_name}</span>
              <Button size="sm" variant="ghost" onClick={() => setSelectedEnrollmentForContract(null)} className="text-gray-400 hover:text-gray-700 text-xs">Fechar</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ContratoAssinaturaTab
              enrollmentId={selectedEnrollmentForContract.id}
              studentId={selectedEnrollmentForContract.student_id}
              enrollmentData={selectedEnrollmentForContract}
            />
          </CardContent>
        </Card>
      )}

      {/* Barra de filtros + botão */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          {/* Busca por aluno */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar aluno por nome ou CPF..."
              value={searchAluno}
              onChange={e => setSearchAluno(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* Filtro por curso */}
          <div className="min-w-[220px]">
            <Select value={filterCourseId} onValueChange={setFilterCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por curso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cursos ({enrollments.length} alunos)</SelectItem>
                {courses.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {countByCourse[c.id] ? `(${countByCourse[c.id]})` : "(0)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={() => setModalOpen(true)} className="bg-gray-900 hover:bg-gray-800 flex-shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Nova Matrícula
        </Button>
      </div>

      {/* Card de resumo do curso filtrado */}
      {filterCourseId !== "all" && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">
              {courses.find(c => c.id === filterCourseId)?.name}
            </p>
            <p className="text-xs text-blue-700">
              {filteredEnrollments.length} aluno(s) inscrito(s) neste curso
            </p>
          </div>
        </div>
      )}

      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Carregando...</div>
          ) : filteredEnrollments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>{filterCourseId !== "all" || searchAluno ? "Nenhuma matrícula encontrada para o filtro aplicado" : "Nenhuma matrícula individual encontrada"}</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredEnrollments.map(e => (
                <div key={e.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div>
                    <p className="font-semibold text-gray-900">{e.student_name}</p>
                    <p className="text-sm text-gray-500">{e.course_name}</p>
                    <p className="text-xs text-gray-400">{e.start_date} → {e.end_date}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {e.unit_value ? (
                        <span className="text-xs font-semibold text-green-700">
                          R$ {parseFloat(e.unit_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Sem valor cadastrado</span>
                      )}
                      {e.forma_pagamento && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <CreditCard className="w-3 h-3" /> {e.forma_pagamento}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                     <Badge className={statusColors[e.status] || "bg-gray-100 text-gray-800"}>{e.status}</Badge>
                     {e.status_pagamento && (
                       <Badge className={pagamentoColors[e.status_pagamento] || "bg-gray-100 text-gray-800"}>
                         {e.status_pagamento}
                       </Badge>
                     )}
                     <Button
                       size="sm"
                       variant="outline"
                       className="text-xs h-7 border-blue-300 text-blue-700 hover:bg-blue-50"
                       onClick={() => setSelectedEnrollmentForContract(selectedEnrollmentForContract?.id === e.id ? null : e)}
                     >
                       <PenLine className="w-3 h-3 mr-1" />
                       {selectedEnrollmentForContract?.id === e.id ? "Fechar Contrato" : "Ver Contrato"}
                     </Button>
                     {e.status === "Aguardando Autorização" && (
                       <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs" onClick={() => updateStatusMutation.mutate({ id: e.id, status: "Autorizado" })}>
                         <CheckCircle className="w-3 h-3 mr-1" /> Autorizar
                       </Button>
                     )}
                     {isMaster && (
                       <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700"
                         onClick={() => { if (window.confirm(`Excluir a matrícula de "${e.student_name}" em "${e.course_name}"? Esta ação não pode ser desfeita.`)) deleteEnrollmentMutation.mutate(e.id); }}>
                         <Trash2 className="w-3 h-3" />
                       </Button>
                     )}
                   </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <MatriculaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={(form) => createMutation.mutate(form)}
        isPending={createMutation.isPending}
      />
    </div>
  );
}

// ─── Aba: Financeiro (Dashboard Completo) ────────────────────────────────────
function FinanceiroAlunos() {
  const [selectedEnrollmentForRecibo, setSelectedEnrollmentForRecibo] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchAluno, setSearchAluno] = useState("");

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["enrollments-pf"],
    queryFn: async () => {
      const all = await base44.entities.StudentCourseEnrollment.list("-created_date", 500);
      return (all || []).filter(e => !e.company_id || e.company_id === "individual" || e.company_name === "Individual (PF)");
    },
    staleTime: 0,
    gcTime: 0,
  });

  const { data: receipts = [] } = useQuery({
    queryKey: ["receipts-pf"],
    queryFn: () => base44.entities.Receipt.list("-created_date", 500),
    initialData: [],
  });

  // Mapear recibos por enrollment_id
  const receiptsByEnrollment = {};
  receipts.forEach(r => {
    if (r.enrollment_id) {
      if (!receiptsByEnrollment[r.enrollment_id]) receiptsByEnrollment[r.enrollment_id] = [];
      receiptsByEnrollment[r.enrollment_id].push(r);
    }
  });

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // KPIs
  const total = enrollments.length;
  const totalReceita = enrollments.reduce((acc, e) => acc + (parseFloat(e.unit_value) || 0), 0);
  const totalRecebido = receipts
    .filter(r => r.status === "Emitido")
    .reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);
  const totalPendente = enrollments
    .filter(e => ["Pendente", "Parcialmente Pago"].includes(e.status_pagamento))
    .reduce((acc, e) => acc + (parseFloat(e.unit_value) || 0), 0);
  const inadimplentes = enrollments.filter(e => e.status_pagamento === "Inadimplente").length;
  const pagos = enrollments.filter(e => e.status_pagamento === "Pago").length;
  const pendentes = enrollments.filter(e => e.status_pagamento === "Pendente").length;

  // Vencimentos próximos (próximos 7 dias)
  const proximosVencimentos = enrollments.filter(e => {
    if (!e.data_vencimento_pagamento) return false;
    const venc = new Date(e.data_vencimento_pagamento + "T00:00:00");
    const diff = (venc - today) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7 && e.status_pagamento !== "Pago";
  });

  // Vencimentos em atraso
  const vencidos = enrollments.filter(e => {
    if (!e.data_vencimento_pagamento) return false;
    return e.data_vencimento_pagamento < todayStr && e.status_pagamento !== "Pago";
  });

  const pagamentoColors = {
    "Pago": "bg-green-100 text-green-800",
    "Pendente": "bg-yellow-100 text-yellow-800",
    "Parcialmente Pago": "bg-blue-100 text-blue-800",
    "Inadimplente": "bg-red-100 text-red-800",
  };

  const norm = (v) => (v || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "").trim();

  const filteredEnrollments = enrollments.filter(e => {
    const byStatus = filterStatus === "all" || e.status_pagamento === filterStatus;
    const bySearch = !searchAluno || norm(e.student_name).includes(norm(searchAluno)) || norm(e.student_cpf || "").includes(norm(searchAluno));
    return byStatus && bySearch;
  });

  const formatCurrency = (v) => `R$ ${(parseFloat(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

  return (
    <div className="space-y-6">

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <BookOpen className="w-5 h-5 text-blue-600 mb-1" />
            <p className="text-xl font-bold text-black">{total}</p>
            <p className="text-xs text-gray-500">Matrículas PF</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <TrendingUp className="w-5 h-5 text-emerald-600 mb-1" />
            <p className="text-xl font-bold text-emerald-700">{formatCurrency(totalReceita)}</p>
            <p className="text-xs text-gray-500">Receita Total</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <CheckCircle className="w-5 h-5 text-green-600 mb-1" />
            <p className="text-xl font-bold text-green-700">{formatCurrency(totalRecebido)}</p>
            <p className="text-xs text-gray-500">Total Recebido</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <Clock className="w-5 h-5 text-yellow-600 mb-1" />
            <p className="text-xl font-bold text-yellow-700">{formatCurrency(totalPendente)}</p>
            <p className="text-xs text-gray-500">A Receber</p>
          </CardContent>
        </Card>
        <Card className={`border ${vencidos.length > 0 ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
          <CardContent className="p-4">
            <XCircle className={`w-5 h-5 mb-1 ${vencidos.length > 0 ? "text-red-600" : "text-gray-400"}`} />
            <p className={`text-xl font-bold ${vencidos.length > 0 ? "text-red-700" : "text-black"}`}>{vencidos.length}</p>
            <p className="text-xs text-gray-500">Vencidos/Atraso</p>
          </CardContent>
        </Card>
        <Card className={`border ${proximosVencimentos.length > 0 ? "border-orange-300 bg-orange-50" : "border-gray-200"}`}>
          <CardContent className="p-4">
            <Calendar className={`w-5 h-5 mb-1 ${proximosVencimentos.length > 0 ? "text-orange-600" : "text-gray-400"}`} />
            <p className={`text-xl font-bold ${proximosVencimentos.length > 0 ? "text-orange-700" : "text-black"}`}>{proximosVencimentos.length}</p>
            <p className="text-xs text-gray-500">Vencem em 7 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de vencimentos */}
      {vencidos.length > 0 && (
        <Card className="border border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-red-800 flex items-center gap-2">
              <XCircle className="w-4 h-4" /> Pagamentos Vencidos ({vencidos.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-red-100">
              {vencidos.map(e => (
                <div key={e.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-red-900">{e.student_name}</p>
                    <p className="text-xs text-red-700">{e.course_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-800">{formatCurrency(e.unit_value)}</p>
                    <p className="text-xs text-red-600">Venceu em {formatDate(e.data_vencimento_pagamento)}</p>
                    <Badge className="bg-red-100 text-red-700 text-xs mt-0.5">{e.status_pagamento}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {proximosVencimentos.length > 0 && (
        <Card className="border border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-orange-800 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Próximos Vencimentos — 7 dias ({proximosVencimentos.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-orange-100">
              {proximosVencimentos.map(e => (
                <div key={e.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-orange-900">{e.student_name}</p>
                    <p className="text-xs text-orange-700">{e.course_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-800">{formatCurrency(e.unit_value)}</p>
                    <p className="text-xs text-orange-600">Vence em {formatDate(e.data_vencimento_pagamento)}</p>
                    <Badge className="bg-orange-100 text-orange-700 text-xs mt-0.5">{e.forma_pagamento || "—"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar aluno..." value={searchAluno} onChange={e => setSearchAluno(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="Pago">Pago ({pagos})</SelectItem>
            <SelectItem value="Pendente">Pendente ({pendentes})</SelectItem>
            <SelectItem value="Inadimplente">Inadimplente ({inadimplentes})</SelectItem>
            <SelectItem value="Parcialmente Pago">Parcialmente Pago</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela detalhada */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-600" />
            Detalhamento Financeiro por Aluno
            <span className="ml-auto text-sm font-normal text-gray-500">{filteredEnrollments.length} registro(s)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Carregando...</div>
          ) : filteredEnrollments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhum registro encontrado</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredEnrollments.map(e => {
                const envReceipts = receiptsByEnrollment[e.id] || [];
                const totalPago = envReceipts.filter(r => r.status === "Emitido").reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);
                const saldo = (parseFloat(e.unit_value) || 0) - totalPago;
                const isOpen = selectedEnrollmentForRecibo?.id === e.id;
                const isVencido = e.data_vencimento_pagamento && e.data_vencimento_pagamento < todayStr && e.status_pagamento !== "Pago";
                const isProximo = e.data_vencimento_pagamento && !isVencido && (() => {
                  const venc = new Date(e.data_vencimento_pagamento + "T00:00:00");
                  const diff = (venc - today) / (1000 * 60 * 60 * 24);
                  return diff >= 0 && diff <= 7;
                })();

                return (
                  <div key={e.id} className={isVencido ? "bg-red-50" : isProximo ? "bg-orange-50" : ""}>
                    <div className="flex items-start justify-between p-4 gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">{e.student_name}</p>
                          {isVencido && <Badge className="bg-red-100 text-red-700 text-xs">⚠ Vencido</Badge>}
                          {isProximo && <Badge className="bg-orange-100 text-orange-700 text-xs">⏰ Vence em breve</Badge>}
                        </div>
                        <p className="text-sm text-gray-600">{e.course_name}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Curso: {formatDate(e.start_date)} → {formatDate(e.end_date)}
                          </span>
                          {e.forma_pagamento && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <CreditCard className="w-3 h-3" /> {e.forma_pagamento}
                            </span>
                          )}
                          {e.data_vencimento_pagamento && (
                            <span className={`text-xs flex items-center gap-1 font-medium ${isVencido ? "text-red-600" : isProximo ? "text-orange-600" : "text-gray-500"}`}>
                              <Clock className="w-3 h-3" /> Vence: {formatDate(e.data_vencimento_pagamento)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Valor do Curso</p>
                          <p className="font-bold text-gray-900">{e.unit_value ? formatCurrency(e.unit_value) : <span className="text-gray-400 font-normal text-xs">Não informado</span>}</p>
                        </div>
                        {totalPago > 0 && (
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Total Recebido</p>
                            <p className="font-semibold text-green-700">{formatCurrency(totalPago)}</p>
                          </div>
                        )}
                        {saldo > 0 && totalPago > 0 && (
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Saldo Restante</p>
                            <p className="font-semibold text-orange-700">{formatCurrency(saldo)}</p>
                          </div>
                        )}
                        <Badge className={pagamentoColors[e.status_pagamento] || "bg-gray-100 text-gray-800"}>
                          {e.status_pagamento || "Pendente"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`text-xs h-7 ${isOpen ? "border-gray-400 text-gray-700" : "border-green-300 text-green-700 hover:bg-green-50"}`}
                          onClick={() => setSelectedEnrollmentForRecibo(isOpen ? null : e)}
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          {isOpen ? "Fechar" : `Recibos ${envReceipts.length > 0 ? `(${envReceipts.length})` : ""}`}
                        </Button>
                      </div>
                    </div>

                    {/* Recibos inline */}
                    {isOpen && (
                      <div className="px-4 pb-4 bg-white border-t border-green-100">
                        <ReciboPagamento enrollment={e} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Aba: Acesso ao Portal ───────────────────────────────────────────────────
function AcessoPortal() {
  const queryClient = useQueryClient();
  const [userRole, setUserRole] = useState(null);
  const [search, setSearch] = useState("");
  const [showDeletePerms, setShowDeletePerms] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => setUserRole(u?.role || "user")).catch(() => {});
  }, []);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students-pf"],
    queryFn: () => base44.entities.Student.list("-created_date"),
    initialData: [],
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Student.update(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["students-pf"] }); toast.success("Acesso atualizado!"); },
  });

  const isMaster = userRole === "admin" || userRole === "Administrador Master" || userRole === "gestor_master";

  const { data: allProfiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["all-user-profiles-portal"],
    queryFn: () => base44.entities.UserProfile.list(),
    enabled: isMaster,
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, permissions }) => base44.entities.UserProfile.update(id, { permissions }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["all-user-profiles-portal"] }); toast.success("Permissão atualizada!"); },
  });

  const toggleDeletePermission = (profile) => {
    const perms = profile.permissions || [];
    const newPerms = perms.includes("delete_students")
      ? perms.filter(p => p !== "delete_students")
      : [...perms, "delete_students"];
    updateProfileMutation.mutate({ id: profile.id, permissions: newPerms });
  };

  const norm = (v) => (v || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "").trim();
  const searchNorm = norm(search);
  const filtered = !searchNorm ? students : students.filter(s =>
    [s.full_name, s.social_name, s.cpf, s.email, s.whatsapp].some(f => norm(f).includes(searchNorm))
  );

  return (
    <div className="space-y-4">
      {!isMaster && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            <strong>Atenção:</strong> Liberação ou bloqueio de acesso ao portal requer autorização do Gestor Master.
          </p>
        </div>
      )}
      {isMaster && (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                <strong>Gestor Master:</strong> Você tem permissão para liberar/bloquear acesso e gerenciar permissões de exclusão.
              </p>
            </div>
            <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50 flex-shrink-0"
              onClick={() => setShowDeletePerms(!showDeletePerms)}>
              <Trash2 className="w-3 h-3 mr-1" />{showDeletePerms ? "Fechar" : "Permissões de Exclusão"}
            </Button>
          </div>

          {showDeletePerms && (
            <Card className="border border-red-200">
              <CardHeader className="pb-2 bg-red-50 border-b border-red-100">
                <CardTitle className="text-sm font-bold text-red-800 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Gerenciar Permissão de Exclusão de Alunos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loadingProfiles ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Carregando usuários...</div>
                ) : allProfiles.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Nenhum perfil encontrado.</div>
                ) : (
                  <div className="divide-y">
                    {allProfiles.map(profile => {
                      const hasDeletePerm = (profile.permissions || []).includes("delete_students");
                      const isAdminRole = ["admin", "Administrador Master", "gestor_master"].includes(profile.role);
                      return (
                        <div key={profile.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{profile.user_name}</p>
                            <p className="text-xs text-gray-500">{profile.user_email} — {profile.role}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isAdminRole ? (
                              <Badge className="bg-blue-100 text-blue-700 text-xs">Acesso total (Master)</Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className={hasDeletePerm ? "border-red-300 text-red-700 hover:bg-red-50" : "border-gray-300 text-gray-600 hover:bg-gray-50"}
                                onClick={() => toggleDeletePermission(profile)}
                                disabled={updateProfileMutation.isPending}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                {hasDeletePerm ? "Revogar" : "Conceder"}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Buscar aluno..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhum aluno encontrado</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(student => {
                const ativo = student.status === "Ativo";
                return (
                  <div key={student.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                    <div>
                      <p className="font-semibold text-gray-900">{student.full_name}</p>
                      <p className="text-sm text-gray-500">CPF: {student.cpf}</p>
                      {student.email && <p className="text-xs text-gray-400">{student.email}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={ativo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {ativo ? (<><Unlock className="w-3 h-3 mr-1 inline" /> Acesso Liberado</>) : (<><Lock className="w-3 h-3 mr-1 inline" /> Acesso Bloqueado</>)}
                      </Badge>
                      {isMaster && (
                        <Button
                          size="sm" variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: student.id, status: ativo ? "Inativo" : "Ativo" })}
                          className={ativo ? "border-red-300 text-red-600 hover:bg-red-50" : "border-green-300 text-green-600 hover:bg-green-50"}
                        >
                          {ativo ? <><Lock className="w-3 h-3 mr-1" /> Bloquear</> : <><Unlock className="w-3 h-3 mr-1" /> Liberar</>}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Aba: Contratos Geral ────────────────────────────────────────────────────
function ContratosGeral() {
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["enrollments-pf"],
    queryFn: async () => {
      const all = await base44.entities.StudentCourseEnrollment.list("-created_date", 500);
      return (all || []).filter(e => !e.company_id || e.company_id === "individual" || e.company_name === "Individual (PF)");
    },
    staleTime: 0,
    gcTime: 0,
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["all-contracts-pf"],
    queryFn: () => base44.entities.Contract.list("-created_date", 200),
    initialData: [],
  });

  const contractByEnrollment = {};
  contracts.forEach(c => { if (c.enrollment_id) contractByEnrollment[c.enrollment_id] = c; });

  const STATUS_COLOR = {
    Gerado_Automaticamente: "bg-blue-100 text-blue-700",
    Gerado_Manualmente: "bg-indigo-100 text-indigo-700",
    Enviado_Assinatura: "bg-yellow-100 text-yellow-800",
    Assinado_Todas_Partes: "bg-emerald-100 text-emerald-800",
    PDF_Gerado: "bg-green-100 text-green-700",
    Cancelado: "bg-red-100 text-red-700",
    Rascunho: "bg-gray-100 text-gray-600",
  };

  if (isLoading) return <div className="text-center py-12 text-gray-400">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <PenLine className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Contratos Digitais — Alunos Individuais PF</p>
          <p className="text-xs text-blue-700 mt-0.5">Clique em uma matrícula para ver ou gerenciar o contrato vinculado.</p>
        </div>
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {enrollments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhuma matrícula individual encontrada</p>
            </div>
          ) : (
            <div className="divide-y">
              {enrollments.map(e => {
                const contract = contractByEnrollment[e.id];
                const isSelected = selectedEnrollment?.id === e.id;
                return (
                  <div key={e.id}>
                    <div
                      className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? "bg-blue-50" : ""}`}
                      onClick={() => setSelectedEnrollment(isSelected ? null : e)}
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{e.student_name}</p>
                        <p className="text-sm text-gray-500">{e.course_name}</p>
                        <p className="text-xs text-gray-400">{e.start_date} → {e.end_date}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {contract ? (
                          <>
                            <Badge className={STATUS_COLOR[contract.status] || "bg-gray-100 text-gray-700"}>
                              {contract.status?.replace(/_/g, " ")}
                            </Badge>
                            <span className="text-xs text-gray-400">{contract.contract_number}</span>
                          </>
                        ) : (
                          <Badge className="bg-red-100 text-red-600">Sem contrato</Badge>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="p-4 bg-gray-50 border-t border-blue-100">
                        <ContratoAssinaturaTab
                          enrollmentId={e.id}
                          studentId={e.student_id}
                          enrollmentData={e}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Bloqueio de Seção ────────────────────────────────────────────────────────
function SecaoBloqueada({ nome }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
      <Lock className="w-12 h-12 text-gray-300" />
      <p className="font-semibold text-gray-500">Acesso bloqueado</p>
      <p className="text-sm text-gray-400">Você não tem permissão para acessar <strong>{nome}</strong>.<br/>Solicite ao Gestor Master a liberação desta seção.</p>
    </div>
  );
}

// ─── Página Principal ────────────────────────────────────────────────────────
export default function GestaoAlunosIndividuais() {
  const { hasPermission, allowedKeys } = usePermissions();
  // null = acesso total (admin/master). Caso contrário, verifica permissão da seção.
  const canAccess = (secao) => allowedKeys === null || hasPermission(secao);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">Gestão de Alunos Individuais</h1>
          <p className="text-gray-600 text-sm mt-1">
            Cadastro, Matrículas, Financeiro e Controle de Acesso — Pessoa Física
          </p>
        </div>

        <Tabs defaultValue="cadastro">
          <TabsList className="grid w-full grid-cols-9 mb-6 bg-gray-100 p-1 h-auto">
            <TabsTrigger value="cadastro" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Cadastro</span>
            </TabsTrigger>
            <TabsTrigger value="matriculas" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Matrículas</span>
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Financeiro</span>
            </TabsTrigger>
            <TabsTrigger value="acesso" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Acesso ao Portal</span>
            </TabsTrigger>
            <TabsTrigger value="pagamentos" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Pagamentos Asaas</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Timeline</span>
            </TabsTrigger>
            <TabsTrigger value="gargalos" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Gargalos</span>
            </TabsTrigger>
            <TabsTrigger value="pendencias" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Pendências</span>
            </TabsTrigger>
            <TabsTrigger value="contratos" className="flex items-center gap-2 data-[state=active]:bg-blue-700 data-[state=active]:text-white py-3">
              <PenLine className="w-4 h-4" />
              <span className="hidden sm:inline">Contratos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cadastro">{canAccess("Alunos PF: Cadastro") ? <AlunosCadastro /> : <SecaoBloqueada nome="Cadastro" />}</TabsContent>
          <TabsContent value="matriculas">{canAccess("Alunos PF: Matrículas") ? <MatriculasCursos /> : <SecaoBloqueada nome="Matrículas" />}</TabsContent>
          <TabsContent value="financeiro">{canAccess("Alunos PF: Financeiro") ? <FinanceiroAlunos /> : <SecaoBloqueada nome="Financeiro" />}</TabsContent>
          <TabsContent value="acesso">{canAccess("Alunos PF: Controle de Acesso") ? <AcessoPortal /> : <SecaoBloqueada nome="Controle de Acesso" />}</TabsContent>
          <TabsContent value="pagamentos"><PagamentosAsaas /></TabsContent>
          <TabsContent value="timeline">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <Activity className="w-5 h-5 text-gray-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Linha do Tempo — Visão Geral</p>
                  <p className="text-xs text-gray-500">Para ver a timeline de um aluno específico, acesse o perfil do aluno na aba Cadastro.</p>
                </div>
              </div>
              <TimelineAluno studentId={null} />
            </div>
          </TabsContent>
          <TabsContent value="gargalos">
            <GargalosDashboard />
          </TabsContent>
          <TabsContent value="pendencias">
            <PainelPendenciasFinanceiras />
          </TabsContent>
          <TabsContent value="contratos">
            <ContratosGeral />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}