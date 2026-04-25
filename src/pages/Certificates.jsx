import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Award, Plus, Printer, Search, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Certificates() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [previewCert, setPreviewCert] = useState(null);
  const [form, setForm] = useState({
    student_name: "",
    course_name: "",
    course_id: "",
    company_name: "",
    company_id: "",
    class_schedule_id: "",
    completion_date: "",
    workload_hours: "",
    location: "",
    instructor_name: "",
    validity_months: 12,
    notes: ""
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ["certificates"],
    queryFn: () => base44.entities.Certificate.list("-created_date"),
    initialData: [],
  });

  const { data: classSchedules = [] } = useQuery({
    queryKey: ["classSchedules"],
    queryFn: () => base44.entities.ClassSchedule.list(),
    initialData: [],
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Certificate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast.success("Certificado criado com sucesso!");
      setShowForm(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Certificate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast.success("Certificado excluído.");
    },
  });

  const resetForm = () => {
    setForm({
      student_name: "",
      course_name: "",
      course_id: "",
      company_name: "",
      company_id: "",
      class_schedule_id: "",
      completion_date: "",
      workload_hours: "",
      location: "",
      instructor_name: "",
      validity_months: 12,
      notes: ""
    });
  };

  const handleClassSelect = (classId) => {
    const cls = classSchedules.find(c => c.id === classId);
    if (!cls) return;
    const company = companies.find(c => c.id === cls.company_id);
    const lastDate = cls.realization_dates?.length
      ? cls.realization_dates[cls.realization_dates.length - 1]
      : "";
    setForm(prev => ({
      ...prev,
      class_schedule_id: classId,
      course_name: cls.training_name || "",
      course_id: cls.training_id || "",
      company_name: cls.company_name || "",
      company_id: cls.company_id || "",
      completion_date: lastDate,
      workload_hours: cls.duration_hours || "",
      location: cls.location || "",
      instructor_name: cls.instructor_name || "",
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const certNumber = `CERT-${Date.now().toString().slice(-8)}`;
    let expiration_date = null;
    if (form.completion_date && form.validity_months) {
      const d = new Date(form.completion_date);
      d.setMonth(d.getMonth() + Number(form.validity_months));
      expiration_date = d.toISOString().split("T")[0];
    }
    createMutation.mutate({
      ...form,
      workload_hours: Number(form.workload_hours),
      validity_months: Number(form.validity_months),
      certificate_number: certNumber,
      expiration_date,
      status: "Ativo"
    });
  };

  const handlePrint = (cert) => {
    setPreviewCert(cert);
    setTimeout(() => window.print(), 300);
  };

  const filtered = certificates.filter(c =>
    c.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.course_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDatePtBR = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "cert-print-styles";
    style.textContent = `
      @media print {
        @page { size: A4 portrait; margin: 0; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body > * { display: none !important; }
        #certificate-print-area { display: flex !important; }
        #app-sidebar, #app-header { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => document.getElementById("cert-print-styles")?.remove();
  }, []);

  return (
    <div className="p-4 md:p-8">
      {/* Certificado para impressão - oculto na tela */}
      {previewCert && (
        <div id="certificate-print-area" className="hidden print:flex fixed inset-0 z-[9999] bg-white items-center justify-center" style={{ width: "210mm", height: "297mm" }}>
          <CertificatePrintLayout cert={previewCert} formatDate={formatDatePtBR} />
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black flex items-center gap-2">
              <Award className="w-7 h-7 text-emerald-600" />
              Certificados
            </h1>
            <p className="text-gray-500 text-sm mt-1">Gerencie e emita certificados de conclusão</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Certificado
          </Button>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-10"
            placeholder="Buscar por aluno, curso ou empresa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Lista */}
        <div className="grid gap-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Award className="w-14 h-14 mx-auto mb-3 text-gray-200" />
              <p>Nenhum certificado encontrado</p>
            </div>
          ) : (
            filtered.map(cert => (
              <Card key={cert.id} className="border border-gray-200">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 grid md:grid-cols-4 gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{cert.student_name}</p>
                      <p className="text-xs text-gray-500">{cert.certificate_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">{cert.course_name}</p>
                      <p className="text-xs text-gray-500">{cert.company_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">{formatDatePtBR(cert.completion_date)}</p>
                      <p className="text-xs text-gray-500">{cert.workload_hours}h • Válido até: {formatDatePtBR(cert.expiration_date)}</p>
                    </div>
                    <div>
                      <Badge className={cert.status === "Ativo" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                        {cert.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button size="icon" variant="outline" onClick={() => setPreviewCert(cert)} title="Visualizar">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => handlePrint(cert)} title="Imprimir">
                      <Printer className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => deleteMutation.mutate(cert.id)} title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Modal Novo Certificado */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Certificado</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Vincular a uma Turma (opcional)</Label>
              <Select onValueChange={handleClassSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma turma para preencher automaticamente" />
                </SelectTrigger>
                <SelectContent>
                  {classSchedules.filter(c => c.status === "Concluído").map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.training_name} — {cls.company_name} ({cls.month})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Aluno *</Label>
                <Input required value={form.student_name} onChange={e => setForm(p => ({ ...p, student_name: e.target.value }))} placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <Label>Nome do Curso *</Label>
                <Input required value={form.course_name} onChange={e => setForm(p => ({ ...p, course_name: e.target.value }))} placeholder="Nome do curso" />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} placeholder="Nome da empresa" />
              </div>
              <div className="space-y-2">
                <Label>Instrutor</Label>
                <Input value={form.instructor_name} onChange={e => setForm(p => ({ ...p, instructor_name: e.target.value }))} placeholder="Nome do instrutor" />
              </div>
              <div className="space-y-2">
                <Label>Data de Conclusão *</Label>
                <Input required type="date" value={form.completion_date} onChange={e => setForm(p => ({ ...p, completion_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Carga Horária (horas) *</Label>
                <Input required type="number" value={form.workload_hours} onChange={e => setForm(p => ({ ...p, workload_hours: e.target.value }))} placeholder="Ex: 8" />
              </div>
              <div className="space-y-2">
                <Label>Local</Label>
                <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Cidade / Local" />
              </div>
              <div className="space-y-2">
                <Label>Validade (meses)</Label>
                <Input type="number" value={form.validity_months} onChange={e => setForm(p => ({ ...p, validity_months: e.target.value }))} placeholder="Ex: 12" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Criar Certificado"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Pré-visualização */}
      <Dialog open={!!previewCert && !false} onOpenChange={() => setPreviewCert(null)}>
        {previewCert && (
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Pré-visualização do Certificado</DialogTitle>
            </DialogHeader>
            <div className="flex justify-end mb-2">
              <Button onClick={() => handlePrint(previewCert)} className="bg-emerald-600 hover:bg-emerald-700">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir / Salvar PDF
              </Button>
            </div>
            <div className="overflow-auto border rounded-lg" style={{ maxHeight: "70vh" }}>
              <CertificatePrintLayout cert={previewCert} formatDate={formatDatePtBR} />
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function CertificatePrintLayout({ cert, formatDate }) {
  return (
    <div style={{
      width: "210mm",
      minHeight: "297mm",
      background: "white",
      fontFamily: "Georgia, serif",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20mm 18mm",
      boxSizing: "border-box",
      border: "12px solid #059669",
      outline: "4px solid #d1fae5",
      outlineOffset: "-18px",
    }}>
      {/* Logo / Topo */}
      <div style={{ textAlign: "center", marginBottom: "12mm" }}>
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png"
          alt="Logo"
          style={{ height: "45px", objectFit: "contain", marginBottom: "8px" }}
        />
        <div style={{ width: "80mm", height: "2px", background: "#059669", margin: "0 auto" }} />
      </div>

      {/* Título */}
      <div style={{ textAlign: "center", marginBottom: "10mm" }}>
        <h1 style={{ fontSize: "28pt", fontWeight: "bold", color: "#064e3b", letterSpacing: "4px", textTransform: "uppercase", margin: 0 }}>
          Certificado
        </h1>
        <p style={{ fontSize: "11pt", color: "#6b7280", margin: "4px 0 0", letterSpacing: "2px" }}>
          DE CONCLUSÃO
        </p>
      </div>

      {/* Corpo */}
      <div style={{ textAlign: "center", lineHeight: "1.8", marginBottom: "10mm" }}>
        <p style={{ fontSize: "11pt", color: "#374151", margin: "0 0 6mm" }}>
          Certificamos que
        </p>
        <p style={{ fontSize: "20pt", fontWeight: "bold", color: "#111827", borderBottom: "2px solid #059669", paddingBottom: "4px", margin: "0 0 6mm", display: "inline-block", minWidth: "120mm" }}>
          {cert.student_name}
        </p>
        <p style={{ fontSize: "11pt", color: "#374151", margin: "6mm 0 4mm" }}>
          concluiu com êxito o curso de
        </p>
        <p style={{ fontSize: "15pt", fontWeight: "bold", color: "#064e3b", margin: "0 0 6mm" }}>
          {cert.course_name}
        </p>
        <p style={{ fontSize: "10.5pt", color: "#4b5563", margin: "0 0 2mm" }}>
          com carga horária de <strong>{cert.workload_hours} horas</strong>
          {cert.company_name ? `, realizado na empresa ${cert.company_name}` : ""}
          {cert.location ? `, em ${cert.location}` : ""}
          , em <strong>{formatDate(cert.completion_date)}</strong>.
        </p>
      </div>

      {/* Número do certificado */}
      <p style={{ fontSize: "8.5pt", color: "#9ca3af", marginBottom: "12mm" }}>
        Certificado Nº {cert.certificate_number}
        {cert.expiration_date ? ` • Válido até ${formatDate(cert.expiration_date)}` : ""}
      </p>

      {/* Assinaturas */}
      <div style={{ display: "flex", justifyContent: "space-around", width: "100%", marginTop: "auto" }}>
        <div style={{ textAlign: "center", minWidth: "60mm" }}>
          <div style={{ borderTop: "1.5px solid #374151", paddingTop: "6px" }}>
            <p style={{ fontSize: "9.5pt", fontWeight: "bold", color: "#111827", margin: 0 }}>
              {cert.instructor_name || "________________________________"}
            </p>
            <p style={{ fontSize: "8.5pt", color: "#6b7280", margin: "2px 0 0" }}>Instrutor(a)</p>
          </div>
        </div>
        <div style={{ textAlign: "center", minWidth: "60mm" }}>
          <div style={{ borderTop: "1.5px solid #374151", paddingTop: "6px" }}>
            <p style={{ fontSize: "9.5pt", fontWeight: "bold", color: "#111827", margin: 0 }}>________________________________</p>
            <p style={{ fontSize: "8.5pt", color: "#6b7280", margin: "2px 0 0" }}>Responsável pela Empresa</p>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{ position: "absolute", bottom: "12mm", textAlign: "center", width: "100%" }}>
        <div style={{ width: "80mm", height: "1px", background: "#d1fae5", margin: "0 auto 6px" }} />
        <p style={{ fontSize: "7.5pt", color: "#9ca3af", margin: 0 }}>
          Documento gerado em {new Date().toLocaleDateString("pt-BR")} • Sistema de Treinamento CAT
        </p>
      </div>
    </div>
  );
}