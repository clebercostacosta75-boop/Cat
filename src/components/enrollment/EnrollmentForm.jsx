import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addMonths, format, parseISO } from "date-fns";

export default function EnrollmentForm({ onSuccess, onCancel, initialData = null }) {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [certModels, setCertModels] = useState([]);
  const [classSchedules, setClassSchedules] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    student_id: "",
    student_name: "",
    student_cpf: "",
    student_email: "",
    student_phone: "",
    course_id: "",
    course_name: "",
    course_duration: "",
    validity_months: 12,
    company_id: "",
    company_name: "",
    instructor_id: "",
    instructor_name: "",
    class_schedule_id: "",
    start_date: "",
    end_date: "",
    valid_until: "",
    certificate_model_id: "",
    certificate_model_name: "",
    notes: "",
    ...initialData
  });

  useEffect(() => {
    Promise.all([
      base44.entities.Student.list(),
      base44.entities.Course.list(),
      base44.entities.Company.list(),
      base44.entities.Instructor.list(),
      base44.entities.CertificateModel.list(),
      base44.entities.ClassSchedule.list("-created_date", 200)
    ]).then(([s, c, co, i, cm, cs]) => {
      setStudents(s);
      setCourses(c);
      setCompanies(co);
      setInstructors(i);
      setCertModels(cm);
      setClassSchedules(cs);
    });
  }, []);

  // Calcular valid_until automaticamente quando end_date ou validity_months mudar
  useEffect(() => {
    if (form.end_date && form.validity_months) {
      const endDate = parseISO(form.end_date);
      const validUntil = addMonths(endDate, Number(form.validity_months));
      setForm(f => ({ ...f, valid_until: format(validUntil, "yyyy-MM-dd") }));
    }
  }, [form.end_date, form.validity_months]);

  const handleStudentChange = (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    setForm(f => ({
      ...f,
      student_id: student.id,
      student_name: student.full_name,
      student_cpf: student.cpf,
      student_email: student.email || "",
      student_phone: student.whatsapp || "",
      company_id: student.company_id || f.company_id,
      company_name: student.company_name || f.company_name
    }));
  };

  const handleCourseChange = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    // Tentar extrair meses de validade do campo validity do curso
    const validityStr = course.validity || "";
    const months = extractMonths(validityStr);
    setForm(f => ({
      ...f,
      course_id: course.id,
      course_name: course.name,
      course_duration: course.duration_hours ? `${course.duration_hours}h` : "",
      validity_months: months || f.validity_months
    }));
  };

  const handleCertModelChange = (modelId) => {
    const model = certModels.find(m => m.id === modelId);
    if (!model) return;
    setForm(f => ({
      ...f,
      certificate_model_id: model.id,
      certificate_model_name: model.name,
      validity_months: model.validity_period_months || f.validity_months
    }));
  };

  const handleCompanyChange = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    if (!company) return;
    setForm(f => ({
      ...f,
      company_id: company.id,
      company_name: company.nome_fantasia || company.razao_social
    }));
  };

  const handleInstructorChange = (instructorId) => {
    const instructor = instructors.find(i => i.id === instructorId);
    if (!instructor) return;
    setForm(f => ({
      ...f,
      instructor_id: instructor.id,
      instructor_name: instructor.name
    }));
  };

  const extractMonths = (str) => {
    if (!str) return null;
    const lower = str.toLowerCase();
    if (lower.includes("ano")) {
      const n = parseInt(lower);
      return isNaN(n) ? null : n * 12;
    }
    if (lower.includes("mes") || lower.includes("mês")) {
      const n = parseInt(lower);
      return isNaN(n) ? null : n;
    }
    const n = parseInt(lower);
    return isNaN(n) ? null : n;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.student_id || !form.course_id || !form.company_id || !form.start_date || !form.end_date) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }
    setLoading(true);
    await base44.entities.StudentCourseEnrollment.create({
      ...form,
      status: "Aguardando Autorização"
    });
    setLoading(false);
    onSuccess && onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Aluno */}
        <div>
          <Label>Aluno *</Label>
          <Select value={form.student_id} onValueChange={handleStudentChange}>
            <SelectTrigger><SelectValue placeholder="Selecionar aluno..." /></SelectTrigger>
            <SelectContent>
              {students.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.full_name} — {s.cpf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Empresa */}
        <div>
          <Label>Empresa Contratante *</Label>
          <Select value={form.company_id} onValueChange={handleCompanyChange}>
            <SelectTrigger><SelectValue placeholder="Selecionar empresa..." /></SelectTrigger>
            <SelectContent>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Curso */}
        <div>
          <Label>Curso Realizado *</Label>
          <Select value={form.course_id} onValueChange={handleCourseChange}>
            <SelectTrigger><SelectValue placeholder="Selecionar curso..." /></SelectTrigger>
            <SelectContent>
              {courses.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Modelo de Certificado */}
        <div>
          <Label>Modelo de Certificado</Label>
          <Select value={form.certificate_model_id} onValueChange={handleCertModelChange}>
            <SelectTrigger><SelectValue placeholder="Selecionar modelo..." /></SelectTrigger>
            <SelectContent>
              {certModels.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Instrutor */}
        <div>
          <Label>Instrutor Responsável</Label>
          <Select value={form.instructor_id} onValueChange={handleInstructorChange}>
            <SelectTrigger><SelectValue placeholder="Selecionar instrutor..." /></SelectTrigger>
            <SelectContent>
              {instructors.map(i => (
                <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Turma (vínculo oficial com o Cronograma) */}
        <div>
          <Label>Turma (Cronograma)</Label>
          <Select
            value={form.class_schedule_id}
            onValueChange={(id) => {
              const turma = classSchedules.find(t => t.id === id);
              setForm(f => ({
                ...f,
                class_schedule_id: id,
                instructor_name: f.instructor_name || turma?.instructor_name || "",
                instructor_id: f.instructor_id || turma?.instructor_id || "",
              }));
            }}
          >
            <SelectTrigger><SelectValue placeholder="Vincular a uma turma..." /></SelectTrigger>
            <SelectContent>
              {classSchedules.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.training_name} — {t.company_name} ({t.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-400 mt-1">Vincula a matrícula à turma para chamada e certificação</p>
        </div>

        {/* Validade em meses */}
        <div>
          <Label>Validade (meses)</Label>
          <Input
            type="number"
            min="1"
            value={form.validity_months}
            onChange={e => setForm(f => ({ ...f, validity_months: Number(e.target.value) }))}
          />
        </div>

        {/* Data Início */}
        <div>
          <Label>Data de Início *</Label>
          <Input
            type="date"
            value={form.start_date}
            onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
          />
        </div>

        {/* Data Término */}
        <div>
          <Label>Data de Término *</Label>
          <Input
            type="date"
            value={form.end_date}
            onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
          />
        </div>

        {/* Vencimento (calculado) */}
        <div>
          <Label>Vencimento do Certificado</Label>
          <Input
            type="date"
            value={form.valid_until}
            readOnly
            className="bg-gray-50 text-gray-600"
          />
          <p className="text-xs text-gray-400 mt-1">Calculado automaticamente: Término + {form.validity_months} meses</p>
        </div>

        {/* Observações */}
        <div className="md:col-span-2">
          <Label>Observações</Label>
          <Input
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Observações adicionais..."
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar Matrícula"}
        </Button>
      </div>
    </form>
  );
}