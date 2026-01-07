import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, ExternalLink } from "lucide-react";
import PaymentInstallmentsForm from "./PaymentInstallmentsForm";

export default function ClassScheduleForm({ classSchedule, onSubmit, onCancel }) {

  const [formData, setFormData] = useState({
    training_name: "",
    training_id: "",
    company_name: "",
    company_id: "",
    location: "",
    students_count: "",
    status: "Agendado",
    start_date: "",
    end_date: "",
    specific_days: "",
    training_schedule: "",
    instructor_name: "",
    instructor_id: "",
    modality: "",
    category: "",
    duration_hours: "",
    month: "",
    unit_value: 0,
    notes: "",
    instructor_payment_value: 0,
    payment_status: "Pendente",
    payment_installments: [],
    ...classSchedule
  });

  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState(null);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourseDetails, setSelectedCourseDetails] = useState(null);

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

  const handleCompanySelect = async (companyId) => {
    const selectedCompany = companies.find(c => c.id === companyId);
    if (selectedCompany) {
      handleChange('company_id', companyId);
      handleChange('company_name', selectedCompany.nome_fantasia || selectedCompany.razao_social);
      
      // Buscar detalhes completos da empresa incluindo company_courses
      try {
        const companyDetails = await base44.entities.Company.get(companyId);
        setSelectedCompanyDetails(companyDetails);
        
        // Se a empresa tem cursos personalizados, usar esses
        if (companyDetails.company_courses && companyDetails.company_courses.length > 0) {
          setAvailableCourses(companyDetails.company_courses);
        } else {
          // Senão, mostrar todos os cursos
          setAvailableCourses(courses);
        }
      } catch (error) {
        console.error('Erro ao buscar detalhes da empresa:', error);
        setAvailableCourses(courses);
      }
    }
  };

  const handleCourseSelect = (courseIdOrName) => {
    let courseDetails = null;
    
    // Verificar se é um curso personalizado da empresa
    if (selectedCompanyDetails?.company_courses && selectedCompanyDetails.company_courses.length > 0) {
      const companyCourse = selectedCompanyDetails.company_courses.find(
        c => c.course_id === courseIdOrName || c.course_name === courseIdOrName
      );
      
      if (companyCourse) {
        courseDetails = {
          practical_hours: companyCourse.practical_hours || companyCourse.workload_hours || 0,
          theoretical_hours: companyCourse.theoretical_hours || 0
        };
        
        setFormData(prev => ({
          ...prev,
          training_id: companyCourse.course_id,
          training_name: companyCourse.course_name,
          modality: companyCourse.modality === 'Presencial' ? 'Formação' : 
                    companyCourse.modality === 'Online' ? 'Periódico' : 'Formação',
          category: companyCourse.modality || '',
          duration_hours: companyCourse.workload_hours || 0,
          unit_value: companyCourse.specific_price || 0
        }));
        setSelectedCourseDetails(courseDetails);
        return;
      }
    }
    
    // Fallback para curso padrão
    const course = courses.find(c => c.id === courseIdOrName);
    if (course) {
      courseDetails = {
        practical_hours: course.practical_hours || course.duration_hours || 0,
        theoretical_hours: course.theoretical_hours || 0
      };
      
      setFormData(prev => ({
        ...prev,
        training_id: courseIdOrName,
        training_name: course.name,
        modality: course.modality || '',
        category: course.training_type || '',
        duration_hours: course.duration_hours || 0,
        unit_value: course.standard_value || 0
      }));
      setSelectedCourseDetails(courseDetails);
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

  // Calcular valor total automaticamente
  useEffect(() => {
    const unitValue = parseFloat(formData.unit_value) || 0;
    const studentsCount = parseInt(formData.students_count) || 0;
    const totalValue = unitValue * studentsCount;
    
    setFormData(prev => ({
      ...prev,
      total_value: totalValue
    }));
  }, [formData.unit_value, formData.students_count]);

  // Calcular valor do instrutor e criar parcelas automaticamente
  useEffect(() => {
    if (formData.instructor_id && selectedCourseDetails) {
      const selectedInstructor = instructors.find(i => i.id === formData.instructor_id);
      if (selectedInstructor && selectedInstructor.hourly_rate) {
        const practicalHours = selectedCourseDetails.practical_hours || 0;
        const instructorPayment = selectedInstructor.hourly_rate * practicalHours;
        
        // Criar parcelas automaticamente (2x com 30 e 60 dias)
        const today = new Date();
        const firstDueDate = new Date(today);
        firstDueDate.setDate(today.getDate() + 30);
        
        const secondDueDate = new Date(today);
        secondDueDate.setDate(today.getDate() + 60);
        
        const halfAmount = instructorPayment / 2;
        
        const newInstallments = [
          {
            installment_number: 1,
            amount: halfAmount,
            due_date: firstDueDate.toISOString().split('T')[0],
            status: "Pendente",
            paid_date: "",
            proof_of_payment_url: "",
            notes: ""
          },
          {
            installment_number: 2,
            amount: halfAmount,
            due_date: secondDueDate.toISOString().split('T')[0],
            status: "Pendente",
            paid_date: "",
            proof_of_payment_url: "",
            notes: ""
          }
        ];
        
        setFormData(prev => ({
          ...prev,
          instructor_payment_value: instructorPayment,
          payment_installments: prev.payment_installments?.length > 0 ? prev.payment_installments : newInstallments
        }));
      }
    }
  }, [formData.instructor_id, selectedCourseDetails, instructors]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Submeter o formulário
    onSubmit(formData);
    
    // Notificar admins sobre a alteração (em background)
    try {
      const action = classSchedule ? 'updated' : 'created';
      base44.functions.invoke('notificarAdmins', {
        action,
        entity_type: 'ClassSchedule',
        entity_id: classSchedule?.id,
        entity_name: formData.training_name,
        details: `Empresa: ${formData.company_name}\nData: ${formData.start_date}\nInstrutor: ${formData.instructor_name}`
      }).catch(err => console.error('Erro ao notificar admins:', err));
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
          <Label htmlFor="company_name">Empresa *</Label>
          <Select value={formData.company_id} onValueChange={handleCompanySelect}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a empresa primeiro" />
            </SelectTrigger>
            <SelectContent>
              {companies.filter(c => c.id && c.id.trim() !== '').map(company => (
                <SelectItem key={company.id} value={company.id}>
                  🏢 {company.nome_fantasia || company.razao_social}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="training_name">Treinamento *</Label>
          <Select 
            value={formData.training_id} 
            onValueChange={handleCourseSelect}
            disabled={!formData.company_id}
          >
            <SelectTrigger>
              <SelectValue placeholder={formData.company_id ? "Selecione o curso" : "Selecione uma empresa primeiro"} />
            </SelectTrigger>
            <SelectContent>
              {availableCourses.length > 0 ? (
                availableCourses.map((course, idx) => (
                  <SelectItem 
                    key={course.course_id || course.id || idx} 
                    value={course.course_id || course.id}
                  >
                    📚 {course.course_name || course.name}
                    {course.specific_price && (
                      <span className="text-xs text-emerald-600 ml-2">
                        (R$ {Number(course.specific_price).toFixed(2)})
                      </span>
                    )}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-courses" disabled>
                  Nenhum curso disponível
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {selectedCompanyDetails?.company_courses && selectedCompanyDetails.company_courses.length > 0 && (
            <p className="text-xs text-emerald-600">
              ✓ Exibindo {selectedCompanyDetails.company_courses.length} curso(s) personalizado(s) para esta empresa
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Local</Label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="Digite o endereço..."
                className="pl-10"
              />
            </div>
            {formData.location && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const encoded = encodeURIComponent(formData.location);
                  window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
                }}
                title="Abrir no Google Maps"
              >
                <ExternalLink className="w-4 h-4 text-blue-600" />
              </Button>
            )}
          </div>
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
          <Select value={formData.instructor_id} onValueChange={(value) => {
            const selectedInstructor = instructors.find(inst => inst.id === value);
            if (selectedInstructor) {
              handleChange('instructor_id', value);
              handleChange('instructor_name', selectedInstructor.name);
            }
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o instrutor" />
            </SelectTrigger>
            <SelectContent>
              {instructors.map(instructor => (
                <SelectItem key={instructor.id} value={instructor.id}>
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
            <Select value={formData.modality} onValueChange={(value) => handleChange('modality', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a modalidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Formação">📚 Formação</SelectItem>
                <SelectItem value="Periódico">🔄 Periódico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
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
            <Label>HR (Carga Horária)</Label>
            <Input 
              type="number"
              value={formData.duration_hours} 
              onChange={(e) => handleChange('duration_hours', parseFloat(e.target.value))}
              placeholder="Ex: 8, 40"
              readOnly
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit_value">Valor Unitário (R$)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">R$</span>
              <Input
                id="unit_value"
                type="text"
                value={formData.unit_value ? Number(formData.unit_value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/[^\d]/g, '');
                  const numericValue = rawValue === '' ? 0 : parseFloat(rawValue) / 100;
                  handleChange('unit_value', numericValue);
                }}
                placeholder="0,00"
                className="pl-10 text-right"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Valor Total (R$)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">R$</span>
              <Input
                type="text"
                value={formData.total_value ? Number(formData.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}
                readOnly
                className="pl-10 text-right bg-stone-50"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Mês</Label>
            <div className="flex gap-2">
              <Select 
                value={formData.month?.split('/')[0] || ''} 
                onValueChange={(monthName) => {
                  const year = formData.month?.split('/')[1] || new Date().getFullYear().toString();
                  handleChange('month', `${monthName}/${year}`);
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select 
                value={formData.month?.split('/')[1] || ''} 
                onValueChange={(year) => {
                  const monthName = formData.month?.split('/')[0] || 'Janeiro';
                  handleChange('month', `${monthName}/${year}`);
                }}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027, 2028].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Pagamento do Instrutor */}
      {formData.instructor_id && selectedCourseDetails && (
        <div className="border-t pt-4">
          <h3 className="font-semibold text-stone-900 mb-3">Pagamento do Instrutor</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Valor Total do Instrutor (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">R$</span>
                <Input
                  type="text"
                  value={formData.instructor_payment_value ? Number(formData.instructor_payment_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                  readOnly
                  className="pl-10 text-right bg-emerald-50 font-semibold text-emerald-700"
                />
              </div>
              <p className="text-xs text-gray-500">
                Calculado: {instructors.find(i => i.id === formData.instructor_id)?.hourly_rate || 0} R$/h × {selectedCourseDetails.practical_hours} horas
              </p>
            </div>
            <div className="space-y-2">
              <Label>Status de Pagamento</Label>
              <Select value={formData.payment_status} onValueChange={(value) => handleChange('payment_status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">⏳ Pendente</SelectItem>
                  <SelectItem value="Parcialmente Pago">💰 Parcialmente Pago</SelectItem>
                  <SelectItem value="Pago">✅ Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <PaymentInstallmentsForm
            installments={formData.payment_installments || []}
            onChange={(installments) => handleChange('payment_installments', installments)}
            instructorPaymentValue={formData.instructor_payment_value}
          />
        </div>
      )}

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