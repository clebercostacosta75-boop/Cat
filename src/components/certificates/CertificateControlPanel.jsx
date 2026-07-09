/**
 * CertificateControlPanel
 *
 * Fluxo correto:
 * - Certificado NUNCA é gerado automaticamente.
 * - Somente usuários com role "Certificacao", "Certificação", "admin" ou "gestor_master"
 *   veem o botão "Gerar Certificado".
 * - Gerar exige wizard de 3 passos + confirmação manual.
 * - Cada geração registra quem gerou, quando, e qual modelo foi usado (AuditLog).
 */
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, Send, Ban, RotateCcw, Clock, Award, CheckCircle2, Eye, Shield
} from "lucide-react";
import { format, parseISO, isBefore, differenceInDays, addDays } from "date-fns";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import RevocationDialog from "./RevocationDialog";
import CertificateStatusBadge from "./CertificateStatusBadge";
import GerarCertificadoWizard from "./GerarCertificadoWizard";
import { gerarCodigoInternoControle } from "@/lib/certControl";
import { classificarFila, verificarAptidao } from "@/lib/aptidaoCertificacao";
import FilaPendenciasBloqueados from "./FilaPendenciasBloqueados";

const AUTHORIZED_ROLES = ["admin", "gestor_master", "Administrador Master", "Certificacao", "Certificação"];

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
  const [wizardEnrollment, setWizardEnrollment] = useState(null);
  const [editSignDateTarget, setEditSignDateTarget] = useState(null);
  const [editSignDateValue, setEditSignDateValue] = useState("");
  const [generatingId, setGeneratingId] = useState(null);

  const queryClient = useQueryClient();
  const { role } = usePermissions();
  const canGenerate = AUTHORIZED_ROLES.includes(role);

  const { data: enrollments = [], isLoading: loadingEnr } = useQuery({
    queryKey: ["enrollments-control"],
    queryFn: () => base44.entities.StudentCourseEnrollment.list("-created_date", 200),
    refetchInterval: 30000,
  });

  const { data: certificates = [], isLoading: loadingCerts } = useQuery({
    queryKey: ["certificates-control"],
    queryFn: () => base44.entities.Certificate.list("-created_date", 200),
    refetchInterval: 30000,
  });

  const { data: certModels = [] } = useQuery({
    queryKey: ["cert-models-control"],
    queryFn: () => base44.entities.CertificateModel.list(),
  });

  const updateEnrollment = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StudentCourseEnrollment.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(["enrollments-control"]),
  });

  const createCertificate = useMutation({
    mutationFn: (data) => base44.entities.Certificate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["certificates-control"]);
      queryClient.invalidateQueries(["enrollments-control"]);
    },
  });

  const updateCertificate = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Certificate.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(["certificates-control"]),
  });

  // Fila de Certificação (SPR-A): classificação automática por aptidão
  const fila = classificarFila(enrollments, { certModels, certificates });
  const certQueue = fila.aguardando
    .sort((a, b) => {
      const da = a.end_date ? new Date(a.end_date) : new Date(a.created_date);
      const db = b.end_date ? new Date(b.end_date) : new Date(b.created_date);
      return da - db;
    });

  // Matrículas aguardando autorização
  const awaitingAuth = enrollments.filter(e => e.status === "Aguardando Autorização");

  const handleAuthorize = async (enrollment) => {
    // SPR-A: autorização exige resultado acadêmico Aprovado
    if (enrollment.resultado_academico && enrollment.resultado_academico !== "Aprovado") {
      toast.error(`Bloqueado: resultado acadêmico "${enrollment.resultado_academico}". Defina como Aprovado na Gestão Acadêmica.`);
      try {
        const user = await base44.auth.me();
        await base44.entities.AuditLog.create({
          user_email: user?.email || "desconhecido",
          user_name: user?.full_name || user?.email || "desconhecido",
          action: "update",
          entity_type: "StudentCourseEnrollment",
          entity_id: enrollment.id,
          entity_name: `${enrollment.student_name} — ${enrollment.course_name}`,
          details: `TENTATIVA DE AUTORIZAÇÃO BLOQUEADA em ${new Date().toLocaleString("pt-BR")}. Resultado acadêmico: ${enrollment.resultado_academico}.`,
        });
      } catch { /* log não bloqueia */ }
      return;
    }
    await updateEnrollment.mutateAsync({
      id: enrollment.id,
      data: { status: "Autorizado", authorized_at: new Date().toISOString() },
    });
    toast.success(`Matrícula de ${enrollment.student_name} marcada como Apta para Certificar.`);
  };

  const handleWizardConfirm = async ({ enrollment, modelId, model, resultado, observacoes }) => {
    setGeneratingId(enrollment.id);
    try {
      const user = await base44.auth.me();

      // SPR-A: bloqueio de emissão para matrículas não aptas
      const aval = verificarAptidao(enrollment, { certModels, certificates });
      if (aval.grupo !== "aguardando") {
        const motivo = aval.bloqueios.join("; ") || "Matrícula não apta para certificação";
        try {
          await base44.entities.AuditLog.create({
            user_email: user?.email || "desconhecido",
            user_name: user?.full_name || user?.email || "desconhecido",
            action: "update",
            entity_type: "StudentCourseEnrollment",
            entity_id: enrollment.id,
            entity_name: `${enrollment.student_name} — ${enrollment.course_name}`,
            details: `TENTATIVA DE EMISSÃO DE CERTIFICADO BLOQUEADA em ${new Date().toLocaleString("pt-BR")}. Motivo: ${motivo}`,
          });
        } catch { /* log não bloqueia */ }
        toast.error("Emissão bloqueada: " + motivo);
        setWizardEnrollment(null);
        return;
      }

      const code = generateCertCode();
      const now = new Date();
      const expiresAt = addDays(now, 7);

      const certData = {
        certificate_code: code,
        internal_control_code: gerarCodigoInternoControle(),
        certification_type: enrollment.certification_type || "Formação",
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
        class_schedule_id: enrollment.class_schedule_id || "",
        version: 1,
        signature_link_expires_at: expiresAt.toISOString(),
        front_background_url: model?.front_background_url || "",
        back_background_url: model?.back_background_url || "",
        programmatic_content: model?.programmatic_content || [],
        technical_responsibles: model?.technical_responsibles || [],
        show_programmatic_hours: model?.show_programmatic_hours ?? true,
        certificate_model_id: modelId || "",
        certificate_model_name: model?.name || "",
      };

      const cert = await createCertificate.mutateAsync(certData);

      await updateEnrollment.mutateAsync({
        id: enrollment.id,
        data: { status: "Certificado Gerado", certificate_id: cert.id },
      });

      try {
        await base44.entities.AuditLog.create({
          user_email: user?.email || "desconhecido",
          user_name: user?.full_name || user?.email || "desconhecido",
          action: "create",
          entity_type: "Certificate",
          entity_id: cert.id,
          entity_name: `Certificado ${code} — ${enrollment.student_name} — ${enrollment.course_name}`,
          details: `Certificado gerado manualmente em ${now.toLocaleString("pt-BR")}. Modelo: "${model?.name || "—"}". Resultado: ${resultado}.${observacoes ? ` Obs: ${observacoes}` : ""}`,
        });
      } catch {
        // log não bloqueia a geração
      }

      setWizardEnrollment(null);
      toast.success(`Certificado ${code} gerado com sucesso!`);
    } catch (e) {
      toast.error("Erro ao gerar certificado: " + e.message);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleResendLink = async (cert) => {
    try {
      const signUrl = `${window.location.origin}/CertificateSign?code=${cert.certificate_code}`;
      await base44.functions.invoke("enviarCertificadoWhatsApp", {
        phone: cert.student_phone,
        studentName: cert.student_name,
        courseName: cert.course_name,
        signUrl,
        certificateCode: cert.certificate_code,
      });
      await updateCertificate.mutateAsync({
        id: cert.id,
        data: { whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString(), signature_reminder_sent_at: new Date().toISOString() },
      });
      toast.success("Link de assinatura reenviado!");
    } catch {
      toast.error("Erro ao reenviar link.");
    }
  };

  const handleRevoke = async ({ cert, reason }) => {
    await updateCertificate.mutateAsync({
      id: cert.id,
      data: { status: "revoked", revocation_reason: reason, revoked_at: new Date().toISOString() },
    });
    if (cert.enrollment_id) {
      await updateEnrollment.mutateAsync({ id: cert.enrollment_id, data: { status: "Revogado" } });
    }
    toast.success("Certificado revogado.");
    setRevokeTarget(null);
  };

  const handleRevalidate = async (cert) => {
    await updateCertificate.mutateAsync({
      id: cert.id,
      data: { status: "pending_signature", revocation_reason: "", revoked_at: null },
    });
    if (cert.enrollment_id) {
      await updateEnrollment.mutateAsync({ id: cert.enrollment_id, data: { status: "Certificado Gerado" } });
    }
    toast.success("Certificado revalidado.");
  };

  const handleEditSignDate = (cert) => {
    setEditSignDateTarget(cert);
    const current = cert.signed_at ? new Date(cert.signed_at) : new Date();
    const pad = n => String(n).padStart(2, "0");
    setEditSignDateValue(`${current.getFullYear()}-${pad(current.getMonth()+1)}-${pad(current.getDate())}T${pad(current.getHours())}:${pad(current.getMinutes())}`);
  };

  const handleSaveSignDate = async () => {
    if (!editSignDateTarget || !editSignDateValue) return;
    await updateCertificate.mutateAsync({
      id: editSignDateTarget.id,
      data: { signed_at: new Date(editSignDateValue).toISOString() },
    });
    toast.success("Data de assinatura atualizada!");
    setEditSignDateTarget(null);
  };

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
    expired: certificates.filter(c => c.valid_until && isBefore(parseISO(c.valid_until), new Date()) && c.status !== "revoked").length,
  };

  return (
    <div className="space-y-6">

      {!canGenerate && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <Shield className="w-4 h-4 flex-shrink-0" />
          <span>Você tem acesso de visualização. Somente <strong>Certificadores</strong> e <strong>Administradores</strong> podem gerar certificados.</span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: certStats.total, color: "bg-blue-50 text-blue-700" },
          { label: "Aguardando Assinatura", value: certStats.pending, color: "bg-yellow-50 text-yellow-700" },
          { label: "Assinados", value: certStats.signed, color: "bg-green-50 text-green-700" },
          { label: "Vencidos", value: certStats.expired, color: "bg-red-50 text-red-700" },
          { label: "Revogados", value: certStats.revoked, color: "bg-gray-100 text-gray-700" },
        ].map(c => (
          <div key={c.label} className={`rounded-lg p-3 ${c.color}`}>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Aguardando autorização */}
      {awaitingAuth.length > 0 && canGenerate && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-blue-50 border-b px-4 py-3">
            <h2 className="font-semibold text-blue-800 flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Aguardando Autorização ({awaitingAuth.length}) — Autorize para entrar na fila de certificação
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Aluno</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Curso</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Empresa</th>
                <th className="px-4 py-2 font-medium text-gray-600">Ação</th>
              </tr>
            </thead>
            <tbody>
              {awaitingAuth.map(e => (
                <tr key={e.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="font-medium">{e.student_name}</div>
                    <div className="text-xs text-gray-400">{e.student_cpf}</div>
                  </td>
                  <td className="px-4 py-2 text-gray-600 max-w-[160px] truncate">{e.course_name}</td>
                  <td className="px-4 py-2 text-gray-600">{e.company_name}</td>
                  <td className="px-4 py-2">
                    <Button size="sm" variant="outline" onClick={() => handleAuthorize(e)}
                      className="text-xs h-7 text-blue-600 border-blue-200 hover:bg-blue-50">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Autorizar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FILA DE CERTIFICAÇÃO */}
      <div className="border-2 rounded-lg overflow-hidden border-emerald-200">
        <div className="bg-emerald-50 border-b px-4 py-3 flex items-center justify-between">
          <h2 className="font-semibold text-emerald-800 flex items-center gap-2">
            <Award className="w-4 h-4" />
            Fila de Certificação — Aptos para Certificar ({certQueue.length})
          </h2>
          {!canGenerate && (
            <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full flex items-center gap-1">
              <Eye className="w-3 h-3" /> Somente visualização
            </span>
          )}
        </div>

        {certQueue.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Award className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum aluno aguardando certificado no momento.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Aluno</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Curso</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Empresa</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Conclusão</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Aguardando</th>
                {canGenerate && <th className="px-4 py-2 font-medium text-gray-600">Ação</th>}
              </tr>
            </thead>
            <tbody>
              {certQueue.map(e => {
                const dias = e.end_date ? differenceInDays(new Date(), parseISO(e.end_date)) : 0;
                const urgente = dias > 30;
                return (
                  <tr key={e.id} className={`border-b ${urgente ? "bg-red-50" : "hover:bg-gray-50"}`}>
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{e.student_name}</div>
                      <div className="text-xs text-gray-400">{e.student_cpf}</div>
                    </td>
                    <td className="px-4 py-2 text-gray-600 max-w-[160px] truncate">{e.course_name}</td>
                    <td className="px-4 py-2 text-gray-500">{e.company_name || "—"}</td>
                    <td className="px-4 py-2 text-gray-600 text-xs">
                      {e.end_date ? format(parseISO(e.end_date), "dd/MM/yyyy") : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${urgente ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                        {dias > 0 ? `${dias}d` : "Hoje"}{urgente && " ⚠️"}
                      </span>
                    </td>
                    {canGenerate && (
                      <td className="px-4 py-2">
                        <Button
                          size="sm"
                          className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => setWizardEnrollment(e)}
                          disabled={generatingId === e.id}
                        >
                          <Award className="w-3 h-3 mr-1" /> Gerar Certificado
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* PENDÊNCIAS E BLOQUEADOS (SPR-A) */}
      <FilaPendenciasBloqueados pendencias={fila.pendencias} bloqueados={fila.bloqueados} />

      {/* CERTIFICADOS EMITIDOS */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-white border-b px-4 py-3 flex flex-wrap gap-2 items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" /> Certificados Emitidos
          </h2>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Buscar..." className="pl-9 h-8 text-sm w-48" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="border rounded-md px-2 py-1 text-sm text-gray-600" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">Todos os status</option>
              <option value="pending_signature">⏳ Aguardando Assinatura</option>
              <option value="signed">✅ Assinado</option>
              <option value="revoked">🚫 Revogado</option>
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
              const displayStatus = isExpired ? "expired" : cert.status;
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
                      {cert.valid_until ? format(parseISO(cert.valid_until), "dd/MM/yyyy") : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <CertificateStatusBadge status={displayStatus} signedAt={cert.signed_at} revokedReason={cert.revocation_reason} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {cert.status === "pending_signature" && canGenerate && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleResendLink(cert)}>
                          <Send className="w-3 h-3 mr-1" /> Reenviar
                        </Button>
                      )}
                      {cert.status === "signed" && canGenerate && (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-purple-600 border-purple-200 hover:bg-purple-50"
                          onClick={() => handleEditSignDate(cert)}>
                          <Clock className="w-3 h-3 mr-1" /> Data Assinatura
                        </Button>
                      )}
                      {cert.status !== "revoked" && canGenerate && (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => setRevokeTarget(cert)}>
                          <Ban className="w-3 h-3 mr-1" /> Revogar
                        </Button>
                      )}
                      {cert.status === "revoked" && canGenerate && (
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

      {/* Wizard de geração manual */}
      {wizardEnrollment && (
        <GerarCertificadoWizard
          enrollment={wizardEnrollment}
          onConfirm={handleWizardConfirm}
          onCancel={() => setWizardEnrollment(null)}
          isLoading={generatingId === wizardEnrollment.id}
        />
      )}

      {/* Dialog editar data assinatura */}
      {editSignDateTarget && (
        <Dialog open onOpenChange={() => setEditSignDateTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Editar Data de Assinatura</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-500">Aluno: <span className="font-medium text-gray-800">{editSignDateTarget.student_name}</span></p>
              <p className="text-sm text-gray-500">Curso: <span className="font-medium text-gray-800">{editSignDateTarget.course_name}</span></p>
              <input type="datetime-local" className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                value={editSignDateValue} onChange={e => setEditSignDateValue(e.target.value)} />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditSignDateTarget(null)}>Cancelar</Button>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleSaveSignDate}>Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <RevocationDialog cert={revokeTarget} onConfirm={handleRevoke} onCancel={() => setRevokeTarget(null)} />
    </div>
  );
}