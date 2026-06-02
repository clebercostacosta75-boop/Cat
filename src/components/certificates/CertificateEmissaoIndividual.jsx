import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { logAction } from "@/components/audit/AuditLogger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Award, Building2, FileText, User, Loader2, Search, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { format, addMonths } from "date-fns";

// CNPJ da empresa CAT que deve ser pré-selecionada
const CAT_CNPJ = "07.238.084/0001-45";
const CAT_NOME_FANTASIA = "CAT - CURSOS DE APRIMORAMENTO DO TRABALHADOR";
const CAT_RAZAO_SOCIAL = "V.S. NUNES CURSOS E TREINAMENTO LTDA";

function gerarCodigo() {
  const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `CAT-${new Date().getFullYear()}-${rand}`;
}

function normStr(v) {
  return (v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "").trim();
}

export default function CertificateEmissaoIndividual({ onSuccess }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [clientId, setClientId] = useState("");
  const [modelId, setModelId] = useState("");
  const [sendWhatsApp, setSendWhatsApp] = useState(true);

  // Busca de aluno
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [studentEnrollments, setStudentEnrollments] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);

  const [form, setForm] = useState({
    student_name: "",
    student_cpf: "",
    student_phone: "",
    detran_registro: "",
    renach: "",
    categoria_cnh: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: format(new Date(), "yyyy-MM-dd"),
    location_and_date: `Barcarena/PA, ${format(new Date(), "dd 'de' MMMM 'de' yyyy")}`,
    resultado: "Aprovado",
    observacoes: "",
  });

  // Carrega empresas
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("nome_fantasia", 100),
  });

  // Carrega modelos de certificado
  const { data: models = [] } = useQuery({
    queryKey: ["certificateModels"],
    queryFn: () => base44.entities.CertificateModel.list("-created_date", 100),
  });

  // Carrega alunos individuais (PF) — lazy: só quando há busca
  const [studentsEnabled, setStudentsEnabled] = useState(false);
  const { data: students = [] } = useQuery({
    queryKey: ["students-pf-cert"],
    queryFn: () => base44.entities.Student.list("-created_date", 300),
    enabled: studentsEnabled,
  });

  // Carrega matrículas (para buscar cursos do aluno selecionado)
  const { data: allEnrollments = [] } = useQuery({
    queryKey: ["enrollments-pf-cert"],
    queryFn: async () => {
      const all = await base44.entities.StudentCourseEnrollment.list("-created_date", 300);
      return (all || []).filter(e => !e.company_id || e.company_id === "individual" || e.company_name === "Individual (PF)");
    },
    enabled: studentsEnabled,
  });

  // Busca de empresa
  const [companySearch, setCompanySearch] = useState("");
  const [showCompanyResults, setShowCompanyResults] = useState(false);
  const companyRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (companyRef.current && !companyRef.current.contains(e.target)) {
        setShowCompanyResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredCompanies = companySearch.length < 1 ? [] : companies.filter(c =>
    normStr(c.nome_fantasia || "").includes(normStr(companySearch)) ||
    normStr(c.razao_social || "").includes(normStr(companySearch)) ||
    (c.cnpj || "").includes(companySearch)
  ).slice(0, 8);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedCompany = companies.find(c => c.id === clientId);
  const selectedModel = models.find(m => m.id === modelId);

  const handleField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Resultados de busca de alunos filtrados
  const searchNorm = normStr(searchQuery);
  const filteredStudents = searchNorm.length < 2 ? [] : students.filter(s =>
    normStr(s.full_name || "").includes(searchNorm) ||
    normStr(s.cpf || "").includes(searchNorm.replace(/\D/g, ""))
  ).slice(0, 8);

  // Ao selecionar aluno
  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setSearchQuery(student.full_name);
    setShowSearchResults(false);

    // Buscar matrículas do aluno
    const enrolls = allEnrollments.filter(e => e.student_id === student.id || e.student_cpf === student.cpf);
    setStudentEnrollments(enrolls);

    // Preencher dados do aluno
    setForm(f => ({
      ...f,
      student_name: student.full_name || "",
      student_cpf: student.cpf || "",
      student_phone: student.whatsapp || "",
    }));

    // Se tem exatamente 1 matrícula, preencher automaticamente
    if (enrolls.length === 1) {
      applyEnrollment(enrolls[0]);
    } else {
      setSelectedEnrollment(null);
    }
  };

  // Ao selecionar matrícula (quando aluno tem múltiplas)
  const applyEnrollment = (enrollment) => {
    setSelectedEnrollment(enrollment);
    handleField("start_date", enrollment.start_date || form.start_date);
    handleField("end_date", enrollment.end_date || form.end_date);

    // Tentar encontrar o modelo de certificado pelo nome do curso
    if (enrollment.course_name) {
      const courseName = normStr(enrollment.course_name);
      const matchModel = models.find(m => normStr(m.name).includes(courseName) || courseName.includes(normStr(m.name)));
      if (matchModel) setModelId(matchModel.id);
    }
  };

  const clearStudent = () => {
    setSelectedStudent(null);
    setSelectedEnrollment(null);
    setStudentEnrollments([]);
    setSearchQuery("");
    setForm(f => ({ ...f, student_name: "", student_cpf: "", student_phone: "" }));
  };

  const handleSave = async () => {
    if (!clientId) { toast.error("Selecione o cliente."); return; }
    if (!modelId) { toast.error("Selecione o modelo."); return; }
    if (!form.student_name) { toast.error("Informe o nome do aluno."); return; }
    if (!form.student_cpf) { toast.error("Informe o CPF do aluno."); return; }

    setSaving(true);
    try {
      const code = gerarCodigo();
      const validMonths = selectedModel?.validity_period_months || 12;
      const validUntil = form.end_date
        ? format(addMonths(new Date(form.end_date), validMonths), "yyyy-MM-dd")
        : null;

      const certData = {
        certificate_code: code,
        student_name: form.student_name,
        student_cpf: form.student_cpf,
        student_phone: form.student_phone || null,
        course_name: selectedModel?.name || "",
        course_duration: selectedModel?.duration || "",
        course_modality: selectedModel?.modality || "",
        programmatic_content: selectedModel?.programmatic_content || [],
        start_date: form.start_date,
        end_date: form.end_date,
        valid_until: validUntil,
        location_and_date: form.location_and_date,
        client_id: clientId,
        client_name: selectedCompany?.nome_fantasia || selectedCompany?.razao_social || "",
        instructor_name: selectedModel?.instructor_name || "",
        technical_responsibles: selectedModel?.technical_responsibles || [],
        front_background_url: selectedModel?.front_background_url || "",
        back_background_url: selectedModel?.back_background_url || "",
        show_programmatic_hours: selectedModel?.show_programmatic_hours ?? true,
        issue_date: new Date().toISOString(),
        status: "pending_signature",
        whatsapp_sent: false,
      };

      if (form.detran_registro) certData.detran_registro = form.detran_registro;
      if (form.renach) certData.renach = form.renach;
      if (form.categoria_cnh) certData.categoria_cnh = form.categoria_cnh;

      const created = await base44.entities.Certificate.create(certData);

      logAction("emissao_individual", "Certificate", created?.id, form.student_name, {
        descricao: `Certificado emitido para ${form.student_name}`,
        codigo: code,
        curso: selectedModel?.name || "",
        empresa: selectedCompany?.nome_fantasia || selectedCompany?.razao_social || "",
        cpf: form.student_cpf,
        data_inicio: form.start_date,
        data_fim: form.end_date,
        modelo_id: modelId,
        modelo_nome: selectedModel?.name || "",
        resultado: form.resultado,
      });

      if (sendWhatsApp && form.student_phone && created?.id) {
        try {
          const res = await base44.functions.invoke("enviarCertificadoWhatsApp", { certificate_id: created.id });
          if (res.data?.whatsapp_url) window.open(res.data.whatsapp_url, "_blank");
        } catch {
          toast.warning("Certificado criado, mas WhatsApp não pôde ser enviado.");
        }
      }

      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast.success("✅ Certificado gerado com sucesso!");
      setShowPreview(false);
      onSuccess?.();

      setForm({
        student_name: "", student_cpf: "", student_phone: "",
        detran_registro: "", renach: "", categoria_cnh: "",
        start_date: format(new Date(), "yyyy-MM-dd"),
        end_date: format(new Date(), "yyyy-MM-dd"),
        location_and_date: `Barcarena/PA, ${format(new Date(), "dd 'de' MMMM 'de' yyyy")}`,
        resultado: "Aprovado", observacoes: "",
      });
      setSelectedStudent(null);
      setSelectedEnrollment(null);
      setStudentEnrollments([]);
      setSearchQuery("");
      setModelId("");
    } catch (err) {
      toast.error("Erro ao gerar certificado: " + (err?.message || "Tente novamente."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* 1. Cliente */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Building2 className="w-4 h-4" /> 1. Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative" ref={companyRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-9 pr-8"
                placeholder="Digite o nome ou CNPJ da empresa..."
                value={companySearch}
                onChange={e => {
                  setCompanySearch(e.target.value);
                  setShowCompanyResults(true);
                  if (!e.target.value) { setClientId(""); }
                }}
                onFocus={() => { if (companySearch.length >= 1) setShowCompanyResults(true); }}
              />
              {selectedCompany && (
                <button onClick={() => { setClientId(""); setCompanySearch(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {showCompanyResults && filteredCompanies.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {filteredCompanies.map(c => (
                  <button
                    key={c.id}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
                    onClick={() => { setClientId(c.id); setCompanySearch(c.nome_fantasia || c.razao_social || ""); setShowCompanyResults(false); }}
                  >
                    <p className="text-sm font-semibold text-gray-900">{c.nome_fantasia || c.razao_social}</p>
                    {c.cnpj && <p className="text-xs text-gray-500">CNPJ: {c.cnpj}</p>}
                  </button>
                ))}
              </div>
            )}
            {showCompanyResults && companySearch.length >= 1 && filteredCompanies.length === 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm text-gray-500">
                Nenhuma empresa encontrada para "<strong>{companySearch}</strong>"
              </div>
            )}
          </div>
          {selectedCompany && (
            <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-1.5">
              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              <span><strong>{selectedCompany.nome_fantasia || selectedCompany.razao_social}</strong>{selectedCompany.cnpj ? ` — CNPJ: ${selectedCompany.cnpj}` : ""}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Buscar Aluno */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Search className="w-4 h-4" /> 2. Buscar Aluno Cadastrado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-9 pr-8"
                placeholder="Digite o nome ou CPF do aluno..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setStudentsEnabled(true); setShowSearchResults(true); }}
                onFocus={() => { setStudentsEnabled(true); if (searchQuery.length >= 2) setShowSearchResults(true); }}
              />
              {selectedStudent && (
                <button onClick={clearStudent} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown de resultados */}
            {showSearchResults && filteredStudents.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {filteredStudents.map(s => (
                  <button
                    key={s.id}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
                    onClick={() => handleSelectStudent(s)}
                  >
                    <p className="text-sm font-semibold text-gray-900">{s.full_name}</p>
                    <p className="text-xs text-gray-500">CPF: {s.cpf}{s.whatsapp ? ` • WhatsApp: ${s.whatsapp}` : ""}</p>
                  </button>
                ))}
              </div>
            )}
            {showSearchResults && searchQuery.length >= 2 && filteredStudents.length === 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm text-gray-500">
                Nenhum aluno encontrado para "<strong>{searchQuery}</strong>"
              </div>
            )}
          </div>

          {/* Aluno selecionado */}
          {selectedStudent && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm space-y-0.5">
              <p className="font-semibold text-blue-900">✅ {selectedStudent.full_name}</p>
              <p className="text-xs text-blue-700">CPF: {selectedStudent.cpf}{selectedStudent.whatsapp ? ` • WhatsApp: ${selectedStudent.whatsapp}` : ""}</p>
              <Badge className="bg-blue-100 text-blue-700 text-xs mt-1">
                {studentEnrollments.length} matrícula(s) encontrada(s)
              </Badge>
            </div>
          )}

          {/* Se aluno tem múltiplas matrículas: dropdown para selecionar curso */}
          {selectedStudent && studentEnrollments.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Selecione o curso para certificar:</Label>
              <Select
                value={selectedEnrollment?.id || ""}
                onValueChange={v => {
                  const enroll = studentEnrollments.find(e => e.id === v);
                  if (enroll) applyEnrollment(enroll);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="📚 Selecione o curso do aluno..." />
                </SelectTrigger>
                <SelectContent>
                  {studentEnrollments.map(enroll => (
                    <SelectItem key={enroll.id} value={enroll.id}>
                      📚 {enroll.course_name} — {enroll.start_date ? new Date(enroll.start_date + "T00:00:00").toLocaleDateString("pt-BR") : "?"} a {enroll.end_date ? new Date(enroll.end_date + "T00:00:00").toLocaleDateString("pt-BR") : "?"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedStudent && studentEnrollments.length === 0 && (
            <div className="flex items-center gap-2 p-2.5 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Nenhuma matrícula encontrada para este aluno. Preencha as datas manualmente.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Modelo do Certificado */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FileText className="w-4 h-4" /> 3. Modelo do Certificado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Select value={modelId} onValueChange={setModelId}>
            <SelectTrigger>
              <SelectValue placeholder="📜 Selecione o modelo..." />
            </SelectTrigger>
            <SelectContent>
              {models.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  📜 {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedModel && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-1.5 border">
              Validade: <strong>{selectedModel.validity_period_months || 12} meses</strong> • Modalidade: {selectedModel.modality || "—"} • Carga: {selectedModel.duration || "—"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Dados do Participante */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <User className="w-4 h-4" /> 4. Dados do Participante
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alerta de verificação */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              ⚠️ <strong>Verifique todos os dados antes de gerar.</strong> Estas informações serão impressas no certificado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome Completo <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Nome do aluno"
                value={form.student_name}
                onChange={e => handleField("student_name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>CPF <span className="text-red-500">*</span></Label>
              <Input
                placeholder="000.000.000-00"
                value={form.student_cpf}
                onChange={e => handleField("student_cpf", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp do Aluno</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={form.student_phone}
                onChange={e => handleField("student_phone", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nº Registro DETRAN/PA (opcional)</Label>
              <Input
                placeholder="Número do Registro DETRAN/PA"
                value={form.detran_registro}
                onChange={e => handleField("detran_registro", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>RENACH (opcional)</Label>
              <Input
                placeholder="Número do RENACH"
                value={form.renach}
                onChange={e => handleField("renach", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria CNH (opcional)</Label>
              <Input
                placeholder="Ex: A, B, AB, C, D, E"
                value={form.categoria_cnh}
                onChange={e => handleField("categoria_cnh", e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Switch checked={sendWhatsApp} onCheckedChange={setSendWhatsApp} id="send-whatsapp" />
            <Label htmlFor="send-whatsapp" className="cursor-pointer text-sm text-gray-600">
              Enviar link de assinatura via WhatsApp automaticamente
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* 5. Período do Curso */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Award className="w-4 h-4" /> 5. Período do Curso
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Data de Início</Label>
            <Input type="date" value={form.start_date} onChange={e => handleField("start_date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Data de Término</Label>
            <Input type="date" value={form.end_date} onChange={e => handleField("end_date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Local e Data de Emissão</Label>
            <Input value={form.location_and_date} onChange={e => handleField("location_and_date", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* 6. Resultado */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">6. Resultado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            {[
              { value: "Aprovado", label: "🟢 Aprovado", cls: "border-green-400 text-green-700 bg-green-50" },
              { value: "Reprovado", label: "🔴 Reprovado", cls: "border-red-400 text-red-700 bg-red-50" },
              { value: "Não Concluiu", label: "🟡 Não Concluiu", cls: "border-yellow-400 text-yellow-700 bg-yellow-50" },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleField("resultado", opt.value)}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${form.resultado === opt.value ? opt.cls + " ring-2 ring-offset-1" : "border-gray-200 text-gray-500 bg-white hover:bg-gray-50"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 7. Observações */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">7. Observações (opcional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Observações adicionais sobre este certificado..."
            value={form.observacoes}
            onChange={e => handleField("observacoes", e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Preview antes de confirmar */}
      {showPreview && (
        <Card className="border-2 border-blue-300 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-blue-800 flex items-center gap-2">
              👁️ Pré-visualização — Confirme os dados antes de gerar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><span className="text-gray-500">Cliente:</span> <strong>{selectedCompany?.nome_fantasia || "—"}</strong></div>
              <div><span className="text-gray-500">Modelo:</span> <strong>{selectedModel?.name || "—"}</strong></div>
              <div><span className="text-gray-500">Aluno:</span> <strong>{form.student_name || "—"}</strong></div>
              <div><span className="text-gray-500">CPF:</span> <strong>{form.student_cpf || "—"}</strong></div>
              <div><span className="text-gray-500">WhatsApp:</span> {form.student_phone || "—"}</div>
              <div><span className="text-gray-500">Resultado:</span> <strong>{form.resultado}</strong></div>
              <div><span className="text-gray-500">Início:</span> {form.start_date ? new Date(form.start_date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</div>
              <div><span className="text-gray-500">Término:</span> {form.end_date ? new Date(form.end_date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</div>
              <div className="md:col-span-2"><span className="text-gray-500">Local/Data emissão:</span> {form.location_and_date}</div>
              {form.observacoes && <div className="md:col-span-2"><span className="text-gray-500">Obs:</span> {form.observacoes}</div>}
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 flex-1"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</> : "✅ Confirmar e Gerar Certificado"}
              </Button>
              <Button variant="outline" className="border-gray-300 text-gray-600" onClick={() => setShowPreview(false)}>
                ❌ Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botão de pré-visualização */}
      {!showPreview && (
        <Button
          className="w-full bg-blue-700 hover:bg-blue-800"
          onClick={() => {
            if (!clientId) { toast.error("Selecione o cliente."); return; }
            if (!modelId) { toast.error("Selecione o modelo de certificado."); return; }
            if (!form.student_name) { toast.error("Informe o nome do aluno."); return; }
            if (!form.student_cpf) { toast.error("Informe o CPF do aluno."); return; }
            setShowPreview(true);
          }}
        >
          👁️ Pré-visualizar antes de Gerar
        </Button>
      )}
    </div>
  );
}