import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, Send, RefreshCw, XCircle, CheckCircle2, Clock,
  AlertTriangle, Ban, FileText, Eye, RotateCcw, ChevronDown, Award
} from "lucide-react";
import { format, parseISO, isAfter, isBefore, addHours, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import RevocationDialog from "./RevocationDialog";
import CertificateStatusBadge from "./CertificateStatusBadge";

function generateCertCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `CAT-${new Date().getFullYear()}-${code}`;
}

export default function CertificateControlPanel() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [selected, setSelected] = useState([]);
  const [editSignDateTarget, setEditSignDateTarget] = useState(null);
  const [editSignDateValue, setEditSignDateValue] = useState("");
  const queryClient = useQueryClient();

  const { data: enrollments = [], isLoading: loadingEnr } = useQuery({
    queryKey: ["enrollments-control"],
    queryFn: () => base44.entities.StudentCourseEnrollment.list("-created_date", 200),
    refetchInterval: 30000
  });

  const { data: certificates = [], isLoading: loadingCerts } = useQuery({
    queryKey: ["certificates-control"],
    queryFn: () => base44.entities.Certificate.list("-created_date", 200),
    refetchInterval: 30000
  });

  const { data: certModels = [] } = useQuery({
    queryKey: ["cert-models"],
    queryFn: () => base44.entities.CertificateModel.list()
  });

  const updateEnrollment = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StudentCourseEnrollment.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(["enrollments-control"])
  });

  const createCertificate = useMutation({
    mutationFn: (data) => base44.entities.Certificate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["certificates-control"]);
      queryClient.invalidateQueries(["enrollments-control"]);
    }
  });

  const updateCertificate = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Certificate.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(["certificates-control"])
  });

  // Autorizar matrícula
  const handleAuthorize = async (enrollment) => {
    await updateEnrollment.mutateAsync({
      id: enrollment.id,
      data: { status: "Autorizado", authorized_at: new Date().toISOString() }
    });
    toast.success(`Matrícula de ${enrollment.student_name} autorizada!`);
  };

  // Autorizar em massa
  const handleBulkAuthorize = async () => {
    const targets = enrollments.filter(e => selected.includes(e.id) && e.status === "Aguardando Autorização");
    for (const e of targets) await handleAuthorize(e);
    setSelected([]);
    toast.success(`${targets.length} matrículas autorizadas!`);
  };

  // Gerar certificado
  const handleGenerate = async (enrollment) => {
    const model = certModels.find(m => m.id === enrollment.certificate_model_id);
    const code = generateCertCode();
    const now = new Date();
    const expiresAt = addDays(now, 7);

    const cert = await createCertificate.mutateAsync({
      certificate_code: code,
      student_id: enrollment.student_id,
      student_name: enrollment.student_name,
      student_cpf: enrollment.student_cpf,
      student_email: enrollment.student_email || "",
      student_phone: enrollment.student_phone || "",
      course_id: enrollment.course_id,
      course_name: enrollment.course_name,
      course_duration: enrollment.course_duration || "",
      client_id: enrollment.company_id,
      client_name: enrollment.company_name,
      instructor_name: enrollment.instructor_name || "",
      start_date: enrollment.start_date,
      end_date: enrollment.end_date,
      valid_until: enrollment.valid_until,
      issue_date: now.toISOString(),
      status: "pending_signature",
      enrollment_id: enrollment.id,
      version: 1,
      signature_link_expires_at: expiresAt.toISOString(),
      front_background_url: model?.front_background_url || "",
      back_background_url: model?.back_background_url || "",
      programmatic_content: model?.programmatic_content || [],
      technical_responsibles: model?.technical_responsibles || [],
      show_programmatic_hours: model?.show_programmatic_hours ?? true
    });

    await updateEnrollment.mutateAsync({
      id: enrollment.id,
      data: { status: "Certificado Gerado", certificate_id: cert.id }
    });

    // Enviar WhatsApp automaticamente
    try {
      const signUrl = `${window.location.origin}/CertificateSign?code=${code}`;
      await base44.functions.invoke("enviarCertificadoWhatsApp", {
        phone: enrollment.student_phone,
        studentName: enrollment.student_name,
        courseName: enrollment.course_name,
        signUrl,
        certificateCode: code
      });
      await updateCertificate.mutateAsync({ id: cert.id, data: { whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() } });
    } catch (e) {
      console.warn("Erro ao enviar WhatsApp:", e);
    }

    toast.success(`Certificado ${code} gerado e link enviado via WhatsApp!`);
  };

  // Gerar em massa
  const handleBulkGenerate = async () => {
    const targets = enrollments.filter(e => selected.includes(e.id) && e.status === "Autorizado");
    for (const e of targets) await handleGenerate(e);
    setSelected([]);
    toast.success(`${targets.length} certificados gerados!`);
  };

  // Reenviar link
  const handleResendLink = async (cert) => {
    try {
      const signUrl = `${window.location.origin}/CertificateSign?code=${cert.certificate_code}`;
      await base44.functions.invoke("enviarCertificadoWhatsApp", {
        phone: cert.student_phone,
        studentName: cert.student_name,
        courseName: cert.course_name,
        signUrl,
        certificateCode: cert.certificate_code
      });
      await updateCertificate.mutateAsync({
        id: cert.id,
        data: {
          whatsapp_sent: true,
          whatsapp_sent_at: new Date().toISOString(),
          signature_reminder_sent_at: new Date().toISOString()
        }
      });
      toast.success("Link de assinatura reenviado!");
    } catch (e) {
      toast.error("Erro ao reenviar link.");
    }
  };

  // Revogar certificado
  const handleRevoke = async ({ cert, reason }) => {
    await updateCertificate.mutateAsync({
      id: cert.id,
      data: {
        status: "revoked",
        revocation_reason: reason,
        revoked_at: new Date().toISOString()
      }
    });
    // Atualizar matrícula vinculada
    if (cert.enrollment_id) {
      await updateEnrollment.mutateAsync({ id: cert.enrollment_id, data: { status: "Revogado" } });
    }
    toast.success("Certificado revogado.");
    setRevokeTarget(null);
  };

  // Editar data de assinatura manualmente
  const handleEditSignDate = (cert) => {
    setEditSignDateTarget(cert);
    // Inicializa com a data atual no formato datetime-local
    const current = cert.signed_at ? new Date(cert.signed_at) : new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const localStr = `${current.getFullYear()}-${pad(current.getMonth()+1)}-${pad(current.getDate())}T${pad(current.getHours())}:${pad(current.getMinutes())}`;
    setEditSignDateValue(localStr);
  };

  const handleSaveSignDate = async () => {
    if (!editSignDateTarget || !editSignDateValue) return;
    await updateCertificate.mutateAsync({
      id: editSignDateTarget.id,
      data: { signed_at: new Date(editSignDateValue).toISOString() }
    });
    toast.success("Data de assinatura atualizada!");
    setEditSignDateTarget(null);
    setEditSignDateValue("");
  };

  // Revalidar certificado revogado
  const handleRevalidate = async (cert) => {
    await updateCertificate.mutateAsync({
      id: cert.id,
      data: { status: "pending_signature", revocation_reason: "", revoked_at: null }
    });
    if (cert.enrollment_id) {
      await updateEnrollment.mutateAsync({ id: cert.enrollment_id, data: { status: "Certificado Gerado" } });
    }
    toast.success("Certificado revalidado.");
  };

  // Filtrar matrículas pendentes (sem certificado gerado)
  const pendingEnrollments = enrollments.filter(e =>
    ["Aguardando Autorização", "Autorizado"].includes(e.status)
  );

  // Filtrar certificados emitidos
  const issuedCerts = certificates.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    return [c.student_name, c.certificate_code, c.client_name, c.course_name]
      .some(v => v && v.toLowerCase().includes(search.toLowerCase()));
  });

  const certStats = {
    total: certificates.length,
    pending: certificates.filter(c => c.status === "pending_signature").length,
    signed: certificates.filter(c => c.status === "signed").length,
    revoked: certificates.filter(c => c.status === "revoked").length,
    expired: certificates.filter(c => {
      return c.valid_until && isBefore(parseISO(c.valid_until), new Date()) && c.status !== "revoked";
    }).length
  };

  const toggleSelect = (id) => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: certStats.total, color: "bg-blue-50 text-blue-700" },
          { label: "Pendentes", value: certStats.pending, color: "bg-yellow-50 text-yellow-700" },
          { label: "Assinados", value: certStats.signed, color: "bg-green-50 text-green-700" },
          { label: "Vencidos", value: certStats.expired, color: "bg-red-50 text-red-700" },
          { label: "Revogados", value: certStats.revoked, color: "bg-gray-100 text-gray-700" }
        ].map(c => (
          <div key={c.label} className={`rounded-lg p-3 ${c.color}`}>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Seção: Matrículas aguardando ação */}
      {pendingEnrollments.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-yellow-50 border-b px-4 py-3 flex items-center justify-between">
            <h2 className="font-semibold text-yellow-800 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Matrículas Aguardando Ação ({pendingEnrollments.length})
            </h2>
            {selected.length > 0 && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleBulkAuthorize}>
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Autorizar Selecionados
                </Button>
                <Button size="sm" onClick={handleBulkGenerate}>
                  <FileText className="w-3 h-3 mr-1" /> Gerar Certificados
                </Button>
              </div>
            )}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 w-8">
                  <input type="checkbox" onChange={e => {
                    setSelected(e.target.checked ? pendingEnrollments.map(x => x.id) : []);
                  }} checked={selected.length === pendingEnrollments.length && pendingEnrollments.length > 0} />
                </th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Aluno</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Curso</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Empresa</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Vencimento</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                <th className="px-4 py-2 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pendingEnrollments.map(e => (
                <tr key={e.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <input type="checkbox" checked={selected.includes(e.id)} onChange={() => toggleSelect(e.id)} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{e.student_name}</div>
                    <div className="text-xs text-gray-400">{e.student_cpf}</div>
                  </td>
                  <td className="px-4 py-2 text-gray-600 max-w-[160px] truncate">{e.course_name}</td>
                  <td className="px-4 py-2 text-gray-600">{e.company_name}</td>
                  <td className="px-4 py-2 text-gray-600 text-xs">
                    {e.valid_until ? format(parseISO(e.valid_until), "dd/MM/yyyy") : "-"}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      e.status === "Aguardando Autorização" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"
                    }`}>{e.status}</span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      {e.status === "Aguardando Autorização" && (
                        <Button size="sm" variant="outline" onClick={() => handleAuthorize(e)}
                          className="text-xs h-7 text-blue-600 border-blue-200 hover:bg-blue-50">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Autorizar
                        </Button>
                      )}
                      {e.status === "Autorizado" && (
                        <Button size="sm" onClick={() => handleGenerate(e)}
                          className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700">
                          <FileText className="w-3 h-3 mr-1" /> Gerar Certificado
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Seção: Certificados emitidos */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-white border-b px-4 py-3 flex flex-wrap gap-2 items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" />
            Certificados Emitidos
          </h2>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Buscar..." className="pl-9 h-8 text-sm w-48" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select
              className="border rounded-md px-2 py-1 text-sm text-gray-600"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos os status</option>
              <option value="pending_signature">⏳ Pendente</option>
              <option value="signed">✅ Assinado</option>
              <option value="revoked">🚫 Revogado</option>
              <option value="expired">❌ Vencido</option>
            </select>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Código</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Aluno</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Curso</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Empresa</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Vencimento</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
              <th className="px-4 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(loadingCerts || loadingEnr) && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>
            )}
            {!loadingCerts && issuedCerts.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum certificado encontrado.</td></tr>
            )}
            {issuedCerts.map(cert => {
              const isExpired = cert.valid_until && isBefore(parseISO(cert.valid_until), new Date()) && cert.status !== "revoked";
              const displayStatus = isExpired && cert.status !== "revoked" ? "expired" : cert.status;
              return (
                <tr key={cert.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-gray-700">{cert.certificate_code}</td>
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900">{cert.student_name}</div>
                    <div className="text-xs text-gray-400">{cert.student_cpf}</div>
                  </td>
                  <td className="px-4 py-2 text-gray-600 max-w-[160px] truncate">{cert.course_name}</td>
                  <td className="px-4 py-2 text-gray-600">{cert.client_name}</td>
                  <td className="px-4 py-2">
                    <span className={isExpired ? "text-red-600 font-semibold text-xs" : "text-gray-600 text-xs"}>
                      {cert.valid_until ? format(parseISO(cert.valid_until), "dd/MM/yyyy") : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <CertificateStatusBadge status={displayStatus} signedAt={cert.signed_at} revokedReason={cert.revocation_reason} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {cert.status === "pending_signature" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => handleResendLink(cert)}>
                          <Send className="w-3 h-3 mr-1" /> Reenviar
                        </Button>
                      )}
                      {cert.status === "signed" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-purple-600 border-purple-200 hover:bg-purple-50"
                          onClick={() => handleEditSignDate(cert)}>
                          <Clock className="w-3 h-3 mr-1" /> Data Assinatura
                        </Button>
                      )}
                      {cert.status !== "revoked" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => setRevokeTarget(cert)}>
                          <Ban className="w-3 h-3 mr-1" /> Revogar
                        </Button>
                      )}
                      {cert.status === "revoked" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => handleRevalidate(cert)}>
                          <RotateCcw className="w-3 h-3 mr-1" /> Revalidar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Dialog editar data assinatura */}
      {editSignDateTarget && (
        <Dialog open onOpenChange={() => setEditSignDateTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Editar Data de Assinatura</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <p className="text-sm text-gray-500 mb-1">Aluno: <span className="font-medium text-gray-800">{editSignDateTarget.student_name}</span></p>
                <p className="text-sm text-gray-500 mb-3">Curso: <span className="font-medium text-gray-800">{editSignDateTarget.course_name}</span></p>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova data e hora da assinatura</label>
                <input
                  type="datetime-local"
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  value={editSignDateValue}
                  onChange={e => setEditSignDateValue(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditSignDateTarget(null)}>Cancelar</Button>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleSaveSignDate}>
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog revogar */}
      <RevocationDialog
        cert={revokeTarget}
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}