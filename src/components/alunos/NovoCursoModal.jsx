import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, BookOpen, CreditCard, CheckCircle, Search, AlertTriangle, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const STEPS = ["Dados do Aluno", "Seleção do Curso", "Pagamento"];

export default function NovoCursoModal({ open, onClose, enrollment, onSuccess }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [courseSearch, setCourseSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [form, setForm] = useState({
    start_date: "",
    end_date: "",
    location: "",
    unit_value: "",
    desconto: "",
    forma_pagamento: "",
    status_pagamento: "Pendente",
    data_vencimento_pagamento: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      setStep(0);
      setCourseSearch("");
      setSelectedCourse(null);
      setForm({
        start_date: "",
        end_date: "",
        location: "",
        unit_value: "",
        desconto: "",
        forma_pagamento: "",
        status_pagamento: "Pendente",
        data_vencimento_pagamento: "",
        notes: "",
      });
    }
  }, [open]);

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["courses"],
    queryFn: () => base44.entities.Course.list("-name", 200),
    enabled: open,
    staleTime: 0,
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ["instructors-list"],
    queryFn: () => base44.entities.Instructor.list("-created_date", 100),
    enabled: open && step === 1,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const newEnrollment = await base44.entities.StudentCourseEnrollment.create(data);
      // Gerar contrato automaticamente
      try {
        await base44.functions.invoke("gerarContrato", {
          student_id: newEnrollment.student_id,
          enrollment_id: newEnrollment.id,
          force_regen: false,
        });
      } catch (e) {
        console.warn("Contrato não gerado:", e);
      }
      // Registrar no histórico
      try {
        await base44.entities.StudentTimeline.create({
          student_id: enrollment.student_id,
          student_name: enrollment.student_name,
          event_type: "matricula_criada",
          title: "Rematrícula em novo curso",
          description: `Aluno matriculado em "${selectedCourse?.name}" via rematrícula.`,
          performed_by: "sistema",
        });
      } catch {}
      // Notificar aluno
      if (enrollment.student_phone) {
        try {
          await base44.functions.invoke("enviarNotificacaoWhatsApp", {
            phone: enrollment.student_phone,
            message: `Olá ${enrollment.student_name}! Sua nova matrícula no curso "${selectedCourse?.name}" foi realizada com sucesso. Em breve você receberá o contrato para assinatura.`,
          });
        } catch {}
      }
      return newEnrollment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] });
      toast.success("Nova matrícula criada com sucesso!");
      onSuccess?.();
      onClose();
    },
    onError: (e) => toast.error("Erro ao criar matrícula: " + e.message),
  });

  const filteredCourses = courseSearch.length >= 2
    ? courses.filter(c => c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(
        courseSearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      ))
    : courses;

  const valorFinal = (parseFloat(form.unit_value) || 0) - (parseFloat(form.desconto) || 0);

  const handleConfirm = () => {
    if (!selectedCourse || !form.start_date || !form.end_date) {
      toast.error("Preencha curso, data de início e data de fim.");
      return;
    }
    if (!form.forma_pagamento) {
      toast.error("Selecione a forma de pagamento.");
      return;
    }
    createMutation.mutate({
      student_id: enrollment.student_id,
      student_name: enrollment.student_name,
      student_cpf: enrollment.student_cpf,
      student_email: enrollment.student_email || "",
      student_phone: enrollment.student_phone || "",
      course_id: selectedCourse.id,
      course_name: selectedCourse.name,
      course_duration: selectedCourse.duration || "",
      company_id: "individual",
      company_name: "Individual (PF)",
      start_date: form.start_date,
      end_date: form.end_date,
      status: "Aguardando Autorização",
      unit_value: valorFinal || undefined,
      forma_pagamento: form.forma_pagamento,
      status_pagamento: form.status_pagamento,
      data_vencimento_pagamento: form.data_vencimento_pagamento || undefined,
      notes: form.notes,
    });
  };

  if (!enrollment) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <BookOpen className="w-5 h-5 text-blue-600" /> Adicionar Novo Curso
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-4">
          {STEPS.map((s, i) => (
            <React.Fragment key={i}>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                i === step ? "bg-gray-900 text-white" : i < step ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}>
                {i < step ? <CheckCircle className="w-3 h-3" /> : <span>{i + 1}</span>}
                {s}
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        {/* PASSO 1: Dados do Aluno */}
        {step === 0 && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3" /> Dados do Aluno (preenchimento automático)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-500">Nome Completo</Label>
                  <Input value={enrollment.student_name} disabled className="bg-white text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">CPF</Label>
                  <Input value={enrollment.student_cpf} disabled className="bg-white text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">E-mail</Label>
                  <Input value={enrollment.student_email || "—"} disabled className="bg-white text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">WhatsApp</Label>
                  <Input value={enrollment.student_phone || "—"} disabled className="bg-white text-sm" />
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800">Os dados do aluno são preenchidos automaticamente. Uma nova matrícula independente será criada para este aluno.</p>
            </div>
            <div className="flex justify-end">
              <Button className="bg-gray-900 hover:bg-gray-800" onClick={() => setStep(1)}>
                Confirmar Aluno <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* PASSO 2: Seleção do Curso */}
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <Label>Buscar Curso</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Digite o nome do curso..."
                  value={courseSearch}
                  onChange={e => { setCourseSearch(e.target.value); setSelectedCourse(null); }}
                />
              </div>
            </div>

            {/* Lista de cursos */}
            {!selectedCourse && (
              <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                {loadingCourses ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Carregando cursos...</div>
                ) : filteredCourses.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Nenhum curso encontrado</div>
                ) : (
                  filteredCourses.map(c => (
                    <div
                      key={c.id}
                      className="px-3 py-2.5 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 flex items-center justify-between"
                      onClick={() => {
                        setSelectedCourse(c);
                        setForm(f => ({ ...f, unit_value: "" }));
                      }}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{c.name}</p>
                        {c.validity && <p className="text-xs text-gray-400">Validade: {c.validity}</p>}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Curso selecionado */}
            {selectedCourse && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-green-900">{selectedCourse.name}</p>
                  <button onClick={() => setSelectedCourse(null)} className="text-xs text-gray-400 hover:text-red-500 underline">Trocar</button>
                </div>
                {selectedCourse.validity && <p className="text-xs text-green-700">Validade: {selectedCourse.validity}</p>}
              </div>
            )}

            {selectedCourse && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data de Início *</Label>
                  <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <Label>Data de Término *</Label>
                  <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <Label>Local do Curso</Label>
                  <Input placeholder="Ex: Barcarena/PA, Online..." value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                </div>
              </div>
            )}

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>Voltar</Button>
              <Button
                className="bg-gray-900 hover:bg-gray-800"
                disabled={!selectedCourse || !form.start_date || !form.end_date}
                onClick={() => setStep(2)}
              >
                Próximo: Pagamento <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* PASSO 3: Pagamento */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Resumo
              </p>
              <p className="text-sm font-medium text-gray-900">{selectedCourse?.name}</p>
              <p className="text-xs text-gray-500">{form.start_date} → {form.end_date}{form.location ? ` • ${form.location}` : ""}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor Total (R$)</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={form.unit_value}
                  onChange={e => setForm(f => ({ ...f, unit_value: e.target.value }))}
                />
              </div>
              <div>
                <Label>Desconto (R$)</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={form.desconto}
                  onChange={e => setForm(f => ({ ...f, desconto: e.target.value }))}
                />
              </div>
            </div>

            {(parseFloat(form.unit_value) > 0 || parseFloat(form.desconto) > 0) && (
              <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-md">
                <span className="text-sm text-emerald-700 font-medium">Valor Final:</span>
                <span className="text-lg font-bold text-emerald-800">
                  R$ {valorFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Forma de Pagamento *</Label>
                <Select value={form.forma_pagamento} onValueChange={v => setForm(f => ({ ...f, forma_pagamento: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="À Vista">À Vista</SelectItem>
                    <SelectItem value="Parcelado 2x">Parcelado 2x</SelectItem>
                    <SelectItem value="Parcelado 3x">Parcelado 3x</SelectItem>
                    <SelectItem value="Parcelado 4x">Parcelado 4x</SelectItem>
                    <SelectItem value="Parcelado 5x">Parcelado 5x</SelectItem>
                    <SelectItem value="Parcelado 6x">Parcelado 6x</SelectItem>
                    <SelectItem value="Pix">Pix</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                    <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                    <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                    <SelectItem value="Dinheiro em Espécie">Dinheiro em Espécie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status Pagamento</Label>
                <Select value={form.status_pagamento} onValueChange={v => setForm(f => ({ ...f, status_pagamento: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Parcialmente Pago">Parcialmente Pago</SelectItem>
                    <SelectItem value="Inadimplente">Inadimplente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Data de Vencimento do Pagamento</Label>
                <Input type="date" value={form.data_vencimento_pagamento} onChange={e => setForm(f => ({ ...f, data_vencimento_pagamento: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label>Observações</Label>
                <Input placeholder="Opcional..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button
                className="bg-green-700 hover:bg-green-800"
                onClick={handleConfirm}
                disabled={createMutation.isPending || !form.forma_pagamento}
              >
                {createMutation.isPending ? "Criando..." : "✓ Confirmar Matrícula"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}