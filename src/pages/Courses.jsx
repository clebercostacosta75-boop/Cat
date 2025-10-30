import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, BookOpen, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CoursesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const queryClient = useQueryClient();

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Course.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setShowForm(false);
      setEditingCourse(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Course.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setShowForm(false);
      setEditingCourse(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Course.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });

  const [formData, setFormData] = useState({
    name: "",
    standard_value: "",
    duration_hours: "",
    description: "",
    modality: "Formação",
    category: "Curso Presencial"
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
    setFormData(course);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ 
      name: "", 
      standard_value: "", 
      duration_hours: "", 
      description: "", 
      modality: "Formação",
      category: "Curso Presencial" 
    });
    setEditingCourse(null);
    setShowForm(false);
  };

  const modalityColors = {
    'Formação': 'bg-blue-100 text-blue-800 border-blue-200',
    'Periódico': 'bg-purple-100 text-purple-800 border-purple-200',
  };

  const categoryColors = {
    'Curso Presencial': 'bg-green-100 text-green-800 border-green-200',
    'Curso Híbrido': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Curso On-line': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-stone-900">Cursos</h1>
            <p className="text-stone-600 mt-1">Catálogo de treinamentos disponíveis</p>
          </div>
          <Button 
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Curso
          </Button>
        </div>

        {showForm && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>{editingCourse ? 'Editar' : 'Novo'} Curso</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Curso</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Nome do treinamento"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="standard_value">Valor Padrão (R$)</Label>
                    <Input
                      id="standard_value"
                      type="number"
                      step="0.01"
                      value={formData.standard_value}
                      onChange={(e) => setFormData({...formData, standard_value: parseFloat(e.target.value)})}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration_hours">Duração (horas)</Label>
                    <Input
                      id="duration_hours"
                      type="number"
                      step="0.5"
                      value={formData.duration_hours}
                      onChange={(e) => setFormData({...formData, duration_hours: parseFloat(e.target.value)})}
                      placeholder="8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modality">📚 Modalidade</Label>
                    <Select 
                      value={formData.modality} 
                      onValueChange={(value) => setFormData({...formData, modality: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Formação">📚 Formação</SelectItem>
                        <SelectItem value="Periódico">🔄 Periódico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="category">🎓 Categoria</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData({...formData, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Curso Presencial">🏢 Curso Presencial</SelectItem>
                        <SelectItem value="Curso Híbrido">🔀 Curso Híbrido</SelectItem>
                        <SelectItem value="Curso On-line">💻 Curso On-line</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                    {editingCourse ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex gap-2">
                    {course.modality && (
                      <Badge className={`${modalityColors[course.modality]} border`}>
                        {course.modality === 'Formação' ? '📚' : '🔄'} {course.modality}
                      </Badge>
                    )}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-stone-900 mb-2">{course.name}</h3>

                {course.category && (
                  <Badge className={`${categoryColors[course.category]} border mb-3`}>
                    {course.category === 'Curso Presencial' && '🏢'}
                    {course.category === 'Curso Híbrido' && '🔀'}
                    {course.category === 'Curso On-line' && '💻'}
                    {' '}{course.category}
                  </Badge>
                )}

                {course.description && (
                  <p className="text-sm text-stone-600 mb-4 line-clamp-2">{course.description}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-stone-600">Valor Padrão:</span>
                    <span className="font-bold text-emerald-600">
                      R$ {(course.standard_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {course.duration_hours && (
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <Clock className="w-4 h-4" />
                      <span>{course.duration_hours}h de duração</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(course)}
                    className="flex-1"
                  >
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => deleteMutation.mutate(course.id)}
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {courses.length === 0 && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-stone-400" />
              </div>
              <p className="text-stone-600">Nenhum curso cadastrado</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}