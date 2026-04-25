import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Bell, AlertTriangle, Search, MessageCircle, RefreshCw, User, Building2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function CertificateAlerts() {
   const [daysAhead, setDaysAhead] = useState(30);
   const [search, setSearch] = useState("");
   const [alerts, setAlerts] = useState(null);
   const [loading, setLoading] = useState(false);
   const [sentStudents, setSentStudents] = useState(new Set());
   const [sentHR, setSentHR] = useState(new Set());
   const [emailLoading, setEmailLoading] = useState(null);
   const [autoNotify, setAutoNotify] = useState(false);

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
    if (!alerts || alerts.count === 0) {
      toast.warning("Nenhum certificado para notificar.");
      return;
    }
    setEmailLoading(true);
    try {
      const res = await base44.functions.invoke("enviarNotificacoesCertificados", {
        alerts: filteredAlerts,
      });
      toast.success(`${res.data.sent} notificação(ções) enviada(s) por e-mail!`);
    } catch (e) {
      toast.error("Erro ao enviar notificações: " + e.message);
    } finally {
      setEmailLoading(false);
    }
  };

  const openWhatsApp = (url, certId, type) => {
    window.open(url, "_blank");
    if (type === "student") {
      setSentStudents(prev => new Set([...prev, certId]));
    } else {
      setSentHR(prev => new Set([...prev, certId]));
    }
    toast.success(`WhatsApp aberto para envio de alerta!`);
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
    if (days <= 7) return { label: "Urgente", variant: "destructive", risk: "critical" };
    if (days <= 15) return { label: "Atenção", className: "bg-orange-500 text-white", risk: "high" };
    return { label: `${days} dias`, className: "bg-yellow-500 text-white", risk: "medium" };
  };

  const getRiskIcon = (risk) => {
    if (risk === "critical") return "🔴";
    if (risk === "high") return "🟠";
    return "🟡";
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-orange-500" />
            Alertas de Vencimento de Certificados
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Identifique certificados próximos do vencimento e notifique o aluno e o RH da empresa via WhatsApp.
          </p>
        </div>
      </div>

      {/* Painel de controle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-700">Parâmetros de Verificação</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">Dias até o vencimento</label>
            <Input
              type="number"
              min={1}
              max={365}
              value={daysAhead}
              onChange={e => setDaysAhead(Number(e.target.value))}
              className="w-28"
            />
          </div>
          <Button
            onClick={() => runCheck(false)}
            disabled={loading}
            className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            Verificar Agora
          </Button>
          <Button
            variant="outline"
            onClick={() => runCheck(true)}
            disabled={loading}
            className="gap-2"
          >
            Pré-visualizar (sem registrar)
          </Button>
        </CardContent>
      </Card>

      {/* Resultados */}
      {alerts && (
        <>
          {/* Resumo por risco */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-3 pb-2">
                <div className="text-2xl font-bold text-red-700">
                  {filteredAlerts.filter(a => a.days_remaining <= 7).length}
                </div>
                <div className="text-xs text-red-600 font-medium">🔴 Crítico (≤7 dias)</div>
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-3 pb-2">
                <div className="text-2xl font-bold text-orange-700">
                  {filteredAlerts.filter(a => a.days_remaining > 7 && a.days_remaining <= 15).length}
                </div>
                <div className="text-xs text-orange-600 font-medium">🟠 Alto (8-15 dias)</div>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-3 pb-2">
                <div className="text-2xl font-bold text-yellow-700">
                  {filteredAlerts.filter(a => a.days_remaining > 15 && a.days_remaining <= 30).length}
                </div>
                <div className="text-xs text-yellow-600 font-medium">🟡 Médio (16-30 dias)</div>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-3 pb-2">
                <div className="text-2xl font-bold text-blue-700">
                  {filteredAlerts.filter(a => a.days_remaining > 30).length}
                </div>
                <div className="text-xs text-blue-600 font-medium">🔵 Baixo (&gt;30 dias)</div>
              </CardContent>
            </Card>
          </div>

          {/* Busca + Notificações automáticas */}
          {alerts.count > 0 && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Filtrar por aluno, curso, empresa ou código..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
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

          {/* Lista de alertas */}
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
                          <Badge className={ub.className} variant={ub.variant}>
                            {ub.label}
                          </Badge>
                          {alert.days_remaining <= 7 && (
                            <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
                          )}
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

                      {/* Botões de ação */}
                      <div className="flex flex-col gap-2 min-w-fit">
                        {alert.student_whatsapp_url ? (
                          <Button
                            size="sm"
                            onClick={() => openWhatsApp(alert.student_whatsapp_url, alert.certificate_id, "student")}
                            className={`gap-2 ${studentSent ? "bg-green-600 hover:bg-green-700" : "bg-green-500 hover:bg-green-600"} text-white`}
                          >
                            {studentSent ? <CheckCircle className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            {studentSent ? "Enviado ao Aluno" : "Notificar Aluno"}
                          </Button>
                        ) : (
                          <Button size="sm" disabled variant="outline" className="text-xs gap-1">
                            <User className="w-3 h-3" /> Sem telefone do aluno
                          </Button>
                        )}

                        {alert.hr_whatsapp_url ? (
                          <Button
                            size="sm"
                            onClick={() => openWhatsApp(alert.hr_whatsapp_url, alert.certificate_id, "hr")}
                            className={`gap-2 ${hrSent ? "bg-blue-700 hover:bg-blue-800" : "bg-blue-600 hover:bg-blue-700"} text-white`}
                          >
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

      {/* Estado inicial */}
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