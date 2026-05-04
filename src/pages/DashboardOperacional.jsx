import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Calendar, Users, AlertTriangle, FileText, CheckSquare,
  MapPin, Clock, UserCheck, Loader2
} from "lucide-react";
import { format, isToday, addDays, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

function StatCard({ icon: Icon, label, value, color = "blue", loading }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
            {loading ? (
              <div className="h-8 w-16 bg-gray-100 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-3xl font-bold text-gray-900 mt-1">{value ?? "—"}</p>
            )}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardOperacional() {
  const hoje = new Date();

  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ["op-schedules"],
    queryFn: () => base44.entities.ClassSchedule.list("-created_date", 500),
    refetchInterval: 60000,
  });

  const { data: bmms = [], isLoading: loadingBMMs } = useQuery({
    queryKey: ["op-bmms"],
    queryFn: () => base44.entities.BMMRecord.list("-created_date", 200),
  });

  const mesAtual = format(hoje, "yyyy-MM");

  // Cards de resumo
  const agendadosMes = schedules.filter(s =>
    (s.status === "Agendado" || s.status === "Em Andamento") &&
    s.realization_dates?.some(d => d?.startsWith(mesAtual))
  ).length;

  const hojeStr = format(hoje, "yyyy-MM-dd");
  const cursosHoje = schedules.filter(s =>
    s.realization_dates?.includes(hojeStr)
  );

  const totalAlunos = schedules.reduce((sum, s) => sum + (s.students_count || 0), 0);

  const bmmsMes = bmms.filter(b => b.created_date?.startsWith(mesAtual)).length;

  // Agenda do dia
  const agendaDia = cursosHoje.map(s => ({
    id: s.id,
    nome: s.training_name,
    empresa: s.company_name,
    instrutor: s.instructor_name || "Não definido",
    local: s.location || "—",
    modalidade: s.category || "Presencial",
    alunos: s.students_count || 0,
    horario: s.training_schedule || "—",
    status: s.status,
  }));

  // Programação da semana (próximos 7 dias)
  const semanaRange = Array.from({ length: 7 }, (_, i) => format(addDays(hoje, i), "yyyy-MM-dd"));
  const programacaoSemana = semanaRange.map(dia => ({
    dia,
    label: format(parseISO(dia), "EEE dd/MM", { locale: ptBR }),
    cursos: schedules.filter(s => s.realization_dates?.includes(dia)),
  })).filter(d => d.cursos.length > 0);

  // Alertas operacionais
  const semInstrutor = schedules.filter(s =>
    !s.instructor_name && (s.status === "Agendado" || s.status === "Em Andamento")
  );
  const semAlunos = schedules.filter(s =>
    (!s.students_count || s.students_count === 0) && s.status === "Agendado"
  );

  const loading = loadingSchedules || loadingBMMs;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Operacional</h1>
        <p className="text-sm text-gray-500 mt-1">
          {format(hoje, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Cursos Agendados no Mês" value={agendadosMes} color="blue" loading={loadingSchedules} />
        <StatCard icon={CheckSquare} label="Cursos Hoje" value={cursosHoje.length} color="green" loading={loadingSchedules} />
        <StatCard icon={Users} label="Alunos em Treinamento" value={totalAlunos} color="purple" loading={loadingSchedules} />
        <StatCard icon={FileText} label="BMMs Gerados no Mês" value={bmmsMes} color="orange" loading={loadingBMMs} />
      </div>

      {/* Acesso Rápido */}
      <div className="flex flex-wrap gap-3">
        <Link to="/AgendaTreinamentos"><Button variant="outline" className="gap-2"><Calendar className="w-4 h-4" />Agenda de Treinamentos</Button></Link>
        <Link to={createPageUrl("Schedule")}><Button variant="outline" className="gap-2"><Calendar className="w-4 h-4" />Cronograma</Button></Link>
        <Link to={createPageUrl("AttendanceCall")}><Button variant="outline" className="gap-2"><UserCheck className="w-4 h-4" />Chamada Presencial</Button></Link>
        <Link to={createPageUrl("BMMGenerator")}><Button variant="outline" className="gap-2"><FileText className="w-4 h-4" />Gerar BMM</Button></Link>
      </div>

      {/* Agenda do Dia */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" /> Agenda do Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : agendaDia.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nenhum curso agendado para hoje.</p>
          ) : (
            <div className="space-y-3">
              {agendaDia.map(c => (
                <div key={c.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900 text-sm">{c.nome}</p>
                    <p className="text-xs text-gray-500">{c.empresa}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-600 mt-1">
                      <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" />{c.instrutor}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.local}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.horario}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.alunos} alunos</span>
                    </div>
                  </div>
                  <Badge className={c.status === "Em Andamento" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                    {c.modalidade}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Programação da Semana */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-500" /> Programação dos Próximos 7 Dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {programacaoSemana.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nenhum curso programado para os próximos 7 dias.</p>
          ) : (
            <div className="space-y-2">
              {programacaoSemana.map(({ dia, label, cursos }) => (
                <div key={dia} className="flex items-start gap-4 p-3 rounded-lg border border-gray-100">
                  <div className="min-w-[80px] text-xs font-semibold text-gray-700 capitalize pt-0.5">{label}</div>
                  <div className="flex flex-wrap gap-2">
                    {cursos.map(c => (
                      <Badge key={c.id} variant="outline" className="text-xs">
                        {c.training_name} — {c.company_name}
                        <span className={`ml-1 ${c.status === "Confirmado" ? "text-green-600" : "text-orange-500"}`}>
                          ● {c.status}
                        </span>
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alertas Operacionais */}
      {(semInstrutor.length > 0 || semAlunos.length > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-4 h-4" /> Alertas Operacionais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {semInstrutor.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-700 mb-1">Cursos sem instrutor definido ({semInstrutor.length})</p>
                {semInstrutor.slice(0, 5).map(s => (
                  <div key={s.id} className="text-xs text-gray-700 bg-white rounded px-3 py-1.5 mb-1 border border-red-100">
                    {s.training_name} — {s.company_name}
                  </div>
                ))}
              </div>
            )}
            {semAlunos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-orange-700 mb-1">Turmas sem alunos cadastrados ({semAlunos.length})</p>
                {semAlunos.slice(0, 5).map(s => (
                  <div key={s.id} className="text-xs text-gray-700 bg-white rounded px-3 py-1.5 mb-1 border border-orange-100">
                    {s.training_name} — {s.company_name}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}