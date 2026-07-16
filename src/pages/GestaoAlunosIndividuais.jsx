import React, { useState, useEffect, useRef, useCallback } from "react";
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
  CheckCircle, Clock, Lock, Unlock, AlertTriangle, Plus, MapPin, User, CreditCard, FileText, Copy, LayoutDashboard, Bell, PenLine, TrendingUp, Calendar, XCircle, ChevronRight, Lightbulb, Upload, Zap, BarChart3 as BarChartIcon
} from "lucide-react";
import { toast } from "sonner";
import PagamentosAsaas from "@/components/alunos/PagamentosAsaas";
import PainelPendenciasFinanceiras from "@/components/financeiro/PainelPendenciasFinanceiras";
import GargalosDashboard from "@/components/alunos/GargalosDashboard";
import ContratoAssinaturaTab from "@/components/contratos/ContratoAssinaturaTab";
import ReciboPagamento from "@/components/financeiro/ReciboPagamento";
import DashboardPF from "@/components/alunos/DashboardPF";
import CadastroUnificado from "@/components/alunos/CadastroUnificado";
import NovoCursoModal from "@/components/alunos/NovoCursoModal";
import NovaMatriculaModal from "@/components/alunos/NovaMatriculaModal";
import ImportarAlunosPlanilha from "@/components/alunos/ImportarAlunosPlanilha";
import ResultadoAcademicoModal from "@/components/alunos/ResultadoAcademicoModal";
import FinanceiroOperacionalTab from "@/components/alunos/FinanceiroOperacionalTab";
import { isMatriculaIndividual } from "@/lib/origemMatricula";
import IndicadoresAtendenteTab from "@/components/vendas/IndicadoresAtendenteTab";
import MatriculaRapidaModal from "@/components/vendas/MatriculaRapidaModal";
import AcoesMatriculaModal from "@/components/alunos/AcoesMatriculaModal";
import PagamentoMatriculaModal from "@/components/alunos/PagamentoMatriculaModal";
import ComunicacoesMatricula from "@/components/comunicacao/ComunicacoesMatricula";
import ModelosMensagemModal from "@/components/comunicacao/ModelosMensagemModal";
import PreCadastrosTab from "@/components/vendas/PreCadastrosTab";
import RelatoriosGerenciaisTab from "@/components/relatorios/RelatoriosGerenciaisTab";
import VisaoGeralCentral from "@/components/alunos/central/VisaoGeralCentral";
import CursosVendaCentral from "@/components/alunos/central/CursosVendaCentral";
import MatriculaFicha from "@/components/alunos/central/MatriculaFicha";

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
          <UserPlus className="w-4 h-4 mr-2" /> Novo Aluno (4 etapas)
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

      {/* Modal de edição simples para alunos existentes */}
      {editingStudent ? (
        <AlunoModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditingStudent(null); }}
          onSave={handleSave}
          editingStudent={editingStudent}
        />
      ) : (
        <CadastroUnificado
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Aba: Matrículas em Cursos ───────────────────────────────────────────────
function MatriculasCursos() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [rapidaOpen, setRapidaOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [selectedEnrollmentForContract, setSelectedEnrollmentForContract] = useState(null);
  const [novoCursoEnrollment, setNovoCursoEnrollment] = useState(null);
  const [filterCourseId, setFilterCourseId] = useState("all");
  const [filterStatusMatricula, setFilterStatusMatricula] = useState("all");
  const [filterStatusPagamento, setFilterStatusPagamento] = useState("all");
  const [searchAluno, setSearchAluno] = useState("");
  const [financeiroEnrollment, setFinanceiroEnrollment] = useState(null);
  const [confirmandoPix, setConfirmandoPix] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [resultadoEnrollment, setResultadoEnrollment] = useState(null);
  const [acoesEnrollment, setAcoesEnrollment] = useState(null);
  const [pagamentoEnrollment, setPagamentoEnrollment] = useState(null);
  const [comunicacoesEnrollment, setComunicacoesEnrollment] = useState(null);
  const [modelosOpen, setModelosOpen] = useState(false);
  const [fichaEnrollment, setFichaEnrollment] = useState(null);
  const [cadastroOpen, setCadastroOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => setUserRole(u?.role || "user")).catch(() => {});
  }, []);

  const isMaster = userRole === "admin" || userRole === "Administrador Master" || userRole === "gestor_master";

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["enrollments-pf"],
    queryFn: async () => {
      const all = await base44.entities.StudentCourseEnrollment.list("-created_date", 500);
      return (all || []).filter(isMatriculaIndividual);
    },
    staleTime: 0,
    gcTime: 0,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => base44.entities.Course.list("-name", 200),
    initialData: [],
    staleTime: 0,
    gcTime: 0,
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
    "Aguardando Autorização": "bg-blue-100 text-blue-800",
    "Autorizado": "bg-green-100 text-green-800",
    "Certificado Gerado": "bg-emerald-100 text-emerald-800",
    "Assinado": "bg-purple-100 text-purple-800",
    "Vencido": "bg-red-100 text-red-800",
    "Revogado": "bg-gray-100 text-gray-800",
  };

  const RESULTADO_COLORS = {
    "Aprovado": "bg-green-100 text-green-800",
    "Reprovado": "bg-red-100 text-red-700",
    "Não Concluiu": "bg-yellow-100 text-yellow-800",
    "Pendente": "bg-gray-100 text-gray-600",
  };

  const pagamentoColors = {
    "Pago": "bg-green-100 text-green-800",
    "Pendente": "bg-yellow-100 text-yellow-800",
    "Parcialmente Pago": "bg-blue-100 text-blue-800",
    "Inadimplente": "bg-red-100 text-red-800",
  };

  const norm = (v) => (v || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "").trim();

  // Filtros combinados
  const filteredEnrollments = enrollments.filter(e => {
    const byCourse = filterCourseId === "all" || e.course_id === filterCourseId;
    const byStatus = filterStatusMatricula === "all" || e.status === filterStatusMatricula;
    const byPagamento = filterStatusPagamento === "all" || e.status_pagamento === filterStatusPagamento;
    const byAluno = !searchAluno || norm(e.student_name).includes(norm(searchAluno)) || (e.student_cpf || "").replace(/\D/g,"").includes(searchAluno.replace(/\D/g,"")) || norm(e.student_cpf || "").includes(norm(searchAluno));
    return byCourse && byStatus && byPagamento && byAluno;
  });

  // Contagem por curso
  const countByCourse = {};
  enrollments.forEach(e => {
    if (e.course_id) countByCourse[e.course_id] = (countByCourse[e.course_id] || 0) + 1;
  });

  const hasFilters = filterCourseId !== "all" || filterStatusMatricula !== "all" || filterStatusPagamento !== "all" || searchAluno;

  return (
    <div className="space-y-4">
      {/* Modal Confirmação PIX */}
      {confirmandoPix && (
        <ModalConfirmarPagamento
          enrollment={confirmandoPix}
          onClose={() => setConfirmandoPix(null)}
          onConfirmed={() => queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] })}
        />
      )}

      {/* Modal Novo Curso (rematrícula) */}
      <NovoCursoModal
        open={!!novoCursoEnrollment}
        onClose={() => setNovoCursoEnrollment(null)}
        enrollment={novoCursoEnrollment}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] })}
      />

      {/* Importação Inteligente por Planilha */}
      <ImportarAlunosPlanilha
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => { queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] }); queryClient.invalidateQueries({ queryKey: ["students-pf"] }); }}
      />

      {/* Modal Resultado Acadêmico (SPR-A) */}
      {resultadoEnrollment && (
        <ResultadoAcademicoModal
          enrollment={resultadoEnrollment}
          onClose={() => setResultadoEnrollment(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] })}
        />
      )}

      {/* FASE 5: Bloco financeiro / pagamento da matrícula */}
      {pagamentoEnrollment && (
        <PagamentoMatriculaModal
          enrollment={pagamentoEnrollment}
          onClose={() => setPagamentoEnrollment(null)}
        />
      )}

      {/* FASE 6: Painel de Comunicações da matrícula */}
      {comunicacoesEnrollment && (
        <ComunicacoesMatricula
          enrollment={comunicacoesEnrollment}
          onClose={() => setComunicacoesEnrollment(null)}
        />
      )}

      {/* FASE 6: Modelos de Mensagem */}
      {modelosOpen && <ModelosMensagemModal onClose={() => setModelosOpen(false)} />}

      {/* FASE 4: Ações controladas da inscrição (trocar/alterar/cancelar/transferir) */}
      {acoesEnrollment && (
        <AcoesMatriculaModal
          enrollment={acoesEnrollment}
          onClose={() => setAcoesEnrollment(null)}
          onDone={() => queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] })}
        />
      )}

      {/* Modal Nova Matrícula com busca de aluno */}
      <NovaMatriculaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] })}
      />

      {/* Central de Matrícula: Ficha única */}
      {fichaEnrollment && (
        <MatriculaFicha
          enrollment={fichaEnrollment}
          onClose={() => setFichaEnrollment(null)}
          onChanged={() => queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] })}
        />
      )}

      {/* Cadastro de aluno absorvido pela aba Matrículas */}
      <CadastroUnificado
        open={cadastroOpen}
        onClose={() => { setCadastroOpen(false); queryClient.invalidateQueries({ queryKey: ["students-pf"] }); }}
      />

      {/* Matrícula Rápida (FASE 1 — Cursos à Venda) */}
      <MatriculaRapidaModal
        open={rapidaOpen}
        onClose={() => setRapidaOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] })}
      />

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

      {/* Painel financeiro inline */}
      {financeiroEnrollment && (
        <Card className="border-2 border-green-300">
          <CardHeader className="pb-2 bg-green-50">
            <CardTitle className="text-sm font-bold text-green-900 flex items-center justify-between">
              <span className="flex items-center gap-2"><DollarSign className="w-4 h-4" />Financeiro — {financeiroEnrollment.student_name} / {financeiroEnrollment.course_name}</span>
              <Button size="sm" variant="ghost" onClick={() => setFinanceiroEnrollment(null)} className="text-gray-400 hover:text-gray-700 text-xs">Fechar</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ReciboPagamento enrollment={financeiroEnrollment} />
          </CardContent>
        </Card>
      )}

      {/* Barra de filtros + botão */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
          {/* Busca por aluno */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar aluno por nome ou CPF..."
              value={searchAluno}
              onChange={e => setSearchAluno(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" onClick={() => setModelosOpen(true)} className="border-indigo-300 text-indigo-700 hover:bg-indigo-50">
              📝 Modelos de Mensagem
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)} className="border-emerald-400 text-emerald-800 hover:bg-emerald-50">
              <Upload className="w-4 h-4 mr-2" /> Importar Alunos por Planilha
            </Button>
            <Button variant="outline" onClick={() => setCadastroOpen(true)} className="border-gray-400">
              <UserPlus className="w-4 h-4 mr-2" /> Novo Aluno
            </Button>
            <Button onClick={() => setRapidaOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white">
              <Zap className="w-4 h-4 mr-2" /> Nova Inscrição Individual
            </Button>
            <Button onClick={() => setModalOpen(true)} className="bg-gray-900 hover:bg-gray-800">
              <Plus className="w-4 h-4 mr-2" /> Nova Matrícula
            </Button>
          </div>
        </div>

        {/* Filtros avançados */}
        <div className="flex flex-wrap gap-2">
          <Select value={filterCourseId} onValueChange={setFilterCourseId}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Filtrar por curso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cursos</SelectItem>
              {courses.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} {countByCourse[c.id] ? `(${countByCourse[c.id]})` : "(0)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatusMatricula} onValueChange={setFilterStatusMatricula}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Status da Matrícula" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="Aguardando Autorização">🔵 Aguardando Autorização</SelectItem>
              <SelectItem value="Autorizado">🟢 Autorizado</SelectItem>
              <SelectItem value="Certificado Gerado">🟢 Certificado Gerado</SelectItem>
              <SelectItem value="Assinado">🟣 Assinado</SelectItem>
              <SelectItem value="Vencido">🔴 Vencido</SelectItem>
              <SelectItem value="Revogado">⚫ Revogado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatusPagamento} onValueChange={setFilterStatusPagamento}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status Pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos pagamentos</SelectItem>
              <SelectItem value="Pago">🟢 Pago</SelectItem>
              <SelectItem value="Pendente">🟡 Pendente</SelectItem>
              <SelectItem value="Parcialmente Pago">🔵 Parcialmente Pago</SelectItem>
              <SelectItem value="Inadimplente">🔴 Inadimplente</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => {
              setFilterCourseId("all"); setFilterStatusMatricula("all");
              setFilterStatusPagamento("all"); setSearchAluno("");
            }}>
              Limpar filtros
            </Button>
          )}

          <span className="text-xs text-gray-500 self-center ml-auto">
            {filteredEnrollments.length} de {enrollments.length} resultado(s)
          </span>
        </div>
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Carregando...</div>
          ) : filteredEnrollments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>{hasFilters ? "Nenhuma matrícula encontrada para os filtros aplicados" : "Nenhuma matrícula individual encontrada"}</p>
              {hasFilters && (
                <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => {
                  setFilterCourseId("all"); setFilterStatusMatricula("all");
                  setFilterStatusPagamento("all"); setSearchAluno("");
                }}>
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filteredEnrollments.map(e => (
                <div key={e.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    {/* Info do aluno e curso */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{e.student_name}</p>
                        {e.student_cpf && <span className="text-xs text-gray-400 font-mono">{e.student_cpf}</span>}
                      </div>
                      <p className="text-sm text-gray-600 font-medium mt-0.5">{e.course_name}</p>
                      <p className="text-xs text-gray-400">{e.start_date} → {e.end_date}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {e.unit_value ? (
                          <span className="text-xs font-semibold text-emerald-700">
                            R$ {parseFloat(e.unit_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Sem valor</span>
                        )}
                        {e.forma_pagamento && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <CreditCard className="w-3 h-3" /> {e.forma_pagamento}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge className={`text-xs ${statusColors[e.status] || "bg-gray-100 text-gray-800"}`}>{e.status}</Badge>
                        <Badge className={`text-xs ${RESULTADO_COLORS[e.resultado_academico] || "bg-gray-100 text-gray-500"}`}>
                          🎓 {e.resultado_academico || "Sem resultado"}
                        </Badge>
                        {e.status_pagamento && (
                          <Badge className={`text-xs ${
                            e.forma_pagamento === "Pix" && e.status_pagamento === "Pendente"
                              ? "bg-yellow-100 text-yellow-800"
                              : pagamentoColors[e.status_pagamento] || "bg-gray-100 text-gray-800"
                          }`}>
                            {e.forma_pagamento === "Pix" && e.status_pagamento === "Pendente"
                              ? "🟡 Aguardando Pagamento PIX"
                              : `💰 ${e.status_pagamento}`}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Botões de ação */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {/* Ficha única da matrícula */}
                      <Button
                        size="sm"
                        className="text-xs h-7 bg-gray-900 hover:bg-gray-800 text-white w-full"
                        onClick={() => setFichaEnrollment(e)}
                      >
                        📋 Ficha da Matrícula
                      </Button>

                      {/* Ver Contrato */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 border-blue-300 text-blue-700 hover:bg-blue-50 w-full"
                        onClick={() => setSelectedEnrollmentForContract(selectedEnrollmentForContract?.id === e.id ? null : e)}
                      >
                        <PenLine className="w-3 h-3 mr-1" />
                        {selectedEnrollmentForContract?.id === e.id ? "Fechar" : "📄 Contrato"}
                      </Button>

                      {/* Ver Financeiro */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 border-green-300 text-green-700 hover:bg-green-50 w-full"
                        onClick={() => setFinanceiroEnrollment(financeiroEnrollment?.id === e.id ? null : e)}
                      >
                        <DollarSign className="w-3 h-3 mr-1" />
                        {financeiroEnrollment?.id === e.id ? "Fechar" : "💰 Financeiro"}
                      </Button>

                      {/* Novo Curso */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 border-purple-300 text-purple-700 hover:bg-purple-50 w-full"
                        onClick={() => setNovoCursoEnrollment(e)}
                      >
                        <Plus className="w-3 h-3 mr-1" /> ➕ Novo Curso
                      </Button>

                      {/* Confirmar PIX manual */}
                      {e.forma_pagamento === "Pix" && e.status_pagamento !== "Pago" && isMaster && (
                        <Button
                          size="sm"
                          className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs h-7 w-full"
                          onClick={() => setConfirmandoPix(e)}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" /> ✅ Confirmar PIX
                        </Button>
                      )}

                      {/* Resultado Acadêmico (SPR-A) */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 border-indigo-300 text-indigo-700 hover:bg-indigo-50 w-full"
                        onClick={() => setResultadoEnrollment(e)}
                      >
                        🎓 Resultado
                      </Button>

                      {/* FASE 6: Comunicações */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 border-indigo-300 text-indigo-700 hover:bg-indigo-50 w-full"
                        onClick={() => setComunicacoesEnrollment(e)}
                      >
                        💬 Comunicações
                      </Button>

                      {/* FASE 5: Pagamento */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 border-emerald-300 text-emerald-700 hover:bg-emerald-50 w-full"
                        onClick={() => setPagamentoEnrollment(e)}
                      >
                        💳 Pagamento
                      </Button>

                      {/* FASE 4: Ações controladas */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 border-gray-300 text-gray-700 hover:bg-gray-100 w-full"
                        onClick={() => setAcoesEnrollment(e)}
                      >
                        🔁 Ações
                      </Button>

                      {/* Autorizar — exige Resultado Acadêmico Aprovado */}
                      {e.status === "Aguardando Autorização" && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 w-full"
                          onClick={() => {
                            if (e.resultado_academico !== "Aprovado") {
                              toast.error("Defina o Resultado Acadêmico como Aprovado antes de autorizar a certificação.");
                              setResultadoEnrollment(e);
                              return;
                            }
                            updateStatusMutation.mutate({ id: e.id, status: "Autorizado" });
                          }}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" /> ✅ Autorizar
                        </Button>
                      )}

                      {/* Excluir */}
                      {isMaster && (
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 h-7 w-full"
                          onClick={() => { if (window.confirm(`Excluir a matrícula de "${e.student_name}" em "${e.course_name}"?`)) deleteEnrollmentMutation.mutate(e.id); }}>
                          <Trash2 className="w-3 h-3 mr-1" /> 🗑️ Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Modal de Confirmação Manual de Pagamento ────────────────────────────────
function ModalConfirmarPagamento({ enrollment, onClose, onConfirmed }) {
  const [dataRecebimento, setDataRecebimento] = useState(new Date().toISOString().split("T")[0]);
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  const handleConfirmar = async () => {
    if (!dataRecebimento) { toast.error("Informe a data do recebimento."); return; }
    setSaving(true);
    try {
      const agora = new Date().toLocaleString("pt-BR");
      const confirmedBy = currentUser?.full_name || currentUser?.email || "Usuário";
      const notesUpdate = `Pago - Confirmação manual por ${confirmedBy} em ${agora}. Data recebimento: ${dataRecebimento}.${observacao ? ` Obs: ${observacao}` : ""}`;

      await base44.entities.StudentCourseEnrollment.update(enrollment.id, {
        status_pagamento: "Pago",
        notes: [enrollment.notes, notesUpdate].filter(Boolean).join(" | "),
      });

      // LOG de auditoria
      await base44.entities.AuditLog.create({
        user_email: currentUser?.email || "desconhecido",
        user_name: confirmedBy,
        action: "update",
        entity_type: "StudentCourseEnrollment",
        entity_id: enrollment.id,
        entity_name: `${enrollment.student_name} — ${enrollment.course_name}`,
        details: `Pagamento confirmado manualmente. Forma: ${enrollment.forma_pagamento}. Valor: R$ ${enrollment.unit_value}. Data recebimento: ${dataRecebimento}.${observacao ? ` Obs: ${observacao}` : ""} — ${agora}`,
      });

      toast.success("Pagamento confirmado e registrado no LOG!");
      onConfirmed();
      onClose();
    } catch (e) {
      toast.error("Erro ao confirmar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5 text-green-600" /> Confirmar Pagamento Manual
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="bg-gray-50 border rounded-md p-3 text-sm space-y-1">
            <p><span className="text-gray-500">Aluno:</span> <strong>{enrollment.student_name}</strong></p>
            <p><span className="text-gray-500">Curso:</span> {enrollment.course_name}</p>
            <p><span className="text-gray-500">Valor:</span> <strong className="text-emerald-700">R$ {parseFloat(enrollment.unit_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></p>
            <p><span className="text-gray-500">Forma:</span> 👤 {enrollment.forma_pagamento}</p>
          </div>
          <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">⚠️ Esta confirmação é <strong>manual</strong>. Verifique o comprovante antes de confirmar!</p>
          </div>
          <div>
            <Label>Data do recebimento *</Label>
            <Input type="date" value={dataRecebimento} onChange={e => setDataRecebimento(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Comprovante / Observação <span className="text-gray-400 font-normal">(opcional)</span></Label>
            <Input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Ex: PIX confirmado, comprovante #12345" className="mt-1" />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-2 text-xs text-blue-700">
            👤 Confirmado por: <strong>{currentUser?.full_name || currentUser?.email || "..."}</strong>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>❌ Cancelar</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleConfirmar} disabled={saving}>
              {saving ? "Salvando..." : "✅ Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
      return (all || []).filter(isMatriculaIndividual);
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
const LEGACY_TABS = ["dashboard", "cadastro", "acesso", "pagamentos", "gargalos", "pendencias", "contratos", "indicadores", "precadastros"];
const LEGACY_LABELS = {
  dashboard: "Dashboard PF (antigo)",
  cadastro: "Cadastro de Alunos",
  acesso: "Acesso ao Portal",
  pagamentos: "Pagamentos Asaas",
  gargalos: "Gargalos",
  pendencias: "Pendências Financeiras",
  contratos: "Contratos (lista antiga)",
  indicadores: "Desempenho de Atendentes",
  precadastros: "Pré-Cadastros",
};

export default function GestaoAlunosIndividuais() {
  const [activeTab, setActiveTab] = useState("visaogeral");
  const { hasPermission, allowedKeys } = usePermissions();
  // Verifica acesso ao módulo principal (chave nova ou legada)
  const moduleAccess =
    allowedKeys === null ||
    hasPermission("Gestão Acadêmica Individual") ||
    hasPermission("Alunos Individuais (PF)");

  // Permissões das abas seguem o acesso ao módulo
  const canAccessTab = useCallback(() => moduleAccess, [moduleAccess]);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">Gestão Acadêmica Individual</h1>
          <p className="text-gray-600 text-sm mt-1">
            Cadastro, Matrículas, Situação Financeira Operacional e Acesso ao Portal — Alunos Individuais
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col gap-2 mb-6">
            <TabsList className="grid w-full grid-cols-5 bg-gray-100 p-1 h-auto">
              <TabsTrigger value="visaogeral" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3">
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Visão Geral</span>
              </TabsTrigger>
              <TabsTrigger value="matriculas" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Matrículas</span>
              </TabsTrigger>
              <TabsTrigger value="vendas" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Cursos à Venda</span>
              </TabsTrigger>
              <TabsTrigger value="financeiro" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3">
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline">Financeiro Operacional</span>
              </TabsTrigger>
              <TabsTrigger value="relatorios" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3">
                <BarChartIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Relatórios</span>
              </TabsTrigger>
            </TabsList>
            <div className="flex justify-end">
              <Select value={LEGACY_TABS.includes(activeTab) ? activeTab : ""} onValueChange={setActiveTab}>
                <SelectTrigger className="w-72 h-8 text-xs text-gray-500 border-dashed">
                  <SelectValue placeholder="🗂 Módulos legados (homologação/compatibilidade)" />
                </SelectTrigger>
                <SelectContent>
                  {LEGACY_TABS.map(t => (
                    <SelectItem key={t} value={t} className="text-xs">{LEGACY_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="visaogeral">{canAccessTab("visaogeral") ? <VisaoGeralCentral /> : <SecaoBloqueada nome="Visão Geral" />}</TabsContent>
          <TabsContent value="dashboard">{canAccessTab("dashboard") ? <DashboardPF /> : <SecaoBloqueada nome="Dashboard" />}</TabsContent>
          <TabsContent value="cadastro">{canAccessTab("cadastro") ? <AlunosCadastro /> : <SecaoBloqueada nome="Cadastro" />}</TabsContent>
          <TabsContent value="matriculas">{canAccessTab("matriculas") ? <MatriculasCursos /> : <SecaoBloqueada nome="Matrículas" />}</TabsContent>
          <TabsContent value="financeiro">{canAccessTab("financeiro") ? <FinanceiroOperacionalTab /> : <SecaoBloqueada nome="Financeiro" />}</TabsContent>
          <TabsContent value="acesso">{canAccessTab("acesso") ? <AcessoPortal /> : <SecaoBloqueada nome="Controle de Acesso" />}</TabsContent>
          <TabsContent value="pagamentos">{canAccessTab("pagamentos") ? <PagamentosAsaas /> : <SecaoBloqueada nome="Pagamentos Asaas" />}</TabsContent>
          <TabsContent value="gargalos">{canAccessTab("gargalos") ? <GargalosDashboard /> : <SecaoBloqueada nome="Gargalos" />}</TabsContent>
          <TabsContent value="pendencias">{canAccessTab("pendencias") ? <PainelPendenciasFinanceiras /> : <SecaoBloqueada nome="Pendências" />}</TabsContent>
          <TabsContent value="contratos">{canAccessTab("contratos") ? <ContratosGeral /> : <SecaoBloqueada nome="Contratos" />}</TabsContent>
          <TabsContent value="vendas">{canAccessTab("vendas") ? <CursosVendaCentral /> : <SecaoBloqueada nome="Cursos à Venda" />}</TabsContent>
          <TabsContent value="indicadores">{canAccessTab("indicadores") ? <IndicadoresAtendenteTab /> : <SecaoBloqueada nome="Indicadores" />}</TabsContent>
          <TabsContent value="precadastros">{canAccessTab("precadastros") ? <PreCadastrosTab /> : <SecaoBloqueada nome="Pré-Cadastros" />}</TabsContent>
          <TabsContent value="relatorios">{canAccessTab("relatorios") ? <RelatoriosGerenciaisTab onNavigate={setActiveTab} /> : <SecaoBloqueada nome="Relatórios Gerenciais" />}</TabsContent>
        </Tabs>
      </div>
    </div>
  );
}