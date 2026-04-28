import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Edit, Trash2, MapPin, Clock, Users, CheckCircle, Building2 } from "lucide-react";

const STATUS_COLORS = {
  Agendado: "bg-blue-100 text-blue-800",
  Confirmado: "bg-green-100 text-green-800",
  "Em Andamento": "bg-yellow-100 text-yellow-800",
  Concluído: "bg-gray-100 text-gray-700",
  Cancelado: "bg-red-100 text-red-700",
};

export default function AgendaDayPanel({ day, agendamentos, onEdit, onDelete, onSendConfirmation, sendingId }) {
  if (!day) return null;

  const dayEvents = agendamentos.filter((a) => {
    if (!a.data_inicio) return false;
    const start = new Date(a.data_inicio + "T00:00:00");
    const end = a.data_fim ? new Date(a.data_fim + "T00:00:00") : start;
    return day >= start && day <= end;
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
        <h3 className="font-semibold text-gray-900 capitalize">
          {format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </h3>
        <p className="text-sm text-gray-500 mt-0.5">{dayEvents.length} treinamento(s)</p>
      </div>

      <div className="divide-y divide-gray-100">
        {dayEvents.length === 0 && (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">
            Nenhum treinamento neste dia.
          </div>
        )}
        {dayEvents.map((ev) => (
          <div key={ev.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-gray-900 text-sm">{ev.titulo || ev.curso_nome}</h4>
                  <Badge className={`text-xs ${STATUS_COLORS[ev.status] || "bg-gray-100"}`}>{ev.status}</Badge>
                  {ev.confirmacao_enviada && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Confirmações enviadas
                    </span>
                  )}
                </div>

                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  {ev.horario_inicio && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {ev.horario_inicio}{ev.horario_fim ? ` às ${ev.horario_fim}` : ""}
                    </div>
                  )}
                  {ev.local && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      {ev.local}
                    </div>
                  )}
                  {ev.empresa_nome && (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-gray-400" />
                      {ev.empresa_nome}
                    </div>
                  )}
                  {ev.alunos_inscritos?.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-gray-400" />
                      {ev.alunos_inscritos.length} aluno(s) inscrito(s)
                      {ev.vagas_total ? ` / ${ev.vagas_total} vagas` : ""}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs h-7"
                  onClick={() => onSendConfirmation(ev)}
                  disabled={sendingId === ev.id || !ev.alunos_inscritos?.length}
                  title={!ev.alunos_inscritos?.length ? "Nenhum aluno inscrito" : "Enviar e-mails de confirmação"}
                >
                  <Mail className="w-3 h-3" />
                  {sendingId === ev.id ? "Enviando..." : "Confirmar"}
                </Button>
                <Button size="sm" variant="ghost" className="gap-1 text-xs h-7" onClick={() => onEdit(ev)}>
                  <Edit className="w-3 h-3" /> Editar
                </Button>
                <Button size="sm" variant="ghost" className="gap-1 text-xs h-7 text-red-500 hover:text-red-700" onClick={() => onDelete(ev.id)}>
                  <Trash2 className="w-3 h-3" /> Excluir
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}