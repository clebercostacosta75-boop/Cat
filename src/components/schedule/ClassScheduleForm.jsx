
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ClassScheduleForm({ classSchedule, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    training_name: "",
    company_name: "",
    location: "",
    students_count: "",
    status: "Agendado",
    start_date: "",
    end_date: "",
    specific_days: "",
    training_schedule: "",
    instructor_name: "",
    modality: "",
    category: "",
    duration_hours: "",
    month: "",
    notes: "",
    ...classSchedule
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
    initialData: [],
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    initialData: [],
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => base44.entities.Instructor.list(),
    initialData: [],
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCourseSelect = (courseName) => {
    const course = courses.find(c => c.name === courseName);
    if (course) {
      setFormData(prev => ({
        ...prev,
        training_name: courseName,
        modality: course.modality || '',
        category: course.category || '',
        duration_hours: course.duration_hours || 0
      }));
    }
  };

  // Calcular o mês automaticamente quando a data de início mudar
  useEffect(() => {
    if (formData.start_date) {
      const date = new Date(formData.start_date);
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const month = `${monthNames[date.getMonth()]}/${date.getFullYear()}`;
      setFormData(prev => ({ ...prev, month }));
    }
  }, [formData.start_date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Submeter o formulário
    await onSubmit(formData);
    
    // Notificar admins sobre a alteração
    try {
      const action = classSchedule ? 'updated' : 'created';
      await base44.functions.invoke('notificarAdmins', {
        action,
        entity_type: 'ClassSchedule',
        entity_id: classSchedule?.id,
        entity_name: formData.training_name,
        details: `Empresa: ${formData.company_name}\nData: ${formData.start_date}\nInstrutor: ${formData.instructor_name}`
      });
    } catch (error) {
      console.error('Erro ao notificar admins:', error);
    }
  };

  // Função para adicionar emoji baseado no valor
  const getModalityDisplay = (value) => {
    if (value === 'Formação') return '📚 Formação';
    if (value === 'Periódico') return '🔄 Periódico';
    return value;
  };

  const getCategoryDisplay = (value) => {
    if (value === 'Presencial') return '🏢 Presencial';
    if (value === 'Híbrido') return '🔀 Híbrido';
    if (value === 'Online') return '💻 Online';
    return value;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="training_name">Treinamento *</Label>
          <Select value={formData.training_name} onValueChange={handleCourseSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o curso" />
            </SelectTrigger>
            <SelectContent>
              {courses.map(course => (
                <SelectItem key={course.id} value={course.name}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_name">Empresa *</Label>
          <Select value={formData.company_name} onValueChange={(value) => handleChange('company_name', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a empresa" />
            </SelectTrigger>
            <SelectContent>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.name}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Local</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="Ex: Tailândia, Belém"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="students_count">Número de Alunos</Label>
          <Input
            id="students_count"
            type="number"
            value={formData.students_count}
            onChange={(e) => handleChange('students_count', parseInt(e.target.value) || 0)}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Agendado">Agendado</SelectItem>
              <SelectItem value="Em Andamento">Em Andamento</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="start_date">Data de Início *</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => handleChange('start_date', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">Data de Finalização</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => handleChange('end_date', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="specific_days">Dias em Específico</Label>
          <Input
            id="specific_days"
            value={formData.specific_days}
            onChange={(e) => handleChange('specific_days', e.target.value)}
            placeholder="Ex: Segunda, Quarta, Sexta"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="training_schedule">Horário do Treinamento</Label>
          <Input
            id="training_schedule"
            value={formData.training_schedule}
            onChange={(e) => handleChange('training_schedule', e.target.value)}
            placeholder="Ex: 07:00 às 12:00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructor_name">Instrutor</Label>
          <Select value={formData.instructor_name} onValueChange={(value) => handleChange('instructor_name', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o instrutor" />
            </SelectTrigger>
            <SelectContent>
              {instructors.map(instructor => (
                <SelectItem key={instructor.id} value={instructor.name}>
                  👨‍🏫 {instructor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Campos Automáticos (Somente Leitura) */}
      <div className="border-t pt-4">
        <h3 className="font-semibold text-stone-900 mb-3">Informações Automáticas do Curso</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Modalidade</Label>
            <Input 
              value={formData.modality ? getModalityDisplay(formData.modality) : ''} 
              readOnly 
              className="bg-stone-50" 
              placeholder="Formação/Periódico" 
            />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Input 
              value={formData.category ? getCategoryDisplay(formData.category) : ''} 
              readOnly 
              className="bg-stone-50" 
              placeholder="Presencial/Híbrido/Online" 
            />
          </div>
          <div className="space-y-2">
            <Label>HR (Carga Horária)</Label>
            <Input value={formData.duration_hours} readOnly className="bg-stone-50" />
          </div>
          <div className="space-y-2">
            <Label>Mês</Label>
            <Input value={formData.month} readOnly className="bg-stone-50" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Observações gerais sobre a turma"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
          {classSchedule ? 'Atualizar' : 'Criar'} Turma
        </Button>
      </div>
    </form>
  );
}
