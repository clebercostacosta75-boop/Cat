import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, DollarSign, CheckCircle, Clock, FileText, Send, Unlock, CreditCard, Calendar } from "lucide-react";
import { toast } from "sonner";
import { isMatriculaIndividual } from "@/lib/origemMatricula";
import ReciboPagamento from "@/components/financeiro/ReciboPagamento";

const fmtDate = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—");

// Situação financeira operacional da matrícula (sem valores consolidados)
export function situacaoFinanceira(e, todayStr) {
  if (e.status_pagamento === "Pago") return { label: "Pago", cls: "bg-green-100 text-green-800" };
  if (e.status_pagamento === "Inadimplente") return { label: "Bloqueado", cls: "bg-red-100 text-red-800" };
  if (e.data_vencimento_pagamento && e.data_vencimento_pagamento < todayStr)
    return { label: "Vencido", cls: "bg-red-100 text-red-700" };
  if (e.status_pagamento === "Parcialmente Pago") return { label: "Em análise", cls: "bg-blue-100 text-blue-800" };
  return { label: "Pendente", cls: "bg-yellow-100 text-yellow-800" };
}

export function statusCertificacaoFinanceiro(situacao) {
  if (situacao === "Pago") return { label: "Liberado", cls: "bg-emerald-100 text-emerald-800" };
  if (situacao === "Vencido" || situacao === "Bloqueado")
    return { label: "Bloqueado por financeiro", cls: "bg-red-100 text-red-700" };
  return { label: "Em análise", cls: "bg-yellow-100 text-yellow-800" };
}

export default function FinanceiroOperacionalTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterSituacao, setFilterSituacao] = useState("all");
  const [reciboEnrollment, setReciboEnrollment] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["enrollments-pf"],
    queryFn: async () => {
      const all = await base44.entities.StudentCourseEnrollment.list("-created_date", 500);
      return (all || []).filter(isMatriculaIndividual);
    },
    staleTime: 0,
    gcTime: 0,
  });

  const todayStr = new Date().toISOString().split("T")[0];

  // SPR-2A: cria solicitação real na fila do Financeiro (não libera automaticamente)
  const criarSolicitacao = useMutation({
    mutationFn: async ({ enrollment, motivo }) => {
      const pendentes = await base44.entities.SolicitacaoLiberacaoFinanceira.filter({
        enrollment_id: enrollment.id,
        status_solicitacao: "Pendente",
      });
      if (pendentes.length > 0) throw new Error("Já existe uma solicitação pendente para esta matrícula.");
      const agora = new Date().toISOString();
      const quem = currentUser?.email || "desconhecido";
      const sit = situacaoFinanceira(enrollment, todayStr).label;
      await base44.entities.SolicitacaoLiberacaoFinanceira.create({
        enrollment_id: enrollment.id,
        student_id: enrollment.student_id || "",
        student_name: enrollment.student_name,
        course_id: enrollment.course_id || "",
        course_name: enrollment.course_name,
        company_id: "",
        company_name: "",
        origem_matricula: "Individual",
        status_solicitacao: "Pendente",
        motivo_solicitacao: motivo,
        solicitado_por: quem,
        solicitado_em: agora,
        status_financeiro_no_momento: sit,
      });
      await base44.entities.AuditLog.create({
        user_email: quem,
        user_name: currentUser?.full_name || quem,
        action: "create",
        entity_type: "SolicitacaoLiberacaoFinanceira",
        entity_id: enrollment.id,
        entity_name: `${enrollment.student_name} — ${enrollment.course_name}`,
        details: `SOLICITAÇÃO DE LIBERAÇÃO FINANCEIRA criada em ${new Date().toLocaleString("pt-BR")}. Origem: Individual. Situação financeira: ${sit}. Motivo: ${motivo}. ANTES: certificação bloqueada por financeiro. DEPOIS: aguardando análise do Financeiro (sem liberação automática).`,
      });
    },
    onSuccess: () => toast.success("Solicitação enviada ao Financeiro para análise."),
    onError: (e) => toast.error(e.message),
  });

  const handleSolicitarLiberacao = (e) => {
    criarSolicitacao.mutate({ enrollment: e, motivo: "Solicitação de liberação financeira para certificação" });
  };

  const handleEncaminharFinanceiro = (e) => {
    criarSolicitacao.mutate({ enrollment: e, motivo: "Matrícula encaminhada para análise do Financeiro" });
  };

  const registrarAcao = criarSolicitacao;

  const norm = (v) => (v || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const filtered = enrollments.filter((e) => {
    const sit = situacaoFinanceira(e, todayStr).label;
    const bySit = filterSituacao === "all" || sit === filterSituacao;
    const bySearch = !search || norm(e.student_name).includes(norm(search)) || norm(e.student_cpf).includes(norm(search));
    return bySit && bySearch;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        <DollarSign className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          Visão <strong>operacional</strong> por aluno/matrícula. Valores consolidados, receitas e indicadores
          gerenciais estão disponíveis apenas no módulo <strong>💰 Financeiro</strong>.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar aluno por nome ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterSituacao} onValueChange={setFilterSituacao}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Situação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as situações</SelectItem>
            <SelectItem value="Pago">🟢 Pago</SelectItem>
            <SelectItem value="Pendente">🟡 Pendente</SelectItem>
            <SelectItem value="Vencido">🔴 Vencido</SelectItem>
            <SelectItem value="Em análise">🔵 Em análise</SelectItem>
            <SelectItem value="Bloqueado">⛔ Bloqueado</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-500 self-center ml-auto">{filtered.length} matrícula(s)</span>
      </div>

      <Card className="border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-600" /> Situação Financeira por Aluno
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhuma matrícula encontrada</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((e) => {
                const sit = situacaoFinanceira(e, todayStr);
                const cert = statusCertificacaoFinanceiro(sit.label);
                const isOpen = reciboEnrollment?.id === e.id;
                return (
                  <div key={e.id}>
                    <div className="flex items-start justify-between p-4 gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{e.student_name}</p>
                        <p className="text-sm text-gray-600">{e.course_name}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-500">
                          {e.forma_pagamento && (
                            <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> {e.forma_pagamento}</span>
                          )}
                          {e.data_vencimento_pagamento && (
                            <span className={`flex items-center gap-1 font-medium ${sit.label === "Vencido" ? "text-red-600" : ""}`}>
                              <Calendar className="w-3 h-3" /> Próx. vencimento: {fmtDate(e.data_vencimento_pagamento)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge className={`text-xs ${sit.cls}`}>💰 {sit.label}</Badge>
                          <Badge className={`text-xs ${cert.cls}`}>🎓 Certificação: {cert.label}</Badge>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {sit.label !== "Pago" && (
                          <Button size="sm" variant="outline"
                            className="text-xs h-7 border-emerald-300 text-emerald-700 hover:bg-emerald-50 w-full"
                            onClick={() => handleSolicitarLiberacao(e)} disabled={registrarAcao.isPending}>
                            <Unlock className="w-3 h-3 mr-1" /> Solicitar liberação financeira
                          </Button>
                        )}
                        <Button size="sm" variant="outline"
                          className="text-xs h-7 border-blue-300 text-blue-700 hover:bg-blue-50 w-full"
                          onClick={() => handleEncaminharFinanceiro(e)} disabled={registrarAcao.isPending}>
                          <Send className="w-3 h-3 mr-1" /> Encaminhar para Financeiro
                        </Button>
                        <Button size="sm" variant="outline"
                          className={`text-xs h-7 w-full ${isOpen ? "border-gray-400 text-gray-700" : "border-green-300 text-green-700 hover:bg-green-50"}`}
                          onClick={() => setReciboEnrollment(isOpen ? null : e)}>
                          <FileText className="w-3 h-3 mr-1" /> {isOpen ? "Fechar" : "Recibos"}
                        </Button>
                      </div>
                    </div>
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