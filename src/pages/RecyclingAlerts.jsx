import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertOctagon, Clock, Send, Loader2, Building2, Users, ChevronDown, ChevronUp, Download, Mail, MessageCircle, CheckSquare, Square } from "lucide-react";
import { logAction } from "@/components/audit/AuditLogger";
import { exportCertificatePDF } from "@/components/certificates/CertificateExporter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RecyclingAlertsPage() {
  const [selectedCompanyId, setSelectedCompanyId] = useState("all");
  const [expandedClass, setExpandedClass] = useState(null);
  const [selectedCerts, setSelectedCerts] = useState([]);
  const [sendingEmail, setSendingEmail] = useState(null);

  const { data: completedClasses = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['completedClasses'],
    queryFn: async () => {
      const allClasses = await base44.entities.ClassSchedule.list();
      return allClasses.filter(c => c.status === 'Concluído');
    },
    initialData: [],
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
    initialData: [],
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    initialData: [],
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => base44.entities.Certificate.list(),
    initialData: [],
  });

  const { data: certModels = [] } = useQuery({
    queryKey: ['certModels'],
    queryFn: () => base44.entities.CertificateModel.list(),
    initialData: [],
  });

  const checkRecyclableStatus = (dataRealizacao, validadeMeses) => {
    const hoje = new Date();
    const dataVencimento = new Date(dataRealizacao);
    dataVencimento.setMonth(dataVencimento.getMonth() + validadeMeses);
    const diffDays = Math.ceil((dataVencimento - hoje) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return { status: "VENCIDO", dias: Math.abs(diffDays) };
    if (diffDays <= 30) return { status: "RECICLAGEM PRÓXIMA", dias: diffDays };
    return { status: "VÁLIDO", dias: diffDays };
  };

  // Agrupar por empresa com detalhes de turma e alunos
  const companiesData = useMemo(() => {
    const map = {};

    completedClasses.forEach(classItem => {
      const course = courses.find(c => c.name === classItem.training_name);
      if (!course || !course.validity) return;

      const validityMonths = parseInt(course.validity);
      if (isNaN(validityMonths)) return;

      const lastDate = classItem.realization_dates?.length
        ? classItem.realization_dates[classItem.realization_dates.length - 1]
        : classItem.end_date;

      if (!lastDate) return;

      const recycleStatus = checkRecyclableStatus(lastDate, validityMonths);
      if (recycleStatus.status === "VÁLIDO") return;

      const companyKey = classItem.company_id || classItem.company_name;
      if (!map[companyKey]) {
        map[companyKey] = {
          id: classItem.company_id,
          nome: classItem.company_name,
          turmas: []
        };
      }

      // Buscar certificados desta turma
      const classCerts = certificates.filter(c =>
        c.class_schedule_id === classItem.id ||
        c.client_name === classItem.company_name
      );

      map[companyKey].turmas.push({
        classItem,
        course,
        status: recycleStatus.status,
        dias: recycleStatus.dias,
        lastDate,
        validityMonths,
        certificates: classCerts,
        dataInicio: classItem.realization_dates?.[0] || null,
        dataFim: lastDate,
      });
    });

    return Object.values(map);
  }, [completedClasses, courses, certificates]);

  const filteredCompanies = selectedCompanyId === "all"
    ? companiesData
    : companiesData.filter(c => c.id === selectedCompanyId || c.nome === selectedCompanyId);

  const totalVencidos = companiesData.reduce((sum, c) => sum + c.turmas.filter(t => t.status === "VENCIDO").length, 0);
  const totalProximos = companiesData.reduce((sum, c) => sum + c.turmas.filter(t => t.status === "RECICLAGEM PRÓXIMA").length, 0);

  const handleNotifyRecycle = async (turma) => {
    const company = companies.find(c =>
      c.nome_fantasia === turma.classItem.company_name ||
      c.razao_social === turma.classItem.company_name ||
      c.id === turma.classItem.company_id
    );
    if (!company?.contacts?.length) { alert('Empresa não possui contatos cadastrados'); return; }
    const contact = company.contacts.find(c => c.is_whatsapp && c.phone);
    if (!contact) { alert('Empresa não possui contato com WhatsApp cadastrado'); return; }

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
    if (!cert.student_email) { alert('Aluno não possui e-mail cadastrado'); return; }
    setSendingEmail(cert.id);
    try {
      await base44.integrations.Core.SendEmail({
        to: cert.student_email,
        subject: `Seu certificado - ${cert.course_name}`,
        body: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#1a3a5c;">Certificado Disponível</h2>
            <p>Olá <strong>${cert.student_name}</strong>,</p>
            <p>Segue informações do seu certificado do curso <strong>${cert.course_name}</strong>.</p>
            <p><strong>Empresa:</strong> ${cert.client_name || ''}</p>
            <p><strong>Válido até:</strong> ${cert.valid_until ? new Date(cert.valid_until).toLocaleDateString('pt-BR') : 'N/A'}</p>
            <p>Para acessar e validar seu certificado, entre em contato com a coordenação.</p>
            <br/><p>CAT Cursos e Treinamentos</p>
          </div>`
      });
      alert(`E-mail enviado para ${cert.student_email}`);
    } catch (e) {
      alert('Erro ao enviar e-mail: ' + e.message);
    }
    setSendingEmail(null);
  };

  const handleWhatsAppCert = (cert) => {
    if (!cert.student_phone) { alert('Aluno não possui telefone cadastrado'); return; }
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
    const targets = certs.filter(c => selectedCerts.includes(c.id));
    for (const cert of targets) {
      await handleEmailCert(cert);
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    try { return format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
  };

  if (loadingClasses) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-black">Alertas de Reciclagem</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie reciclagens por empresa e distribua certificados</p>
        </div>

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

        {/* Filtro de Empresa */}
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

        {/* Lista de Empresas */}
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
                        {/* Linha da Turma */}
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleNotifyRecycle(turma)}
                              className="text-xs"
                            >
                              <Send className="w-3 h-3 mr-1" />
                              Notificar
                            </Button>
                            {turmaCerts.length > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setExpandedClass(isExpanded ? null : turma.classItem.id)}
                                className="text-xs"
                              >
                                <Users className="w-3 h-3 mr-1" />
                                {turmaCerts.length} cert.
                                {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Alunos / Certificados Expandido */}
                        {isExpanded && turmaCerts.length > 0 && (
                          <div className="border-t border-gray-200 bg-white rounded-b-lg">
                            {/* Ações em massa */}
                            <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50 rounded-b-none">
                              <button
                                className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                                onClick={() => {
                                  if (allSelected) {
                                    setSelectedCerts(prev => prev.filter(id => !turmaCertIds.includes(id)));
                                  } else {
                                    setSelectedCerts(prev => [...new Set([...prev, ...turmaCertIds])]);
                                  }
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

                            {/* Lista de alunos */}
                            <div className="divide-y divide-gray-100">
                              {turmaCerts.map(cert => (
                                <div key={cert.id} className="flex items-center gap-3 px-4 py-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedCerts.includes(cert.id)}
                                    onChange={() => toggleSelectCert(cert.id)}
                                    className="rounded"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900">{cert.student_name}</p>
                                    <div className="flex gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                                      {cert.student_cpf && <span>CPF: {cert.student_cpf}</span>}
                                      {cert.student_email && <span>✉ {cert.student_email}</span>}
                                      {cert.student_phone && <span>📱 {cert.student_phone}</span>}
                                      {cert.start_date && <span>Início: {formatDate(cert.start_date)}</span>}
                                      {cert.end_date && <span>Término: {formatDate(cert.end_date)}</span>}
                                      {cert.valid_until && <span>Válido até: {formatDate(cert.valid_until)}</span>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-7 px-2"
                                      onClick={() => handleDownloadCert(cert)}
                                      title="Baixar PDF"
                                    >
                                      <Download className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-7 px-2"
                                      onClick={() => handleEmailCert(cert)}
                                      disabled={sendingEmail === cert.id}
                                      title="Enviar por E-mail"
                                    >
                                      {sendingEmail === cert.id
                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                        : <Mail className="w-3 h-3" />}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-7 px-2"
                                      onClick={() => handleWhatsAppCert(cert)}
                                      title="Enviar por WhatsApp"
                                    >
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
    </div>
  );
}