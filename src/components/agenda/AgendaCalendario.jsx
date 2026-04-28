import React, { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_COLORS = {
  Agendado: "bg-blue-100 text-blue-800 border-blue-200",
  Confirmado: "bg-green-100 text-green-800 border-green-200",
  "Em Andamento": "bg-yellow-100 text-yellow-800 border-yellow-200",
  Concluído: "bg-gray-100 text-gray-700 border-gray-200",
  Cancelado: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_DOT = {
  Agendado: "bg-blue-500",
  Confirmado: "bg-green-500",
  "Em Andamento": "bg-yellow-500",
  Concluído: "bg-gray-400",
  Cancelado: "bg-red-400",
};

export default function AgendaCalendario({ agendamentos, onSelectDay, selectedDay }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // Preencher início com dias vazios
  const startDow = startOfMonth(currentMonth).getDay();
  const emptyStart = Array(startDow).fill(null);

  const getAgendamentosForDay = (day) =>
    agendamentos.filter((a) => {
      if (!a.data_inicio) return false;
      const start = new Date(a.data_inicio + "T00:00:00");
      const end = a.data_fim ? new Date(a.data_fim + "T00:00:00") : start;
      return day >= start && day <= end;
    });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header do mês */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="font-semibold text-gray-900 capitalize text-lg">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-500 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-7">
        {emptyStart.map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[90px] border-b border-r border-gray-50" />
        ))}
        {days.map((day) => {
          const events = getAgendamentosForDay(day);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const isTodayDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={`min-h-[90px] border-b border-r border-gray-100 p-1.5 cursor-pointer transition-colors
                ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}
                ${!isSameMonth(day, currentMonth) ? "opacity-40" : ""}
              `}
            >
              <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1
                ${isTodayDay ? "bg-blue-600 text-white" : isSelected ? "bg-blue-200 text-blue-800" : "text-gray-700"}
              `}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {events.slice(0, 2).map((ev) => (
                  <div
                    key={ev.id}
                    className={`text-xs px-1.5 py-0.5 rounded border truncate font-medium ${STATUS_COLORS[ev.status] || "bg-blue-100 text-blue-800 border-blue-200"}`}
                  >
                    {ev.titulo || ev.curso_nome}
                  </div>
                ))}
                {events.length > 2 && (
                  <div className="text-xs text-gray-400 pl-1">+{events.length - 2} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-3">
        {Object.entries(STATUS_DOT).map(([status, dot]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${dot}`} />
            <span className="text-xs text-gray-500">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}