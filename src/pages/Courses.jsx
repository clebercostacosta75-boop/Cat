import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, BookOpen, Clock, Download, DollarSign, X, Copy, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CoursesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
    initialData: [],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['courseCategories'],
    queryFn: () => base44.entities.CourseCategory.list(),
    initialData: [],
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Course.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setShowForm(false);
      setEditingCourse(null);
      alert('Curso criado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar:', error);
      alert('Erro ao criar curso: ' + (error.message || 'Tente novamente'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Course.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setShowForm(false);
      setEditingCourse(null);
      alert('Curso atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar:', error);
      alert('Erro ao atualizar curso: ' + (error.message || 'Tente novamente'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Course.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      alert('Curso excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir curso: ' + (error.message || 'Tente novamente'));
    }
  });

  const [formData, setFormData] = useState({
    name: "",
    duration_hours: "",
    description: "",
    modality: "Formação",
    category: "Presencial",
    validity: "",
    start_date: "",
    end_date: "",
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
      ...course,
      start_date: course.start_date || "",
      end_date: course.end_date || "",
      category: course.category || "Presencial",
      schedules: course.schedules || {
        morning: { start: "", end: "" },
        afternoon: { start: "", end: "" },
        night: { start: "", end: "" }
      }
    });
    setShowForm(true);
  };

  const handleDuplicate = async (course) => {
    try {
      const duplicatedCourse = {
        name: `${course.name} (Cópia)`,
        duration_hours: course.duration_hours || 0,
        description: course.description || "",
        modality: course.modality || "Formação",
        category: course.category || "",
        validity: course.validity || "",
        schedules: course.schedules || {
          morning: { start: "", end: "" },
          afternoon: { start: "", end: "" },
          night: { start: "", end: "" }
        }
      };
      
      await createMutation.mutateAsync(duplicatedCourse);
    } catch (error) {
      console.error('Erro ao duplicar curso:', error);
      alert('Erro ao duplicar curso. Tente novamente.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      duration_hours: "",
      description: "",
      modality: "Formação",
      category: "",
      validity: "",
      start_date: "",
      end_date: "",
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



  const exportCourses = () => {
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Cursos</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #000000; padding: 8px; }
          th { 
            background-color: #10B981; 
            color: #FFFFFF; 
            font-weight: bold; 
            text-align: center;
            font-size: 12pt;
          }
          td { text-align: left; font-size: 11pt; }
          .numero { text-align: right; }
          .titulo { 
            background-color: #065F46; 
            color: #FFFFFF; 
            font-size: 14pt; 
            font-weight: bold; 
            text-align: center; 
          }
          .subtitulo { 
            background-color: #ECFDF5; 
            font-size: 10pt; 
            text-align: center; 
            color: #374151;
          }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="6" class="titulo">CATÁLOGO DE CURSOS - CAT</td>
          </tr>
          <tr>
            <td colspan="6" class="subtitulo">Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</td>
          </tr>
          <tr><td colspan="6"></td></tr>
          <tr>
            <th style="width: 300px;">Nome</th>
            <th style="width: 120px;">Modalidade</th>
            <th style="width: 150px;">Categoria</th>
            <th style="width: 100px;">Carga Horária</th>
            <th style="width: 100px;">Validade</th>
          </tr>
          ${courses.map(c => `
            <tr>
              <td>${c.name || ''}</td>
              <td>${c.modality || ''}</td>
              <td>${c.category || ''}</td>
              <td class="numero">${c.duration_hours ? c.duration_hours + 'h' : ''}</td>
              <td>${c.validity || ''}</td>
            </tr>
          `).join('')}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cursos_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
  };



  const modalityColors = {
    'Formação': 'bg-blue-100 text-blue-800 border-blue-200',
    'Periódico': 'bg-purple-100 text-purple-800 border-purple-200',
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Logo e Título */}
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
          <div className="flex-shrink-0">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png"
              alt="CAT Logo"
              className="h-24 w-auto"
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-stone-900">Cursos</h1>
            <p className="text-stone-600 mt-1">Catálogo de treinamentos disponíveis</p>
          </div>
          <div className="flex gap-3 items-center">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
                              <Input
                                placeholder="Pesquisar curso..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 w-64"
                              />
                            </div>
                            <Button
                              onClick={exportCourses}
                              variant="outline"
                              disabled={courses.length === 0}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Exportar Lista
                            </Button>
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
        </div>

        {showForm && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>{editingCourse ? 'Editar' : 'Novo'} Curso</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Informações Gerais */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-stone-900">Informações Gerais</h3>
                  <div className="grid md:grid-cols-2 gap-4">
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
                      <Label htmlFor="duration_hours">Carga Horária (horas) *</Label>
                      <Input
                        id="duration_hours"
                        type="number"
                        step="0.5"
                        value={formData.duration_hours}
                        onChange={(e) => setFormData({...formData, duration_hours: parseFloat(e.target.value)})}
                        placeholder="8"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="modality">Modalidade</Label>
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
                    <div className="space-y-2">
                      <Label htmlFor="category">Categoria</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({...formData, category: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Presencial">🏢 Presencial</SelectItem>
                          <SelectItem value="Híbrido">🔀 Híbrido</SelectItem>
                          <SelectItem value="Online">💻 Online</SelectItem>
                        </SelectContent>
                      </Select>
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
                          <Label htmlFor="start_date">Data de Início</Label>
                          <Input
                            id="start_date"
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="end_date">Data de Fim</Label>
                          <Input
                            id="end_date"
                            type="date"
                            value={formData.end_date}
                            onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                          />
                        </div>
                      </div>
                      </div>

                {/* Horários Padrão */}
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

                <div className="space-y-2 border-t pt-4">
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
                    {courses
                      .filter((course) =>
                        course.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        course.modality?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        course.category?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((course) => (
            <Card key={course.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex gap-2 flex-wrap">
                      {course.modality && (
                        <Badge className={`${modalityColors[course.modality]} border`}>
                          {course.modality === 'Formação' ? '📚' : '🔄'} {course.modality}
                        </Badge>
                      )}
                      {course.category && (
                        <Badge variant="outline" className="border-stone-300">
                          {course.category === 'Presencial' ? '🏢' : course.category === 'Híbrido' ? '🔀' : '💻'} {course.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-stone-900 mb-2">{course.name}</h3>

                {course.category && (
                  <Badge variant="outline" className="mb-3">
                    {course.category}
                  </Badge>
                )}

                {course.description && (
                  <p className="text-sm text-stone-600 mb-4 line-clamp-2">{course.description}</p>
                )}

                <div className="space-y-2 mb-4">
                  {course.duration_hours && (
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <Clock className="w-4 h-4" />
                      <span>{course.duration_hours}h de duração</span>
                    </div>
                  )}

                  {course.validity && (
                      <div className="text-sm text-stone-600">
                        ⏱️ Validade: {course.validity}
                      </div>
                    )}

                    {(course.start_date || course.end_date) && (
                      <div className="text-sm text-stone-600">
                        📅 Período: {course.start_date || '—'} a {course.end_date || '—'}
                      </div>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(course)}
                    className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    disabled={createMutation.isPending}
                    title="Duplicar este curso"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(course)}
                    className="w-full text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    title="Editar este curso"
                  >
                    ✏️
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
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Excluir este curso"
                  >
                    🗑️
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