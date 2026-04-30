import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bell, AlertOctagon, Clock, AlertTriangle, Search, RefreshCw,
  MessageCircle, CheckCircle, User, Building2, Send, Download,
  Mail, Users, ChevronDown, ChevronUp, CheckSquare, Square, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { logAction } from "@/components/audit/AuditLogger";
import { exportCertificatePDF } from "@/components/certificates/CertificateExporter";

// ─── Aba 1: Alertas por Certificado (valid_until) ───────────────────────────

function AbaCertificados() {
  const [daysAhead, setDaysAhead] = useState(30);
  const [search, setSearch] = useState("");
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sentStudents, setSentStudents] = useState(new Set());
  const [sentHR, setSentHR] = useState(new Set());
  const [emailLoading, setEmailLoading] = useState(null);

  const runCheck = async (dry = false) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("alertarVencimentoCertificados", {
        days_ahead: daysAhead,
        dry_run: dry,
      });
      setAlerts(res.data);
      if (res.data.count === 0) {
        toast.success(`Nenhum certificado vencendo nos próximos ${daysAhead} dias.`);
      } else {
        toast.info(`${res.data.count} certificado(s) encontrado(s).`);
      }
    } catch (e) {
      toast.error("Erro ao verificar vencimentos: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const sendEmailNotifications = async () => {
    if (!alerts || alerts.count === 0) { toast.warning("Nenhum certificado para notificar."); return; }
    setEmailLoading(true);
    try {
      const res = await base44.functions.invoke("enviarNotificacoesCertificados", { alerts: filteredAlerts });
      toast.success(`${res.data.sent} notificação(ções) enviada(s) por e-mail!`);
    } catch (e) {
      toast.error("Erro ao enviar notificações: " + e.message);
    } finally {
      setEmailLoading(false);
    }
  };

  const openWhatsApp = (url, certId, type) => {
    window.open(url, "_blank");
    if (type === "student") setSentStudents(prev => new Set([...prev, certId]));
    else setSentHR(prev => new Set([...prev, certId]));
    toast.success("WhatsApp aberto para envio de alerta!");
  };

  const filteredAlerts = (alerts?.alerts || []).filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.student_name?.toLowerCase().includes(q) ||
      a.course_name?.toLowerCase().includes(q) ||
      a.client_name?.toLowerCase().includes(q) ||
      a.certificate_code?.toLowerCase().includes(q)
    );
  });

  const urgencyColor = (days) => {
    if (days <= 7) return "bg-red-100 text-red-700 border-red-200";
    if (days <= 15) return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  };

  const urgencyBadge = (days) => {
    if (days <= 7) return { label: "Urgente", className: "bg-red-600 text-white", risk: "critical" };
    if (days <= 15) return { label: "Atenção", className: "bg-orange-500 text-white", risk: "high" };
    return { label: `${days} dias`, className: "bg-yellow-500 text-white", risk: "medium" };
  };

  const getRiskIcon = (risk) => {
    if (risk === "critical") return "🔴";
    if (risk === "high") return "🟠";
    return "🟡";
  };

  return (
    <div className="space-y-5">
      {/* Painel de controle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-700">Parâmetros de Verificação</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">Dias até o vencimento</label>
            <Input
              type="number" min={1} max={365}
              value={daysAhead}
              onChange={e => setDaysAhead(Number(e.target.value))}
              className="w-28"
            />
          </div>
          <Button onClick={() => runCheck(false)} disabled={loading} className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            Verificar Agora
          </Button>
          <Button variant="outline" onClick={() => runCheck(true)} disabled={loading} className="gap-2">
            Pré-visualizar (sem registrar)
          </Button>
        </CardContent>
      </Card>

      {/* Resultados */}
      {alerts && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-3 pb-2">
                <div className="text-2xl font-bold text-red-700">{filteredAlerts.filter(a => a.days_remaining <= 7).length}</div>
                <div className="text-xs text-red-600 font-medium">🔴 Crítico (≤7 dias)</div>
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-3 pb-2">
                <div className="text-2xl font-bold text-orange-700">{filteredAlerts.filter(a => a.days_remaining > 7 && a.days_remaining <= 15).length}</div>
                <div className="text-xs text-orange-600 font-medium">🟠 Alto (8-15 dias)</div>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-3 pb-2">
                <div className="text-2xl font-bold text-yellow-700">{filteredAlerts.filter(a => a.days_remaining > 15 && a.days_remaining <= 30).length}</div>
                <div className="text-xs text-yellow-600 font-medium">🟡 Médio (16-30 dias)</div>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-3 pb-2">
                <div className="text-2xl font-bold text-blue-700">{filteredAlerts.filter(a => a.days_remaining > 30).length}</div>
                <div className="text-xs text-blue-600 font-medium">🔵 Baixo (&gt;30 dias)</div>
              </CardContent>
            </Card>
          </div>

          {alerts.count > 0 && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Filtrar por aluno, curso, empresa ou código..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4 pb-4 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                  <div>
                    <p className="font-medium text-blue-900 text-sm">📧 Enviar notificações por e-mail</p>
                    <p className="text-xs text-blue-700">Notifique alunos e empresas sobre certificados vencendo</p>
                  </div>
                  <Button
                    onClick={sendEmailNotifications}
                    disabled={emailLoading || filteredAlerts.length === 0}
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                  >
                    {emailLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                    {emailLoading ? "Enviando..." : `Enviar E-mails (${filteredAlerts.length})`}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="space-y-3">
            {filteredAlerts.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
                <p>Nenhum certificado encontrado para os filtros aplicados.</p>
              </div>
            )}
            {filteredAlerts.map((alert) => {
              const ub = urgencyBadge(alert.days_remaining);
              const studentSent = sentStudents.has(alert.certificate_id);
              const hrSent = sentHR.has(alert.certificate_id);
              return (
                <Card key={alert.certificate_id} className={`border ${urgencyColor(alert.days_remaining)}`}>
                  <CardContent className="pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-lg">{getRiskIcon(ub.risk)}</span>
                          <span className="font-semibold text-gray-900">{alert.student_name}</span>
                          <Badge className={ub.className}>{ub.label}</Badge>
                          {alert.days_remaining <= 7 && <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />}
                        </div>
                        <div className="text-sm text-gray-600">📚 {alert.course_name}</div>
                        {alert.client_name && (
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {alert.client_name}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          Cód: {alert.certificate_code} &nbsp;|&nbsp;
                          Vence: {new Date(alert.valid_until).toLocaleDateString("pt-BR")} &nbsp;|&nbsp;
                          <strong>{alert.days_remaining} dia(s) restante(s)</strong>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 min-w-fit">
                        {alert.student_whatsapp_url ? (
                          <Button size="sm" onClick={() => openWhatsApp(alert.student_whatsapp_url, alert.certificate_id, "student")}
                            className={`gap-2 ${studentSent ? "bg-green-600 hover:bg-green-700" : "bg-green-500 hover:bg-green-600"} text-white`}>
                            {studentSent ? <CheckCircle className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            {studentSent ? "Enviado ao Aluno" : "Notificar Aluno"}
                          </Button>
                        ) : (
                          <Button size="sm" disabled variant="outline" className="text-xs gap-1">
                            <User className="w-3 h-3" /> Sem telefone do aluno
                          </Button>
                        )}
                        {alert.hr_whatsapp_url ? (
                          <Button size="sm" onClick={() => openWhatsApp(alert.hr_whatsapp_url, alert.certificate_id, "hr")}
                            className={`gap-2 ${hrSent ? "bg-blue-700 hover:bg-blue-800" : "bg-blue-600 hover:bg-blue-700"} text-white`}>
                            {hrSent ? <CheckCircle className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                            {hrSent ? "Enviado ao RH" : "Notificar RH"}
                          </Button>
                        ) : (
                          <Button size="sm" disabled variant="outline" className="text-xs gap-1">
                            <Building2 className="w-3 h-3" /> Sem contato do RH
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {!alerts && !loading && (
        <div className="text-center py-16 text-gray-400">
          <Bell className="w-12 h-12 mx-auto mb-3 text-orange-300" />
          <p className="text-base font-medium text-gray-500">Clique em "Verificar Agora" para encontrar certificados próximos do vencimento.</p>
          <p className="text-sm mt-1">O sistema verificará todos os certificados que vencerão nos próximos {daysAhead} dias.</p>
        </div>
      )}
    </div>
  );
}

// ─── Aba 2: Reciclagens por Turma (ClassSchedule + Course.validity) ──────────

function AbaReciclagens() {
  const [selectedCompanyId, setSelectedCompanyId] = useState("all");
  const [expandedClass, setExpandedClass] = useState(null);
  const [selectedCerts, setSelectedCerts] = useState([]);
  const [sendingEmail, setSendingEmail] = useState(null);

  const { data: completedClasses = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['completedClasses'],
    queryFn: async () => {
      const all = await base44.entities.ClassSchedule.list();
      return all.filter(c => c.status === 'Concluído');
    },
    initialData: [],
  });

  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => base44.entities.Course.list(), initialData: [] });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list(), initialData: [] });
  const { data: certificates = [] } = useQuery({ queryKey: ['certificates'], queryFn: () => base44.entities.Certificate.list(), initialData: [] });
  const { data: certModels = [] } = useQuery({ queryKey: ['certModels'], queryFn: () => base44.entities.CertificateModel.list(), initialData: [] });

  const checkStatus = (dataRealizacao, validadeMeses) => {
    const hoje = new Date();
    const venc = new Date(dataRealizacao);
    venc.setMonth(venc.getMonth() + validadeMeses);
    const diffDays = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return { status: "VENCIDO", dias: Math.abs(diffDays) };
    if (diffDays <= 30) return { status: "RECICLAGEM PRÓXIMA", dias: diffDays };
    return { status: "VÁLIDO", dias: diffDays };
  };

  const companiesData = useMemo(() => {
    const map = {};
    completedClasses.forEach(classItem => {
      const course = courses.find(c => c.name === classItem.training_name);
      if (!course?.validity) return;
      const validityMonths = parseInt(course.validity);
      if (isNaN(validityMonths)) return;
      const lastDate = classItem.realization_dates?.length
        ? classItem.realization_dates[classItem.realization_dates.length - 1]
        : classItem.end_date;
      if (!lastDate) return;
      const recycleStatus = checkStatus(lastDate, validityMonths);
      if (recycleStatus.status === "VÁLIDO") return;
      const key = classItem.company_id || classItem.company_name;
      if (!map[key]) map[key] = { id: classItem.company_id, nome: classItem.company_name, turmas: [] };
      const classCerts = certificates.filter(c =>
        c.class_schedule_id === classItem.id || c.client_name === classItem.company_name
      );
      map[key].turmas.push({
        classItem, course, status: recycleStatus.status, dias: recycleStatus.dias,
        lastDate, validityMonths, certificates: classCerts,
        dataInicio: classItem.realization_dates?.[0] || null, dataFim: lastDate,
      });
    });
    return Object.values(map);
  }, [completedClasses, courses, certificates]);

  const filteredCompanies = selectedCompanyId === "all"
    ? companiesData
    : companiesData.filter(c => c.id === selectedCompanyId || c.nome === selectedCompanyId);

  const totalVencidos = companiesData.reduce((sum, c) => sum + c.turmas.filter(t => t.status === "VENCIDO").length, 0);
  const totalProximos = companiesData.reduce((sum, c) => sum + c.turmas.filter(t => t.status === "RECICLAGEM PRÓXIMA").length, 0);

  const formatDate = (d) => {
    if (!d) return '-';
    try { return format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
  };

  const handleNotifyRecycle = async (turma) => {
    const company = companies.find(c =>
      c.nome_fantasia === turma.classItem.company_name ||
      c.razao_social === turma.classItem.company_name ||
      c.id === turma.classItem.company_id
    );
    if (!company?.contacts?.length) { toast.error('Empresa não possui contatos cadastrados'); return; }
    const contact = company.contacts.find(c => c.is_whatsapp && c.phone);
    if (!contact) { toast.error('Empresa não possui contato com WhatsApp cadastrado'); return; }
    const dataVencimento = new Date(turma.lastDate);
    dataVencimento.setMonth(dataVencimento.getMonth() + turma.validityMonths);
    const dataFormatada = dataVencimento.toLocaleDateString('pt-BR');
    const mensagem = `Olá ${contact.name || company.nome_fantasia}, o treinamento de *${turma.classItem.training_name}* da empresa *${turma.classItem.company_name}* vence em ${dataFormatada} (${turma.dias} dias). Favor agendar a reciclagem.`;
    const phoneClean = contact.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phoneClean}?text=${encodeURIComponent(mensagem)}`, '_blank');
    await logAction("ENVIO_WHATSAPP", "ClassSchedule", turma.classItem.id, `Reciclagem: ${turma.classItem.training_name}`, {
      empresa: turma.classItem.company_name, dias_restantes: turma.dias, contato: contact.name, status: 'Sucesso'
    });
  };

  const handleDownloadCert = (cert) => {
    const model = certModels.find(m => m.name === cert.course_name) || certModels[0];
    exportCertificatePDF(cert, model);
  };

  const handleEmailCert = async (cert) => {
    if (!cert.student_email) { toast.error('Aluno não possui e-mail cadastrado'); return; }
    setSendingEmail(cert.id);
    try {
      await base44.integrations.Core.SendEmail({
        to: cert.student_email,
        subject: `Seu certificado - ${cert.course_name}`,
        body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#1a3a5c;">Certificado Disponível</h2>
          <p>Olá <strong>${cert.student_name}</strong>,</p>
          <p>Segue informações do seu certificado do curso <strong>${cert.course_name}</strong>.</p>
          <p><strong>Empresa:</strong> ${cert.client_name || ''}</p>
          <p><strong>Válido até:</strong> ${cert.valid_until ? new Date(cert.valid_until).toLocaleDateString('pt-BR') : 'N/A'}</p>
          <p>Para acessar e validar seu certificado, entre em contato com a coordenação.</p>
          <br/><p>CAT Cursos e Treinamentos</p>
        </div>`
      });
      toast.success(`E-mail enviado para ${cert.student_email}`);
    } catch (e) {
      toast.error('Erro ao enviar e-mail: ' + e.message);
    }
    setSendingEmail(null);
  };

  const handleWhatsAppCert = (cert) => {
    if (!cert.student_phone) { toast.error('Aluno não possui telefone cadastrado'); return; }
    const appUrl = window.location.origin;
    const msg = `Olá ${cert.student_name}, seu certificado do curso *${cert.course_name}* está disponível. Acesse: ${appUrl}/CertificateValidate?code=${cert.certificate_code}`;
    const phone = cert.student_phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const toggleSelectCert = (certId) => {
    setSelectedCerts(prev => prev.includes(certId) ? prev.filter(id => id !== certId) : [...prev, certId]);
  };

  const handleBulkDownload = (certs) => {
    certs.filter(c => selectedCerts.includes(c.id)).forEach((cert, i) => {
      setTimeout(() => handleDownloadCert(cert), i * 800);
    });
  };

  const handleBulkEmail = async (certs) => {
    for (const cert of certs.filter(c => selectedCerts.includes(c.id))) {
      await handleEmailCert(cert);
    }
  };

  if (loadingClasses) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-600" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <Bell className="w-5 h-5 text-gray-500 mb-1" />
            <p className="text-2xl font-bold">{totalVencidos + totalProximos}</p>
            <p className="text-xs text-gray-500">Total Pendentes</p>
          </CardContent>
        </Card>
        <Card className="border border-red-200">
          <CardContent className="p-4">
            <AlertOctagon className="w-5 h-5 text-red-500 mb-1" />
            <p className="text-2xl font-bold text-red-600">{totalVencidos}</p>
            <p className="text-xs text-gray-500">Vencidos</p>
          </CardContent>
        </Card>
        <Card className="border border-orange-200">
          <CardContent className="p-4">
            <Clock className="w-5 h-5 text-orange-500 mb-1" />
            <p className="text-2xl font-bold text-orange-600">{totalProximos}</p>
            <p className="text-xs text-gray-500">Próximos 30 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtro por empresa */}
      <div className="flex items-center gap-3 flex-wrap">
        <Building2 className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filtrar por empresa:</span>
        <button
          onClick={() => setSelectedCompanyId("all")}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selectedCompanyId === "all" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"}`}
        >
          Todas ({companiesData.length})
        </button>
        {companiesData.map(c => (
          <button
            key={c.id || c.nome}
            onClick={() => setSelectedCompanyId(c.id || c.nome)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selectedCompanyId === (c.id || c.nome) ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"}`}
          >
            {c.nome}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filteredCompanies.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="w-14 h-14 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-bold text-gray-700">Nenhuma reciclagem pendente</h3>
            <p className="text-gray-400 text-sm mt-1">Todos os treinamentos estão em dia</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {filteredCompanies.map(company => (
            <Card key={company.id || company.nome} className="border border-gray-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    {company.nome}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-100 text-red-700 border-red-200">
                      {company.turmas.filter(t => t.status === "VENCIDO").length} vencida(s)
                    </Badge>
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                      {company.turmas.filter(t => t.status === "RECICLAGEM PRÓXIMA").length} próxima(s)
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {company.turmas.map((turma) => {
                  const isExpanded = expandedClass === turma.classItem.id;
                  const isVencido = turma.status === "VENCIDO";
                  const turmaCerts = turma.certificates;
                  const turmaCertIds = turmaCerts.map(c => c.id);
                  const allSelected = turmaCertIds.length > 0 && turmaCertIds.every(id => selectedCerts.includes(id));
                  return (
                    <div key={turma.classItem.id} className={`rounded-lg border-2 ${isVencido ? 'border-red-200 bg-red-50' : 'border-orange-100 bg-orange-50'}`}>
                      <div className="flex items-center justify-between p-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900">{turma.classItem.training_name}</p>
                            <Badge className={isVencido ? "bg-red-100 text-red-700 text-xs" : "bg-orange-100 text-orange-700 text-xs"}>
                              {isVencido ? `Vencido há ${turma.dias} dias` : `Vence em ${turma.dias} dias`}
                            </Badge>
                          </div>
                          <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                            <span>📅 Início: {formatDate(turma.dataInicio)}</span>
                            <span>🏁 Término: {formatDate(turma.dataFim)}</span>
                            <span>⏱ Validade: {turma.validityMonths} meses</span>
                            <span>👥 {turma.classItem.students_count || turmaCerts.length} aluno(s)</span>
                            {turma.classItem.location && <span>📍 {turma.classItem.location}</span>}
                            {turma.classItem.instructor_name && <span>👨‍🏫 {turma.classItem.instructor_name}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <Button size="sm" variant="outline" onClick={() => handleNotifyRecycle(turma)} className="text-xs">
                            <Send className="w-3 h-3 mr-1" /> Notificar
                          </Button>
                          {turmaCerts.length > 0 && (
                            <Button size="sm" variant="ghost" onClick={() => setExpandedClass(isExpanded ? null : turma.classItem.id)} className="text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              {turmaCerts.length} cert.
                              {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                            </Button>
                          )}
                        </div>
                      </div>

                      {isExpanded && turmaCerts.length > 0 && (
                        <div className="border-t border-gray-200 bg-white rounded-b-lg">
                          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50">
                            <button
                              className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                              onClick={() => {
                                if (allSelected) setSelectedCerts(prev => prev.filter(id => !turmaCertIds.includes(id)));
                                else setSelectedCerts(prev => [...new Set([...prev, ...turmaCertIds])]);
                              }}
                            >
                              {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                              Selecionar turma
                            </button>
                            {selectedCerts.some(id => turmaCertIds.includes(id)) && (
                              <>
                                <span className="text-gray-300">|</span>
                                <span className="text-xs text-gray-500">{selectedCerts.filter(id => turmaCertIds.includes(id)).length} selecionado(s)</span>
                                <Button size="sm" variant="outline" className="text-xs h-6 px-2" onClick={() => handleBulkDownload(turmaCerts)}>
                                  <Download className="w-3 h-3 mr-1" /> Baixar Selecionados
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs h-6 px-2" onClick={() => handleBulkEmail(turmaCerts)}>
                                  <Mail className="w-3 h-3 mr-1" /> E-mail Selecionados
                                </Button>
                              </>
                            )}
                          </div>
                          <div className="divide-y divide-gray-100">
                            {turmaCerts.map(cert => (
                              <div key={cert.id} className="flex items-center gap-3 px-4 py-3">
                                <input type="checkbox" checked={selectedCerts.includes(cert.id)} onChange={() => toggleSelectCert(cert.id)} className="rounded" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900">{cert.student_name}</p>
                                  <div className="flex gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                                    {cert.student_cpf && <span>CPF: {cert.student_cpf}</span>}
                                    {cert.student_email && <span>✉ {cert.student_email}</span>}
                                    {cert.student_phone && <span>📱 {cert.student_phone}</span>}
                                    {cert.valid_until && <span>Válido até: {formatDate(cert.valid_until)}</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => handleDownloadCert(cert)} title="Baixar PDF">
                                    <Download className="w-3 h-3" />
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => handleEmailCert(cert)} disabled={sendingEmail === cert.id} title="Enviar por E-mail">
                                    {sendingEmail === cert.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => handleWhatsAppCert(cert)} title="Enviar por WhatsApp">
                                    <MessageCircle className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Página Principal Unificada ───────────────────────────────────────────────

export default function CertificateAlerts() {
  const [activeTab, setActiveTab] = useState("certificados");

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-orange-500" />
            Alertas de Vencimento
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gerencie certificados próximos do vencimento e reciclagens pendentes por turma
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("certificados")}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "certificados"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            🎓 Por Certificado
          </button>
          <button
            onClick={() => setActiveTab("reciclagens")}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "reciclagens"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            🔄 Por Turma / Reciclagem
          </button>
        </div>

        {/* Conteúdo da aba */}
        {activeTab === "certificados" ? <AbaCertificados /> : <AbaReciclagens />}
      </div>
    </div>
  );
}