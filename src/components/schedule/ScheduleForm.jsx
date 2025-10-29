import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ScheduleForm({ schedule, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    training_name: "",
    instructor_name: "",
    company: "",
    month: "",
    date: "",
    hours: "",
    instructor_cost: "",
    standard_value: "",
    participants: "",
    status: "Planejado",
    notes: "",
    ...schedule
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => base44.entities.Instructor.list(),
    initialData: [],
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
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
        standard_value: course.standard_value || 0,
        hours: course.duration_hours || prev.hours
      }));
    }
  };

  const handleInstructorSelect = (instructorName) => {
    const instructor = instructors.find(i => i.name === instructorName);
    if (instructor && formData.hours) {
      setFormData(prev => ({
        ...prev,
        instructor_name: instructorName,
        instructor_cost: (instructor.hourly_rate || 0) * (prev.hours || 0)
      }));
    } else {
      setFormData(prev => ({ ...prev, instructor_name: instructorName }));
    }
  };

  useEffect(() => {
    if (formData.instructor_name && formData.hours) {
      const instructor = instructors.find(i => i.name === formData.instructor_name);
      if (instructor) {
        setFormData(prev => ({
          ...prev,
          instructor_cost: (instructor.hourly_rate || 0) * (prev.hours || 0)
        }));
      }
    }
  }, [formData.hours, formData.instructor_name, instructors]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="training_name">Treinamento</Label>
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
          <Input
            id="training_name"
            value={formData.training_name}
            onChange={(e) => handleChange('training_name', e.target.value)}
            placeholder="Ou digite o nome do treinamento"
            className="mt-2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructor_name">Instrutor</Label>
          <Select value={formData.instructor_name} onValueChange={handleInstructorSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o instrutor" />
            </SelectTrigger>
            <SelectContent>
              {instructors.map(instructor => (
                <SelectItem key={instructor.id} value={instructor.name}>
                  {instructor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company">Empresa</Label>
          <Input
            id="company"
            value={formData.company}
            onChange={(e) => handleChange('company', e.target.value)}
            placeholder="Nome da empresa"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="month">Mês</Label>
          <Input
            id="month"
            value={formData.month}
            onChange={(e) => handleChange('month', e.target.value)}
            placeholder="Ex: Janeiro/2024"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Data</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hours">Horas</Label>
          <Input
            id="hours"
            type="number"
            step="0.5"
            value={formData.hours}
            onChange={(e) => handleChange('hours', parseFloat(e.target.value))}
            placeholder="Quantidade de horas"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructor_cost">Custo Instrutor (HP)</Label>
          <Input
            id="instructor_cost"
            type="number"
            step="0.01"
            value={formData.instructor_cost}
            onChange={(e) => handleChange('instructor_cost', parseFloat(e.target.value))}
            placeholder="Custo do instrutor"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="standard_value">Valor Padrão</Label>
          <Input
            id="standard_value"
            type="number"
            step="0.01"
            value={formData.standard_value}
            onChange={(e) => handleChange('standard_value', parseFloat(e.target.value))}
            placeholder="Valor padrão do curso"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="participants">Participantes</Label>
          <Input
            id="participants"
            type="number"
            value={formData.participants}
            onChange={(e) => handleChange('participants', parseInt(e.target.value))}
            placeholder="Número de participantes"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Planejado">Planejado</SelectItem>
              <SelectItem value="Confirmado">Confirmado</SelectItem>
              <SelectItem value="Realizado">Realizado</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Notas adicionais"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
          {schedule ? 'Atualizar' : 'Criar'} Treinamento
        </Button>
      </div>
    </form>
  );
}