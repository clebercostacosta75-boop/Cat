import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, CheckCircle2, Clock, Award, AlertTriangle, XCircle, Edit2, Trash2 } from "lucide-react";
import { format, parseISO, isAfter } from "date-fns";
import EnrollmentForm from "./EnrollmentForm";

const STATUS_CONFIG = {
  "Aguardando Autorização": { label: "Aguardando Autorização", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  "Autorizado": { label: "Autorizado", color: "bg-blue-100 text-blue-800", icon: CheckCircle2 },
  "Certificado Gerado": { label: "Certificado Gerado", color: "bg-purple-100 text-purple-800", icon: Award },
  "Assinado": { label: "Assinado", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  "Vencido": { label: "Vencido", color: "bg-red-100 text-red-800", icon: AlertTriangle },
  "Revogado": { label: "Revogado", color: "bg-gray-100 text-gray-800", icon: XCircle }
};

export default function EnrollmentList() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["enrollments"],
    queryFn: () => base44.entities.StudentCourseEnrollment.list("-created_date", 100)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StudentCourseEnrollment.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["enrollments"])
  });

  const filtered = enrollments.filter(e =>
    [e.student_name, e.course_name, e.company_name, e.instructor_name]
      .some(v => v && v.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = {
    total: enrollments.length,
    aguardando: enrollments.filter(e => e.status === "Aguardando Autorização").length,
    assinados: enrollments.filter(e => e.status === "Assinado").length,
    vencendo: enrollments.filter(e => {
      if (!e.valid_until) return false;
      const diff = (new Date(e.valid_until) - new Date()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 90;
    }).length
  };

  return (
    <div className="space-y-4">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Matrículas", value: stats.total, color: "bg-blue-50 text-blue-700" },
          { label: "Aguardando Autorização", value: stats.aguardando, color: "bg-yellow-50 text-yellow-700" },
          { label: "Assinados", value: stats.assinados, color: "bg-green-50 text-green-700" },
          { label: "Vencendo em 90 dias", value: stats.vencendo, color: "bg-orange-50 text-orange-700" }
        ].map(c => (
          <div key={c.label} className={`rounded-lg p-3 ${c.color}`}>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Busca e ação */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por aluno, curso, empresa..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Matrícula
        </Button>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Aluno / CPF</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Curso</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Empresa</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Início</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimento</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhuma matrícula encontrada.</td></tr>
            )}
            {filtered.map(e => {
              const cfg = STATUS_CONFIG[e.status] || STATUS_CONFIG["Aguardando Autorização"];
              const Icon = cfg.icon;
              const isExpiring = e.valid_until && (() => {
                const diff = (new Date(e.valid_until) - new Date()) / (1000 * 60 * 60 * 24);
                return diff >= 0 && diff <= 30;
              })();
              return (
                <tr key={e.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{e.student_name}</div>
                    <div className="text-xs text-gray-400">{e.student_cpf}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate">{e.course_name}</td>
                  <td className="px-4 py-3 text-gray-600">{e.company_name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {e.start_date ? format(parseISO(e.start_date), "dd/MM/yyyy") : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={isExpiring ? "text-red-600 font-semibold" : "text-gray-600"}>
                      {e.valid_until ? format(parseISO(e.valid_until), "dd/MM/yyyy") : "-"}
                    </span>
                    {isExpiring && <span className="ml-1 text-xs text-red-500">⚠ Vencendo</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (confirm(`Excluir matrícula de ${e.student_name}?`)) {
                          deleteMutation.mutate(e.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Dialog nova matrícula */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Realização de Curso</DialogTitle>
          </DialogHeader>
          <EnrollmentForm
            onSuccess={() => {
              setShowForm(false);
              queryClient.invalidateQueries(["enrollments"]);
            }}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}