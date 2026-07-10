import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, BookOpen, Clock } from "lucide-react";
import { isMatriculaEmpresarial } from "@/lib/origemMatricula";

export default function EmpresasResumoTab() {
  const { data: companies = [] } = useQuery({
    queryKey: ["companies-emp"],
    queryFn: () => base44.entities.Company.list("-created_date", 300),
    initialData: [],
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["enrollments-emp"],
    queryFn: async () => {
      const all = await base44.entities.StudentCourseEnrollment.list("-created_date", 500);
      return (all || []).filter(isMatriculaEmpresarial);
    },
    staleTime: 0,
    gcTime: 0,
  });

  const empresasAtivas = companies.filter((c) => c.status === "Ativo").length;
  const alunosVinculados = new Set(enrollments.map((e) => e.student_id).filter(Boolean)).size;
  const aguardandoResultado = enrollments.filter(
    (e) => !e.resultado_academico || e.resultado_academico === "Pendente"
  ).length;

  const matriculasPorEmpresa = {};
  enrollments.forEach((e) => {
    if (e.company_id) matriculasPorEmpresa[e.company_id] = (matriculasPorEmpresa[e.company_id] || 0) + 1;
  });

  const kpis = [
    { label: "Empresas Ativas", value: empresasAtivas, icon: Building2, color: "text-blue-600 bg-blue-50" },
    { label: "Matrículas Empresariais", value: enrollments.length, icon: BookOpen, color: "text-purple-600 bg-purple-50" },
    { label: "Alunos Vinculados", value: alunosVinculados, icon: Users, color: "text-green-600 bg-green-50" },
    { label: "Aguardando Resultado", value: aguardandoResultado, icon: Clock, color: "text-yellow-600 bg-yellow-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className={`border border-gray-200 ${k.color.split(" ")[1]}`}>
            <CardContent className="p-4">
              <k.icon className={`w-5 h-5 mb-1 ${k.color.split(" ")[0]}`} />
              <p className="text-2xl font-bold text-gray-900">{k.value}</p>
              <p className="text-xs text-gray-600">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-gray-200">
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Empresas Contratantes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {companies.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Nenhuma empresa cadastrada</div>
          ) : (
            <div className="divide-y">
              {companies.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div>
                    <p className="font-semibold text-gray-900">{c.nome_fantasia || c.razao_social}</p>
                    <p className="text-xs text-gray-500">{c.razao_social} — CNPJ: {c.cnpj}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-700 text-xs">
                      {matriculasPorEmpresa[c.id] || 0} matrícula(s)
                    </Badge>
                    <Badge className={c.status === "Ativo" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}>
                      {c.status || "Ativo"}
                    </Badge>
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