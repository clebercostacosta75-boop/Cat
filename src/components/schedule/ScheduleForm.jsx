import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ScheduleForm({ schedule, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    training_name: "",
    instructor_name: "",
    company: "",
    month: "",
    date: "",
    start_time: "",
    end_time: "",
    hours: "",
    instructor_cost: "",
    standard_value: "",
    participants: "",
    status: "Planejado",
    location: "",
    room: "",
    logistics: "",
    pedagogical_content: "",
    payment_date: "",
    payment_status: "Pendente",
    company_contact_email: "",
    company_contact_phone: "",
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

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    initialData: [],
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Buscar cursos disponíveis da empresa selecionada
  const getAvailableCoursesForCompany = () => {
    const selectedCompany = companies.find(c => c.nome_fantasia === formData.company);
    if (!selectedCompany || !selectedCompany.company_courses) {
      return [];
    }
    return selectedCompany.company_courses;
  };

  const handleCompanySelect = (companyName) => {
    setFormData(prev => ({
      ...prev,
      company: companyName,
      training_name: "", // Reset course selection when company changes
      hours: "",
      standard_value: ""
    }));
  };

  const handleCourseSelect = (courseName) => {
    const selectedCompany = companies.find(c => c.nome_fantasia === formData.company);
    
    if (selectedCompany && selectedCompany.company_courses) {
      // Buscar o curso na lista de cursos da empresa
      const companyCourse = selectedCompany.company_courses.find(c => c.course_name === courseName);
      
      if (companyCourse) {
        // Preencher automaticamente com dados do curso vinculado à empresa
        const baseCourse = courses.find(c => c.name === courseName);
        
        setFormData(prev => ({
          ...prev,
          training_name: courseName,
          hours: companyCourse.workload_hours || 0,
          standard_value: companyCourse.specific_price || 0,
          pedagogical_content: baseCourse?.description || prev.pedagogical_content
        }));
      }
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

  const availableCompanyCourses = getAvailableCoursesForCompany();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Básico</TabsTrigger>
          <TabsTrigger value="logistics">Logística</TabsTrigger>
          <TabsTrigger value="pedagogical">Pedagógico</TabsTrigger>
          <TabsTrigger value="payment">Pagamento</TabsTrigger>
        </TabsList>

        {/* ABA BÁSICA */}
        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Empresa *</Label>
              <Select value={formData.company} onValueChange={handleCompanySelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.nome_fantasia}>
                      {company.nome_fantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="training_name">Treinamento *</Label>
              <Select 
                value={formData.training_name} 
                onValueChange={handleCourseSelect}
                disabled={!formData.company}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.company ? "Selecione o curso" : "Selecione uma empresa primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {availableCompanyCourses.map((course, idx) => (
                    <SelectItem key={idx} value={course.course_name}>
                      {course.course_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label htmlFor="start_time">Horário Início</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => handleChange('start_time', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">Horário Término</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => handleChange('end_time', e.target.value)}
              />
            </div>

            <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <Label className="text-gray-700">Carga Horária (Automático)</Label>
              <div className="text-2xl font-bold text-gray-900">
                {formData.hours || 0}h
              </div>
              <p className="text-xs text-gray-500">
                Preenchido automaticamente ao selecionar empresa e curso
              </p>
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

            <div className="space-y-2">
              <Label htmlFor="company_contact_email">E-mail Empresa</Label>
              <Input
                id="company_contact_email"
                type="email"
                value={formData.company_contact_email}
                onChange={(e) => handleChange('company_contact_email', e.target.value)}
                placeholder="contato@empresa.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_contact_phone">WhatsApp Empresa</Label>
              <Input
                id="company_contact_phone"
                value={formData.company_contact_phone}
                onChange={(e) => handleChange('company_contact_phone', e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
        </TabsContent>

        {/* ABA LOGÍSTICA */}
        <TabsContent value="logistics" className="space-y-4 mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location">Local (Endereço Completo)</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="Rua, número, cidade, estado"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="room">Sala/Auditório</Label>
              <Input
                id="room"
                value={formData.room}
                onChange={(e) => handleChange('room', e.target.value)}
                placeholder="Ex: Sala 301, Auditório Principal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logistics">Logística e Infraestrutura</Label>
              <Textarea
                id="logistics"
                value={formData.logistics}
                onChange={(e) => handleChange('logistics', e.target.value)}
                placeholder="Descreva: materiais necessários, equipamentos (projetor, som), coffee break, estacionamento, etc."
                rows={6}
              />
            </div>
          </div>
        </TabsContent>

        {/* ABA PEDAGÓGICA */}
        <TabsContent value="pedagogical" className="space-y-4 mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pedagogical_content">Conteúdo Programático</Label>
              <Textarea
                id="pedagogical_content"
                value={formData.pedagogical_content}
                onChange={(e) => handleChange('pedagogical_content', e.target.value)}
                placeholder="Descreva os objetivos, tópicos que serão abordados, metodologia, resultados esperados..."
                rows={10}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações Gerais</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Informações adicionais, requisitos especiais, etc."
                rows={4}
              />
            </div>
          </div>
        </TabsContent>

        {/* ABA PAGAMENTO */}
        <TabsContent value="payment" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
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

            <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <Label className="text-gray-700">Valor Padrão (Automático)</Label>
              <div className="text-2xl font-bold text-gray-900">
                R$ {(formData.standard_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-gray-500">
                Preenchido automaticamente ao selecionar empresa e curso
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_date">Data Prevista de Pagamento</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => handleChange('payment_date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_status">Status do Pagamento</Label>
              <Select value={formData.payment_status} onValueChange={(value) => handleChange('payment_status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Agendado">Agendado</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 p-4 bg-stone-100 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-stone-600">Diferença de Custo:</span>
                <span className={`text-lg font-bold ${((formData.instructor_cost || 0) - (formData.standard_value || 0)) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {((formData.instructor_cost || 0) - (formData.standard_value || 0)) >= 0 ? '+' : ''}
                  R$ {((formData.instructor_cost || 0) - (formData.standard_value || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 pt-4 border-t">
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