import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StudentForm({ companies = [], courses = [], onSave, onCancel, initialData = null }) {
  const [form, setForm] = useState({
    full_name: initialData?.full_name || "",
    cpf: initialData?.cpf || "",
    email: initialData?.email || "",
    whatsapp: initialData?.whatsapp || "",
    company_id: initialData?.company_id || "",
    company_name: initialData?.company_name || "",
    course_id: initialData?.course_id || "",
    course_name: initialData?.course_name || "",
    status: initialData?.status || "Ativo",
    notes: initialData?.notes || "",
  });

  const handleCompanyChange = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    setForm(f => ({
      ...f,
      company_id: companyId,
      company_name: company ? (company.nome_fantasia || company.name || "") : "",
    }));
  };

  const handleCourseChange = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    setForm(f => ({
      ...f,
      course_id: courseId,
      course_name: course ? course.name : "",
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.full_name || !form.cpf) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="full_name">Nome Completo *</Label>
          <Input
            id="full_name"
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            placeholder="Nome completo do aluno"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cpf">CPF *</Label>
          <Input
            id="cpf"
            value={form.cpf}
            onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))}
            placeholder="000.000.000-00"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="aluno@email.com"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input
            id="whatsapp"
            value={form.whatsapp}
            onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
            placeholder="(91) 99999-9999"
          />
        </div>
        <div className="space-y-1">
          <Label>Empresa</Label>
          <Select value={form.company_id} onValueChange={handleCompanyChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar empresa..." />
            </SelectTrigger>
            <SelectContent>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome_fantasia || c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Curso</Label>
          <Select value={form.course_id} onValueChange={handleCourseChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar curso..." />
            </SelectTrigger>
            <SelectContent>
              {courses.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="notes">Observações</Label>
        <Input
          id="notes"
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Observações opcionais"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">
          {initialData ? "Salvar Alterações" : "Cadastrar Aluno"}
        </Button>
      </div>
    </form>
  );
}