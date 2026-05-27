import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, User, BookOpen, UserPlus, ChevronRight, AlertTriangle } from "lucide-react";
import NovoCursoModal from "./NovoCursoModal";
import CadastroUnificado from "./CadastroUnificado";

export default function NovaMatriculaModal({ open, onClose, onSuccess }) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [foundStudent, setFoundStudent] = useState(null);
  const [showNovoCurso, setShowNovoCurso] = useState(false);
  const [showCadastro, setShowCadastro] = useState(false);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSearched(false);
      setFoundStudent(null);
      setShowNovoCurso(false);
      setShowCadastro(false);
    }
  }, [open]);

  const norm = (v) => (v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "").trim();

  const { data: students = [] } = useQuery({
    queryKey: ["students-pf"],
    queryFn: () => base44.entities.Student.list("-created_date", 500),
    initialData: [],
  });

  const { data: allEnrollments = [] } = useQuery({
    queryKey: ["enrollments-pf"],
    queryFn: async () => {
      const all = await base44.entities.StudentCourseEnrollment.list("-created_date", 500);
      return (all || []).filter(e => !e.company_id || e.company_id === "individual" || e.company_name === "Individual (PF)");
    },
    initialData: [],
  });

  const handleSearch = () => {
    const q = norm(query);
    if (!q) return;
    const found = students.find(s =>
      norm(s.full_name).includes(q) ||
      (s.cpf || "").replace(/\D/g, "").includes(query.replace(/\D/g, ""))
    );
    setFoundStudent(found || null);
    setSearched(true);
  };

  const studentEnrollments = foundStudent
    ? allEnrollments.filter(e => e.student_id === foundStudent.id)
    : [];

  // Enrollment sintético para NovoCursoModal baseado no aluno encontrado
  const syntheticEnrollment = foundStudent ? {
    student_id: foundStudent.id,
    student_name: foundStudent.full_name,
    student_cpf: foundStudent.cpf,
    student_email: foundStudent.email || "",
    student_phone: foundStudent.whatsapp || "",
  } : null;

  // Se abriu NovoCurso ou Cadastro, fechar o modal pai temporariamente
  if (showNovoCurso && syntheticEnrollment) {
    return (
      <NovoCursoModal
        open={true}
        onClose={() => setShowNovoCurso(false)}
        enrollment={syntheticEnrollment}
        onSuccess={() => { setShowNovoCurso(false); onSuccess?.(); onClose(); }}
      />
    );
  }

  if (showCadastro) {
    return (
      <CadastroUnificado
        open={true}
        onClose={() => { setShowCadastro(false); onSuccess?.(); onClose(); }}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gray-700" /> Nova Matrícula Individual (PF)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Busca */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Verificar se aluno já existe no sistema:</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Digite nome ou CPF..."
                  value={query}
                  onChange={e => { setQuery(e.target.value); setSearched(false); setFoundStudent(null); }}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button className="bg-gray-900 hover:bg-gray-800" onClick={handleSearch} disabled={!query.trim()}>
                <Search className="w-4 h-4 mr-1" /> Buscar
              </Button>
            </div>
          </div>

          {/* Resultado: aluno encontrado */}
          {searched && foundStudent && (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-green-700" />
                  <p className="font-semibold text-green-900">Aluno Encontrado</p>
                </div>
                <p className="text-sm font-medium text-gray-900">{foundStudent.full_name}</p>
                <p className="text-xs text-gray-500">CPF: {foundStudent.cpf}</p>
                {foundStudent.email && <p className="text-xs text-gray-500">{foundStudent.email}</p>}
                {foundStudent.whatsapp && <p className="text-xs text-gray-500">WhatsApp: {foundStudent.whatsapp}</p>}
              </div>

              {/* Cursos que já está matriculado */}
              {studentEnrollments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Cursos atuais ({studentEnrollments.length}):
                  </p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {studentEnrollments.map(e => (
                      <div key={e.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md border border-gray-100">
                        <div>
                          <p className="text-xs font-medium text-gray-800">{e.course_name}</p>
                          <p className="text-xs text-gray-400">{e.start_date} → {e.end_date}</p>
                        </div>
                        <Badge className={e.status === "Autorizado" || e.status === "Certificado Gerado"
                          ? "bg-green-100 text-green-700"
                          : e.status === "Aguardando Autorização"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                        }>
                          {e.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="w-full bg-blue-700 hover:bg-blue-800"
                onClick={() => setShowNovoCurso(true)}
              >
                <BookOpen className="w-4 h-4 mr-2" /> Matricular em Novo Curso
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            </div>
          )}

          {/* Resultado: aluno NÃO encontrado */}
          {searched && !foundStudent && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-800">Aluno não encontrado</p>
                  <p className="text-xs text-yellow-700 mt-0.5">Nenhum aluno com esse nome ou CPF foi localizado no sistema.</p>
                </div>
              </div>
              <Button
                className="w-full bg-gray-900 hover:bg-gray-800"
                onClick={() => setShowCadastro(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" /> Cadastrar Novo Aluno (4 etapas)
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}