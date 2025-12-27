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
import { toast } from "sonner";

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
      toast.success('✅ Turma criada com sucesso!');
    },
    onError: (error) => {
      toast.error('❌ Erro ao criar turma', {
        description: error.message || 'Não foi possível criar a turma. Verifique os dados e tente novamente.'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClassSchedule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSchedules'] });
      setShowForm(false);
      setEditingClass(null);
      toast.success('✅ Turma atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('❌ Erro ao atualizar turma', {
        description: error.message || 'Não foi possível atualizar a turma. Verifique os dados e tente novamente.'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClassSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSchedules'] });
      toast.success('✅ Turma excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('❌ Erro ao excluir turma', {
        description: error.message || 'Não foi possível excluir a turma. Tente novamente.'
      });
    }
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
    'Agendado': 'bg-gray-100 text-gray-800 border border-gray-300',
    'Em Andamento': 'bg-gray-100 text-gray-800 border border-gray-300',
    'Concluído': 'bg-gray-100 text-gray-800 border border-gray-300',
    'Cancelado': 'bg-gray-100 text-gray-800 border border-gray-300',
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
        toast.error('❌ Atenção: Instrutor não encontrado', {
          description: 'Não foi possível localizar o instrutor. Verifique se o nome está correto.'
        });
        return;
      }
      const instructor = instructors[0];

      // Buscar usuário do instrutor pelo email
      const users = await base44.entities.User.filter({ email: instructor.email });
      if (users.length === 0) {
        toast.error('❌ Atenção: Usuário do instrutor não encontrado', {
          description: 'O instrutor não possui um usuário vinculado no sistema. Crie um usuário com o email do instrutor.'
        });
        return;
      }
      const user = users[0];

      if (!user.phone || !user.is_whatsapp) {
        toast.error('❌ Atenção: WhatsApp não cadastrado', {
          description: 'O instrutor não possui WhatsApp cadastrado. Edite o usuário e adicione o telefone marcando como WhatsApp.'
        });
        return;
      }

      // Enviar mensagem
      await base44.functions.invoke('enviarNotificacaoWhatsApp', {
        recipient_id: user.id,
        recipient_type: 'instructor',
        message_type: 'class_schedule',
        class_schedule_id: classItem.id
      });

      toast.success('✅ Cronograma enviado com sucesso!', {
        description: 'O instrutor foi notificado via WhatsApp.'
      });
      } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      toast.error('❌ Erro ao enviar mensagem', {
        description: error.message || 'Ocorreu um erro desconhecido ao tentar enviar o WhatsApp. Tente novamente.'
      });
      } finally {
      setSendingWhatsApp(null);
      }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">
            Cronograma de Turmas
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {stats.total} {stats.total === 1 ? 'turma agendada' : 'turmas agendadas'}
          </p>
        </div>



        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <Calendar className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{stats.agendado}</p>
              <p className="text-sm text-gray-600">Agendadas</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <Clock className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{stats.emAndamento}</p>
              <p className="text-sm text-gray-600">Em Andamento</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <BookOpen className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{stats.concluido}</p>
              <p className="text-sm text-gray-600">Concluídas</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <Users className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{classes.reduce((sum, c) => sum + (c.students_count || 0), 0)}</p>
              <p className="text-sm text-gray-600">Total Alunos</p>
            </CardContent>
          </Card>
        </div>

        {showForm && (
          <Card className="border border-gray-300 bg-white mb-6">
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
            <Card key={classItem.id} className="border border-gray-300 bg-white">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Cabeçalho da Turma */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-black mb-1">{classItem.training_name}</h3>
                        <p className="text-sm text-gray-600">{classItem.company_name}</p>
                      </div>
                      <Badge variant="outline">
                        {classItem.status}
                      </Badge>
                    </div>

                    {/* Informações em Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-gray-200 pt-3">
                      <div>
                        <p className="text-xs text-gray-500">Período</p>
                        <p className="text-sm font-semibold text-black">{classItem.start_date}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500">Local</p>
                        <p className="text-sm font-semibold text-black">{classItem.location || 'Não definido'}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500">Alunos</p>
                        <p className="text-sm font-semibold text-black">{classItem.students_count || 0}</p>
                      </div>

                      {classItem.training_schedule && (
                        <div>
                          <p className="text-xs text-gray-500">Horário</p>
                          <p className="text-sm font-semibold text-black">{classItem.training_schedule}</p>
                        </div>
                      )}

                      {classItem.instructor_name && (
                        <div>
                          <p className="text-xs text-gray-500">Instrutor</p>
                          <p className="text-sm font-semibold text-black">{classItem.instructor_name}</p>
                        </div>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      {classItem.modality && (
                        <Badge variant="outline" className="text-xs">
                          {classItem.modality}
                        </Badge>
                      )}
                      {classItem.category && (
                        <Badge variant="outline" className="text-xs">
                          {classItem.category}
                        </Badge>
                      )}
                      {classItem.duration_hours && (
                        <Badge variant="outline" className="text-xs">
                          {classItem.duration_hours}h
                        </Badge>
                      )}
                      {classItem.month && (
                        <Badge variant="outline" className="text-xs">
                          {classItem.month}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-col gap-2">
                    <Link to={createPageUrl(`ClassDetails?id=${classItem.id}`)}>
                      <Button size="sm" className="w-full bg-gray-900 hover:bg-gray-800 text-white">
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </Link>
                    
                    {classItem.instructor_name && (
                      <Button 
                        size="sm" 
                        onClick={() => handleSendWhatsApp(classItem)}
                        disabled={sendingWhatsApp === classItem.id}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        {sendingWhatsApp === classItem.id ? 'Enviando...' : 'WhatsApp'}
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(classItem)}
                      className="w-full"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => deleteMutation.mutate(classItem.id)}
                      className="w-full text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </div>

                {classItem.notes && (
                  <div className="mt-4 p-3 bg-gray-50 border-l-4 border-gray-400">
                    <p className="text-sm text-gray-700">{classItem.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Botão Fixo no Rodapé */}
        {classes.length > 0 && (
          <div className="fixed bottom-8 right-8 z-50">
            <button 
              onClick={() => {
                setEditingClass(null);
                setShowForm(true);
              }}
              className="px-6 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 shadow-lg flex items-center gap-2"
            >
              <CalendarPlus className="w-5 h-5" />
              Nova Turma
            </button>
          </div>
        )}

        {classes.length === 0 && !isLoading && (
          <Card className="border border-gray-300 bg-white">
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-bold text-black mb-2">Nenhuma turma agendada</h3>
              <p className="text-gray-600 mb-6">Comece criando sua primeira turma de treinamento</p>
              <button 
                onClick={() => {
                  setEditingClass(null);
                  setShowForm(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Agendar Primeira Turma
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}