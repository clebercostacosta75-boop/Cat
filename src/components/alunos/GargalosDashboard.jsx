import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, FileText, Award, UserX, Loader2 } from "lucide-react";

function GargaloCard({ icon: Icon, title, count, color, items, emptyText }) {
  return (
    <Card className={`border-l-4 ${color}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className="w-4 h-4" /> {title}
          <Badge className="ml-auto bg-gray-100 text-gray-800">{count}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-gray-400">{emptyText}</p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {items.slice(0, 8).map((item, i) => (
              <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                <span className="text-gray-700 truncate">{item.label}</span>
                <span className="text-gray-400 flex-shrink-0 ml-2">{item.sub}</span>
              </div>
            ))}
            {items.length > 8 && (
              <p className="text-xs text-gray-400 pt-1">+{items.length - 8} mais...</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function GargalosDashboard() {
  const { data: enrollments = [], isLoading: loadEnroll } = useQuery({
    queryKey: ["enrollments-pf-gargalos"],
    queryFn: () => base44.entities.StudentCourseEnrollment.filter({ company_name: "Individual (PF)" }),
    initialData: [],
  });

  const { data: contracts = [], isLoading: loadContracts } = useQuery({
    queryKey: ["contracts-gargalos"],
    queryFn: () => base44.entities.Contract.list("-created_date", 200),
    initialData: [],
  });

  const { data: docs = [], isLoading: loadDocs } = useQuery({
    queryKey: ["docs-pendentes"],
    queryFn: () => base44.entities.StudentDocument.filter({ status: "Pendente_Revisao" }),
    initialData: [],
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-pf"],
    queryFn: () => base44.entities.Student.list("-created_date"),
    initialData: [],
  });

  const isLoading = loadEnroll || loadContracts || loadDocs;

  // Gargalo 1: Matrículas aguardando autorização há mais de 1 dia
  const aguardandoAutorizacao = enrollments
    .filter(e => e.status === "Aguardando Autorização")
    .map(e => ({ label: `${e.student_name} — ${e.course_name}`, sub: e.start_date }));

  // Gargalo 2: Contratos enviados mas sem assinatura do aluno
  const contratosNaoAssinados = contracts
    .filter(c => c.status === "Aguardando_Assinatura")
    .map(c => ({ label: `${c.student_name}`, sub: c.contract_number }));

  // Gargalo 3: Documentos pendentes de revisão
  const docsPendentes = docs
    .map(d => ({ label: `${d.student_name || "Sem nome"} — ${d.document_type?.replace("_"," ")}`, sub: new Date(d.created_date).toLocaleDateString("pt-BR") }));

  // Gargalo 4: Alunos sem CPF ou sem e-mail
  const cadastrosIncompletos = students
    .filter(s => !s.cpf || !s.email || !s.whatsapp)
    .map(s => ({
      label: s.full_name,
      sub: [!s.cpf && "CPF", !s.email && "E-mail", !s.whatsapp && "WhatsApp"].filter(Boolean).join(", ")
    }));

  // Gargalo 5: Inadimplentes
  const inadimplentes = enrollments
    .filter(e => e.status_pagamento === "Inadimplente")
    .map(e => ({
      label: `${e.student_name} — ${e.course_name}`,
      sub: e.unit_value ? `R$ ${parseFloat(e.unit_value).toFixed(2)}` : "Sem valor"
    }));

  if (isLoading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  );

  const totalGargalos = aguardandoAutorizacao.length + contratosNaoAssinados.length + docsPendentes.length + cadastrosIncompletos.length + inadimplentes.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
        <div>
          <p className="font-semibold text-orange-900 text-sm">Dashboard de Gargalos Operacionais</p>
          <p className="text-xs text-orange-700">
            {totalGargalos === 0 ? "Tudo em dia! Nenhum gargalo identificado." : `${totalGargalos} item(s) precisam de atenção`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GargaloCard
          icon={Clock}
          title="Aguardando Autorização"
          count={aguardandoAutorizacao.length}
          color="border-yellow-400"
          items={aguardandoAutorizacao}
          emptyText="Nenhuma matrícula pendente de autorização"
        />
        <GargaloCard
          icon={FileText}
          title="Contratos Não Assinados"
          count={contratosNaoAssinados.length}
          color="border-blue-400"
          items={contratosNaoAssinados}
          emptyText="Todos os contratos foram assinados"
        />
        <GargaloCard
          icon={FileText}
          title="Documentos Pendentes de Revisão"
          count={docsPendentes.length}
          color="border-orange-400"
          items={docsPendentes}
          emptyText="Nenhum documento aguardando revisão"
        />
        <GargaloCard
          icon={UserX}
          title="Cadastros Incompletos"
          count={cadastrosIncompletos.length}
          color="border-gray-400"
          items={cadastrosIncompletos}
          emptyText="Todos os cadastros estão completos"
        />
        <GargaloCard
          icon={AlertTriangle}
          title="Alunos Inadimplentes"
          count={inadimplentes.length}
          color="border-red-400"
          items={inadimplentes}
          emptyText="Nenhum aluno inadimplente"
        />
      </div>
    </div>
  );
}