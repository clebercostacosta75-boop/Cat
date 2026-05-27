import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FileText, Send, CheckCircle, Clock, XCircle, Eye, Download, RefreshCw, PenLine,
  AlertTriangle, User, Shield, Copy, ExternalLink, Mail
} from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS = {
  Rascunho: { label: "Rascunho", color: "bg-gray-100 text-gray-700" },
  Gerado_Automaticamente: { label: "Gerado Automaticamente", color: "bg-blue-100 text-blue-700" },
  Gerado_Manualmente: { label: "Gerado Manualmente", color: "bg-indigo-100 text-indigo-700" },
  Enviado_Assinatura: { label: "Enviado para Assinatura", color: "bg-yellow-100 text-yellow-800" },
  Aguardando_Assinatura_Aluno: { label: "Aguardando Aluno", color: "bg-orange-100 text-orange-700" },
  Aguardando_Assinatura_Responsavel_Legal: { label: "Aguardando Resp. Legal", color: "bg-orange-100 text-orange-700" },
  Aguardando_Assinatura_Responsavel_Financeiro: { label: "Aguardando Resp. Financeiro", color: "bg-orange-100 text-orange-700" },
  Aguardando_Assinatura_CAT: { label: "Aguardando CAT", color: "bg-purple-100 text-purple-700" },
  Assinado_Parcialmente: { label: "Assinado Parcialmente", color: "bg-cyan-100 text-cyan-700" },
  Assinado_Todas_Partes: { label: "Assinado por Todas as Partes", color: "bg-emerald-100 text-emerald-800" },
  PDF_Gerado: { label: "PDF Gerado", color: "bg-green-100 text-green-700" },
  Enviado_WhatsApp: { label: "Enviado por WhatsApp", color: "bg-green-100 text-green-700" },
  Cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700" },
  Expirado: { label: "Expirado", color: "bg-gray-100 text-gray-500" },
  Recusado: { label: "Recusado", color: "bg-red-100 text-red-700" },
};

function SignatureStatus({ label, signed_at, required = true }) {
  if (!required) return (
    <div className="flex items-center gap-2 py-2 px-3 border border-gray-100 rounded-lg bg-gray-50">
      <div className="w-4 h-4 rounded-full bg-gray-200 flex-shrink-0" />
      <span className="text-sm text-gray-400">{label} — Não se aplica</span>
    </div>
  );
  return (
    <div className={`flex items-center gap-3 py-2 px-3 border rounded-lg ${signed_at ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
      {signed_at
        ? <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        : <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${signed_at ? "text-emerald-800" : "text-amber-800"}`}>{label}</span>
        {signed_at && <p className="text-xs text-emerald-600">{new Date(signed_at).toLocaleString("pt-BR")}</p>}
        {!signed_at && <p className="text-xs text-amber-600">Pendente</p>}
      </div>
    </div>
  );
}

export default function ContratoAssinaturaTab({ enrollmentId, studentId, studentData, enrollmentData }) {
  const queryClient = useQueryClient();
  const [viewHtml, setViewHtml] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [userRole, setUserRole] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(u => setUserRole(u?.role || "user")).catch(() => {});
  }, []);

  const isMaster = ["admin", "gestor_master", "Administrador Master"].includes(userRole);

  const { data: contracts = [], isLoading, refetch } = useQuery({
    queryKey: ["contract-enrollment", enrollmentId],
    queryFn: () => base44.entities.Contract.filter({ enrollment_id: enrollmentId }),
    enabled: !!enrollmentId,
  });

  const contract = contracts.find(c => !["Cancelado", "Substituido_Aditivo"].includes(c.status)) || contracts[0];

  const handleGerarContrato = async (force = false) => {
    setGenerating(true);
    try {
      const result = await base44.functions.invoke("gerarContrato", {
        student_id: studentId,
        enrollment_id: enrollmentId,
        force_regen: force,
      });
      if (result.data?.already_exists && !force) {
        toast.info("Contrato já existe para esta matrícula.");
      } else {
        toast.success(`Contrato ${result.data?.contract_number} gerado com sucesso!`);
      }
      refetch();
    } catch (err) {
      toast.error("Erro ao gerar contrato.");
    }
    setGenerating(false);
  };

  const handleEnviarWhatsApp = async (target = "student") => {
    if (!contract) return;
    setSending(true);
    try {
      await base44.functions.invoke("enviarContratoWhatsApp", {
        contract_id: contract.id,
        send_to: target,
      });
      toast.success("Contrato enviado pelo WhatsApp!");
      refetch();
    } catch (err) {
      toast.error("Erro ao enviar WhatsApp.");
    }
    setSending(false);
  };

  const handleEnviarEmail = async () => {
    if (!contract) return;
    if (!contract.student_email) {
      toast.error("O aluno não possui e-mail cadastrado.");
      return;
    }
    setSendingEmail(true);
    try {
      await base44.functions.invoke("enviarContratoEmail", { contract_id: contract.id, app_url: window.location.origin });
      toast.success(`Contrato enviado por e-mail para ${contract.student_email}!`);
      refetch();
    } catch (err) {
      toast.error("Erro ao enviar e-mail: " + (err.message || "tente novamente"));
    }
    setSendingEmail(false);
  };

  const handleCancelarContrato = async () => {
    if (!contract) return;
    if (!window.confirm("Tem certeza que deseja cancelar este contrato? Esta ação não pode ser desfeita.")) return;
    try {
      await base44.entities.Contract.update(contract.id, { status: "Cancelado" });
      await base44.entities.StudentTimeline.create({
        student_id: studentId,
        student_name: contract.student_name,
        event_type: "contrato_gerado",
        title: "Contrato Cancelado",
        description: `Contrato ${contract.contract_number} cancelado manualmente.`,
        performed_by: "gestor",
      });
      toast.success("Contrato cancelado.");
      refetch();
    } catch {
      toast.error("Erro ao cancelar contrato.");
    }
  };

  const appUrl = window.location.origin;
  const signUrl = contract?.auth_code ? `${appUrl}/ContractSign?code=${contract.auth_code}` : null;

  const copySignUrl = (signer = "") => {
    const url = signer ? `${signUrl}&signer=${signer}` : signUrl;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const formatMoney = (v) => v ? `R$ ${parseFloat(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-";

  if (isLoading) return <div className="text-center py-12 text-gray-400">Carregando...</div>;

  // Sem contrato ainda
  if (!contract) return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
        <FileText className="w-12 h-12 text-gray-300 mb-3" />
        <h3 className="text-base font-semibold text-gray-700 mb-1">Nenhum contrato gerado</h3>
        <p className="text-sm text-gray-500 mb-4 text-center max-w-sm">
          O contrato deve ser gerado automaticamente ao finalizar a matrícula. Clique abaixo para gerar manualmente se necessário.
        </p>
        <Button
          className="bg-blue-700 hover:bg-blue-800"
          onClick={() => handleGerarContrato(false)}
          disabled={generating || !enrollmentId}
        >
          {generating
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Gerando...</>
            : <><FileText className="w-4 h-4 mr-2" />Gerar Contrato</>}
        </Button>
        {!enrollmentId && <p className="text-xs text-red-500 mt-2">Selecione uma matrícula antes de gerar o contrato.</p>}
      </div>
    </div>
  );

  const statusInfo = STATUS_LABELS[contract.status] || { label: contract.status, color: "bg-gray-100 text-gray-700" };
  const isLocked = ["Assinado_Todas_Partes", "PDF_Gerado", "Enviado_WhatsApp", "Cancelado"].includes(contract.status);
  const hasRespLegal = !!contract.resp_legal_nome;
  const hasRespFinanceiro = !!contract.resp_financeiro_nome;

  return (
    <div className="space-y-4">
      {/* BLOCO 1 - DADOS DO CONTRATO */}
      <Card className="border border-blue-200">
        <CardHeader className="pb-3 bg-blue-50">
          <CardTitle className="text-sm font-bold text-blue-900 flex items-center justify-between">
            <span className="flex items-center gap-2"><FileText className="w-4 h-4" />Dados do Contrato</span>
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><span className="text-xs text-gray-400 block">Nº do Contrato</span><span className="font-bold text-gray-900">{contract.contract_number}</span></div>
            <div><span className="text-xs text-gray-400 block">Código de Autenticação</span><span className="font-mono text-xs font-semibold text-blue-700 break-all">{contract.auth_code}</span></div>
            <div><span className="text-xs text-gray-400 block">Aluno</span><span className="font-semibold text-gray-900">{contract.student_name}</span></div>
            <div><span className="text-xs text-gray-400 block">Curso</span><span className="font-semibold text-gray-900">{contract.course_name}</span></div>
            <div><span className="text-xs text-gray-400 block">Valor do Curso</span><span className="font-semibold text-gray-900">{formatMoney(contract.course_value)}</span></div>
            <div><span className="text-xs text-gray-400 block">Forma de Pagamento</span><span className="font-semibold text-gray-900">{contract.payment_method || "-"}</span></div>
            {contract.num_parcelas > 1 && <div><span className="text-xs text-gray-400 block">Parcelas</span><span className="font-semibold text-gray-900">{contract.num_parcelas}x de {formatMoney(contract.valor_parcela)}</span></div>}
            <div><span className="text-xs text-gray-400 block">Data de Geração</span><span className="font-semibold text-gray-900">{new Date(contract.created_date).toLocaleDateString("pt-BR")}</span></div>
          </div>
          {contract.sent_at && (
            <div className="mt-3 text-xs text-gray-500">
              Enviado para assinatura em {new Date(contract.sent_at).toLocaleString("pt-BR")} via {contract.sent_via || "-"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* BLOCO 2 - STATUS DAS ASSINATURAS */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <PenLine className="w-4 h-4 text-blue-600" />Assinaturas Necessárias
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          <SignatureStatus
            label={`Aluno — ${contract.student_name}`}
            signed_at={contract.student_signed_at}
            required={!contract.is_minor}
          />
          <SignatureStatus
            label={`Responsável Legal — ${contract.resp_legal_nome || "Não informado"}`}
            signed_at={contract.resp_legal_signed_at}
            required={hasRespLegal || !!contract.is_minor}
          />
          <SignatureStatus
            label={`Responsável Financeiro — ${contract.resp_financeiro_nome || "Não informado"}`}
            signed_at={contract.resp_financeiro_signed_at}
            required={hasRespFinanceiro}
          />
          <SignatureStatus
            label="CAT Cursos (Contratada)"
            signed_at={contract.manager_signed_at}
            required={true}
          />
        </CardContent>
      </Card>

      {/* BLOCO 3 - AÇÕES */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />Ações
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Visualizar */}
            <Button
              variant="outline"
              className="justify-start gap-2 text-sm h-10"
              onClick={() => setViewHtml(true)}
            >
              <Eye className="w-4 h-4 text-blue-600" />Visualizar Contrato
            </Button>

            {/* Enviar por e-mail */}
            <Button
              variant="outline"
              className="justify-start gap-2 text-sm h-10 border-blue-300 text-blue-700 hover:bg-blue-50"
              onClick={handleEnviarEmail}
              disabled={sendingEmail || !contract.student_email}
              title={!contract.student_email ? "Aluno sem e-mail cadastrado" : ""}
            >
              <Mail className="w-4 h-4 text-blue-600" />{sendingEmail ? "Enviando..." : "Enviar por E-mail ao Aluno"}
            </Button>

            {/* Enviar para aluno via WhatsApp */}
            <Button
              variant="outline"
              className="justify-start gap-2 text-sm h-10"
              onClick={() => handleEnviarWhatsApp("student")}
              disabled={sending || !contract.student_phone}
            >
              <Send className="w-4 h-4 text-green-600" />{sending ? "Enviando..." : "Enviar ao Aluno (WhatsApp)"}
            </Button>

            {/* Copiar link do aluno */}
            {signUrl && (
              <Button
                variant="outline"
                className="justify-start gap-2 text-sm h-10"
                onClick={() => copySignUrl()}
              >
                <Copy className="w-4 h-4 text-blue-500" />Copiar Link de Assinatura
              </Button>
            )}

            {/* Abrir link para assinar */}
            {signUrl && (
              <Button
                variant="outline"
                className="justify-start gap-2 text-sm h-10"
                onClick={() => window.open(signUrl, "_blank")}
              >
                <ExternalLink className="w-4 h-4 text-blue-500" />Abrir Portal de Assinatura
              </Button>
            )}

            {/* Enviar para responsável legal */}
            {hasRespLegal && !contract.resp_legal_signed_at && (
              <Button
                variant="outline"
                className="justify-start gap-2 text-sm h-10"
                onClick={() => handleEnviarWhatsApp("resp_legal")}
                disabled={sending}
              >
                <Send className="w-4 h-4 text-purple-600" />Enviar ao Resp. Legal
              </Button>
            )}

            {/* Enviar para responsável financeiro */}
            {hasRespFinanceiro && !contract.resp_financeiro_signed_at && (
              <Button
                variant="outline"
                className="justify-start gap-2 text-sm h-10"
                onClick={() => handleEnviarWhatsApp("resp_financeiro")}
                disabled={sending}
              >
                <Send className="w-4 h-4 text-orange-600" />Enviar ao Resp. Financeiro
              </Button>
            )}

            {/* Regerar contrato (apenas antes de assinar) */}
            {!isLocked && isMaster && (
              <Button
                variant="outline"
                className="justify-start gap-2 text-sm h-10 border-orange-300 text-orange-700 hover:bg-orange-50"
                onClick={() => { if (window.confirm("Isso irá gerar um novo contrato substituindo o atual. Confirma?")) handleGerarContrato(true); }}
                disabled={generating}
              >
                <RefreshCw className="w-4 h-4" />Regerar Contrato
              </Button>
            )}

            {/* Cancelar */}
            {!isLocked && isMaster && (
              <Button
                variant="outline"
                className="justify-start gap-2 text-sm h-10 border-red-300 text-red-600 hover:bg-red-50"
                onClick={handleCancelarContrato}
              >
                <XCircle className="w-4 h-4" />Cancelar Contrato
              </Button>
            )}
          </div>

          {isLocked && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Contrato assinado. O documento está bloqueado para edição. Alterações requerem aditivo contratual.</span>
            </div>
          )}

          {/* Baixar PDF do contrato assinado */}
          {contract?.student_signed_at && contract?.html_content_filled && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                <Download className="w-3 h-3" /> Contrato Assinado — Disponível para Download
              </p>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-sm h-9 border-blue-400 text-blue-700 hover:bg-blue-100"
                onClick={() => {
                  const w = window.open("", "_blank");
                  w.document.write(contract.html_content_filled);
                  w.document.close();
                  setTimeout(() => w.print(), 800);
                }}
              >
                <Download className="w-4 h-4" /> Baixar / Imprimir Contrato Assinado (PDF)
              </Button>
              <p className="text-xs text-blue-500 mt-1">Na janela de impressão, escolha "Salvar como PDF".</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal visualização HTML */}
      <Dialog open={viewHtml} onOpenChange={setViewHtml}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Contrato Nº {contract.contract_number}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-lg border">
            {contract.html_content_filled ? (
              <iframe
                srcDoc={contract.html_content_filled}
                className="w-full h-[70vh]"
                title="Contrato"
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">HTML do contrato não disponível.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}