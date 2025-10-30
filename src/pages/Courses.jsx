
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, BookOpen, Clock, Download, DollarSign, X } from "lucide-react";
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
    category: "",
    validity: "",
    schedules: {
      morning: { start: "", end: "" },
      afternoon: { start: "", end: "" },
      night: { start: "", end: "" }
    },
    company_prices: []
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
      schedules: course.schedules || {
        morning: { start: "", end: "" },
        afternoon: { start: "", end: "" },
        night: { start: "", end: "" }
      },
      company_prices: course.company_prices || []
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      standard_value: "",
      duration_hours: "",
      description: "",
      modality: "Formação",
      category: "",
      validity: "",
      schedules: {
        morning: { start: "", end: "" },
        afternoon: { start: "", end: "" },
        night: { start: "", end: "" }
      },
      company_prices: []
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

  const handleAddCompanyPrice = () => {
    setFormData({
      ...formData,
      company_prices: [
        ...formData.company_prices,
        { company_name: "", company_id: "", negotiated_value: 0 }
      ]
    });
  };

  const handleRemoveCompanyPrice = (index) => {
    setFormData({
      ...formData,
      company_prices: formData.company_prices.filter((_, i) => i !== index)
    });
  };

  const handleCompanyPriceChange = (index, field, value) => {
    const updated = [...formData.company_prices];

    if (field === 'company_id') {
      const company = companies.find(c => c.id === value);
      updated[index] = {
        ...updated[index],
        company_id: value,
        company_name: company ? company.name : ''
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }

    setFormData({ ...formData, company_prices: updated });
  };

  const exportCourses = () => {
    const csv = [
      ['Nome', 'Modalidade', 'Categoria', 'Carga Horária', 'Validade', 'Valor Padrão'].join(','),
      ...courses.map(c => [
        c.name,
        c.modality || '',
        c.category || '',
        c.duration_hours || '',
        c.validity || '',
        c.standard_value || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'cursos.csv';
    link.click();
  };

  const exportCoursePrices = (course) => {
    const prices = [
      { company: 'Padrão (Tabela)', value: course.standard_value || 0 },
      ...(course.company_prices || []).map(cp => ({
        company: cp.company_name,
        value: cp.negotiated_value
      }))
    ];

    const csv = [
      ['Empresa', 'Valor'].join(','),
      ...prices.map(p => [p.company, p.value].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `precos_${course.name.replace(/\s+/g, '_')}.csv`;
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
          <div className="flex gap-2 mt-4 md:mt-0"> {/* Added mt-4 md:mt-0 for spacing on small screens */}
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
                      <Label htmlFor="modality">Tipo de Treinamento</Label>
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
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.name}>
                              {cat.icon && `${cat.icon} `}{cat.name}
                            </SelectItem>
                          ))}
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

                {/* Precificação */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-stone-900">Sistema de Precificação</h3>
                  <div className="space-y-2">
                    <Label htmlFor="standard_value">Valor Padrão (Preço de Tabela) *</Label>
                    <Input
                      id="standard_value"
                      type="number"
                      step="0.01"
                      value={formData.standard_value}
                      onChange={(e) => setFormData({...formData, standard_value: parseFloat(e.target.value)})}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Preços por Empresa</Label>
                      <Button type="button" onClick={handleAddCompanyPrice} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar Valor Específico
                      </Button>
                    </div>

                    {formData.company_prices.map((cp, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1 space-y-2">
                          <Label>Empresa</Label>
                          <Select
                            value={cp.company_id}
                            onValueChange={(value) => handleCompanyPriceChange(index, 'company_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {companies.map(company => (
                                <SelectItem key={company.id} value={company.id}>
                                  {company.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label>Valor Negociado (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={cp.negotiated_value}
                            onChange={(e) => handleCompanyPriceChange(index, 'negotiated_value', parseFloat(e.target.value))}
                            placeholder="0.00"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCompanyPrice(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
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
                  <Badge variant="outline" className="mb-3">
                    {course.category}
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

                  {course.validity && (
                    <div className="text-sm text-stone-600">
                      ⏱️ Validade: {course.validity}
                    </div>
                  )}

                  {course.company_prices && course.company_prices.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <DollarSign className="w-4 h-4" />
                      <span>{course.company_prices.length} preço(s) específico(s)</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportCoursePrices(course)}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Exportar Preços
                  </Button>
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
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
