import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, MapPin, Shield, BookOpen, CheckCircle, ChevronRight, ChevronLeft, Loader2, Plus, Printer, Send, Mail, FileText, Receipt, Copy } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { buscarAlunosPorCpf } from "@/lib/centralMatricula";

const PIX_CNPJ = "07238084000145";
const PIX_BENEFICIARIO = "V.S. NUNES CURSOS E TREINAMENTO LTDA";
const PIX_CNPJ_FORMATADO = "07.238.084/0001-45";

const EMPTY_STUDENT = {
  full_name: "", social_name: "", cpf: "", rg: "", rg_orgao_emissor: "", ra: "",
  data_nascimento: "", sexo: "", email: "", whatsapp: "", status: "Ativo", notes: "",
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
  resp_financeiro_nome: "", resp_financeiro_cpf: "", resp_financeiro_telefone: "",
  resp_financeiro_email: "", resp_financeiro_parentesco: "",
};

const STEPS = [
  { id: 1, label: "Dados Pessoais", icon: User },
  { id: 2, label: "Endereço", icon: MapPin },
  { id: 3, label: "Resp. Financeiro", icon: Shield },
  { id: 4, label: "Matrícula", icon: BookOpen },
];

export default function CadastroUnificado({ open, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_STUDENT);
  const [enrollment, setEnrollment] = useState({
    course_id: "", course_name: "", start_date: "", end_date: "",
    forma_pagamento: "", unit_value: "", status_pagamento: "Pendente",
    data_vencimento_pagamento: "", num_parcelas: 1,
  });
  const [saving, setSaving] = useState(false);
  const [successData, setSuccessData] = useState(null); // { student, enrollment, contractNumber, authCode, receiptHtml, receiptNumber }
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [cpfCheck, setCpfCheck] = useState(null); // { status: novo|existente|duplicidade, alunos }
  const [oferta, setOferta] = useState(null); // CourseOffer selecionada (opcional)
  const [descontoCode, setDescontoCode] = useState("");
  const [desconto, setDesconto] = useState(null); // { discount_authorization_id, code, percentage }
  const [validandoDesconto, setValidandoDesconto] = useState(false);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const setEnr = (field, value) => setEnrollment(f => ({ ...f, [field]: value }));

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => base44.entities.Course.list("-name", 200),
    staleTime: 0, gcTime: 0,
  });

  const { data: ofertas = [] } = useQuery({
    queryKey: ["course-offers"],
    queryFn: () => base44.entities.CourseOffer.list("-created_date", 200),
    enabled: open,
  });
  const ofertasDisponiveis = ofertas.filter(o => !["Encerrada", "Cancelada", "Esgotada"].includes(o.status));

  useEffect(() => {
    if (open) {
      setStep(1);
      setForm(EMPTY_STUDENT);
      setEnrollment({ course_id: "", course_name: "", start_date: "", end_date: "", forma_pagamento: "", unit_value: "", status_pagamento: "Pendente", data_vencimento_pagamento: "", num_parcelas: 1 });
      setSuccessData(null);
      setCpfCheck(null);
      setOferta(null);
      setDescontoCode("");
      setDesconto(null);
    }
  }, [open]);

  const handleNext = async () => {
    if (step === 1 && (!form.full_name || !form.cpf)) { toast.error("Nome e CPF são obrigatórios"); return; }
    if (step === 1) {
      // Pesquisar antes de criar (CPF normalizado apenas para consulta e validação)
      const check = await buscarAlunosPorCpf(form.cpf);
      setCpfCheck(check);
      if (check.status === "invalido") { toast.error("CPF inválido — informe os 11 dígitos."); return; }
      if (check.status === "duplicidade") {
        toast.error("Este CPF possui mais de um cadastro — duplicidade para análise. Criação bloqueada.");
        return;
      }
      if (check.status === "existente") {
        toast.info(`Aluno já cadastrado (${check.alunos[0].full_name}). O cadastro existente será reutilizado.`);
      }
    }
    if (step < 4) setStep(s => s + 1);
  };

  const isParcelado = enrollment.forma_pagamento?.startsWith("Parcelado");
  const isPix = enrollment.forma_pagamento === "Pix";
  // PIX manual NUNCA é automático. Apenas "À Vista" em dinheiro gera recibo automático.
  const isAVistaAutomatico = enrollment.forma_pagamento === "À Vista" || enrollment.forma_pagamento === "Dinheiro em Espécie";
  const isAVista = isAVistaAutomatico; // manter compatibilidade

  // Desconto autorizado (snapshot — nunca altera o preço da oferta)
  const valorBase = parseFloat(enrollment.unit_value) || 0;
  const descontoValor = desconto ? Math.round(valorBase * desconto.percentage) / 100 : 0;
  const valorFinal = Math.max(valorBase - descontoValor, 0);

  const handleValidarDesconto = async () => {
    if (!descontoCode.trim()) return;
    setValidandoDesconto(true);
    try {
      const res = await base44.functions.invoke("validarCodigoDesconto", {
        action: "validar",
        code: descontoCode.trim(),
        course_id: enrollment.course_id || undefined,
        course_offer_id: oferta?.id || undefined,
      });
      if (res.data?.valid) {
        setDesconto(res.data);
        toast.success(`Desconto de ${res.data.percentage}% validado!`);
      } else {
        setDesconto(null);
        toast.error(res.data?.reason || "Código inválido");
      }
    } catch (e) {
      setDesconto(null);
      toast.error("Erro ao validar código: " + (e.message || ""));
    }
    setValidandoDesconto(false);
  };

  const handleSave = async () => {
    if (!enrollment.course_id || !enrollment.start_date) { toast.error("Selecione o curso e a data de início"); return; }
    setSaving(true);
    try {
      // 1. Pesquisar antes de criar: reutilizar aluno existente; bloquear duplicidade (nunca consolidar automaticamente)
      const check = await buscarAlunosPorCpf(form.cpf);
      if (check.status === "duplicidade") {
        toast.error("Este CPF possui mais de um cadastro — duplicidade para análise. Criação bloqueada.");
        setSaving(false);
        return;
      }
      const student = check.status === "existente"
        ? check.alunos[0]
        : await base44.entities.Student.create(form);

      // 2. Criar matrícula
      // PIX manual NUNCA marca como Pago automaticamente
      const statusPagamentoInicial = isAVistaAutomatico ? "Pago" : "Pendente";
      const enrollmentData = {
        student_id: student.id,
        student_name: student.full_name,
        student_cpf: student.cpf,
        student_email: student.email || "",
        student_phone: student.whatsapp || "",
        course_id: enrollment.course_id,
        course_name: enrollment.course_name,
        company_id: "individual",
        company_name: "Individual (PF)",
        start_date: enrollment.start_date,
        end_date: enrollment.end_date || enrollment.start_date,
        status: "Aguardando Autorização",
        unit_value: parseFloat(enrollment.unit_value) || 0,
        forma_pagamento: enrollment.forma_pagamento,
        status_pagamento: statusPagamentoInicial,
        data_vencimento_pagamento: enrollment.data_vencimento_pagamento,
        notes: isPix ? "Aguardando confirmação manual do pagamento PIX." : "",
        workflow_stage: statusPagamentoInicial === "Pago" ? "Confirmed" : "PaymentPending",
        ...(oferta ? { oferta_id: oferta.id, oferta_nome: oferta.nome_comercial, course_offer_id: oferta.id } : {}),
        ...(desconto ? {
          discount_authorization_id: desconto.discount_authorization_id,
          discount_code_snapshot: desconto.code,
          discount_percentage_snapshot: desconto.percentage,
          discount_amount: descontoValor,
          final_amount: valorFinal,
          valor_original: valorBase,
        } : {}),
      };
      const newEnrollment = await base44.entities.StudentCourseEnrollment.create(enrollmentData);

      // Registrar uso do código de desconto (snapshot já gravado na matrícula)
      if (desconto) {
        try {
          await base44.functions.invoke("validarCodigoDesconto", {
            action: "aplicar",
            code: desconto.code,
            course_id: enrollment.course_id || undefined,
            course_offer_id: oferta?.id || undefined,
            enrollment_id: newEnrollment.id,
          });
        } catch (e) { console.warn("Desconto:", e); }
      }

      // 3. Gerar contrato automaticamente
      try {
        await base44.functions.invoke("gerarContrato", {
          student_id: student.id,
          enrollment_id: newEnrollment.id,
          force_regen: false,
        });
      } catch (e) { console.warn("Contrato:", e); }

      // 4. Se à vista (dinheiro/cartão), gerar recibo. PIX manual NUNCA gera recibo automático.
      let receiptHtml = null;
      let receiptNumber = null;
      if (isAVistaAutomatico && enrollment.unit_value) {
        try {
          const res = await base44.functions.invoke("gerarRecibo", {
            enrollment_id: newEnrollment.id,
            student_id: student.id,
            amount: desconto ? valorFinal : parseFloat(enrollment.unit_value),
            payment_method: enrollment.forma_pagamento,
            payment_date: enrollment.start_date || new Date().toISOString().split("T")[0],
            description: `Pagamento à vista — ${enrollment.course_name}`,
            send_email: false,
          });
          if (res.data?.success) {
            receiptHtml = res.data.html;
            receiptNumber = res.data.receipt_number;
          }
        } catch (e) { console.warn("Recibo:", e); }
      }

      // 5. Registrar no histórico
      try {
        await base44.entities.StudentTimeline.create({
          student_id: student.id,
          student_name: student.full_name,
          event_type: "matricula_criada",
          title: `Matrícula criada — ${enrollment.course_name}`,
          description: `Cadastro e matrícula realizados. Forma de pagamento: ${enrollment.forma_pagamento || "não informada"}. Valor: R$ ${enrollment.unit_value || "0"}.`,
          performed_by: "Sistema",
        });
      } catch (e) { console.warn("Timeline:", e); }

      queryClient.invalidateQueries({ queryKey: ["students-pf"] });
      queryClient.invalidateQueries({ queryKey: ["enrollments-pf"] });
      queryClient.invalidateQueries({ queryKey: ["receipts-pf"] });

      // Buscar número do contrato gerado
      let contractNumber = null;
      let contractId = null;
      let contractAuthCode = null;
      let studentPhone = student.whatsapp || "";
      let studentEmail = student.email || "";
      try {
        const contracts = await base44.entities.Contract.filter({ enrollment_id: newEnrollment.id });
        const c = contracts[0];
        if (c) { contractNumber = c.contract_number; contractId = c.id; contractAuthCode = c.auth_code; }
      } catch (e) {}

      toast.success("Aluno cadastrado com sucesso!");
      onSaved && onSaved(student, newEnrollment);

      // Mostrar modal de conclusão com ações (não fechar ainda)
      // Montar payload PIX para QR Code
      const pixAmount = parseFloat(enrollment.unit_value) || 0;
      const pixDescricao = `Matricula - ${enrollment.course_name} - ${student.full_name}`.substring(0, 40);

      setSuccessData({
        student, enrollment: newEnrollment,
        contractNumber, contractId, contractAuthCode,
        studentPhone, studentEmail,
        receiptHtml, receiptNumber,
        courseName: enrollment.course_name,
        isAVista: isAVistaAutomatico,
        isPix,
        pixAmount,
        pixDescricao,
      });
    } catch (e) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImprimirRecibo = () => {
    if (!successData?.receiptHtml) return;
    const w = window.open("", "_blank");
    w.document.write(successData.receiptHtml);
    w.document.close();
    w.print();
  };

  const handleEnviarContratoWhatsApp = async () => {
    if (!successData?.contractId) return;
    setSendingWhatsApp(true);
    try {
      await base44.functions.invoke("enviarContratoWhatsApp", { contract_id: successData.contractId, send_to: "student" });
      toast.success("Contrato enviado pelo WhatsApp!");
    } catch (e) { toast.error("Erro ao enviar WhatsApp: " + e.message); }
    setSendingWhatsApp(false);
  };

  const handleEnviarContratoEmail = async () => {
    if (!successData?.contractId) return;
    if (!successData.studentEmail) { toast.error("Aluno sem e-mail cadastrado."); return; }
    setSendingEmail(true);
    try {
      await base44.functions.invoke("enviarContratoEmail", { contract_id: successData.contractId, app_url: window.location.origin });
      toast.success("Contrato enviado por e-mail!");
    } catch (e) { toast.error("Erro ao enviar e-mail: " + e.message); }
    setSendingEmail(false);
  };

  const handleCopiarLink = () => {
    if (!successData?.contractAuthCode) return;
    const url = `${window.location.origin}/ContractSign?code=${successData.contractAuthCode}`;
    navigator.clipboard.writeText(url);
    toast.success("Link de assinatura copiado!");
  };

  // Gerar payload Pix Copia e Cola (formato EMV simplificado)
  const gerarPixCopiaCola = (cnpj, beneficiario, valor, descricao) => {
    const cnpjLimpo = cnpj.replace(/\D/g, "");
    const valorStr = valor.toFixed(2);
    const cidade = "BELEM";
    const txid = "***";

    const campo = (id, valor) => {
      const len = String(valor.length).padStart(2, "0");
      return `${id}${len}${valor}`;
    };

    const merchantAccountInfo = campo("00", "BR.GOV.BCB.PIX") + campo("01", cnpjLimpo);
    const pixPayload =
      campo("00", "01") +
      campo("26", merchantAccountInfo) +
      campo("52", "0000") +
      campo("53", "986") +
      campo("54", valorStr) +
      campo("58", "BR") +
      campo("59", beneficiario.substring(0, 25)) +
      campo("60", cidade) +
      campo("62", campo("05", txid)) +
      "6304";

    // CRC16 simples
    let crc = 0xFFFF;
    for (let i = 0; i < pixPayload.length; i++) {
      crc ^= pixPayload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
      }
    }
    return pixPayload + (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
  };

  // Modal de conclusão pós-cadastro
  if (successData) {
    const pixCopiaCola = successData.isPix && successData.pixAmount > 0
      ? gerarPixCopiaCola(PIX_CNPJ, PIX_BENEFICIARIO, successData.pixAmount, successData.pixDescricao)
      : null;

    return (
      <Dialog open={open} onOpenChange={() => { setSuccessData(null); onClose(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle className="w-5 h-5" /> Cadastro Concluído com Sucesso!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* Resumo */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
              <p className="font-semibold text-emerald-800">{successData.student.full_name}</p>
              <p className="text-emerald-700 text-xs">CPF: {successData.student.cpf} · Curso: {successData.courseName}</p>
              <p className="text-emerald-600 text-xs mt-1">
                ✓ Aluno cadastrado &nbsp;·&nbsp; ✓ Matrícula criada &nbsp;·&nbsp;
                {successData.contractNumber ? `✓ Contrato ${successData.contractNumber} gerado` : "⚠ Contrato não gerado"}
                {successData.isAVista && successData.receiptNumber ? ` · ✓ Recibo ${successData.receiptNumber} emitido` : ""}
                {successData.isPix ? " · 🟡 Aguardando Pagamento PIX" : ""}
              </p>
            </div>

            {/* BLOCO PIX — aparece quando forma de pagamento é Pix */}
            {successData.isPix && (
              <div className="border-2 border-yellow-300 rounded-xl p-4 bg-yellow-50 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💳</span>
                  <p className="font-bold text-yellow-900 text-sm">DADOS PARA PAGAMENTO PIX</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">Beneficiário</p>
                    <p className="font-semibold text-gray-800">{PIX_BENEFICIARIO}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">CNPJ</p>
                    <p className="font-semibold text-gray-800">{PIX_CNPJ_FORMATADO}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Valor</p>
                    <p className="font-bold text-emerald-700 text-base">
                      R$ {successData.pixAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">🟡 Aguardando PIX</Badge>
                  </div>
                </div>

                {/* QR Code */}
                {pixCopiaCola && (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <QRCodeSVG value={pixCopiaCola} size={160} level="M" />
                    <p className="text-xs text-gray-500 text-center">Escaneie com o app do banco</p>
                  </div>
                )}

                {/* Chave PIX */}
                <div className="bg-white border border-yellow-200 rounded-lg p-2">
                  <p className="text-xs text-gray-500 mb-1">Chave PIX (CNPJ):</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-bold text-gray-800 flex-1">{PIX_CNPJ_FORMATADO}</p>
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => { navigator.clipboard.writeText(PIX_CNPJ_FORMATADO); toast.success("Chave PIX copiada!"); }}>
                      <Copy className="w-3 h-3 mr-1" /> Copiar
                    </Button>
                  </div>
                </div>

                {/* Pix Copia e Cola */}
                {pixCopiaCola && (
                  <Button variant="outline" className="w-full border-yellow-400 text-yellow-800 hover:bg-yellow-100 gap-2"
                    onClick={() => { navigator.clipboard.writeText(pixCopiaCola); toast.success("Código PIX copiado!"); }}>
                    <Copy className="w-4 h-4" /> 📋 Copiar Código PIX
                  </Button>
                )}

                <div className="flex items-start gap-2 p-2 bg-amber-100 border border-amber-300 rounded-lg">
                  <span className="text-sm">⚠️</span>
                  <p className="text-xs text-amber-800 font-medium">
                    O pagamento será confirmado <strong>manualmente</strong> pela equipe após verificação do comprovante.
                  </p>
                </div>
              </div>
            )}

            {/* RECIBO - Imprimir (apenas para pagamentos à vista automáticos, NÃO PIX) */}
            {successData.isAVista && successData.receiptHtml && (
              <div className="border border-green-200 rounded-lg p-3 bg-green-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">Recibo Nº {successData.receiptNumber}</p>
                      <p className="text-xs text-green-600">Pagamento à vista registrado</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-green-700 hover:bg-green-800"
                    onClick={handleImprimirRecibo}
                  >
                    <Printer className="w-4 h-4 mr-1" /> Imprimir Recibo
                  </Button>
                </div>
              </div>
            )}
            {successData.isAVista && !successData.receiptHtml && (
              <div className="border border-yellow-200 rounded-lg p-3 bg-yellow-50">
                <p className="text-xs text-yellow-700">⚠ Recibo não gerado automaticamente. Acesse a aba Financeiro para emitir manualmente.</p>
              </div>
            )}

            {/* CONTRATO - Enviar para assinatura */}
            {successData.contractId && (
              <div className="border border-blue-200 rounded-lg p-3 bg-blue-50 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-semibold text-blue-800">Contrato {successData.contractNumber} — Enviar para Assinatura</p>
                </div>
                <p className="text-xs text-blue-600">Escolha como enviar o contrato ao aluno para assinatura digital (LGPD inclusa):</p>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    className="justify-start gap-2 border-green-300 text-green-700 hover:bg-green-50"
                    onClick={handleEnviarContratoWhatsApp}
                    disabled={sendingWhatsApp || !successData.studentPhone}
                    title={!successData.studentPhone ? "Aluno sem WhatsApp cadastrado" : ""}
                  >
                    <Send className="w-4 h-4" />
                    {sendingWhatsApp ? "Enviando..." : `Enviar via WhatsApp${!successData.studentPhone ? " (sem número)" : ""}`}
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={handleEnviarContratoEmail}
                    disabled={sendingEmail || !successData.studentEmail}
                    title={!successData.studentEmail ? "Aluno sem e-mail cadastrado" : ""}
                  >
                    <Mail className="w-4 h-4" />
                    {sendingEmail ? "Enviando..." : `Enviar via E-mail${!successData.studentEmail ? " (sem e-mail)" : ""}`}
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start gap-2 border-gray-300 text-gray-600 hover:bg-gray-50"
                    onClick={handleCopiarLink}
                    disabled={!successData.contractAuthCode}
                  >
                    <FileText className="w-4 h-4" /> Copiar Link de Assinatura
                  </Button>
                </div>
              </div>
            )}
            {!successData.contractId && (
              <div className="border border-orange-200 rounded-lg p-3 bg-orange-50">
                <p className="text-xs text-orange-700">⚠ Contrato não foi gerado automaticamente. Acesse a aba Contratos para gerar manualmente.</p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t">
              <Button className="bg-gray-900 hover:bg-gray-800" onClick={() => { setSuccessData(null); onClose(); }}>
                Concluir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" /> Novo Aluno (PF) — Cadastro Completo
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div
                className={`flex flex-col items-center cursor-pointer ${step >= s.id ? "opacity-100" : "opacity-40"}`}
                onClick={() => step > s.id && setStep(s.id)}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${step === s.id ? "bg-gray-900 border-gray-900 text-white" : step > s.id ? "bg-green-600 border-green-600 text-white" : "bg-white border-gray-300 text-gray-400"}`}>
                  {step > s.id ? <CheckCircle className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                </div>
                <span className="text-xs mt-1 text-gray-600 hidden sm:block">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${step > s.id ? "bg-green-500" : "bg-gray-200"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ETAPA 1 */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700 pb-1 border-b">Dados Pessoais</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label>Nome Completo *</Label><Input value={form.full_name} onChange={e => set("full_name", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Nome Social</Label><Input value={form.social_name} onChange={e => set("social_name", e.target.value)} placeholder="Opcional" /></div>
              <div><Label>CPF *</Label><Input value={form.cpf} onChange={e => set("cpf", e.target.value)} placeholder="000.000.000-00" /></div>
              <div><Label>Data de Nascimento</Label><Input type="date" value={form.data_nascimento} onChange={e => set("data_nascimento", e.target.value)} /></div>
              <div><Label>RG</Label><Input value={form.rg} onChange={e => set("rg", e.target.value)} /></div>
              <div><Label>Órgão Emissor RG</Label><Input value={form.rg_orgao_emissor} onChange={e => set("rg_orgao_emissor", e.target.value)} placeholder="SSP/PA" /></div>
              <div>
                <Label>Sexo</Label>
                <Select value={form.sexo} onValueChange={v => set("sexo", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                    <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>E-mail</Label><Input value={form.email} onChange={e => set("email", e.target.value)} /></div>
              <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="(91) 99999-9999" /></div>
              <div className="sm:col-span-2"><Label>Observações</Label><Input value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
              {cpfCheck?.status === "existente" && (
                <div className="sm:col-span-2 p-2.5 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800">
                  ℹ️ CPF já cadastrado para <strong>{cpfCheck.alunos[0].full_name}</strong>. O cadastro existente será <strong>reutilizado</strong> — nenhum aluno duplicado será criado.
                </div>
              )}
              {cpfCheck?.status === "duplicidade" && (
                <div className="sm:col-span-2 p-2.5 bg-red-50 border border-red-300 rounded-md text-xs text-red-800">
                  🚫 <strong>Duplicidade para análise:</strong> este CPF possui {cpfCheck.alunos.length} cadastros ({cpfCheck.alunos.map(a => a.full_name).join(", ")}). A criação está bloqueada — resolva a duplicidade na Visão Geral antes de matricular.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ETAPA 2 */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700 pb-1 border-b">Endereço</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>CEP</Label><Input value={form.cep} onChange={e => set("cep", e.target.value)} placeholder="00000-000" /></div>
              <div className="sm:col-span-2"><Label>Rua/Logradouro</Label><Input value={form.logradouro} onChange={e => set("logradouro", e.target.value)} /></div>
              <div><Label>Número</Label><Input value={form.numero} onChange={e => set("numero", e.target.value)} /></div>
              <div><Label>Complemento</Label><Input value={form.complemento} onChange={e => set("complemento", e.target.value)} placeholder="Apto, Bloco..." /></div>
              <div><Label>Bairro</Label><Input value={form.bairro} onChange={e => set("bairro", e.target.value)} /></div>
              <div><Label>Cidade</Label><Input value={form.cidade} onChange={e => set("cidade", e.target.value)} /></div>
              <div><Label>Estado (UF)</Label><Input value={form.estado} onChange={e => set("estado", e.target.value)} placeholder="PA" maxLength={2} /></div>
            </div>
          </div>
        )}

        {/* ETAPA 3 */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700 pb-1 border-b">Responsável Financeiro</p>
            <p className="text-xs text-gray-500">Preencha se o responsável financeiro for diferente do aluno.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label>Nome do Responsável</Label><Input value={form.resp_financeiro_nome} onChange={e => set("resp_financeiro_nome", e.target.value)} /></div>
              <div><Label>CPF do Responsável</Label><Input value={form.resp_financeiro_cpf} onChange={e => set("resp_financeiro_cpf", e.target.value)} placeholder="000.000.000-00" /></div>
              <div><Label>Parentesco</Label><Input value={form.resp_financeiro_parentesco} onChange={e => set("resp_financeiro_parentesco", e.target.value)} placeholder="Pai, Mãe, Cônjuge..." /></div>
              <div><Label>Telefone</Label><Input value={form.resp_financeiro_telefone} onChange={e => set("resp_financeiro_telefone", e.target.value)} placeholder="(91) 99999-9999" /></div>
              <div><Label>E-mail</Label><Input value={form.resp_financeiro_email} onChange={e => set("resp_financeiro_email", e.target.value)} /></div>
            </div>
          </div>
        )}

        {/* ETAPA 4 */}
        {step === 4 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700 pb-1 border-b">Matrícula e Pagamento</p>
            <div>
              <Label>Oferta de Curso <span className="text-gray-400 font-normal">(opcional)</span></Label>
              <Select
                value={oferta?.id || ""}
                onValueChange={v => {
                  if (v === "nenhuma") { setOferta(null); return; }
                  const o = ofertasDisponiveis.find(x => x.id === v);
                  setOferta(o || null);
                  if (o) {
                    setEnrollment(f => ({
                      ...f,
                      course_id: o.course_id, course_name: o.course_name,
                      start_date: o.data_inicio || f.start_date,
                      end_date: o.data_termino || f.end_date,
                      unit_value: o.valor != null ? String(o.valor) : f.unit_value,
                    }));
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Matricular por oferta publicada..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Sem oferta — escolher curso-base</SelectItem>
                  {ofertasDisponiveis.map(o => {
                    const vagasDisp = Math.max((o.vagas_total || 0) - (o.vagas_preenchidas || 0), 0);
                    return <SelectItem key={o.id} value={o.id}>{o.nome_comercial} — {vagasDisp} vaga(s)</SelectItem>;
                  })}
                </SelectContent>
              </Select>
              {oferta && (
                <p className="text-xs text-gray-500 mt-1">
                  🎟️ Vagas disponíveis: <strong>{Math.max((oferta.vagas_total || 0) - (oferta.vagas_preenchidas || 0), 0)}</strong> de {oferta.vagas_total || 0}
                  {oferta.valor != null && <> · Valor da oferta: <strong>R$ {Number(oferta.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></>}
                </p>
              )}
            </div>
            <div>
              <Label>Curso *</Label>
              <Select value={enrollment.course_id} onValueChange={v => { const c = courses.find(c => c.id === v); setEnrollment(f => ({ ...f, course_id: v, course_name: c?.name || "" })); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o curso" /></SelectTrigger>
                <SelectContent>
                  {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data de Início *</Label><Input type="date" value={enrollment.start_date} onChange={e => setEnr("start_date", e.target.value)} /></div>
              <div><Label>Data de Término</Label><Input type="date" value={enrollment.end_date} onChange={e => setEnr("end_date", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={enrollment.forma_pagamento} onValueChange={v => setEnr("forma_pagamento", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="À Vista">À Vista</SelectItem>
                    <SelectItem value="Pix">Pix</SelectItem>
                    <SelectItem value="Dinheiro em Espécie">Dinheiro em Espécie</SelectItem>
                    <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                    <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                    <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Parcelado 2x">Parcelado 2x</SelectItem>
                    <SelectItem value="Parcelado 3x">Parcelado 3x</SelectItem>
                    <SelectItem value="Parcelado 4x">Parcelado 4x</SelectItem>
                    <SelectItem value="Parcelado 5x">Parcelado 5x</SelectItem>
                    <SelectItem value="Parcelado 6x">Parcelado 6x</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor Total do Curso (R$)</Label>
                <Input type="number" min="0" step="0.01" value={enrollment.unit_value} onChange={e => setEnr("unit_value", e.target.value)} placeholder="0,00" />
              </div>
            </div>
            <div>
              <Label>Data de Vencimento do Pagamento</Label>
              <Input type="date" value={enrollment.data_vencimento_pagamento} onChange={e => setEnr("data_vencimento_pagamento", e.target.value)} />
            </div>
            <div>
              <Label>Código de Desconto <span className="text-gray-400 font-normal">(opcional — autorizado pelo Financeiro)</span></Label>
              <div className="flex gap-2 mt-1">
                <Input value={descontoCode} onChange={e => { setDescontoCode(e.target.value); setDesconto(null); }} placeholder="Ex: DESC-2026-XXXX" />
                <Button type="button" variant="outline" onClick={handleValidarDesconto} disabled={validandoDesconto || !descontoCode.trim()}>
                  {validandoDesconto ? "Validando..." : "Validar"}
                </Button>
              </div>
              {desconto && (
                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800">
                  ✅ Código <strong>{desconto.code}</strong> — {desconto.percentage}% de desconto.
                  {valorBase > 0 && <> Valor final: <strong>R$ {valorFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> (− R$ {descontoValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})</>}
                </div>
              )}
            </div>
            {isParcelado && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-semibold text-blue-800 mb-2">📋 Parcelamento</p>
                <p className="text-xs text-blue-700">
                  {enrollment.forma_pagamento} de {enrollment.unit_value
                    ? `R$ ${(parseFloat(enrollment.unit_value) / parseInt(enrollment.forma_pagamento.match(/\d+/)?.[0] || 1)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} cada`
                    : "—"}
                </p>
                <p className="text-xs text-blue-600 mt-1">⚠️ Cada parcela confirmada manualmente.</p>
              </div>
            )}
            {isPix && enrollment.unit_value && (
              <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg space-y-1">
                <p className="text-xs font-bold text-yellow-900">💳 Pagamento via PIX</p>
                <p className="text-xs text-yellow-800">Chave PIX (CNPJ): <strong>{PIX_CNPJ_FORMATADO}</strong></p>
                <p className="text-xs text-yellow-800">Beneficiário: <strong>{PIX_BENEFICIARIO}</strong></p>
                <p className="text-xs text-amber-800 font-medium mt-1">⚠️ O pagamento será confirmado manualmente pela equipe após verificação do comprovante.</p>
              </div>
            )}
            {isAVistaAutomatico && enrollment.unit_value && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-xs text-green-800 font-medium">
                  {enrollment.forma_pagamento === "Dinheiro em Espécie"
                    ? "💵 Pagamento em dinheiro. ⚠️ Confirmação manual necessária."
                    : "Pagamento à vista — recibo será gerado automaticamente ao salvar."}
                </p>
              </div>
            )}

            {/* Resumo Final */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2">
              <p className="text-xs font-bold text-gray-700 mb-2">Resumo do Cadastro</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                <span className="font-medium">Aluno:</span><span>{form.full_name}</span>
                <span className="font-medium">CPF:</span><span>{form.cpf}</span>
                <span className="font-medium">Curso:</span><span>{enrollment.course_name || "—"}</span>
                <span className="font-medium">Início:</span><span>{enrollment.start_date || "—"}</span>
                <span className="font-medium">Pagamento:</span><span>{enrollment.forma_pagamento || "—"}</span>
                <span className="font-medium">Valor:</span><span>{enrollment.unit_value ? `R$ ${parseFloat(enrollment.unit_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Ao salvar serão gerados automaticamente: ✓ Cadastro ✓ Matrícula ✓ Contrato
                  {isAVistaAutomatico && !isPix ? " ✓ Recibo" : ""}
                  {isPix ? " ✓ QR Code PIX" : ""}
                  {" "}✓ Histórico
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navegação */}
        <div className="flex items-center justify-between pt-3 border-t mt-2">
          <Button variant="outline" onClick={step === 1 ? onClose : () => setStep(s => s - 1)} disabled={saving}>
            <ChevronLeft className="w-4 h-4 mr-1" /> {step === 1 ? "Cancelar" : "Anterior"}
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Etapa {step} de {STEPS.length}</span>
            {step < 4 ? (
              <Button className="bg-gray-900 hover:bg-gray-800" onClick={handleNext}>
                Próximo <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button className="bg-green-700 hover:bg-green-800" onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : <><CheckCircle className="w-4 h-4 mr-2" />Salvar Tudo</>}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}