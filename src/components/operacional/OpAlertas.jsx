import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react";
import { format, addDays, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";

export default function OpAlertas({ schedules, certificates }) {
  const hoje = new Date();
  const em3dias = addDays(hoje, 3);
  const em7dias = addDays(hoje, 7);

  const getFirstDate = (s) => {
    if (!s.realization_dates?.length) return null;
    try { return parseISO(s.realization_dates[0]); } catch { return null; }
  };

  // URGENTE
  const iniciam3dias = schedules.filter(s => {
    const d = getFirstDate(s);
    return d && s.status === "Agendado" && isWithinInterval(d, { start: startOfDay(hoje), end: endOfDay(em3dias) });
  });
  const semInstrutor = schedules.filter(s =>
    !s.instructor_name && (s.status === "Agendado" || s.status === "Em Andamento")
  );
  const semLocal = schedules.filter(s =>
    !s.location && (s.status === "Agendado" || s.status === "Em Andamento")
  );
  const semAlunos = schedules.filter(s =>
    (!s.students_count || s.students_count === 0) && s.status === "Agendado"
  );

  // ATENÇÃO
  const iniciam7dias = schedules.filter(s => {
    const d = getFirstDate(s);
    return d && s.status === "Agendado" && isWithinInterval(d, { start: endOfDay(em3dias), end: endOfDay(em7dias) });
  });
  const poucosAlunos = schedules.filter(s =>
    s.students_count > 0 && s.students_count < 5 && s.status === "Agendado"
  );

  // INFORMATIVO
  const startSemana = startOfDay(addDays(hoje, -7));
  const concluidosSemana = schedules.filter(s =>
    s.status === "Concluído" && s.updated_date && new Date(s.updated_date) >= startSemana
  );
  const certPendentes = certificates?.filter(c => c.status === "pending_signature") || [];

  const hasUrgente = iniciam3dias.length || semInstrutor.length || semLocal.length || semAlunos.length;
  const hasAtencao = iniciam7dias.length || poucosAlunos.length;
  const hasInfo = concluidosSemana.length || certPendentes.length;

  if (!hasUrgente && !hasAtencao && !hasInfo) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-gray-400">
          <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
          Nenhum alerta operacional no momento. Tudo em ordem!
        </CardContent>
      </Card>
    );
  }

  const AlertItem = ({ text }) => (
    <div className="text-xs text-gray-700 bg-white rounded px-3 py-1.5 border border-gray-100 mb-1">{text}</div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* URGENTE */}
      {hasUrgente > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> 🔴 Urgente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {iniciam3dias.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 mb-1">Iniciam em até 3 dias ({iniciam3dias.length})</p>
                {iniciam3dias.slice(0, 4).map(s => <AlertItem key={s.id} text={`${s.training_name} — ${s.company_name}`} />)}
              </div>
            )}
            {semInstrutor.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 mb-1">Sem instrutor ({semInstrutor.length})</p>
                {semInstrutor.slice(0, 3).map(s => <AlertItem key={s.id} text={`${s.training_name} — ${s.company_name}`} />)}
              </div>
            )}
            {semLocal.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 mb-1">Sem local definido ({semLocal.length})</p>
                {semLocal.slice(0, 3).map(s => <AlertItem key={s.id} text={`${s.training_name} — ${s.company_name}`} />)}
              </div>
            )}
            {semAlunos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 mb-1">Sem alunos cadastrados ({semAlunos.length})</p>
                {semAlunos.slice(0, 3).map(s => <AlertItem key={s.id} text={`${s.training_name} — ${s.company_name}`} />)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ATENÇÃO */}
      {hasAtencao > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-yellow-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> 🟡 Atenção
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {iniciam7dias.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-yellow-700 mb-1">Iniciam em até 7 dias ({iniciam7dias.length})</p>
                {iniciam7dias.slice(0, 4).map(s => <AlertItem key={s.id} text={`${s.training_name} — ${s.company_name}`} />)}
              </div>
            )}
            {poucosAlunos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-yellow-700 mb-1">Turmas com menos de 5 alunos ({poucosAlunos.length})</p>
                {poucosAlunos.slice(0, 4).map(s => <AlertItem key={s.id} text={`${s.training_name} — ${s.students_count} aluno(s)`} />)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* INFORMATIVO */}
      {hasInfo > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-green-700 flex items-center gap-2">
              <Info className="w-4 h-4" /> 🟢 Informativo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {concluidosSemana.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-700 mb-1">Concluídos esta semana ({concluidosSemana.length})</p>
                {concluidosSemana.slice(0, 4).map(s => <AlertItem key={s.id} text={`${s.training_name} — ${s.company_name}`} />)}
              </div>
            )}
            {certPendentes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-700 mb-1">Certificados pendentes de assinatura ({certPendentes.length})</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}