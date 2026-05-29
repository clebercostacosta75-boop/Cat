import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, BookOpen, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { calculateCourseBilling } from "@/lib/billingCalculations";

export default function CompanyCoursesForm({ companyCourses, courses, onChange }) {
  const handleAddCourse = () => {
    onChange([
      ...companyCourses,
      {
        course_id: "",
        course_name: "",
        workload_hours: 0,
        modality: "Presencial",
        theoretical_hours: 0,
        practical_hours: 0,
        billing_type: "per_student",
        specific_price: 0,
        class_fixed_value: 0,
        included_students_limit: 15,
        extra_student_unit_value: 0
      }
    ]);
  };

  const handleRemoveCourse = (index) => {
    onChange(companyCourses.filter((_, i) => i !== index));
  };

  const handleCourseChange = (index, field, value) => {
    const updated = [...companyCourses];
    
    // Se mudou o curso, atualizar também o nome e valores padrão
    if (field === 'course_id') {
      const selectedCourse = courses.find(c => c.id === value);
      if (selectedCourse) {
        updated[index] = {
          ...updated[index],
          course_id: value,
          course_name: selectedCourse.name,
          workload_hours: selectedCourse.duration_hours || 0,
          modality: selectedCourse.training_type || "Presencial",
          theoretical_hours: selectedCourse.theoretical_hours || 0,
          practical_hours: selectedCourse.practical_hours || 0,
          billing_type: "per_student",
          specific_price: selectedCourse.standard_value || 0,
          class_fixed_value: 0,
          included_students_limit: 15,
          extra_student_unit_value: 0
        };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {companyCourses.length === 0 ? (
        <div className="text-center py-8 text-stone-500">
          <BookOpen className="w-12 h-12 mx-auto mb-2 text-stone-300" />
          <p>Nenhum curso cadastrado para esta empresa</p>
          <p className="text-sm">Clique em "Adicionar Curso" para começar</p>
        </div>
      ) : (
        companyCourses.map((course, index) => (
          <Card key={index} className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-4">
                <h4 className="font-semibold text-stone-900">Curso {index + 1}</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveCourse(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Curso *</Label>
                  <Select 
                    value={course.course_id} 
                    onValueChange={(value) => handleCourseChange(index, 'course_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o curso" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.filter(c => c.id && c.id.trim() !== '').map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          📚 {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Carga Horária Total (horas) *</Label>
                  <Input
                    type="number"
                    value={course.workload_hours}
                    onChange={(e) => handleCourseChange(index, 'workload_hours', parseFloat(e.target.value) || 0)}
                    placeholder="Ex: 8"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modalidade *</Label>
                  <Select 
                    value={course.modality} 
                    onValueChange={(value) => handleCourseChange(index, 'modality', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Presencial">🏢 Presencial</SelectItem>
                      <SelectItem value="Híbrido">🔄 Híbrido</SelectItem>
                      <SelectItem value="Online">💻 Online</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Cobrança *</Label>
                  <Select 
                    value={course.billing_type || 'per_student'} 
                    onValueChange={(value) => handleCourseChange(index, 'billing_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_student">💰 Valor unitário por aluno</SelectItem>
                      <SelectItem value="per_closed_class">📦 Valor por turma fechada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Campos adicionais para modalidade Híbrido */}
               {course.modality === 'Híbrido' && (
                 <div className="grid md:grid-cols-2 gap-3 mt-3 pt-3 border-t">
                   <div className="space-y-2">
                     <Label>Carga Horária EAD (horas)</Label>
                     <Input
                       type="number"
                       value={course.theoretical_hours || 0}
                       onChange={(e) => handleCourseChange(index, 'theoretical_hours', parseFloat(e.target.value) || 0)}
                       placeholder="Ex: 4"
                     />
                   </div>
                   <div className="space-y-2">
                     <Label>Carga Horária Presencial (horas)</Label>
                     <Input
                       type="number"
                       value={course.practical_hours || 0}
                       onChange={(e) => handleCourseChange(index, 'practical_hours', parseFloat(e.target.value) || 0)}
                       placeholder="Ex: 4"
                     />
                   </div>
                 </div>
               )}

               {/* Campos de cobrança por aluno */}
               {(course.billing_type === 'per_student' || !course.billing_type) && (
                 <div className="mt-3 pt-3 border-t space-y-3">
                   <div className="flex items-center gap-2 mb-2">
                     <Badge variant="outline" className="bg-blue-50">Cobrança por Aluno</Badge>
                   </div>
                   <div className="space-y-2">
                     <Label>Valor Unitário por Aluno (R$) *</Label>
                     <Input
                       type="number"
                       step="0.01"
                       value={course.specific_price || 0}
                       onChange={(e) => handleCourseChange(index, 'specific_price', parseFloat(e.target.value.replace(',', '.')) || 0)}
                       placeholder="Ex: 150.00"
                       required
                     />
                     <p className="text-xs text-stone-500">Valor total = Valor unitário × Quantidade de alunos</p>
                   </div>
                 </div>
               )}

               {/* Campos de cobrança por turma fechada */}
               {course.billing_type === 'per_closed_class' && (
                 <div className="mt-3 pt-3 border-t space-y-3">
                   <div className="flex items-center gap-2 mb-2">
                     <Badge variant="outline" className="bg-emerald-50">Turma Fechada</Badge>
                   </div>
                   <div className="grid md:grid-cols-2 gap-3">
                     <div className="space-y-2">
                       <Label>Valor da Turma Fechada (R$) *</Label>
                       <Input
                         type="text"
                         value={course.class_fixed_value || ''}
                         onChange={(e) => handleCourseChange(index, 'class_fixed_value', e.target.value === '' ? 0 : parseFloat(e.target.value.replace(',', '.')) || 0)}
                         placeholder="Ex: 2000.00 ou 2000,00"
                         required
                       />
                     </div>
                     <div className="space-y-2">
                       <Label>Quantidade Máxima de Alunos *</Label>
                       <Input
                         type="number"
                         value={course.included_students_limit || 15}
                         onChange={(e) => handleCourseChange(index, 'included_students_limit', parseInt(e.target.value) || 15)}
                         placeholder="Ex: 15"
                         required
                       />
                     </div>
                     <div className="space-y-2">
                       <Label>Valor por Aluno Excedente (R$) *</Label>
                       <Input
                         type="number"
                         step="0.01"
                         value={course.extra_student_unit_value || 0}
                         onChange={(e) => handleCourseChange(index, 'extra_student_unit_value', parseFloat(e.target.value.replace(',', '.')) || 0)}
                         placeholder="Ex: 133.33"
                         required
                       />
                     </div>
                   </div>
                   <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                     <AlertCircle className="w-3 h-3 inline mr-1" />
                     <strong>Exemplo:</strong> Turma de R$ 2.000 com até 15 alunos. Se tiver 18 alunos, será cobrado R$ 2.000 + (3 × valor excedente).
                   </div>
                 </div>
               )}
            </CardContent>
          </Card>
        ))
      )}
      <Button type="button" onClick={handleAddCourse} size="sm" variant="outline" className="w-full">
        <Plus className="w-4 h-4 mr-1" />
        Adicionar Curso
      </Button>
    </div>
  );
}