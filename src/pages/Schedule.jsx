import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Eye, Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ClassScheduleForm from "@/components/schedule/ClassScheduleForm";

export default function SchedulePage() {
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const queryClient = useQueryClient();

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['classSchedules'],
    queryFn: () => base44.entities.ClassSchedule.list('-start_date'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClassSchedule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSchedules'] });
      setShowForm(false);
      setEditingClass(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClassSchedule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSchedules'] });
      setShowForm(false);
      setEditingClass(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClassSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSchedules'] });
    },
  });

  const handleSubmit = (data) => {
    if (editingClass) {
      updateMutation.mutate({ id: editingClass.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (classItem) => {
    setEditingClass(classItem);
    setShowForm(true);
  };

  const statusColors = {
    'Agendado': 'bg-blue-100 text-blue-800 border-blue-200',
    'Em Andamento': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Concluído': 'bg-green-100 text-green-800 border-green-200',
    'Cancelado': 'bg-red-100 text-red-800 border-red-200',
  };

  const scheduleColors = {
    'Manhã': 'bg-amber-100 text-amber-800',
    'Tarde': 'bg-orange-100 text-orange-800',
    'Noite': 'bg-indigo-100 text-indigo-800',
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-stone-900">Cronograma de Turmas</h1>
            <p className="text-stone-600 mt-1">Gerencie os agendamentos de treinamentos</p>
          </div>
          <Button 
            onClick={() => {
              setEditingClass(null);
              setShowForm(!showForm);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Turma
          </Button>
        </div>

        {showForm && (
          <Card className="border-none shadow-xl">
            <CardContent className="p-6">
              <ClassScheduleForm
                classSchedule={editingClass}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingClass(null);
                }}
              />
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {classes.map((classItem) => (
            <Card key={classItem.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-stone-900 mb-1">{classItem.training_name}</h3>
                        <p className="text-stone-600">{classItem.company_name}</p>
                      </div>
                      <Badge className={`${statusColors[classItem.status]} border`}>
                        {classItem.status}
                      </Badge>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="flex items-center gap-2 text-sm text-stone-600">
                        <Calendar className="w-4 h-4" />
                        <span>{classItem.start_date} a {classItem.end_date}</span>
                      </div>
                      <div className="text-sm text-stone-600">
                        📍 Local: {classItem.location || 'Não definido'}
                      </div>
                      <div className="text-sm text-stone-600">
                        👥 Alunos: {classItem.students_count || 0}
                      </div>
                      {classItem.specific_days && (
                        <div className="flex items-center gap-2 text-sm text-stone-600">
                          <Calendar className="w-4 h-4" />
                          <span>{classItem.specific_days}</span>
                        </div>
                      )}
                      {classItem.training_schedule && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-stone-600" />
                          <Badge className={scheduleColors[classItem.training_schedule]}>
                            {classItem.training_schedule}
                          </Badge>
                        </div>
                      )}
                      {classItem.instructor_name && (
                        <div className="flex items-center gap-2 text-sm text-stone-600">
                          <User className="w-4 h-4" />
                          <span>{classItem.instructor_name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {classItem.modality && (
                        <Badge variant="outline" className="bg-blue-50">
                          {classItem.modality}
                        </Badge>
                      )}
                      {classItem.category && (
                        <Badge variant="outline" className="bg-purple-50">
                          {classItem.category}
                        </Badge>
                      )}
                      {classItem.duration_hours && (
                        <Badge variant="outline" className="bg-green-50">
                          {classItem.duration_hours}h
                        </Badge>
                      )}
                      {classItem.month && (
                        <Badge variant="outline" className="bg-orange-50">
                          {classItem.month}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col justify-between items-end gap-4">
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Link to={createPageUrl(`ClassDetails?id=${classItem.id}`)}>
                        <Button variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                          <Eye className="w-4 h-4 mr-1" />
                          Ver Detalhes
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(classItem)}>
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deleteMutation.mutate(classItem.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>

                {classItem.notes && (
                  <div className="mt-4 pt-4 border-t border-stone-200">
                    <p className="text-sm text-stone-600">{classItem.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {classes.length === 0 && !isLoading && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-stone-300" />
              <p className="text-stone-600 mb-4">Nenhuma turma agendada</p>
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Agendar Primeira Turma
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}