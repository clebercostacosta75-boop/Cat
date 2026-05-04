import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Search, Send, Eye, XCircle, Copy, CheckCircle, Clock, Settings, PlusCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import CertificateExporter from "@/components/certificates/CertificateExporter";
import CertificateValidation from "@/components/certificates/CertificateValidation";
import CertificateQRCode from "@/components/certificates/CertificateQRCode";
import BulkCertificateExporter from "@/components/certificates/BulkCertificateExporter";
import { Checkbox } from "@/components/ui/checkbox";
import CertificateEmissaoIndividual from "@/components/certificates/CertificateEmissaoIndividual";
import CertificateEmissaoMassa from "@/components/certificates/CertificateEmissaoMassa";

const statusConfig = {
  pending_signature: { label: "Aguardando Assinatura", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  signed: { label: "Assinado", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
  active: { label: "Ativo", color: "bg-green-100 text-green-800", icon: CheckCircle },
  revoked: { label: "Revogado", color: "bg-red-100 text-red-800", icon: XCircle },
};

export default function Certificates() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("lista");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const queryClient = useQueryClient();

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ["certificates"],
    queryFn: () => base44.entities.Certificate.list("-created_date", 200),
  });

  const { data: models = [] } = useQuery({
    queryKey: ["certificateModels"],
    queryFn: () => base44.entities.CertificateModel.list("-created_date", 100),
  });

  const getModelForCert = (cert) =>
    models.find(m => m.name === cert.course_name || m.id === cert.model_id) || null;

  const revokeMutation = useMutation({
    mutationFn: (id) => base44.entities.Certificate.update(id, { status: "revoked" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast.success("Certificado revogado.");
    },
  });

  const unrevokeMutation = useMutation({
    mutationFn: (id) => base44.entities.Certificate.update(id, { status: "active" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast.success("Revogação desfeita. Certificado reativado.");
    },
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: (certificateId) =>
      base44.functions.invoke("enviarCertificadoWhatsApp", { certificate_id: certificateId }),
    onSuccess: (res) => {
      if (res.data?.whatsapp_url) window.open(res.data.whatsapp_url, "_blank");
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast.success("Link de assinatura enviado via WhatsApp!");
    },
    onError: (err) => {
      toast.error("Erro ao enviar WhatsApp: " + (err?.message || "Tente novamente"));
    },
  });

  const copySignLink = (code) => {
    const url = `${window.location.origin}/CertificateSign?code=${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link de assinatura copiado!");
  };

  const copyValidateLink = (code) => {
    const url = `${window.location.origin}/CertificateValidate?code=${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link de validação copiado!");
  };

  const filtered = certificates.filter((c) => {
    const matchSearch =
      !search ||
      c.student_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.course_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.certificate_code?.toLowerCase().includes(search.toLowerCase()) ||
      c.student_cpf?.includes(search);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  };

  const selectedCerts = filtered.filter((c) => selectedIds.has(c.id));
  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  const stats = {
    total: certificates.length,
    pending: certificates.filter((c) => c.status === "pending_signature").length,
    signed: certificates.filter((c) => c.status === "signed" || c.status === "active").length,
    revoked: certificates.filter((c) => c.status === "revoked").length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-6 h-6" /> Certificados
          </h1>
          <p className="text-gray-500 text-sm mt-1">Gestão de certificados de treinamentos NR</p>
        </div>
        <div className="flex gap-2">
          <Link to="/CertDesigner">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="w-4 h-4" /> Editar Modelos
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-gray-900" },
          { label: "Aguardando", value: stats.pending, color: "text-yellow-600" },
          { label: "Assinados", value: stats.signed, color: "text-green-600" },
          { label: "Revogados", value: stats.revoked, color: "text-red-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="lista" className="gap-2">
            <Award className="w-4 h-4" /> Lista
          </TabsTrigger>
          <TabsTrigger value="emitir" className="gap-2">
            <PlusCircle className="w-4 h-4" /> Emitir
          </TabsTrigger>
          <TabsTrigger value="massa" className="gap-2">
            <Users className="w-4 h-4" /> Em Massa
          </TabsTrigger>
          <TabsTrigger value="validar" className="gap-2">
            <Search className="w-4 h-4" /> Validar
          </TabsTrigger>
        </TabsList>

        {/* Lista de Certificados */}
        <TabsContent value="lista" className="space-y-4 mt-4">

          {/* Barra de seleção em lote */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 gap-3">
              <span className="text-sm font-medium text-emerald-800">
                {selectedIds.size} certificado{selectedIds.size !== 1 ? "s" : ""} selecionado{selectedIds.size !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-2">
                <BulkCertificateExporter
                  certificates={selectedCerts}
                  models={models}
                  onDone={() => setSelectedIds(new Set())}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por aluno, curso, CPF ou código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {["all", "pending_signature", "signed", "active", "revoked"].map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "all" ? "Todos" : statusConfig[s]?.label || s}
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-gray-400">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Nenhum certificado encontrado.</div>
          ) : (
            <div className="space-y-3">
              {/* Selecionar todos */}
              <div className="flex items-center gap-2 px-1">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm text-gray-500 cursor-pointer select-none">
                  {allSelected ? "Desselecionar todos" : `Selecionar todos (${filtered.length})`}
                </label>
              </div>

              {filtered.map((cert) => {
                const sc = statusConfig[cert.status] || statusConfig.pending_signature;
                const Icon = sc.icon;
                const isSelected = selectedIds.has(cert.id);
                return (
                  <Card
                    key={cert.id}
                    className={`hover:shadow-md transition-shadow cursor-pointer ${isSelected ? "ring-2 ring-emerald-400 bg-emerald-50/30" : ""}`}
                    onClick={() => toggleSelect(cert.id)}
                  >
                    <CardContent className="py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(cert.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 flex-shrink-0"
                          />
                        <div className="flex-1 min-w-0 flex gap-3 items-start">
                          {cert.certificate_code && (
                            <div className="flex-shrink-0 hidden sm:block">
                              <CertificateQRCode certificateCode={cert.certificate_code} size={56} showLabel={false} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900">{cert.student_name}</span>
                            <Badge className={sc.color + " border-0"}>
                              <Icon className="w-3 h-3 mr-1" />
                              {sc.label}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {cert.course_name}
                            {cert.course_duration && ` • ${cert.course_duration}`}
                            {cert.client_name && ` • ${cert.client_name}`}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {cert.certificate_code && (
                              <span className="font-mono">{cert.certificate_code}</span>
                            )}
                            {cert.student_cpf && <span className="ml-2">CPF: {cert.student_cpf}</span>}
                            {cert.valid_until && <span className="ml-2">Válido até: {cert.valid_until}</span>}
                          </div>
                          {cert.whatsapp_sent && (
                            <div className="text-xs text-green-600 mt-1">✓ WhatsApp enviado</div>
                          )}
                          </div>{/* fim info text */}
                        </div>{/* fim flex QR + info */}
                        </div>{/* fim flex checkbox + conteúdo */}
                        <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          {cert.status === "pending_signature" && cert.student_phone && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendWhatsAppMutation.mutate(cert.id)}
                              disabled={sendWhatsAppMutation.isPending}
                              className="text-green-700 border-green-300 hover:bg-green-50"
                            >
                              <Send className="w-3 h-3 mr-1" /> WhatsApp
                            </Button>
                          )}
                          {cert.status === "pending_signature" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copySignLink(cert.certificate_code)}
                            >
                              <Copy className="w-3 h-3 mr-1" /> Link Assinatura
                            </Button>
                          )}
                          {cert.certificate_code && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyValidateLink(cert.certificate_code)}
                            >
                              <Eye className="w-3 h-3 mr-1" /> Link Validação
                            </Button>
                          )}
                          <CertificateExporter certificate={cert} model={getModelForCert(cert)} />
                          {cert.status === "revoked" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => {
                                if (confirm("Desfazer a revogação deste certificado?")) unrevokeMutation.mutate(cert.id);
                              }}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" /> Desfazer Revogação
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => {
                                if (confirm("Revogar este certificado?")) revokeMutation.mutate(cert.id);
                              }}
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Revogar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Emissão Individual */}
        <TabsContent value="emitir" className="mt-4">
          <div className="max-w-3xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Emitir Certificado Individual</CardTitle>
                <p className="text-sm text-gray-500 mt-2">Preencha os dados para gerar um novo certificado</p>
              </CardHeader>
              <CardContent>
                <CertificateEmissaoIndividual onSuccess={() => setActiveTab("lista")} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Emissão em Massa */}
        <TabsContent value="massa" className="mt-4">
          <div className="max-w-3xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Emissão em Massa</CardTitle>
                <p className="text-sm text-gray-500 mt-2">Cole os dados da planilha para gerar múltiplos certificados</p>
              </CardHeader>
              <CardContent>
                <CertificateEmissaoMassa onSuccess={() => setActiveTab("lista")} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Validação */}
        <TabsContent value="validar" className="mt-4">
          <CertificateValidation />
        </TabsContent>
      </Tabs>
    </div>
  );
}