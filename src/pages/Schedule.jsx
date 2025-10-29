import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Building2, User, Clock, DollarSign, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ScheduleForm from "../components/schedule/ScheduleForm";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SchedulePage() {
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => base44.entities.TrainingSchedule.list('-date'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TrainingSchedule.create(data),
    onSuccess: async (newSchedule) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      
      // Se o status for "Confirmado", enviar notificações automaticamente
      if (newSchedule.status === 'Confirmado') {
        try {
          await base44.functions.invoke('enviarNotificacoesTreinamento', { 
            schedule_id: newSchedule.id 
          });
        } catch (error) {
          console.error('Erro ao enviar notificações:', error);
        }
      }
      
      setShowForm(false);
      setEditingSchedule(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TrainingSchedule.update(id, data),
    onSuccess: async (updatedSchedule, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      
      // Se mudou para "Confirmado" e ainda não enviou notificações, enviar agora
      if (variables.data.status === 'Confirmado' && !editingSchedule.notifications_sent) {
        try {
          await base44.functions.invoke('enviarNotificacoesTreinamento', { 
            schedule_id: variables.id 
          });
        } catch (error) {
          console.error('Erro ao enviar notificações:', error);
        }
      }
      
      setShowForm(false);
      setEditingSchedule(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TrainingSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  const handleSubmit = (data) => {
    const scheduleData = {
      ...data,
      cost_difference: (data.instructor_cost || 0) - (data.standard_value || 0)
    };

    if (editingSchedule) {
      updateMutation.mutate({ id: editingSchedule.id, data: scheduleData });
    } else {
      createMutation.mutate(scheduleData);
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setShowForm(true);
  };

  const handleSendNotifications = async (schedule) => {
    try {
      await base44.functions.invoke('enviarNotificacoesTreinamento', { 
        schedule_id: schedule.id 
      });
      alert('Notificações enviadas com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    } catch (error) {
      console.error('Erro ao enviar notificações:', error);
      alert('Erro ao enviar notificações. Tente novamente.');
    }
  };

  const statusColors = {
    'Planejado': 'bg-blue-100 text-blue-800 border-blue-200',
    'Confirmado': 'bg-purple-100 text-purple-800 border-purple-200',
    'Realizado': 'bg-green-100 text-green-800 border-green-200',
    'Cancelado': 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-stone-900">Cronograma</h1>
            <p className="text-stone-600 mt-1">Gerencie os treinamentos agendados</p>
          </div>
          <Button 
            onClick={() => {
              setEditingSchedule(null);
              setShowForm(!showForm);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Treinamento
          </Button>
        </div>

        {showForm && (
          <Card className="border-none shadow-xl">
            <CardContent className="p-6">
              <ScheduleForm
                schedule={editingSchedule}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingSchedule(null);
                }}
              />
            </CardContent>
          </Card>
        )}

        {schedules.length === 0 && !isLoading && (
          <Alert className="border-none shadow-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhum treinamento cadastrado. Clique em "Novo Treinamento" para começar.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          {schedules.map((schedule) => (
            <Card key={schedule.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-xl font-bold text-stone-900">{schedule.training_name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge className={`${statusColors[schedule.status]} border`}>
                          {schedule.status}
                        </Badge>
                        {schedule.notifications_sent && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 border">
                            ✓ Notificado
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-stone-600">
                        <User className="w-4 h-4" />
                        <span className="text-sm">{schedule.instructor_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-stone-600">
                        <Building2 className="w-4 h-4" />
                        <span className="text-sm">{schedule.company}</span>
                      </div>
                      <div className="flex items-center gap-2 text-stone-600">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">{schedule.month} • {schedule.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-stone-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">
                          {schedule.start_time && schedule.end_time 
                            ? `${schedule.start_time} - ${schedule.end_time}` 
                            : `${schedule.hours}h`}
                        </span>
                      </div>
                      {schedule.location && (
                        <div className="flex items-center gap-2 text-stone-600 md:col-span-2">
                          <span className="text-sm">📍 {schedule.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col justify-between items-end gap-4">
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-stone-500" />
                        <span className="text-sm text-stone-600">Custo Instrutor:</span>
                        <span className="font-bold text-stone-900">
                          R$ {(schedule.instructor_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="text-sm text-stone-600">
                        Valor Padrão: R$ {(schedule.standard_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className={`text-sm font-semibold ${(schedule.cost_difference || 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        Diferença: {(schedule.cost_difference || 0) >= 0 ? '+' : ''}R$ {(schedule.cost_difference || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end">
                      {schedule.status === 'Confirmado' && !schedule.notifications_sent && (
                        <Button 
                          size="sm" 
                          onClick={() => handleSendNotifications(schedule)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          📧 Enviar Notificações
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleEdit(schedule)}>
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deleteMutation.mutate(schedule.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>

                {schedule.notes && (
                  <div className="mt-4 pt-4 border-t border-stone-200">
                    <p className="text-sm text-stone-600">{schedule.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}