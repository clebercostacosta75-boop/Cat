import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Pencil, Trash2, Users, Upload } from "lucide-react";
import { toast } from "sonner";
import StudentForm from "./StudentForm";
import StudentBulkImport from "./StudentBulkImport";
import PortalAccessButton from "@/components/invites/PortalAccessButton";

export default function StudentList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [importTab, setImportTab] = useState("individual");

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: () => base44.entities.Student.list("-created_date", 500),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("nome_fantasia", 100),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => base44.entities.Course.list("name", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Student.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setModalOpen(false);
      toast.success("Aluno cadastrado com sucesso!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Student.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setModalOpen(false);
      setEditingStudent(null);
      toast.success("Aluno atualizado!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Student.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Aluno removido.");
    },
  });

  const handleSave = (form) => {
    if (editingStudent) {
      updateMutation.mutate({ id: editingStudent.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setImportTab("individual");
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingStudent(null);
    setImportTab("individual");
    setModalOpen(true);
  };

  const uniqueCompanies = [...new Set(students.map(s => s.company_name).filter(Boolean))].sort();

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      s.full_name?.toLowerCase().includes(q) ||
      s.cpf?.includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.whatsapp?.includes(q) ||
      s.company_name?.toLowerCase().includes(q) ||
      s.course_name?.toLowerCase().includes(q);
    const matchCompany = !filterCompany || s.company_name === filterCompany;
    return matchSearch && matchCompany;
  });

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500">Total de Alunos</p>
            <p className="text-2xl font-bold text-gray-900">{students.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500">Ativos</p>
            <p className="text-2xl font-bold text-green-600">{students.filter(s => s.status === "Ativo").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500">Empresas</p>
            <p className="text-2xl font-bold text-blue-600">{uniqueCompanies.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros + Ação */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome, CPF, e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterCompany}
          onChange={e => setFilterCompany(e.target.value)}
          className="border border-gray-200 rounded-md text-sm px-3 py-2 text-gray-700 bg-white"
        >
          <option value="">Todas as empresas</option>
          {uniqueCompanies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <Button onClick={handleNew} className="gap-2">
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
          <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p>Nenhum aluno encontrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Aluno</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">CPF</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Empresa</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Curso</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{s.full_name}</div>
                    <div className="text-xs text-gray-400">{s.email || s.whatsapp || ""}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell font-mono text-xs">{s.cpf}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{s.company_name || "—"}</td>
                  <td className="px-4 py-3 text-gray-600 hidden lg:table-cell text-xs">{s.course_name || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className={s.status === "Ativo" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                      {s.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <PortalAccessButton portalType="Aluno" entityId={s.id} name={s.full_name} email={s.email} phone={s.whatsapp} size="sm" variant="ghost" />
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEdit(s)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-500"
                        onClick={() => { if (confirm("Remover este aluno?")) deleteMutation.mutate(s.id); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal cadastro/edição/importação */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) { setModalOpen(false); setEditingStudent(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStudent ? "Editar Aluno" : "Cadastrar Aluno"}
            </DialogTitle>
          </DialogHeader>

          {!editingStudent ? (
            <Tabs value={importTab} onValueChange={setImportTab}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="individual">Cadastro Individual</TabsTrigger>
                <TabsTrigger value="massa">Importação em Massa</TabsTrigger>
              </TabsList>
              <TabsContent value="individual" className="mt-4">
                <StudentForm
                  companies={companies}
                  courses={courses}
                  onSave={handleSave}
                  onCancel={() => setModalOpen(false)}
                />
              </TabsContent>
              <TabsContent value="massa" className="mt-4">
                <StudentBulkImport
                  companies={companies}
                  courses={courses}
                  onSuccess={() => {
                    setModalOpen(false);
                    queryClient.invalidateQueries({ queryKey: ["students"] });
                  }}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <StudentForm
              companies={companies}
              courses={courses}
              initialData={editingStudent}
              onSave={handleSave}
              onCancel={() => { setModalOpen(false); setEditingStudent(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}