/**
 * SPR-2D-1: edição de dados sensíveis (nome, CPF, empresa, curso) não é mais silenciosa —
 * exige justificativa, valida CPF, bloqueia duplicidade e gera AuditLog com antes/depois.
 */
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CorrecaoDadosDialog from "@/components/shared/CorrecaoDadosDialog";
import { validarCPF, verificarCPFDuplicado, buscarCertificadosRelacionados, registrarCorrecoes } from "@/lib/correcaoOperacional";

const CAMPOS_SENSIVEIS = [
  { campo: "full_name", rotulo: "Nome do aluno" },
  { campo: "cpf", rotulo: "CPF" },
  { campo: "company_name", rotulo: "Empresa vinculada" },
  { campo: "course_name", rotulo: "Curso vinculado" },
];

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
  const [erroSensivel, setErroSensivel] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [correcaoPendente, setCorrecaoPendente] = useState(null); // { alteracoes, certificados }
  const [salvandoCorrecao, setSalvandoCorrecao] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.cpf) return;
    setErroSensivel("");

    // Cadastro novo: segue fluxo normal (com validação de CPF)
    if (!initialData?.id) {
      if (!validarCPF(form.cpf)) {
        setErroSensivel("CPF inválido. Verifique os dígitos informados.");
        return;
      }
      setVerificando(true);
      const dup = await verificarCPFDuplicado(form.cpf, null);
      setVerificando(false);
      if (dup) {
        setErroSensivel(`CPF já cadastrado para outro aluno (${dup.full_name}). Correção bloqueada para evitar duplicidade.`);
        return;
      }
      onSave(form);
      return;
    }

    // Edição: detectar alterações em campos sensíveis
    const alteracoes = CAMPOS_SENSIVEIS
      .filter(({ campo }) => (initialData[campo] || "") !== (form[campo] || ""))
      .map(({ campo, rotulo }) => ({ campo, rotulo, valor_anterior: initialData[campo] || "—", valor_novo: form[campo] || "—" }));

    if (alteracoes.length === 0) {
      onSave(form); // nenhum campo sensível alterado — salvamento normal
      return;
    }

    setVerificando(true);
    try {
      if (alteracoes.some(a => a.campo === "cpf")) {
        if (!validarCPF(form.cpf)) {
          setErroSensivel("CPF inválido. Verifique os dígitos informados.");
          return;
        }
        const dup = await verificarCPFDuplicado(form.cpf, initialData.id);
        if (dup) {
          setErroSensivel(`CPF já cadastrado para outro aluno (${dup.full_name}). Correção bloqueada para evitar duplicidade.`);
          return;
        }
      }
      const certificados = await buscarCertificadosRelacionados({ alunoId: initialData.id });
      setCorrecaoPendente({ alteracoes, certificados });
    } finally {
      setVerificando(false);
    }
  };

  const handleConfirmarCorrecao = async (justificativa) => {
    setSalvandoCorrecao(true);
    try {
      const certs = correcaoPendente.certificados || [];
      const { sucesso, erros } = await registrarCorrecoes(correcaoPendente.alteracoes, {
        origem: "Gestão Acadêmica",
        entidade: "Student",
        entidade_id: initialData.id,
        aluno_id: initialData.id,
        certificado_id: certs[0]?.id || "",
        curso_id: form.course_id || "",
        empresa_id: form.company_id || "",
        justificativa,
        impacto: certs.length
          ? `Correção de dado sensível. ATENÇÃO: aluno possui ${certs.length} certificado(s) emitido(s) (${certs.map(c => c.certificate_code).join(", ")}) — certificado NÃO alterado; atualização exigirá reemissão futura.`
          : "Correção de dado sensível antes da certificação.",
      });
      if (!sucesso) {
        setErroSensivel("Correção não registrada: " + erros.join("; "));
        return;
      }
      setCorrecaoPendente(null);
      onSave(form);
    } finally {
      setSalvandoCorrecao(false);
    }
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

      {erroSensivel && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{erroSensivel}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={verificando}>
          {verificando ? "Verificando..." : initialData ? "Salvar Alterações" : "Cadastrar Aluno"}
        </Button>
      </div>

      <CorrecaoDadosDialog
        open={!!correcaoPendente}
        alteracoes={correcaoPendente?.alteracoes || []}
        certificadosRelacionados={correcaoPendente?.certificados || []}
        onConfirm={handleConfirmarCorrecao}
        onCancel={() => setCorrecaoPendente(null)}
        saving={salvandoCorrecao}
      />
    </form>
  );
}