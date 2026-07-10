/**
 * CertificateControlPanel — SPR-2B-2
 * Fila de Certificação organizada em sub-abas (Aptos / Pend. Acadêmicas / Pend. Financeiras / Bloqueados)
 * e Certificados Emitidos em sub-abas (Aguardando / Assinados / Impressão / Revogados).
 *
 * Regras de negócio: exclusivamente o motor central (aptidaoCertificacao.js) — nenhuma regra nova.
 * Emissão (individual e em massa) sempre validada por verificarAptidao + gateFinanceiro.
 * Revogação, revalidação e edição de data de assinatura geram AuditLog (SPR-2B-2).
 */
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Eye, Shield } from "lucide-react";
import { addDays } from "date-fns";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import RevocationDialog from "./RevocationDialog";
import RevalidacaoDialog from "./RevalidacaoDialog";
import { executarCorrecaoOperacional } from "@/lib/correcaoOperacional";
import GerarCertificadoWizard from "./GerarCertificadoWizard";
import { gerarCodigoInternoControle } from "@/lib/certControl";
import { classificarFila, verificarAptidao } from "@/lib/aptidaoCertificacao";
import { categorizarFilaVisual, aplicarFiltrosFila } from "@/lib/filaVisual";
import { registrarTentativaBloqueada } from "@/lib/validarEmissao";
import FilaFiltros, { FILTROS_INICIAIS } from "./fila/FilaFiltros";
import FilaAptosTab from "./fila/FilaAptosTab";
import FilaPendAcademicasTab from "./fila/FilaPendAcademicasTab";
import FilaPendFinanceirasTab from "./fila/FilaPendFinanceirasTab";
import FilaBloqueadosTab from "./fila/FilaBloqueadosTab";
import EmitidosSubTabs from "./emitidos/EmitidosSubTabs";

const AUTHORIZED_ROLES = ["admin", "gestor_master", "Administrador Master", "Certificacao", "Certificação"];

function generateCertCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `CAT-${new Date().getFullYear()}-${code}`;
}

export default function CertificateControlPanel({ navTarget }) {
  const [search, setSearch] = useState("");
  const [filaSub, setFilaSub] = useState("aptos");
  const [emitSub, setEmitSub] = useState("aguardando");
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [selectedIds, setSelectedIds] = useState([]);
  const [emitindoMassa, setEmitindoMassa] = useState(false);
  const [massaRelatorio, setMassaRelatorio] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revalidateTarget, setRevalidateTarget] = useState(null); // SPR-2D-2
  const [signJustif, setSignJustif] = useState(""); // SPR-2D-2
  const [signJustifError, setSignJustifError] = useState("");
  const [wizardEnrollment, setWizardEnrollment] = useState(null);
  const [editSignDateTarget, setEditSignDateTarget] = useState(null);
  const [editSignDateValue, setEditSignDateValue] = useState("");
  const [generatingId, setGeneratingId] = useState(null);

  const queryClient = useQueryClient();
  const { role } = usePermissions();
  const canGenerate = AUTHORIZED_ROLES.includes(role);

  // SPR-2B-2: navegação profunda vinda do Dashboard
  useEffect(() => {
    if (navTarget?.area === "fila" && navTarget.tab) setFilaSub(navTarget.tab);
    if (navTarget?.area === "emitidos" && navTarget.tab) setEmitSub(navTarget.tab);
  }, [navTarget]);

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

  // SPR-2A — Gate Financeiro: empresas (bloqueio financeiro/contratos) e solicitações de liberação
  const { data: companies = [] } = useQuery({
    queryKey: ["companies-control"],
    queryFn: () => base44.entities.Company.list("-created_date", 300),
  });

  const { data: solicitacoesLib = [] } = useQuery({
    queryKey: ["solicitacoes-liberacao-control"],
    queryFn: () => base44.entities.SolicitacaoLiberacaoFinanceira.list("-created_date", 300),
    refetchInterval: 30000,
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

  const ctxMotor = { certModels, certificates, companies, solicitacoes: solicitacoesLib };

  // Classificação pelo motor central + categorização visual (SPR-2B-2, sem regra nova)
  const fila = classificarFila(enrollments, ctxMotor);
  const filaVis = categorizarFilaVisual(fila);
  const aptosF = aplicarFiltrosFila(filaVis.aptos, filtros).sort((a, b) => {
    const da = a.end_date ? new Date(a.end_date) : new Date(a.created_date);
    const db = b.end_date ? new Date(b.end_date) : new Date(b.created_date);
    return da - db;
  });
  const acadF = aplicarFiltrosFila(filaVis.academicas, filtros);
  const finF = aplicarFiltrosFila(filaVis.financeiras, filtros);
  const bloqF = aplicarFiltrosFila(filaVis.bloqueados, filtros);

  const awaitingAuth = enrollments.filter(e => e.status === "Aguardando Autorização");

  // ── Auditoria (SPR-2B-2) ────────────────────────────────────────────────────
  const logCertAudit = async (action, cert, details) => {
    try {
      const user = await base44.auth.me().catch(() => null);
      await base44.entities.AuditLog.create({
        user_email: user?.email || "desconhecido",
        user_name: user?.full_name || user?.email || "desconhecido",
        action,
        entity_type: "Certificate",
        entity_id: cert.id,
        entity_name: `Certificado ${cert.certificate_code} — ${cert.student_name} — ${cert.course_name}`,
        details: `${details} em ${new Date().toLocaleString("pt-BR")}.`,
      });
    } catch { /* log não bloqueia */ }
  };

  const handleAuthorize = async (enrollment) => {
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

  // ── Emissão (individual e em massa) — sempre pelo motor central ────────────
  const emitirCertificado = async (enrollment, model, modelId, user, detalhes) => {
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
        details: `${detalhes} em ${now.toLocaleString("pt-BR")}. Modelo: "${model?.name || "—"}".`,
      });
    } catch { /* log não bloqueia */ }
    return code;
  };

  const handleWizardConfirm = async ({ enrollment, modelId, model, resultado, observacoes }) => {
    setGeneratingId(enrollment.id);
    try {
      const user = await base44.auth.me();
      const aval = verificarAptidao(enrollment, ctxMotor);
      if (aval.grupo !== "aguardando") {
        const motivo = aval.bloqueios.join("; ") || "Matrícula não apta para certificação";
        await registrarTentativaBloqueada(enrollment, motivo, "Fila de Certificação");
        toast.error("Emissão bloqueada: " + motivo);
        setWizardEnrollment(null);
        return;
      }
      const code = await emitirCertificado(enrollment, model, modelId, user,
        `Certificado gerado manualmente pela fila. Resultado: ${resultado}.${observacoes ? ` Obs: ${observacoes}` : ""}`);
      setWizardEnrollment(null);
      toast.success(`Certificado ${code} gerado com sucesso!`);
    } catch (e) {
      toast.error("Erro ao gerar certificado: " + e.message);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleEmitirMassa = async () => {
    const selecionados = aptosF.filter(e => selectedIds.includes(e.id));
    if (!selecionados.length) return;
    setEmitindoMassa(true);
    try {
      const user = await base44.auth.me();
      let ok = 0;
      const bloqueadosRel = [];
      for (const e of selecionados) {
        // Revalida cada aluno pelo motor central antes de emitir (SPR-2B-1)
        const aval = verificarAptidao(e, ctxMotor);
        if (aval.grupo !== "aguardando" || !aval.modelo) {
          const motivo = aval.bloqueios.join("; ") || "Modelo de certificado indisponível";
          bloqueadosRel.push(`${e.student_name}: ${motivo}`);
          await registrarTentativaBloqueada(e, motivo, "Emissão em Massa — Fila");
          continue;
        }
        await emitirCertificado(e, aval.modelo, aval.modelo.id, user,
          "Emissão em massa pela Fila de Certificação (validada pelo motor central)");
        ok++;
      }
      setMassaRelatorio({ processados: selecionados.length, emitidos: ok, bloqueados: bloqueadosRel });
      setSelectedIds([]);
      toast.success(`${ok} certificado(s) emitido(s).${bloqueadosRel.length ? ` ${bloqueadosRel.length} bloqueado(s) pelo motor.` : ""}`);
    } catch (e) {
      toast.error("Erro na emissão em massa: " + e.message);
    } finally {
      setEmitindoMassa(false);
    }
  };

  // ── Ciclo do certificado (com AuditLog — SPR-2B-2) ──────────────────────────
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
    const user = await base44.auth.me().catch(() => null);
    await updateCertificate.mutateAsync({
      id: cert.id,
      data: {
        status: "revoked",
        revocation_reason: reason,
        revoked_at: new Date().toISOString(),
        revoked_by: user?.email || "desconhecido",
      },
    });
    if (cert.enrollment_id) {
      await updateEnrollment.mutateAsync({ id: cert.enrollment_id, data: { status: "Revogado" } });
    }
    await logCertAudit("update", cert,
      `REVOGAÇÃO DE CERTIFICADO. Motivo: ${reason}. Status anterior: ${cert.status} → novo: revoked. Aluno: ${cert.student_name}`);
    toast.success("Certificado revogado.");
    setRevokeTarget(null);
  };

  // SPR-2D-2: revalidação exige justificativa obrigatória + AuditLog estruturado (padrão 2D-1)
  const handleRevalidate = async ({ cert, justificativa }) => {
    const reg = await executarCorrecaoOperacional({
      origem: "Certificação",
      entidade: "Certificate",
      entidade_id: cert.id,
      aluno_id: cert.student_id || "",
      matricula_id: cert.enrollment_id || "",
      certificado_id: cert.id,
      curso_id: cert.course_id || "",
      empresa_id: cert.client_id || "",
      campo: "status",
      valor_anterior: `revoked (motivo da revogação: ${cert.revocation_reason || "—"})`,
      valor_novo: "pending_signature",
      justificativa,
      tipo: "revalidacao_certificado",
      impacto: `Revalidação do certificado ${cert.certificate_code} — ${cert.student_name} — ${cert.course_name}. Validade: ${cert.valid_until || "—"} (inalterada). Certificado volta a aguardar assinatura.`,
    });
    if (!reg.sucesso) {
      toast.error("Revalidação bloqueada: " + reg.erro);
      return;
    }
    await updateCertificate.mutateAsync({
      id: cert.id,
      data: { status: "pending_signature", revocation_reason: "", revoked_at: null },
    });
    if (cert.enrollment_id) {
      await updateEnrollment.mutateAsync({ id: cert.enrollment_id, data: { status: "Certificado Gerado" } });
    }
    toast.success("Certificado revalidado.");
    setRevalidateTarget(null);
  };

  const handleEditSignDate = (cert) => {
    setEditSignDateTarget(cert);
    setSignJustif("");
    setSignJustifError("");
    const current = cert.signed_at ? new Date(cert.signed_at) : new Date();
    const pad = n => String(n).padStart(2, "0");
    setEditSignDateValue(`${current.getFullYear()}-${pad(current.getMonth()+1)}-${pad(current.getDate())}T${pad(current.getHours())}:${pad(current.getMinutes())}`);
  };

  // SPR-2D-2: dados de assinatura exigem justificativa + AuditLog estruturado; data inválida bloqueada
  const handleSaveSignDate = async () => {
    if (!editSignDateTarget) return;
    const cert = editSignDateTarget;
    if (!signJustif.trim()) {
      setSignJustifError("Alterar dados de assinatura exige justificativa obrigatória.");
      return;
    }
    const novaData = new Date(editSignDateValue);
    if (!editSignDateValue || isNaN(novaData.getTime())) {
      setSignJustifError("Data de assinatura inválida. Informe uma data/hora válida.");
      return;
    }
    const anterior = cert.signed_at || "—";
    const nova = novaData.toISOString();
    const reg = await executarCorrecaoOperacional({
      origem: "Certificação",
      entidade: "Certificate",
      entidade_id: cert.id,
      aluno_id: cert.student_id || "",
      matricula_id: cert.enrollment_id || "",
      certificado_id: cert.id,
      curso_id: cert.course_id || "",
      empresa_id: cert.client_id || "",
      campo: "signed_at",
      valor_anterior: anterior,
      valor_novo: nova,
      justificativa: signJustif,
      tipo: "alteracao_dados_assinatura",
      impacto: `Alteração de dados de assinatura do certificado ${cert.certificate_code} (status: ${cert.status}). Impacta comprovante de assinatura, impressão com assinatura e validação pública. Histórico de impressão preservado.${cert.status === "revoked" ? " ATENÇÃO: certificado REVOGADO." : ""}`,
    });
    if (!reg.sucesso) {
      setSignJustifError(reg.erro);
      return;
    }
    await updateCertificate.mutateAsync({ id: cert.id, data: { signed_at: nova } });
    toast.success("Data de assinatura atualizada!");
    setEditSignDateTarget(null);
  };

  const invalidateSolicitacoes = () => queryClient.invalidateQueries(["solicitacoes-liberacao-control"]);

  const FILA_TABS = [
    { key: "aptos", label: `🟢 Aptos (${aptosF.length})` },
    { key: "academicas", label: `🟠 Pend. Acadêmicas (${acadF.length})` },
    { key: "financeiras", label: `💰 Pend. Financeiras (${finF.length})` },
    { key: "bloqueados", label: `🔴 Bloqueados / Não Aptos (${bloqF.length})` },
  ];

  return (
    <div className="space-y-6">

      {!canGenerate && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <Shield className="w-4 h-4 flex-shrink-0" />
          <span>Você tem acesso de visualização. Somente <strong>Certificadores</strong> e <strong>Administradores</strong> podem gerar certificados.</span>
        </div>
      )}

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

      {/* FILA DE CERTIFICAÇÃO — sub-abas (SPR-2B-2) */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1 items-center">
          {FILA_TABS.map(t => (
            <button key={t.key} onClick={() => setFilaSub(t.key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filaSub === t.key ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}>
              {t.label}
            </button>
          ))}
          {!canGenerate && (
            <span className="text-xs text-gray-500 flex items-center gap-1 ml-2"><Eye className="w-3 h-3" /> Somente visualização</span>
          )}
        </div>

        <FilaFiltros filtros={filtros} setFiltros={setFiltros} />

        {massaRelatorio && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm">
            <p className="font-semibold text-emerald-800">
              Último processamento em massa: {massaRelatorio.processados} processado(s) · {massaRelatorio.emitidos} emitido(s) · {massaRelatorio.bloqueados.length} bloqueado(s)
            </p>
            {massaRelatorio.bloqueados.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {massaRelatorio.bloqueados.map((b, i) => <li key={i} className="text-xs text-red-700">🔒 {b}</li>)}
              </ul>
            )}
          </div>
        )}

        {loadingEnr ? (
          <div className="text-center py-10 text-gray-400 text-sm">Carregando fila...</div>
        ) : (
          <>
            {filaSub === "aptos" && (
              <FilaAptosTab items={aptosF} canGenerate={canGenerate}
                selectedIds={selectedIds} setSelectedIds={setSelectedIds}
                onEmitir={setWizardEnrollment} onEmitirMassa={handleEmitirMassa} emitindoMassa={emitindoMassa} />
            )}
            {filaSub === "academicas" && <FilaPendAcademicasTab items={acadF} />}
            {filaSub === "financeiras" && (
              <FilaPendFinanceirasTab items={finF} solicitacoes={solicitacoesLib} onAtualizar={invalidateSolicitacoes} />
            )}
            {filaSub === "bloqueados" && <FilaBloqueadosTab items={bloqF} />}
          </>
        )}
      </div>

      {/* CERTIFICADOS EMITIDOS — sub-abas (SPR-2B-2) */}
      <EmitidosSubTabs
        certificates={certificates}
        loading={loadingCerts}
        canGenerate={canGenerate}
        search={search} setSearch={setSearch}
        subTab={emitSub} setSubTab={setEmitSub}
        onResend={handleResendLink}
        onEditSignDate={handleEditSignDate}
        onRevoke={setRevokeTarget}
        onRevalidate={setRevalidateTarget}
      />

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
              {editSignDateTarget.status === "revoked" && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  ⚠️ ATENÇÃO: este certificado está REVOGADO. Alterar dados de assinatura de certificado revogado é uma ação excepcional.
                </p>
              )}
              <div>
                <label className="text-sm font-medium">Justificativa <span className="text-red-500">*</span></label>
                <textarea rows={3}
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="Descreva obrigatoriamente o motivo da alteração..."
                  value={signJustif}
                  onChange={e => { setSignJustif(e.target.value); setSignJustifError(""); }} />
                {signJustifError && <p className="text-xs text-red-500 mt-1">{signJustifError}</p>}
              </div>
              <p className="text-xs text-gray-500 bg-gray-50 border rounded-md px-3 py-2">
                Alterar dados de assinatura pode impactar o comprovante, impressão e validação pública. Informe a justificativa.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditSignDateTarget(null)}>Cancelar</Button>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleSaveSignDate}>Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <RevocationDialog cert={revokeTarget} onConfirm={handleRevoke} onCancel={() => setRevokeTarget(null)} />
      <RevalidacaoDialog cert={revalidateTarget} onConfirm={handleRevalidate} onCancel={() => setRevalidateTarget(null)} />
    </div>
  );
}