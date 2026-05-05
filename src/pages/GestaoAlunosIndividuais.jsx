import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  CheckCircle, XCircle, Clock, Lock, Unlock, AlertTriangle, Plus, Eye
} from "lucide-react";
import { toast } from "sonner";

// ─── Aba: Cadastro de Alunos ─────────────────────────────────────────────────
function AlunosCadastro() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState({ full_name: "", cpf: "", email: "", whatsapp: "", status: "Ativo", notes: "" });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students-pf"],
    queryFn: () => base44.entities.Student.list("-created_date"),
    initialData: [],
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => base44.entities.Course.list(),
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

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Student.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["students-pf"] }); toast.success("Aluno removido!"); },
  });

  const openNew = () => {
    setEditingStudent(null);
    setForm({ full_name: "", cpf: "", email: "", whatsapp: "", status: "Ativo", notes: "" });
    setModalOpen(true);
  };

  const openEdit = (student) => {
    setEditingStudent(student);
    setForm({ full_name: student.full_name, cpf: student.cpf, email: student.email || "", whatsapp: student.whatsapp || "", status: student.status || "Ativo", notes: student.notes || "" });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.full_name || !form.cpf) { toast.error("Nome e CPF são obrigatórios"); return; }
    if (editingStudent) updateMutation.mutate({ id: editingStudent.id, data: form });
    else createMutation.mutate(form);
  };

  const filtered = students.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.cpf?.includes(search) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar por nome, CPF ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={openNew} className="bg-gray-900 hover:bg-gray-800">
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
              <p>Nenhum aluno encontrado</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(student => (
                <div key={student.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div>
                    <p className="font-semibold text-gray-900">{student.full_name}</p>
                    <p className="text-sm text-gray-500">CPF: {student.cpf} {student.email && `• ${student.email}`}</p>
                    {student.whatsapp && <p className="text-xs text-gray-400">WhatsApp: {student.whatsapp}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={student.status === "Ativo" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {student.status || "Ativo"}
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(student)}><Edit className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => deleteMutation.mutate(student.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingStudent ? "Editar Aluno" : "Novo Aluno (PF)"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome Completo *</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>CPF *</Label><Input value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" /></div>
            <div><Label>E-mail</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="(91) 99999-9999" /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Observações</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button className="bg-gray-900 hover:bg-gray-800" onClick={handleSave}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Aba: Matrículas em Cursos ───────────────────────────────────────────────
function MatriculasCursos() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    student_id: "", student_name: "", student_cpf: "", student_email: "", student_phone: "",
    course_id: "", course_name: "", company_id: "individual", company_name: "Individual (PF)",
    start_date: "", end_date: "", status: "Aguardando Autorização", notes: ""
  });

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["enrollments-pf"],
    queryFn: () => base44.entities.StudentCourseEnrollment.filter({ company_name: "Individual (PF)" }),
    initialData: [],
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-pf"],
    queryFn: () => base44.entities.Student.list(),
    initialData: [],
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => base44.entities.Course.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StudentCourseEnrollment.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] }); toast.success("Matrícula criada!"); setModalOpen(false); },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.StudentCourseEnrollment.update(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] }); toast.success("Status atualizado!"); },
  });

  const handleStudentChange = (studentId) => {
    const s = students.find(s => s.id === studentId);
    if (s) setForm(f => ({ ...f, student_id: s.id, student_name: s.full_name, student_cpf: s.cpf, student_email: s.email || "", student_phone: s.whatsapp || "" }));
  };

  const handleCourseChange = (courseId) => {
    const c = courses.find(c => c.id === courseId);
    if (c) setForm(f => ({ ...f, course_id: c.id, course_name: c.name }));
  };

  const statusColors = {
    "Aguardando Autorização": "bg-yellow-100 text-yellow-800",
    "Autorizado": "bg-blue-100 text-blue-800",
    "Certificado Gerado": "bg-green-100 text-green-800",
    "Assinado": "bg-emerald-100 text-emerald-800",
    "Vencido": "bg-red-100 text-red-800",
    "Revogado": "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModalOpen(true)} className="bg-gray-900 hover:bg-gray-800">
          <Plus className="w-4 h-4 mr-2" /> Nova Matrícula
        </Button>
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Carregando...</div>
          ) : enrollments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhuma matrícula individual encontrada</p>
            </div>
          ) : (
            <div className="divide-y">
              {enrollments.map(e => (
                <div key={e.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div>
                    <p className="font-semibold text-gray-900">{e.student_name}</p>
                    <p className="text-sm text-gray-500">{e.course_name}</p>
                    <p className="text-xs text-gray-400">{e.start_date} → {e.end_date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={statusColors[e.status] || "bg-gray-100 text-gray-800"}>{e.status}</Badge>
                    {e.status === "Aguardando Autorização" && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs" onClick={() => updateStatusMutation.mutate({ id: e.id, status: "Autorizado" })}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Autorizar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Matrícula Individual (PF)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Aluno *</Label>
              <Select value={form.student_id} onValueChange={handleStudentChange}>
                <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name} — {s.cpf}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Curso *</Label>
              <Select value={form.course_id} onValueChange={handleCourseChange}>
                <SelectTrigger><SelectValue placeholder="Selecione o curso" /></SelectTrigger>
                <SelectContent>
                  {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data Início *</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>Data Fim *</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div><Label>Observações</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button className="bg-gray-900 hover:bg-gray-800" onClick={() => createMutation.mutate(form)}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Aba: Financeiro ─────────────────────────────────────────────────────────
function FinanceiroAlunos() {
  const { data: enrollments = [] } = useQuery({
    queryKey: ["enrollments-pf"],
    queryFn: () => base44.entities.StudentCourseEnrollment.filter({ company_name: "Individual (PF)" }),
    initialData: [],
  });

  const total = enrollments.length;
  const autorizados = enrollments.filter(e => ["Autorizado", "Certificado Gerado", "Assinado"].includes(e.status)).length;
  const aguardando = enrollments.filter(e => e.status === "Aguardando Autorização").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <BookOpen className="w-6 h-6 text-blue-600 mb-2" />
            <p className="text-2xl font-bold text-black">{total}</p>
            <p className="text-sm text-gray-600">Total de Matrículas PF</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
            <p className="text-2xl font-bold text-black">{autorizados}</p>
            <p className="text-sm text-gray-600">Autorizadas / Concluídas</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <Clock className="w-6 h-6 text-yellow-600 mb-2" />
            <p className="text-2xl font-bold text-black">{aguardando}</p>
            <p className="text-sm text-gray-600">Aguardando Autorização</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200">
        <CardHeader className="bg-gray-50">
          <CardTitle className="text-base font-semibold">Resumo Financeiro por Aluno</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {enrollments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhuma matrícula individual registrada</p>
            </div>
          ) : (
            <div className="divide-y">
              {enrollments.map(e => (
                <div key={e.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold text-gray-900">{e.student_name}</p>
                    <p className="text-sm text-gray-500">{e.course_name}</p>
                  </div>
                  <Badge className={e.status === "Aguardando Autorização" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}>
                    {e.status}
                  </Badge>
                </div>
              ))}
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

  const isMaster = userRole === "admin" || userRole === "Administrador Master";

  const filtered = students.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.cpf?.includes(search)
  );

  return (
    <div className="space-y-4">
      {!isMaster && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            <strong>Atenção:</strong> Liberação ou bloqueio de acesso ao portal requer autorização do Gestor Master.
            As ações aqui refletem as permissões concedidas pelo gestor responsável.
          </p>
        </div>
      )}

      {isMaster && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            <strong>Gestor Master:</strong> Você tem permissão para liberar ou bloquear o acesso dos alunos ao portal.
          </p>
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
                        {ativo ? (
                          <><Unlock className="w-3 h-3 mr-1 inline" /> Acesso Liberado</>
                        ) : (
                          <><Lock className="w-3 h-3 mr-1 inline" /> Acesso Bloqueado</>
                        )}
                      </Badge>
                      {isMaster && (
                        <Button
                          size="sm"
                          variant="outline"
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

// ─── Página Principal ────────────────────────────────────────────────────────
export default function GestaoAlunosIndividuais() {
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
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-gray-100 p-1 h-auto">
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
          </TabsList>

          <TabsContent value="cadastro"><AlunosCadastro /></TabsContent>
          <TabsContent value="matriculas"><MatriculasCursos /></TabsContent>
          <TabsContent value="financeiro"><FinanceiroAlunos /></TabsContent>
          <TabsContent value="acesso"><AcessoPortal /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}