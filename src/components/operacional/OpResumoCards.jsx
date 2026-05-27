import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Building2, Users, UserCheck, Calendar, Loader2, TrendingUp, Clock } from "lucide-react";

function StatCard({ icon: Icon, label, value, color, loading }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-100",
    green: "bg-green-50 text-green-600 border-green-100",
    red: "bg-red-50 text-red-600 border-red-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    teal: "bg-teal-50 text-teal-600 border-teal-100",
  };
  return (
    <Card className="border">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            {loading ? (
              <div className="h-7 w-16 bg-gray-100 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? "—"}</p>
            )}
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.blue}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OpResumoCards({ schedules, companies, instructors, loading }) {
  const totalTreinamentos = schedules.length;
  const empresasAtendidas = new Set(schedules.map(s => s.company_id).filter(Boolean)).size || companies.length;
  const totalAlunos = schedules.reduce((s, t) => s + (t.students_count || 0), 0);
  const instrutoresAtivos = instructors.filter(i => i.status !== "Inativo").length;

  const agendados = schedules.filter(s => s.status === "Agendado").length;
  const emAndamento = schedules.filter(s => s.status === "Em Andamento").length;
  const concluidos = schedules.filter(s => s.status === "Concluído").length;
  const cancelados = schedules.filter(s => s.status === "Cancelado").length;

  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const turmasMes = schedules.filter(s =>
    s.realization_dates?.some(d => d?.startsWith(mesAtual))
  );
  const horasMes = turmasMes.reduce((s, t) => s + (t.duration_hours || 0), 0);
  const totalTurmasMes = turmasMes.length;

  const meta = totalTreinamentos > 0 ? Math.round((concluidos / totalTreinamentos) * 100) : 0;

  const totalValor = schedules
    .filter(s => s.status !== "Cancelado")
    .reduce((s, t) => s + (t.total_value || 0), 0);

  return (
    <div className="space-y-3">
      {/* Linha 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={BookOpen} label="Total de Treinamentos" value={totalTreinamentos} color="blue" loading={loading} />
        <StatCard icon={Building2} label="Empresas Atendidas" value={empresasAtendidas} color="indigo" loading={loading} />
        <StatCard icon={Users} label="Alunos Matriculados" value={totalAlunos} color="purple" loading={loading} />
        <StatCard icon={UserCheck} label="Instrutores Ativos" value={instrutoresAtivos} color="teal" loading={loading} />
      </div>
      {/* Linha 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Calendar} label="Agendados" value={agendados} color="blue" loading={loading} />
        <StatCard icon={Loader2} label="Em Andamento" value={emAndamento} color="yellow" loading={loading} />
        <StatCard icon={UserCheck} label="Concluídos" value={concluidos} color="green" loading={loading} />
        <StatCard icon={Calendar} label="Cancelados" value={cancelados} color="red" loading={loading} />
      </div>
      {/* Linha 3 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp} label="Contratos Ativos (R$)" value={`R$ ${totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`} color="green" loading={loading} />
        <StatCard icon={Clock} label="Horas no Mês" value={`${horasMes}h`} color="orange" loading={loading} />
        <StatCard icon={BookOpen} label="Turmas no Mês" value={totalTurmasMes} color="indigo" loading={loading} />
        <StatCard icon={TrendingUp} label="Meta Atingida" value={`${meta}%`} color={meta >= 80 ? "green" : meta >= 50 ? "yellow" : "red"} loading={loading} />
      </div>
    </div>
  );
}