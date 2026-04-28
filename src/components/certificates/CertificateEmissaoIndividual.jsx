import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { logAction } from "@/components/audit/AuditLogger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Award, Building2, FileText, User, Loader2 } from "lucide-react";
import { format, addMonths } from "date-fns";

function gerarCodigo() {
  const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `CAT-${new Date().getFullYear()}-${rand}`;
}

export default function CertificateEmissaoIndividual({ onSuccess }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [clientId, setClientId] = useState("");
  const [modelId, setModelId] = useState("");
  const [sendWhatsApp, setSendWhatsApp] = useState(true);

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
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("nome_fantasia", 100),
  });

  const { data: models = [] } = useQuery({
    queryKey: ["certificateModels"],
    queryFn: () => base44.entities.CertificateModel.list("-created_date", 100),
  });

  const selectedCompany = companies.find(c => c.id === clientId);
  const selectedModel = models.find(m => m.id === modelId);

  const handleField = (k, v) => setForm(f => ({ ...f, [k]: v }));

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

      // Campos DETRAN opcionais
      if (form.detran_registro) certData.detran_registro = form.detran_registro;
      if (form.renach) certData.renach = form.renach;
      if (form.categoria_cnh) certData.categoria_cnh = form.categoria_cnh;

      const created = await base44.entities.Certificate.create(certData);

      // Registrar auditoria
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
      });

      // Enviar WhatsApp se solicitado e se tiver telefone
      if (sendWhatsApp && form.student_phone && created?.id) {
        try {
          const res = await base44.functions.invoke("enviarCertificadoWhatsApp", { certificate_id: created.id });
          if (res.data?.whatsapp_url) window.open(res.data.whatsapp_url, "_blank");
        } catch (e) {
          toast.warning("Certificado criado, mas WhatsApp não pôde ser enviado.");
        }
      }

      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast.success("Certificado gerado com sucesso!");
      onSuccess?.();

      // Reset form
      setForm({
        student_name: "",
        student_cpf: "",
        student_phone: "",
        detran_registro: "",
        renach: "",
        categoria_cnh: "",
        start_date: format(new Date(), "yyyy-MM-dd"),
        end_date: format(new Date(), "yyyy-MM-dd"),
        location_and_date: `Barcarena/PA, ${format(new Date(), "dd 'de' MMMM 'de' yyyy")}`,
      });
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
            <Building2 className="w-4 h-4" /> 1. Selecione o Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger>
              <SelectValue placeholder="🏢 Selecione a empresa..." />
            </SelectTrigger>
            <SelectContent>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  🏢 {c.nome_fantasia || c.razao_social}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 2. Modelo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FileText className="w-4 h-4" /> 2. Selecione o Modelo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={modelId} onValueChange={setModelId}>
            <SelectTrigger>
              <SelectValue placeholder="📜 Selecione o modelo..." />
            </SelectTrigger>
            <SelectContent>
              {models.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  📜 {m.name} ({m.duration})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 3. Dados do Participante */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <User className="w-4 h-4" /> 3. Dados do Participante
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

      {/* 4. Período do Curso */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Award className="w-4 h-4" /> 4. Período do Curso
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Data de Início</Label>
            <Input
              type="date"
              value={form.start_date}
              onChange={e => handleField("start_date", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Data de Término</Label>
            <Input
              type="date"
              value={form.end_date}
              onChange={e => handleField("end_date", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Local e Data de Emissão</Label>
            <Input
              value={form.location_and_date}
              onChange={e => handleField("location_and_date", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</> : "Gerar e Salvar Certificado"}
      </Button>
    </div>
  );
}