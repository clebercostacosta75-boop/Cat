import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, BookOpen, Search, Edit2, Trash2, Award } from "lucide-react";
import { toast } from "sonner";

export default function CoursesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: courses = [], isLoading, error } = useQuery({
    queryKey: ['courses', 'prod'],
    queryFn: async () => {
      const result = await base44.entities.Course.list('-name', 200);
      console.log('Cursos carregados:', result?.length, result);
      return result || [];
    },
    staleTime: 0,
    gcTime: 0,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Course.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setShowForm(false);
      setEditingCourse(null);
      toast.success('✅ Curso criado com sucesso!');
    },
    onError: (error) => {
      toast.error('❌ Erro ao criar curso', {
        description: error.message || 'Verifique os dados e tente novamente.'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Course.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setShowForm(false);
      setEditingCourse(null);
      toast.success('✅ Curso atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('❌ Erro ao atualizar curso', {
        description: error.message || 'Verifique os dados e tente novamente.'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Course.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('✅ Curso excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('❌ Erro ao excluir curso', {
        description: error.message || 'Não foi possível excluir o curso. Tente novamente.'
      });
    }
  });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    validity: "",
    schedules: {
      morning: { start: "", end: "" },
      afternoon: { start: "", end: "" },
      night: { start: "", end: "" }
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCourse) {
      updateMutation.mutate({ id: editingCourse.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name || "",
      description: course.description || "",
      validity: course.validity || "",
      schedules: course.schedules || {
        morning: { start: "", end: "" },
        afternoon: { start: "", end: "" },
        night: { start: "", end: "" }
      }
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      validity: "",
      schedules: {
        morning: { start: "", end: "" },
        afternoon: { start: "", end: "" },
        night: { start: "", end: "" }
      }
    });
    setEditingCourse(null);
    setShowForm(false);
  };

  const handleScheduleChange = (shift, field, value) => {
    setFormData({
      ...formData,
      schedules: {
        ...formData.schedules,
        [shift]: {
          ...formData.schedules[shift],
          [field]: value
        }
      }
    });
  };

  const filteredCourses = courses.filter((course) =>
    course.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Carregando cursos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold">Erro ao carregar cursos:</p>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">Catálogo de Cursos</h1>
          <p className="text-gray-600 text-sm mt-1">
            {courses.length} {courses.length === 1 ? 'curso cadastrado' : 'cursos cadastrados'}
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Pesquisar curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <BookOpen className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{courses.length}</p>
              <p className="text-sm text-gray-600">Total de Cursos</p>
            </CardContent>
          </Card>
        </div>

        {showForm && (
          <Card className="border border-gray-300 bg-white mb-6">
            <CardHeader>
              <h2 className="text-lg font-bold text-black">
                {editingCourse ? 'Editar' : 'Novo'} Curso
              </h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-stone-900">Informações Gerais</h3>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Curso *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Nome do treinamento"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="validity">Validade</Label>
                    <Input
                      id="validity"
                      value={formData.validity}
                      onChange={(e) => setFormData({...formData, validity: e.target.value})}
                      placeholder="Ex: 12 meses, 24 meses"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Descreva o conteúdo do curso"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-stone-900">Horários Padrão Estruturados</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>☀️ Manhã</Label>
                      <div className="flex gap-2">
                        <Input
                          type="time"
                          value={formData.schedules.morning.start}
                          onChange={(e) => handleScheduleChange('morning', 'start', e.target.value)}
                          placeholder="07:00"
                        />
                        <Input
                          type="time"
                          value={formData.schedules.morning.end}
                          onChange={(e) => handleScheduleChange('morning', 'end', e.target.value)}
                          placeholder="11:00"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>🌤️ Tarde</Label>
                      <div className="flex gap-2">
                        <Input
                          type="time"
                          value={formData.schedules.afternoon.start}
                          onChange={(e) => handleScheduleChange('afternoon', 'start', e.target.value)}
                          placeholder="13:00"
                        />
                        <Input
                          type="time"
                          value={formData.schedules.afternoon.end}
                          onChange={(e) => handleScheduleChange('afternoon', 'end', e.target.value)}
                          placeholder="17:00"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>🌙 Noturno</Label>
                      <div className="flex gap-2">
                        <Input
                          type="time"
                          value={formData.schedules.night.start}
                          onChange={(e) => handleScheduleChange('night', 'start', e.target.value)}
                          placeholder="19:00"
                        />
                        <Input
                          type="time"
                          value={formData.schedules.night.end}
                          onChange={(e) => handleScheduleChange('night', 'end', e.target.value)}
                          placeholder="23:00"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm} className="hover:bg-stone-100">
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-gray-900 hover:bg-gray-800">
                    {editingCourse ? 'Atualizar' : 'Criar'} Curso
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="border border-gray-300 hover:shadow-md transition-shadow">
              <CardHeader className="border-b border-gray-200 bg-gray-50">
                <CardTitle className="text-lg text-black">{course.name}</CardTitle>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {course.description && (
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {course.description}
                  </p>
                )}

                {course.validity && (
                  <p className="text-xs text-gray-600 border-t pt-2">
                    Validade: {course.validity}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(course)}
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Tem certeza que deseja excluir "${course.name}"?`)) {
                        deleteMutation.mutate(course.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {courses.length === 0 && (
          <Card className="border border-gray-300">
            <CardContent className="p-16 text-center">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-bold text-black mb-2">Nenhum curso cadastrado</h3>
              <p className="text-gray-600 mb-6">Comece criando o primeiro curso do catálogo</p>
              <Button 
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="bg-gray-900 hover:bg-gray-800"
              >
                <Plus className="w-5 h-5 mr-2" />
                Criar Primeiro Curso
              </Button>
            </CardContent>
          </Card>
        )}

        {filteredCourses.length === 0 && courses.length > 0 && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <Search className="w-16 h-16 mx-auto mb-4 text-stone-300" />
              <p className="text-stone-600">Nenhum curso encontrado com "{searchTerm}"</p>
            </CardContent>
          </Card>
        )}

        {courses.length > 0 && (
          <div className="fixed bottom-8 right-8 z-50">
            <button 
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-6 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 shadow-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Novo Curso
            </button>
          </div>
        )}
      </div>
    </div>
  );
}