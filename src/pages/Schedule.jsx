import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarPlus, Calendar, Eye, Clock, User, MessageCircle, MapPin, Users, Edit2, Trash2, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ClassScheduleForm from "@/components/schedule/ClassScheduleForm";

export default function SchedulePage() {
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(null);
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
    'Agendado': 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-md',
    'Em Andamento': 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-md',
    'Concluído': 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-md',
    'Cancelado': 'bg-gradient-to-r from-red-500 to-rose-500 text-white border-0 shadow-md',
  };

  // Estatísticas
  const stats = {
    total: classes.length,
    agendado: classes.filter(c => c.status === 'Agendado').length,
    emAndamento: classes.filter(c => c.status === 'Em Andamento').length,
    concluido: classes.filter(c => c.status === 'Concluído').length,
  };

  const handleSendWhatsApp = async (classItem) => {
    setSendingWhatsApp(classItem.id);
    try {
      // Buscar instrutor
      const instructors = await base44.entities.Instructor.filter({ name: classItem.instructor_name });
      if (instructors.length === 0) {
        alert('Instrutor não encontrado');
        return;
      }
      const instructor = instructors[0];

      // Buscar usuário do instrutor pelo email
      const users = await base44.entities.User.filter({ email: instructor.email });
      if (users.length === 0) {
        alert('Usuário do instrutor não encontrado');
        return;
      }
      const user = users[0];

      if (!user.phone || !user.is_whatsapp) {
        alert('O instrutor não possui WhatsApp cadastrado');
        return;
      }

      // Enviar mensagem
      await base44.functions.invoke('enviarNotificacaoWhatsApp', {
        recipient_id: user.id,
        recipient_type: 'instructor',
        message_type: 'class_schedule',
        class_schedule_id: classItem.id
      });

      alert('Cronograma enviado com sucesso via WhatsApp!');
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      alert('Erro ao enviar mensagem: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSendingWhatsApp(null);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho Moderno */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-xl">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full border-4 border-white flex items-center justify-center">
                <span className="text-white text-xs font-bold">{stats.total}</span>
              </div>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-stone-900 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Cronograma de Turmas
              </h1>
              <p className="text-stone-600 text-sm mt-1 font-medium">
                {stats.total} {stats.total === 1 ? 'turma agendada' : 'turmas agendadas'} • Gestão completa de treinamentos
              </p>
            </div>
          </div>
          <Button 
            onClick={() => {
              setEditingClass(null);
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <CalendarPlus className="w-5 h-5 mr-2" />
            Nova Turma
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-5 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <Calendar className="w-8 h-8 text-blue-600 mb-2" />
                  <p className="text-3xl font-black text-blue-900 mb-1">{stats.agendado}</p>
                  <p className="text-xs font-semibold text-blue-700">Agendadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-amber-100 to-orange-50 p-5 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <Clock className="w-8 h-8 text-amber-600 mb-2" />
                  <p className="text-3xl font-black text-amber-900 mb-1">{stats.emAndamento}</p>
                  <p className="text-xs font-semibold text-amber-700">Em Andamento</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-green-100 to-emerald-50 p-5 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <BookOpen className="w-8 h-8 text-green-600 mb-2" />
                  <p className="text-3xl font-black text-green-900 mb-1">{stats.concluido}</p>
                  <p className="text-xs font-semibold text-green-700">Concluídas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-purple-100 to-purple-50 p-5 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <Users className="w-8 h-8 text-purple-600 mb-2" />
                  <p className="text-3xl font-black text-purple-900 mb-1">{classes.reduce((sum, c) => sum + (c.students_count || 0), 0)}</p>
                  <p className="text-xs font-semibold text-purple-700">Total Alunos</p>
                </div>
              </div>
            </CardContent>
          </Card>
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

        <div className="grid gap-6">
          {classes.map((classItem) => (
            <Card key={classItem.id} className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex flex-col lg:flex-row justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    {/* Cabeçalho da Turma */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                            <BookOpen className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-stone-900">{classItem.training_name}</h3>
                            <p className="text-sm text-stone-600 font-medium flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {classItem.company_name}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Badge className={`${statusColors[classItem.status]} px-4 py-1.5 font-bold`}>
                        {classItem.status}
                      </Badge>
                    </div>

                    {/* Informações em Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 bg-stone-50 p-4 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-stone-500 font-medium">Período</p>
                          <p className="text-sm font-bold text-stone-900">{classItem.start_date}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-stone-500 font-medium">Local</p>
                          <p className="text-sm font-bold text-stone-900">{classItem.location || 'Não definido'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-stone-500 font-medium">Alunos</p>
                          <p className="text-sm font-bold text-stone-900">{classItem.students_count || 0}</p>
                        </div>
                      </div>

                      {classItem.training_schedule && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-xs text-stone-500 font-medium">Horário</p>
                            <p className="text-sm font-bold text-stone-900">{classItem.training_schedule}</p>
                          </div>
                        </div>
                      )}

                      {classItem.instructor_name && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <User className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-xs text-stone-500 font-medium">Instrutor</p>
                            <p className="text-sm font-bold text-stone-900">{classItem.instructor_name}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      {classItem.modality && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-semibold">
                          {classItem.modality === 'Formação' ? '📚' : '🔄'} {classItem.modality}
                        </Badge>
                      )}
                      {classItem.category && (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 font-semibold">
                          {classItem.category === 'Presencial' && '🏢'}
                          {classItem.category === 'Híbrido' && '🔀'}
                          {classItem.category === 'Online' && '💻'}
                          {' '}{classItem.category}
                        </Badge>
                      )}
                      {classItem.duration_hours && (
                        <Badge className="bg-green-100 text-green-700 border-green-200 font-semibold">
                          ⏱️ {classItem.duration_hours}h
                        </Badge>
                      )}
                      {classItem.month && (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 font-semibold">
                          📅 {classItem.month}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-col justify-between gap-3">
                    <Link to={createPageUrl(`ClassDetails?id=${classItem.id}`)}>
                      <Button size="sm" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md">
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </Link>
                    
                    {classItem.instructor_name && (
                      <Button 
                        size="sm" 
                        onClick={() => handleSendWhatsApp(classItem)}
                        disabled={sendingWhatsApp === classItem.id}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        {sendingWhatsApp === classItem.id ? 'Enviando...' : 'WhatsApp'}
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(classItem)}
                      className="w-full hover:bg-blue-50 border-blue-200 text-blue-700"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => deleteMutation.mutate(classItem.id)}
                      className="w-full hover:bg-red-50 border-red-200 text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </div>

                {classItem.notes && (
                  <div className="mt-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-lg">
                    <p className="text-sm text-amber-900 font-medium">📝 {classItem.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {classes.length === 0 && !isLoading && (
          <Card className="border-none shadow-xl overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-16 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <Calendar className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-stone-900 mb-2">Nenhuma turma agendada</h3>
              <p className="text-stone-600 mb-6">Comece criando sua primeira turma de treinamento</p>
              <Button 
                onClick={() => {
                  setEditingClass(null);
                  setShowForm(true);
                }}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg"
              >
                <CalendarPlus className="w-5 h-5 mr-2" />
                Agendar Primeira Turma
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}