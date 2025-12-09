import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Calendar } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import DailyRecordForm from "@/components/schedule/DailyRecordForm";

export default function ClassDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  const queryClient = useQueryClient();
  const [showDailyForm, setShowDailyForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const { data: classItem, isLoading: loadingClass } = useQuery({
    queryKey: ['classSchedule', id],
    queryFn: async () => {
      const classes = await base44.entities.ClassSchedule.filter({ id });
      return classes[0];
    },
    enabled: !!id,
  });

  const { data: dailyRecords = [], isLoading: loadingRecords } = useQuery({
    queryKey: ['dailyRecords', id],
    queryFn: async () => {
      const records = await base44.entities.ClassDailyRecord.filter({ class_schedule_id: id });
      return records.sort((a, b) => new Date(a.specific_date) - new Date(b.specific_date));
    },
    enabled: !!id,
    initialData: [],
  });

  const createRecordMutation = useMutation({
    mutationFn: (data) => base44.entities.ClassDailyRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyRecords', id] });
      setShowDailyForm(false);
      setEditingRecord(null);
    },
  });

  const updateRecordMutation = useMutation({
    mutationFn: ({ recordId, data }) => base44.entities.ClassDailyRecord.update(recordId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyRecords', id] });
      setShowDailyForm(false);
      setEditingRecord(null);
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: (recordId) => base44.entities.ClassDailyRecord.delete(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyRecords', id] });
    },
  });

  const handleSubmitDaily = (data) => {
    const recordData = {
      ...data,
      class_schedule_id: id,
      total_daily_cost: 
        (data.lunch_cost || 0) + 
        (data.transport_cost || 0) + 
        (data.coffee_break_cost || 0) + 
        (data.taxi_cost || 0) + 
        (data.hp_cost || 0)
    };

    if (editingRecord) {
      updateRecordMutation.mutate({ recordId: editingRecord.id, data: recordData });
    } else {
      createRecordMutation.mutate(recordData);
    }
  };

  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setShowDailyForm(true);
  };

  const totalCosts = dailyRecords.reduce((sum, record) => sum + (record.total_daily_cost || 0), 0);

  if (loadingClass) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-stone-600">Carregando...</p>
      </div>
    );
  }

  if (!classItem) {
    return (
      <div className="p-8">
        <p className="text-stone-600">Turma não encontrada</p>
        <Link to={createPageUrl("Schedule")}>
          <Button className="mt-4">Voltar</Button>
        </Link>
      </div>
    );
  }

  const statusColors = {
    'Agendado': 'bg-blue-100 text-blue-800 border-blue-200',
    'Em Andamento': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Concluído': 'bg-green-100 text-green-800 border-green-200',
    'Cancelado': 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl("Schedule")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-stone-900">{classItem.training_name}</h1>
            <p className="text-stone-600">{classItem.company_name}</p>
          </div>
          <Badge variant="outline" className="text-base px-4 py-2">
            {classItem.status}
          </Badge>
        </div>

        {/* Informações Gerais da Turma */}
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle>Informações da Turma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-stone-500">Período</p>
                <p className="font-semibold">{classItem.start_date} a {classItem.end_date}</p>
              </div>
              <div>
                <p className="text-sm text-stone-500">Local</p>
                <p className="font-semibold">{classItem.location || 'Não definido'}</p>
              </div>
              <div>
                <p className="text-sm text-stone-500">Alunos</p>
                <p className="font-semibold">{classItem.students_count || 0} participantes</p>
              </div>
              <div>
                <p className="text-sm text-stone-500">Modalidade</p>
                <p className="font-semibold">{classItem.modality || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-stone-500">Categoria</p>
                <p className="font-semibold">{classItem.category || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-stone-500">Carga Horária</p>
                <p className="font-semibold">{classItem.duration_hours || 0}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lançamentos Diários */}
        <Card className="border-none shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Lançamentos Diários e Custos</CardTitle>
            <Button 
              onClick={() => {
                setEditingRecord(null);
                setShowDailyForm(!showDailyForm);
              }}
              className="bg-gray-900 hover:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Lançamento
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {showDailyForm && (
              <Card className="bg-stone-50">
                <CardContent className="p-4">
                  <DailyRecordForm
                    record={editingRecord}
                    onSubmit={handleSubmitDaily}
                    onCancel={() => {
                      setShowDailyForm(false);
                      setEditingRecord(null);
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {dailyRecords.length === 0 && !loadingRecords && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-stone-300" />
                <p className="text-stone-600 mb-4">Nenhum lançamento diário cadastrado</p>
                <Button 
                  onClick={() => setShowDailyForm(true)}
                  variant="outline"
                >
                  Adicionar Primeiro Lançamento
                </Button>
              </div>
            )}

            <div className="space-y-3">
              {dailyRecords.map((record) => (
                <Card key={record.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold text-stone-900">
                            {new Date(record.specific_date).toLocaleDateString('pt-BR', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                          <Badge variant="outline">{record.schedule_time}</Badge>
                        </div>
                        <p className="text-sm text-stone-600 mb-3">
                          👨‍🏫 Instrutor: <span className="font-medium">{record.instructor_name}</span>
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                          <div>
                            <p className="text-stone-500">Almoço</p>
                            <p className="font-semibold text-black">R$ {(record.lunch_cost || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-stone-500">Transporte</p>
                            <p className="font-semibold text-black">R$ {(record.transport_cost || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-stone-500">Coffee Break</p>
                            <p className="font-semibold text-black">R$ {(record.coffee_break_cost || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-stone-500">Taxi</p>
                            <p className="font-semibold text-black">R$ {(record.taxi_cost || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-stone-500">Custo HP</p>
                            <p className="font-semibold text-black">R$ {(record.hp_cost || 0).toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-stone-200">
                          <p className="text-sm text-stone-500">Total do Dia</p>
                          <p className="text-lg font-bold text-black">
                            R$ {(record.total_daily_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditRecord(record)}
                        >
                          Editar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteRecordMutation.mutate(record.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {dailyRecords.length > 0 && (
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold text-black">Custo Total da Turma</p>
                    <p className="text-2xl font-bold text-black">
                      R$ {totalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}