import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Search, Clock, Settings, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import CertificateValidation from "@/components/certificates/CertificateValidation";
import CertificateQRCode from "@/components/certificates/CertificateQRCode";
import BulkCertificateExporter from "@/components/certificates/BulkCertificateExporter";
import { Checkbox } from "@/components/ui/checkbox";
import CertificateActionBar from "@/components/certificates/CertificateActionBar";

const statusConfig = {
  pending_signature: { label: "Aguardando Assinatura", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  signed: { label: "Assinado", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
  active: { label: "Ativo", color: "bg-green-100 text-green-800", icon: CheckCircle },
  revoked: { label: "Revogado", color: "bg-red-100 text-red-800", icon: XCircle },
  expired: { label: "Vencido", color: "bg-gray-100 text-gray-700", icon: XCircle },
};

export default function Certificates() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("lista");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [canDelete, setCanDelete] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(user => {
      if (!user) return;
      const masterRoles = ["admin", "gestor_master", "Administrador Master"];
      if (masterRoles.includes(user.role)) {
        setCanDelete(true);
        return;
      }
      // Verificar se tem permissão delegada via UserProfile
      base44.entities.UserProfile.filter({ user_email: user.email }).then(profiles => {
        const profile = profiles[0];
        if (profile?.permissions?.includes("delete_certificates")) {
          setCanDelete(true);
        }
      }).catch(() => {});
    }).catch(() => {});
  }, []);

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

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Certificate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast.success("Certificado excluído com sucesso!");
    },
  });

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
      <TabsList className="grid grid-cols-2 w-full max-w-sm">
        <TabsTrigger value="lista" className="gap-2">
          <Award className="w-4 h-4" /> Lista
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
              {["all", "pending_signature", "signed", "active", "revoked", "expired"].map((s) => (
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
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {/* Checkbox */}
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(cert.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-shrink-0"
                        />

                        {/* QR Code */}
                        {cert.certificate_code && (
                          <div className="flex-shrink-0 hidden sm:block">
                            <CertificateQRCode certificateCode={cert.certificate_code} size={48} showLabel={false} />
                          </div>
                        )}

                        {/* Info principal */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 text-sm">{cert.student_name}</span>
                            <Badge className={sc.color + " border-0 text-xs"}>
                              <Icon className="w-3 h-3 mr-1" />
                              {sc.label}
                            </Badge>
                            {cert.whatsapp_sent && (
                              <span className="text-xs text-green-600">✓ WA</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-0.5 truncate">
                            {cert.course_name}
                            {cert.course_duration && <span className="text-gray-400"> · {cert.course_duration}</span>}
                            {cert.client_name && <span className="text-gray-400"> · {cert.client_name}</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {cert.certificate_code && (
                              <span className="text-xs font-mono text-gray-400">{cert.certificate_code}</span>
                            )}
                            {cert.student_cpf && (
                              <span className="text-xs text-gray-400">CPF: {cert.student_cpf}</span>
                            )}
                            {cert.valid_until && (
                              <span className="text-xs text-gray-400">Válido até: {cert.valid_until}</span>
                            )}
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <CertificateActionBar
                            cert={cert}
                            model={getModelForCert(cert)}
                            canDelete={canDelete}
                            onRevoke={(id) => revokeMutation.mutate(id)}
                            onUnrevoke={(id) => unrevokeMutation.mutate(id)}
                            onDelete={(id) => deleteMutation.mutate(id)}
                            onRefresh={() => queryClient.invalidateQueries({ queryKey: ["certificates"] })}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Validação */}
        <TabsContent value="validar" className="mt-4">
          <CertificateValidation />
        </TabsContent>
      </Tabs>
    </div>
  );
}