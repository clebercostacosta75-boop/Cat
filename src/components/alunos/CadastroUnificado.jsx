import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, MapPin, Shield, BookOpen, CheckCircle, ChevronRight, ChevronLeft, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

const EMPTY_STUDENT = {
  full_name: "", social_name: "", cpf: "", rg: "", rg_orgao_emissor: "", ra: "",
  data_nascimento: "", sexo: "", email: "", whatsapp: "", status: "Ativo", notes: "",
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
  resp_financeiro_nome: "", resp_financeiro_cpf: "", resp_financeiro_telefone: "",
  resp_financeiro_email: "", resp_financeiro_parentesco: "",
};

const STEPS = [
  { id: 1, label: "Dados Pessoais", icon: User },
  { id: 2, label: "Endereço", icon: MapPin },
  { id: 3, label: "Resp. Financeiro", icon: Shield },
  { id: 4, label: "Matrícula", icon: BookOpen },
];

export default function CadastroUnificado({ open, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_STUDENT);
  const [enrollment, setEnrollment] = useState({
    course_id: "", course_name: "", start_date: "", end_date: "",
    forma_pagamento: "", unit_value: "", status_pagamento: "Pendente",
    data_vencimento_pagamento: "", num_parcelas: 1,
  });
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const setEnr = (field, value) => setEnrollment(f => ({ ...f, [field]: value }));

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => base44.entities.Course.list("-name", 200),
    staleTime: 0, gcTime: 0,
  });

  useEffect(() => {
    if (open) { setStep(1); setForm(EMPTY_STUDENT); setEnrollment({ course_id: "", course_name: "", start_date: "", end_date: "", forma_pagamento: "", unit_value: "", status_pagamento: "Pendente", data_vencimento_pagamento: "", num_parcelas: 1 }); }
  }, [open]);

  const handleNext = () => {
    if (step === 1 && (!form.full_name || !form.cpf)) { toast.error("Nome e CPF são obrigatórios"); return; }
    if (step < 4) setStep(s => s + 1);
  };

  const isParcelado = enrollment.forma_pagamento?.startsWith("Parcelado");
  const isAVista = enrollment.forma_pagamento === "À Vista" || enrollment.forma_pagamento === "Pix" || enrollment.forma_pagamento === "Dinheiro em Espécie";

  const handleSave = async () => {
    if (!enrollment.course_id || !enrollment.start_date) { toast.error("Selecione o curso e a data de início"); return; }
    setSaving(true);
    try {
      // 1. Salvar aluno
      const student = await base44.entities.Student.create(form);

      // 2. Criar matrícula
      const enrollmentData = {
        student_id: student.id,
        student_name: student.full_name,
        student_cpf: student.cpf,
        student_email: student.email || "",
        student_phone: student.whatsapp || "",
        course_id: enrollment.course_id,
        course_name: enrollment.course_name,
        company_id: "individual",
        company_name: "Individual (PF)",
        start_date: enrollment.start_date,
        end_date: enrollment.end_date || enrollment.start_date,
        status: "Aguardando Autorização",
        unit_value: parseFloat(enrollment.unit_value) || 0,
        forma_pagamento: enrollment.forma_pagamento,
        status_pagamento: isAVista ? "Pago" : "Pendente",
        data_vencimento_pagamento: enrollment.data_vencimento_pagamento,
        notes: "",
      };
      const newEnrollment = await base44.entities.StudentCourseEnrollment.create(enrollmentData);

      // 3. Gerar contrato automaticamente
      try {
        await base44.functions.invoke("gerarContrato", {
          student_id: student.id,
          enrollment_id: newEnrollment.id,
          force_regen: false,
        });
      } catch (e) { console.warn("Contrato:", e); }

      // 4. Se à vista, gerar recibo
      if (isAVista && enrollment.unit_value) {
        try {
          const year = new Date().getFullYear();
          const countRes = await base44.entities.Receipt.list("-created_date", 1);
          const num = `REC-${year}-${String((countRes.length || 0) + 1).padStart(4, "0")}`;
          await base44.entities.Receipt.create({
            receipt_number: num,
            student_id: student.id,
            student_name: student.full_name,
            student_cpf: student.cpf,
            enrollment_id: newEnrollment.id,
            course_name: enrollment.course_name,
            amount: parseFloat(enrollment.unit_value),
            payment_method: enrollment.forma_pagamento,
            payment_date: enrollment.start_date || new Date().toISOString().split("T")[0],
            description: `Pagamento à vista — ${enrollment.course_name}`,
            status: "Emitido",
          });
        } catch (e) { console.warn("Recibo:", e); }
      }

      // 5. Registrar no histórico
      try {
        await base44.entities.StudentTimeline.create({
          student_id: student.id,
          student_name: student.full_name,
          event_type: "matricula_criada",
          title: `Matrícula criada — ${enrollment.course_name}`,
          description: `Cadastro e matrícula realizados. Forma de pagamento: ${enrollment.forma_pagamento || "não informada"}. Valor: R$ ${enrollment.unit_value || "0"}.`,
          performed_by: "Sistema",
        });
      } catch (e) { console.warn("Timeline:", e); }

      queryClient.invalidateQueries({ queryKey: ["students-pf"] });
      queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] });
      queryClient.invalidateQueries({ queryKey: ["receipts-pf"] });

      toast.success("Aluno cadastrado e matrícula criada com sucesso!");
      onSaved && onSaved(student, newEnrollment);
      onClose();
    } catch (e) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" /> Novo Aluno (PF) — Cadastro Completo
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div
                className={`flex flex-col items-center cursor-pointer ${step >= s.id ? "opacity-100" : "opacity-40"}`}
                onClick={() => step > s.id && setStep(s.id)}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${step === s.id ? "bg-gray-900 border-gray-900 text-white" : step > s.id ? "bg-green-600 border-green-600 text-white" : "bg-white border-gray-300 text-gray-400"}`}>
                  {step > s.id ? <CheckCircle className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                </div>
                <span className="text-xs mt-1 text-gray-600 hidden sm:block">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${step > s.id ? "bg-green-500" : "bg-gray-200"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ETAPA 1 */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700 pb-1 border-b">Dados Pessoais</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label>Nome Completo *</Label><Input value={form.full_name} onChange={e => set("full_name", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Nome Social</Label><Input value={form.social_name} onChange={e => set("social_name", e.target.value)} placeholder="Opcional" /></div>
              <div><Label>CPF *</Label><Input value={form.cpf} onChange={e => set("cpf", e.target.value)} placeholder="000.000.000-00" /></div>
              <div><Label>Data de Nascimento</Label><Input type="date" value={form.data_nascimento} onChange={e => set("data_nascimento", e.target.value)} /></div>
              <div><Label>RG</Label><Input value={form.rg} onChange={e => set("rg", e.target.value)} /></div>
              <div><Label>Órgão Emissor RG</Label><Input value={form.rg_orgao_emissor} onChange={e => set("rg_orgao_emissor", e.target.value)} placeholder="SSP/PA" /></div>
              <div>
                <Label>Sexo</Label>
                <Select value={form.sexo} onValueChange={v => set("sexo", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                    <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>E-mail</Label><Input value={form.email} onChange={e => set("email", e.target.value)} /></div>
              <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="(91) 99999-9999" /></div>
              <div className="sm:col-span-2"><Label>Observações</Label><Input value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
            </div>
          </div>
        )}

        {/* ETAPA 2 */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700 pb-1 border-b">Endereço</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>CEP</Label><Input value={form.cep} onChange={e => set("cep", e.target.value)} placeholder="00000-000" /></div>
              <div className="sm:col-span-2"><Label>Rua/Logradouro</Label><Input value={form.logradouro} onChange={e => set("logradouro", e.target.value)} /></div>
              <div><Label>Número</Label><Input value={form.numero} onChange={e => set("numero", e.target.value)} /></div>
              <div><Label>Complemento</Label><Input value={form.complemento} onChange={e => set("complemento", e.target.value)} placeholder="Apto, Bloco..." /></div>
              <div><Label>Bairro</Label><Input value={form.bairro} onChange={e => set("bairro", e.target.value)} /></div>
              <div><Label>Cidade</Label><Input value={form.cidade} onChange={e => set("cidade", e.target.value)} /></div>
              <div><Label>Estado (UF)</Label><Input value={form.estado} onChange={e => set("estado", e.target.value)} placeholder="PA" maxLength={2} /></div>
            </div>
          </div>
        )}

        {/* ETAPA 3 */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700 pb-1 border-b">Responsável Financeiro</p>
            <p className="text-xs text-gray-500">Preencha se o responsável financeiro for diferente do aluno.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label>Nome do Responsável</Label><Input value={form.resp_financeiro_nome} onChange={e => set("resp_financeiro_nome", e.target.value)} /></div>
              <div><Label>CPF do Responsável</Label><Input value={form.resp_financeiro_cpf} onChange={e => set("resp_financeiro_cpf", e.target.value)} placeholder="000.000.000-00" /></div>
              <div><Label>Parentesco</Label><Input value={form.resp_financeiro_parentesco} onChange={e => set("resp_financeiro_parentesco", e.target.value)} placeholder="Pai, Mãe, Cônjuge..." /></div>
              <div><Label>Telefone</Label><Input value={form.resp_financeiro_telefone} onChange={e => set("resp_financeiro_telefone", e.target.value)} placeholder="(91) 99999-9999" /></div>
              <div><Label>E-mail</Label><Input value={form.resp_financeiro_email} onChange={e => set("resp_financeiro_email", e.target.value)} /></div>
            </div>
          </div>
        )}

        {/* ETAPA 4 */}
        {step === 4 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700 pb-1 border-b">Matrícula e Pagamento</p>
            <div>
              <Label>Curso *</Label>
              <Select value={enrollment.course_id} onValueChange={v => { const c = courses.find(c => c.id === v); setEnrollment(f => ({ ...f, course_id: v, course_name: c?.name || "" })); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o curso" /></SelectTrigger>
                <SelectContent>
                  {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data de Início *</Label><Input type="date" value={enrollment.start_date} onChange={e => setEnr("start_date", e.target.value)} /></div>
              <div><Label>Data de Término</Label><Input type="date" value={enrollment.end_date} onChange={e => setEnr("end_date", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={enrollment.forma_pagamento} onValueChange={v => setEnr("forma_pagamento", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="À Vista">À Vista</SelectItem>
                    <SelectItem value="Pix">Pix</SelectItem>
                    <SelectItem value="Dinheiro em Espécie">Dinheiro em Espécie</SelectItem>
                    <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                    <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                    <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Parcelado 2x">Parcelado 2x</SelectItem>
                    <SelectItem value="Parcelado 3x">Parcelado 3x</SelectItem>
                    <SelectItem value="Parcelado 4x">Parcelado 4x</SelectItem>
                    <SelectItem value="Parcelado 5x">Parcelado 5x</SelectItem>
                    <SelectItem value="Parcelado 6x">Parcelado 6x</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor Total do Curso (R$)</Label>
                <Input type="number" min="0" step="0.01" value={enrollment.unit_value} onChange={e => setEnr("unit_value", e.target.value)} placeholder="0,00" />
              </div>
            </div>
            <div>
              <Label>Data de Vencimento do Pagamento</Label>
              <Input type="date" value={enrollment.data_vencimento_pagamento} onChange={e => setEnr("data_vencimento_pagamento", e.target.value)} />
            </div>
            {isParcelado && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-semibold text-blue-800 mb-2">Parcelamento</p>
                <p className="text-xs text-blue-700">
                  {enrollment.forma_pagamento} de {enrollment.unit_value
                    ? `R$ ${(parseFloat(enrollment.unit_value) / parseInt(enrollment.forma_pagamento.match(/\d+/)?.[0] || 1)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} cada`
                    : "—"}
                </p>
              </div>
            )}
            {isAVista && enrollment.unit_value && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-xs text-green-800 font-medium">Pagamento à vista — recibo será gerado automaticamente ao salvar.</p>
              </div>
            )}

            {/* Resumo Final */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2">
              <p className="text-xs font-bold text-gray-700 mb-2">Resumo do Cadastro</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                <span className="font-medium">Aluno:</span><span>{form.full_name}</span>
                <span className="font-medium">CPF:</span><span>{form.cpf}</span>
                <span className="font-medium">Curso:</span><span>{enrollment.course_name || "—"}</span>
                <span className="font-medium">Início:</span><span>{enrollment.start_date || "—"}</span>
                <span className="font-medium">Pagamento:</span><span>{enrollment.forma_pagamento || "—"}</span>
                <span className="font-medium">Valor:</span><span>{enrollment.unit_value ? `R$ ${parseFloat(enrollment.unit_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">Ao salvar serão gerados automaticamente: ✓ Cadastro ✓ Matrícula ✓ Contrato {isAVista ? "✓ Recibo" : ""} ✓ Histórico</p>
              </div>
            </div>
          </div>
        )}

        {/* Navegação */}
        <div className="flex items-center justify-between pt-3 border-t mt-2">
          <Button variant="outline" onClick={step === 1 ? onClose : () => setStep(s => s - 1)} disabled={saving}>
            <ChevronLeft className="w-4 h-4 mr-1" /> {step === 1 ? "Cancelar" : "Anterior"}
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Etapa {step} de {STEPS.length}</span>
            {step < 4 ? (
              <Button className="bg-gray-900 hover:bg-gray-800" onClick={handleNext}>
                Próximo <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button className="bg-green-700 hover:bg-green-800" onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : <><CheckCircle className="w-4 h-4 mr-2" />Salvar Tudo</>}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}