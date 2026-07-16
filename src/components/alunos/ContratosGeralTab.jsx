import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PenLine, FileText } from "lucide-react";
import ContratoAssinaturaTab from "@/components/contratos/ContratoAssinaturaTab";
import { isMatriculaIndividual } from "@/lib/origemMatricula";

export default function ContratosGeralTab() {
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