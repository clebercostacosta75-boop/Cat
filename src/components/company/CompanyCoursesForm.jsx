import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Garante que cada curso tem todos os campos de billing com defaults corretos
function normalizeCourse(course) {
  return {
    billing_type: 'per_student',
    specific_price: 0,
    class_fixed_value: 0,
    included_students_limit: 15,
    ...course,
    specific_price: parseFloat(course.specific_price) || 0,
    class_fixed_value: parseFloat(String(course.class_fixed_value).replace(',', '.')) || 0,
    included_students_limit: parseInt(course.included_students_limit) || 15,
  };
}

export default function CompanyCoursesForm({ companyCourses, courses, onChange }) {
  // Normalizar cursos ao receber para garantir todos os campos
  const normalizedCourses = (companyCourses || []).map(normalizeCourse);

  const handleAddCourse = () => {
    onChange([
      ...normalizedCourses,
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
      }
    ]);
  };

  const handleRemoveCourse = (index) => {
    onChange(normalizedCourses.filter((_, i) => i !== index));
  };

  const handleCourseChange = (index, field, value) => {
    const updated = [...normalizedCourses];

    if (field === 'course_id') {
      const selectedCourse = courses.find(c => c.id === value);
      if (selectedCourse) {
        updated[index] = normalizeCourse({
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
        });
      }
    } else if (field === 'class_fixed_value') {
      // Aceita digitação livre (vírgula ou ponto), converte ao sair
      updated[index] = { ...updated[index], [field]: value };
    } else if (['specific_price', 'workload_hours', 'theoretical_hours', 'practical_hours'].includes(field)) {
      updated[index] = { ...updated[index], [field]: parseFloat(String(value).replace(',', '.')) || 0 };
    } else if (field === 'included_students_limit') {
      updated[index] = { ...updated[index], [field]: parseInt(value) || 15 };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }

    onChange(updated);
  };

  // Ao perder foco do campo class_fixed_value, converter para número
  const formatCurrency = (value) => {
    const num = parseFloat(String(value).replace(',', '.')) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Formata dígitos como moeda enquanto digita (apenas números → R$ X.XXX,XX)
  const handleClassFixedValueChange = (index, rawInput) => {
    // Remove tudo que não é dígito
    const digits = rawInput.replace(/\D/g, '');
    const num = parseInt(digits || '0', 10) / 100;
    const updated = [...normalizedCourses];
    updated[index] = { ...updated[index], class_fixed_value: num };
    onChange(updated);
  };

  const handleClassFixedValueBlur = () => {}; // mantido por compatibilidade

  return (
    <div className="space-y-4">
      {normalizedCourses.length === 0 ? (
        <div className="text-center py-8 text-stone-500">
          <BookOpen className="w-12 h-12 mx-auto mb-2 text-stone-300" />
          <p>Nenhum curso cadastrado para esta empresa</p>
          <p className="text-sm">Clique em "Adicionar Curso" para começar</p>
        </div>
      ) : (
        normalizedCourses.map((course, index) => (
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
                      {(courses || []).filter(c => c.id && c.id.trim() !== '').map((c) => (
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
                    onChange={(e) => handleCourseChange(index, 'workload_hours', e.target.value)}
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
                      onChange={(e) => handleCourseChange(index, 'theoretical_hours', e.target.value)}
                      placeholder="Ex: 4"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Carga Horária Presencial (horas)</Label>
                    <Input
                      type="number"
                      value={course.practical_hours || 0}
                      onChange={(e) => handleCourseChange(index, 'practical_hours', e.target.value)}
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
                      onChange={(e) => handleCourseChange(index, 'specific_price', e.target.value)}
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
                  <div className="space-y-2">
                    <Label>Valor da Turma Fechada (R$) *</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={course.class_fixed_value > 0 ? formatCurrency(course.class_fixed_value) : ''}
                      onChange={(e) => handleClassFixedValueChange(index, e.target.value)}
                      placeholder="R$ 0,00"
                      required
                    />
                  </div>
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
                    <strong>Valor configurado:</strong> {formatCurrency(course.class_fixed_value)} fixo por turma — independente da quantidade de alunos.
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