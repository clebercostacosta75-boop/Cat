import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar } from "lucide-react";

const STATUS_COLORS = {
  "Agendado": "bg-blue-100 text-blue-800",
  "Confirmado": "bg-green-100 text-green-800",
  "Em Andamento": "bg-yellow-100 text-yellow-800",
  "Concluído": "bg-emerald-100 text-emerald-800",
  "Cancelado": "bg-red-100 text-red-700",
  "Pendente": "bg-gray-100 text-gray-600",
  "Aguardando": "bg-gray-100 text-gray-600",
};

export default function TurmasCorporativasTab() {
  const [search, setSearch] = useState("");

  const { data: turmas = [], isLoading } = useQuery({
    queryKey: ["turmas-emp"],
    queryFn: () => base44.entities.ClassSchedule.list("-created_date", 300),
    initialData: [],
  });

  const norm = (v) => (v || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const filtered = turmas.filter(
    (t) => !search || norm(t.training_name).includes(norm(search)) || norm(t.company_name).includes(norm(search))
  );

  const fmtDate = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—");

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Buscar por treinamento ou empresa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhuma turma corporativa encontrada</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((t) => {
                const datas = t.realization_dates || [];
                return (
                  <div key={t.id} className="flex items-start justify-between p-4 hover:bg-gray-50 gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{t.training_name}</p>
                      <p className="text-xs text-blue-700 font-medium">🏢 {t.company_name}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-500">
                        {datas.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {fmtDate(datas[0])}{datas.length > 1 ? ` → ${fmtDate(datas[datas.length - 1])}` : ""}
                          </span>
                        )}
                        {t.instructor_name && <span>Instrutor: {t.instructor_name}</span>}
                        {t.location && <span>Local: {t.location}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge className={`text-xs ${STATUS_COLORS[t.status] || "bg-gray-100 text-gray-600"}`}>{t.status || "Agendado"}</Badge>
                      {t.students_count > 0 && (
                        <span className="text-xs text-gray-500">{t.students_count} aluno(s)</span>
                      )}
                    </div>
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