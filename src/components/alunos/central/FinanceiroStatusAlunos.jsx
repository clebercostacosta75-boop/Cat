import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, DollarSign } from "lucide-react";
import { isMatriculaIndividual } from "@/lib/origemMatricula";
import MatriculaFicha from "@/components/alunos/central/MatriculaFicha";

const STATUS_STYLE = {
  Pago: "bg-green-100 text-green-800",
  Pendente: "bg-yellow-100 text-yellow-800",
  Vencido: "bg-red-100 text-red-700",
  Bloqueado: "bg-gray-900 text-white",
  Liberado: "bg-blue-100 text-blue-800",
};
const STATUS_ORDER = ["Pago", "Pendente", "Vencido", "Bloqueado", "Liberado"];

export function statusFinanceiroAluno(e) {
  if (e.bloqueio_certificacao) return "Bloqueado";
  if (e.liberacao_financeira_manual) return "Liberado";
  if (["Pago", "Cortesia"].includes(e.status_pagamento)) return "Pago";
  if (e.status_pagamento === "Inadimplente") return "Vencido";
  const hoje = new Date().toISOString().split("T")[0];
  if (e.data_vencimento_pagamento && e.data_vencimento_pagamento < hoje) return "Vencido";
  return "Pendente";
}

export default function FinanceiroStatusAlunos() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [ficha, setFicha] = useState(null);

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["enrollments-pf"],
    queryFn: async () => {
      const all = await base44.entities.StudentCourseEnrollment.list("-created_date", 500);
      return (all || []).filter(isMatriculaIndividual);
    },
    staleTime: 0,
    gcTime: 0,
  });

  const norm = (v) => (v || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const rows = enrollments.map(e => ({ enrollment: e, statusFin: statusFinanceiroAluno(e) }));
  const counts = {};
  rows.forEach(r => { counts[r.statusFin] = (counts[r.statusFin] || 0) + 1; });

  const filtered = rows.filter(r => {
    const byStatus = filterStatus === "all" || r.statusFin === filterStatus;
    const bySearch = !search
      || norm(r.enrollment.student_name).includes(norm(search))
      || (r.enrollment.student_cpf || "").replace(/\D/g, "").includes(search.replace(/\D/g, "") || "___");
    return byStatus && bySearch;
  });

  return (
    <div className="space-y-4">
      {ficha && (
        <MatriculaFicha
          enrollment={ficha}
          onClose={() => setFicha(null)}
          onChanged={() => queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] })}
        />
      )}

      <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <DollarSign className="w-5 h-5 text-gray-600 flex-shrink-0" />
        <p className="text-sm text-gray-700">
          <strong>Financeiro Operacional</strong> — status de pagamento por aluno. Detalhes e ações ficam na Ficha da Matrícula.
        </p>
      </div>

      {/* Filtros por status */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setFilterStatus("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border ${filterStatus === "all" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
        >
          Todos ({rows.length})
        </button>
        {STATUS_ORDER.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${filterStatus === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
          >
            {s} ({counts[s] || 0})
          </button>
        ))}
        <div className="relative flex-1 min-w-[200px] max-w-sm ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar aluno por nome ou CPF..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9" />
        </div>
      </div>

      <Card className="border border-gray-200">
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
              {filtered.map(({ enrollment: e, statusFin }) => (
                <div key={e.id} className="flex items-center justify-between gap-3 p-4 hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{e.student_name}</p>
                    <p className="text-sm text-gray-500 truncate">{e.course_name}</p>
                    <p className="text-xs text-gray-400">
                      {e.forma_pagamento || "Forma não informada"}
                      {e.data_vencimento_pagamento ? ` · Vencimento: ${e.data_vencimento_pagamento}` : ""}
                      {e.unit_value ? ` · R$ ${parseFloat(e.unit_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`text-xs ${STATUS_STYLE[statusFin]}`}>{statusFin}</Badge>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setFicha(e)}>
                      📋 Ficha
                    </Button>
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