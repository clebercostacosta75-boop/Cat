import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, CheckCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { isMatriculaEmpresarial } from "@/lib/origemMatricula";
import ResultadoAcademicoModal from "@/components/alunos/ResultadoAcademicoModal";
import ImportarAlunosPlanilha from "@/components/alunos/ImportarAlunosPlanilha";

const STATUS_COLORS = {
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

export default function MatriculasEmpresariaisTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [resultadoEnrollment, setResultadoEnrollment] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    base44.auth.me().then((u) => setUserRole(u?.role || "user")).catch(() => {});
  }, []);

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["enrollments-emp"],
    queryFn: async () => {
      const all = await base44.entities.StudentCourseEnrollment.list("-created_date", 500);
      return (all || []).filter(isMatriculaEmpresarial);
    },
    staleTime: 0,
    gcTime: 0,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StudentCourseEnrollment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments-emp"] });
      toast.success("Status atualizado!");
    },
  });

  // SPR-2A: solicitação de liberação financeira ao módulo Financeiro (origem Empresa)
  const solicitarLiberacao = async (e) => {
    try {
      const user = await base44.auth.me().catch(() => null);
      const pendentes = await base44.entities.SolicitacaoLiberacaoFinanceira.filter({
        enrollment_id: e.id,
        status_solicitacao: "Pendente",
      });
      if (pendentes.length > 0) {
        toast.info("Já existe uma solicitação pendente para esta matrícula.");
        return;
      }
      const agora = new Date().toISOString();
      await base44.entities.SolicitacaoLiberacaoFinanceira.create({
        enrollment_id: e.id,
        student_id: e.student_id || "",
        student_name: e.student_name,
        course_id: e.course_id || "",
        course_name: e.course_name,
        company_id: e.company_id || "",
        company_name: e.company_name || "",
        origem_matricula: "Empresa",
        status_solicitacao: "Pendente",
        motivo_solicitacao: "Solicitação de liberação financeira para certificação (matrícula empresarial)",
        solicitado_por: user?.email || "desconhecido",
        solicitado_em: agora,
        status_financeiro_no_momento: e.status_pagamento || "—",
      });
      await base44.entities.AuditLog.create({
        user_email: user?.email || "desconhecido",
        user_name: user?.full_name || user?.email || "desconhecido",
        action: "create",
        entity_type: "SolicitacaoLiberacaoFinanceira",
        entity_id: e.id,
        entity_name: `${e.student_name} — ${e.course_name}`,
        company_id: e.company_id || "",
        company_name: e.company_name || "",
        details: `SOLICITAÇÃO DE LIBERAÇÃO FINANCEIRA criada em ${new Date().toLocaleString("pt-BR")}. Origem: Empresa (${e.company_name}). ANTES: certificação bloqueada por financeiro. DEPOIS: aguardando análise do Financeiro (sem liberação automática).`,
      });
      toast.success("Solicitação enviada ao Financeiro para análise.");
    } catch (err) {
      toast.error("Erro ao criar solicitação: " + err.message);
    }
  };

  const handleAutorizar = (e) => {
    if (e.resultado_academico !== "Aprovado") {
      toast.error("Defina o Resultado Acadêmico como Aprovado antes de autorizar a certificação.");
      setResultadoEnrollment(e);
      return;
    }
    updateStatusMutation.mutate({ id: e.id, data: { status: "Autorizado", authorized_at: new Date().toISOString() } });
  };

  const companies = [...new Map(enrollments.map((e) => [e.company_id, e.company_name])).entries()];

  const norm = (v) => (v || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const filtered = enrollments.filter((e) => {
    const byCompany = filterCompany === "all" || e.company_id === filterCompany;
    const byStatus = filterStatus === "all" || e.status === filterStatus;
    const bySearch = !search || norm(e.student_name).includes(norm(search)) || norm(e.student_cpf).includes(norm(search));
    return byCompany && byStatus && bySearch;
  });

  return (
    <div className="space-y-4">
      {resultadoEnrollment && (
        <ResultadoAcademicoModal
          enrollment={resultadoEnrollment}
          onClose={() => setResultadoEnrollment(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["enrollments-emp"] })}
        />
      )}

      <ImportarAlunosPlanilha
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => queryClient.invalidateQueries({ queryKey: ["enrollments-emp"] })}
      />

      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar aluno por nome ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button variant="outline" onClick={() => setImportOpen(true)} className="border-emerald-400 text-emerald-800 hover:bg-emerald-50">
          <Upload className="w-4 h-4 mr-2" /> Importar Alunos por Planilha
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={filterCompany} onValueChange={setFilterCompany}>
          <SelectTrigger className="w-60"><SelectValue placeholder="Filtrar por empresa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as empresas</SelectItem>
            {companies.map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Status da matrícula" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.keys(STATUS_COLORS).map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-500 self-center ml-auto">
          {filtered.length} de {enrollments.length} matrícula(s) empresarial(is)
        </span>
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhuma matrícula empresarial encontrada</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((e) => (
                <div key={e.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{e.student_name}</p>
                        {e.student_cpf && <span className="text-xs text-gray-400 font-mono">{e.student_cpf}</span>}
                      </div>
                      <p className="text-sm text-gray-600 font-medium mt-0.5">{e.course_name}</p>
                      <p className="text-xs text-blue-700 font-medium">🏢 {e.company_name}</p>
                      <p className="text-xs text-gray-400">{e.start_date} → {e.end_date}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge className={`text-xs ${STATUS_COLORS[e.status] || "bg-gray-100 text-gray-800"}`}>{e.status}</Badge>
                        <Badge className={`text-xs ${RESULTADO_COLORS[e.resultado_academico] || "bg-gray-100 text-gray-500"}`}>
                          🎓 {e.resultado_academico || "Sem resultado"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <Button size="sm" variant="outline"
                        className="text-xs h-7 border-indigo-300 text-indigo-700 hover:bg-indigo-50 w-full"
                        onClick={() => setResultadoEnrollment(e)}>
                        🎓 Resultado
                      </Button>
                      <Button size="sm" variant="outline"
                        className="text-xs h-7 border-emerald-300 text-emerald-700 hover:bg-emerald-50 w-full"
                        onClick={() => solicitarLiberacao(e)}>
                        💰 Solicitar liberação
                      </Button>
                      {e.status === "Aguardando Autorização" && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 w-full"
                          onClick={() => handleAutorizar(e)} disabled={updateStatusMutation.isPending}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Autorizar
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