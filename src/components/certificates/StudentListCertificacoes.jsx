/**
 * StudentListCertificacoes
 * Lista de alunos com foco em certificação:
 * - Botão "Gerar Certificado" (apenas Certificador/Admin)
 * - Edição de nome com LOG de auditoria
 * - Alteração de documento com modal e LOG
 */
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Plus, Pencil, Trash2, Users, Upload, Award, AlertTriangle, FileText
} from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import StudentForm from "@/components/students/StudentForm";
import StudentBulkImport from "@/components/students/StudentBulkImport";
import GerarCertificadoWizard from "./GerarCertificadoWizard";

const AUTHORIZED_ROLES = ["admin", "gestor_master", "Administrador Master", "Certificacao", "Certificação"];

const TIPOS_DOCUMENTO = ["CPF", "RG", "CNH", "Passaporte", "Outro número de registro"];

function generateCertCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `CAT-${new Date().getFullYear()}-${code}`;
}

// ── Modal editar nome ─────────────────────────────────────────────────────────
function EditarNomeModal({ student, onClose, onSaved }) {
  const [nome, setNome] = useState(student?.full_name || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nome.trim()) { toast.error("Nome não pode ser vazio."); return; }
    if (nome === student.full_name) { onClose(); return; }
    setSaving(true);
    try {
      await base44.entities.Student.update(student.id, { full_name: nome.trim() });
      const user = await base44.auth.me();
      await base44.entities.AuditLog.create({
        user_email: user?.email || "desconhecido",
        user_name: user?.full_name || user?.email || "desconhecido",
        action: "update",
        entity_type: "Student",
        entity_id: student.id,
        entity_name: student.full_name,
        details: `Nome alterado: "${student.full_name}" → "${nome.trim()}" em ${new Date().toLocaleString("pt-BR")}`,
      });
      toast.success("Nome atualizado e registrado no LOG.");
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="w-4 h-4" /> Corrigir Nome do Aluno</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">Atenção: o nome será impresso no certificado. Verifique com cuidado antes de salvar.</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Nome atual</Label>
            <p className="text-sm font-medium text-gray-700 mt-1">{student.full_name}</p>
          </div>
          <div>
            <Label>Novo nome *</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} className="mt-1" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button className="bg-gray-900 hover:bg-gray-800" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar correção"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Modal alterar documento ───────────────────────────────────────────────────
function AlterarDocumentoModal({ student, onClose, onSaved }) {
  const [tipoDoc, setTipoDoc] = useState("CPF");
  const [novoDoc, setNovoDoc] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!novoDoc.trim()) { toast.error("Informe o novo número do documento."); return; }
    if (!motivo.trim()) { toast.error("O motivo da alteração é obrigatório."); return; }
    setSaving(true);
    try {
      const docAnterior = student.cpf || student.rg || "—";
      const updateData = tipoDoc === "CPF" ? { cpf: novoDoc.trim() } : { rg: novoDoc.trim() };
      await base44.entities.Student.update(student.id, updateData);
      const user = await base44.auth.me();
      await base44.entities.AuditLog.create({
        user_email: user?.email || "desconhecido",
        user_name: user?.full_name || user?.email || "desconhecido",
        action: "update",
        entity_type: "Student",
        entity_id: student.id,
        entity_name: student.full_name,
        details: `Documento alterado: tipo="${tipoDoc}", anterior="${docAnterior}", novo="${novoDoc.trim()}". Motivo: "${motivo}". Em ${new Date().toLocaleString("pt-BR")}`,
      });
      toast.success("Documento atualizado e registrado no LOG.");
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="w-4 h-4" /> ⚠️ Alterar Documento</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <p className="text-sm text-gray-600">Aluno: <strong>{student.full_name}</strong></p>

          <div>
            <Label className="text-xs font-semibold mb-1 block">Tipo de documento</Label>
            <div className="space-y-1">
              {TIPOS_DOCUMENTO.map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input type="radio" name="tipoDoc" value={t} checked={tipoDoc === t} onChange={() => setTipoDoc(t)} className="accent-gray-800" />
                  {t}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-gray-500">Número atual</Label>
            <p className="text-sm font-medium text-gray-700 mt-0.5 font-mono">{student.cpf || student.rg || "—"}</p>
          </div>

          <div>
            <Label>Novo número *</Label>
            <Input value={novoDoc} onChange={e => setNovoDoc(e.target.value)} className="mt-1 font-mono" placeholder="Digite o número correto" />
          </div>

          <div>
            <Label>Motivo da alteração *</Label>
            <Input value={motivo} onChange={e => setMotivo(e.target.value)} className="mt-1" placeholder="Ex: Correção de digitação" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button className="bg-gray-900 hover:bg-gray-800" onClick={handleConfirm} disabled={saving}>
              {saving ? "Salvando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function StudentListCertificacoes() {
  const queryClient = useQueryClient();
  const { role } = usePermissions();
  const canGenerate = AUTHORIZED_ROLES.includes(role);

  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [importTab, setImportTab] = useState("individual");
  const [editNomeStudent, setEditNomeStudent] = useState(null);
  const [alterarDocStudent, setAlterarDocStudent] = useState(null);
  const [wizardEnrollment, setWizardEnrollment] = useState(null);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: () => base44.entities.Student.list("-created_date", 500),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["enrollments-cert-list"],
    queryFn: () => base44.entities.StudentCourseEnrollment.list("-created_date", 500),
    staleTime: 30_000,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("nome_fantasia", 100),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => base44.entities.Course.list("name", 500),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Student.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["students"] }); setModalOpen(false); setEditingStudent(null); toast.success("Aluno atualizado!"); },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Student.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["students"] }); setModalOpen(false); toast.success("Aluno cadastrado!"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Student.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["students"] }); toast.success("Aluno removido."); },
  });

  const handleSave = (form) => {
    if (editingStudent) updateMutation.mutate({ id: editingStudent.id, data: form });
    else createMutation.mutate(form);
  };

  // Matrícula apta para certificar por aluno
  const getAptaEnrollment = (studentId) =>
    enrollments.find(e => e.student_id === studentId && e.status === "Autorizado");

  const handleGerarCertificado = (student) => {
    const enrollment = getAptaEnrollment(student.id);
    if (!enrollment) {
      toast.warning("Este aluno não possui matrícula 'Autorizada' para certificar.");
      return;
    }
    setWizardEnrollment(enrollment);
  };

  const uniqueCompanies = [...new Set(students.map(s => s.company_name).filter(Boolean))].sort();

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      s.full_name?.toLowerCase().includes(q) ||
      s.cpf?.includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.whatsapp?.includes(q) ||
      s.company_name?.toLowerCase().includes(q);
    const matchCompany = !filterCompany || s.company_name === filterCompany;
    return matchSearch && matchCompany;
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["students"] });
    queryClient.invalidateQueries({ queryKey: ["enrollments-cert-list"] });
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-gray-500">Total de Alunos</p><p className="text-2xl font-bold text-gray-900">{students.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-gray-500">Ativos</p><p className="text-2xl font-bold text-green-600">{students.filter(s => s.status === "Ativo").length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-gray-500">Aptos para Certificar</p><p className="text-2xl font-bold text-amber-600">{enrollments.filter(e => e.status === "Autorizado").length}</p></CardContent></Card>
      </div>

      {/* Filtros + Ações */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar por nome, CPF, e-mail..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}
          className="border border-gray-200 rounded-md text-sm px-3 py-2 text-gray-700 bg-white">
          <option value="">Todas as empresas</option>
          {uniqueCompanies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <Button onClick={() => { setEditingStudent(null); setImportTab("individual"); setModalOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Aluno
        </Button>
        <Button variant="outline" onClick={() => { setEditingStudent(null); setImportTab("massa"); setModalOpen(true); }} className="gap-2">
          <Upload className="w-4 h-4" /> Importar em Massa
        </Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" /><p>Nenhum aluno encontrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Aluno</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">CPF</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Empresa</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Certificação</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(s => {
                const aptaEnrollment = getAptaEnrollment(s.id);
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{s.full_name}</div>
                      <div className="text-xs text-gray-400">{s.email || s.whatsapp || ""}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell font-mono text-xs">{s.cpf}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{s.company_name || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={s.status === "Ativo" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>{s.status}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {aptaEnrollment ? (
                        <Badge className="bg-amber-100 text-amber-800 text-xs">🟡 Apto para Certificar</Badge>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {/* Gerar Certificado — apenas roles autorizadas */}
                        {canGenerate && aptaEnrollment && (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 gap-1"
                            onClick={() => handleGerarCertificado(s)}>
                            <Award className="w-3 h-3" /> Gerar
                          </Button>
                        )}
                        {/* Editar dados */}
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-blue-600 hover:text-blue-800"
                          onClick={() => setEditNomeStudent(s)} title="Corrigir nome">
                          <Pencil className="w-3 h-3" /> Nome
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-purple-600 hover:text-purple-800"
                          onClick={() => setAlterarDocStudent(s)} title="Alterar documento">
                          <FileText className="w-3 h-3" /> Doc
                        </Button>
                        {/* Editar completo */}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={() => { setEditingStudent(s); setImportTab("individual"); setModalOpen(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500"
                          onClick={() => { if (confirm("Remover este aluno?")) deleteMutation.mutate(s.id); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal cadastro/edição */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) { setModalOpen(false); setEditingStudent(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStudent ? "Editar Aluno" : "Cadastrar Aluno"}</DialogTitle>
          </DialogHeader>
          {!editingStudent ? (
            <Tabs value={importTab} onValueChange={setImportTab}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="individual">Cadastro Individual</TabsTrigger>
                <TabsTrigger value="massa">Importação em Massa</TabsTrigger>
              </TabsList>
              <TabsContent value="individual" className="mt-4">
                <StudentForm companies={companies} courses={courses} onSave={handleSave} onCancel={() => setModalOpen(false)} />
              </TabsContent>
              <TabsContent value="massa" className="mt-4">
                <StudentBulkImport companies={companies} courses={courses} onSuccess={() => { setModalOpen(false); queryClient.invalidateQueries({ queryKey: ["students"] }); }} />
              </TabsContent>
            </Tabs>
          ) : (
            <StudentForm companies={companies} courses={courses} initialData={editingStudent} onSave={handleSave}
              onCancel={() => { setModalOpen(false); setEditingStudent(null); }} />
          )}
        </DialogContent>
      </Dialog>

      {/* Modais de edição de dados */}
      {editNomeStudent && (
        <EditarNomeModal student={editNomeStudent} onClose={() => setEditNomeStudent(null)} onSaved={invalidate} />
      )}
      {alterarDocStudent && (
        <AlterarDocumentoModal student={alterarDocStudent} onClose={() => setAlterarDocStudent(null)} onSaved={invalidate} />
      )}

      {/* Wizard de certificado */}
      {wizardEnrollment && (
        <GerarCertificadoWizard
          enrollment={wizardEnrollment}
          onConfirm={() => { setWizardEnrollment(null); invalidate(); }}
          onCancel={() => setWizardEnrollment(null)}
        />
      )}
    </div>
  );
}