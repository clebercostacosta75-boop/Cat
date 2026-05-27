import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, MapPin, User, Clock } from "lucide-react";
import { format, addDays, addWeeks, subWeeks, startOfWeek, parseISO, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_COLORS = {
  "Agendado": "bg-blue-100 text-blue-700 border-blue-200",
  "Em Andamento": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Concluído": "bg-green-100 text-green-700 border-green-200",
  "Cancelado": "bg-red-100 text-red-700 border-red-200",
};

export default function OpAgendaSemanal({ schedules }) {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { locale: ptBR }));

  const dias = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getSchedulesForDay = (date) => {
    const key = format(date, "yyyy-MM-dd");
    return schedules.filter(s => s.realization_dates?.includes(key));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" /> Agenda Semanal
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setWeekStart(d => subWeeks(d, 1))}>
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <span className="text-xs text-gray-600 font-medium">
              {format(weekStart, "dd/MM", { locale: ptBR })} — {format(addDays(weekStart, 6), "dd/MM/yyyy", { locale: ptBR })}
            </span>
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setWeekStart(d => addWeeks(d, 1))}>
              <ChevronRight className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setWeekStart(startOfWeek(new Date(), { locale: ptBR }))}>
              Hoje
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {dias.map(dia => {
            const daySchedules = getSchedulesForDay(dia);
            const today = isToday(dia);
            return (
              <div key={dia.toISOString()} className={`min-h-[120px] rounded-lg border p-2 ${today ? "border-blue-400 bg-blue-50" : "border-gray-100 bg-gray-50"}`}>
                <div className={`text-center mb-2 ${today ? "text-blue-700 font-bold" : "text-gray-600"}`}>
                  <p className="text-xs uppercase tracking-wide">{format(dia, "EEE", { locale: ptBR })}</p>
                  <p className={`text-sm font-bold ${today ? "bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto" : ""}`}>
                    {format(dia, "dd")}
                  </p>
                </div>
                {daySchedules.length === 0 ? (
                  <p className="text-xs text-gray-300 text-center mt-2">—</p>
                ) : (
                  <div className="space-y-1">
                    {daySchedules.map(s => (
                      <div key={s.id} className={`rounded p-1.5 text-xs border ${STATUS_COLORS[s.status] || "bg-white border-gray-200"}`}>
                        <p className="font-semibold truncate leading-tight">{s.training_name}</p>
                        <p className="truncate text-gray-500 mt-0.5">{s.company_name}</p>
                        {s.training_schedule && (
                          <p className="flex items-center gap-0.5 mt-0.5 text-gray-500">
                            <Clock className="w-2.5 h-2.5" /> {s.training_schedule}
                          </p>
                        )}
                        {s.location && (
                          <p className="flex items-center gap-0.5 text-gray-500 truncate">
                            <MapPin className="w-2.5 h-2.5" /> {s.location}
                          </p>
                        )}
                        {s.instructor_name && (
                          <p className="flex items-center gap-0.5 text-gray-500 truncate">
                            <User className="w-2.5 h-2.5" /> {s.instructor_name.split(" ")[0]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}