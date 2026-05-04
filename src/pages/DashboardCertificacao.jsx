import React, { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Award, Clock, CheckCircle, XCircle, AlertTriangle, Send,
  PenTool, Users, Loader2
} from "lucide-react";
import { format, differenceInDays, parseISO, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

function StatCard({ icon: Icon, label, value, color = "blue", loading }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
            {loading ? (
              <div className="h-8 w-16 bg-gray-100 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-3xl font-bold text-gray-900 mt-1">{value ?? "—"}</p>
            )}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardCertificacao() {
  const hoje = new Date();
  const mesAtual = format(hoje, "yyyy-MM");

  const { data: certs = [], isLoading } = useQuery({
    queryKey: ["cert-dash"],
    queryFn: () => base44.entities.Certificate.list("-created_date", 1000),
    refetchInterval: 60000,
  });

  const metrics = useMemo(() => {
    const emitidosMes = certs.filter(c => c.created_date?.startsWith(mesAtual)).length;
    const pendentes = certs.filter(c => c.status === "pending_signature");
    const assinadosHoje = certs.filter(c => c.signed_at && isToday(parseISO(c.signed_at)));
    const vencidos = certs.filter(c => {
      if (!c.valid_until) return false;
      return differenceInDays(parseISO(c.valid_until), hoje) < 0;
    });
    const revogados = certs.filter(c => c.status === "revoked");

    const vencendo30 = certs.filter(c => {
      if (!c.valid_until || c.status === "revoked") return false;
      const d = differenceInDays(parseISO(c.valid_until), hoje);
      return d >= 0 && d <= 30;
    });
    const vencendo60 = certs.filter(c => {
      if (!c.valid_until || c.status === "revoked") return false;
      const d = differenceInDays(parseISO(c.valid_until), hoje);
      return d > 30 && d <= 60;
    });
    const vencendo90 = certs.filter(c => {
      if (!c.valid_until || c.status === "revoked") return false;
      const d = differenceInDays(parseISO(c.valid_until), hoje);
      return d > 60 && d <= 90;
    });

    const recenteSigned = certs
      .filter(c => c.signed_at)
      .sort((a, b) => new Date(b.signed_at) - new Date(a.signed_at))
      .slice(0, 5);
    const recenteGerados = certs
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 5);

    return { emitidosMes, pendentes, assinadosHoje, vencidos, revogados, vencendo30, vencendo60, vencendo90, recenteSigned, recenteGerados };
  }, [certs]);

  const handleReenviar = async (cert) => {
    try {
      await base44.functions.invoke("enviarCertificadoWhatsApp", { certificate_id: cert.id });
      toast.success("Link reenviado via WhatsApp!");
    } catch {
      toast.error("Erro ao reenviar link.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Certificação</h1>
        <p className="text-sm text-gray-500 mt-1">
          {format(hoje, "MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={Award} label="Emitidos no Mês" value={metrics.emitidosMes} color="blue" loading={isLoading} />
        <StatCard icon={Clock} label="Pendentes Assinatura" value={metrics.pendentes.length} color="orange" loading={isLoading} />
        <StatCard icon={CheckCircle} label="Assinados Hoje" value={metrics.assinadosHoje.length} color="green" loading={isLoading} />
        <StatCard icon={AlertTriangle} label="Vencidos" value={metrics.vencidos.length} color="red" loading={isLoading} />
        <StatCard icon={XCircle} label="Revogados" value={metrics.revogados.length} color="purple" loading={isLoading} />
      </div>

      {/* Acesso Rápido */}
      <div className="flex flex-wrap gap-3">
        <Link to="/CertificateEmissao"><Button variant="outline" className="gap-2"><Award className="w-4 h-4" />Gerar Certificados</Button></Link>
        <Link to="/Certificacoes"><Button variant="outline" className="gap-2"><Users className="w-4 h-4" />Cadastro de Alunos</Button></Link>
        <Link to="/CertificateAuditPanel"><Button variant="outline" className="gap-2"><CheckCircle className="w-4 h-4" />Auditoria</Button></Link>
        <Link to={createPageUrl("CertDesigner")}><Button variant="outline" className="gap-2"><PenTool className="w-4 h-4" />Designer</Button></Link>
      </div>

      {/* Pendentes de Assinatura */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" /> Pendentes de Assinatura ({metrics.pendentes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : metrics.pendentes.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nenhum certificado pendente de assinatura.</p>
          ) : (
            <div className="space-y-2">
              {metrics.pendentes.slice(0, 8).map(c => {
                const diasEnvio = c.created_date
                  ? differenceInDays(hoje, parseISO(c.created_date))
                  : null;
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{c.student_name}</p>
                      <p className="text-xs text-gray-500">{c.course_name} — {c.client_name}</p>
                      {diasEnvio !== null && (
                        <p className="text-xs text-orange-600 mt-0.5">{diasEnvio} dias desde o envio</p>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleReenviar(c)} className="gap-1 text-xs">
                      <Send className="w-3 h-3" /> Reenviar
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alertas de Vencimento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Alertas de Vencimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Vencendo em até 30 dias", list: metrics.vencendo30, color: "red" },
            { label: "Vencendo em 31–60 dias", list: metrics.vencendo60, color: "orange" },
            { label: "Vencendo em 61–90 dias", list: metrics.vencendo90, color: "yellow" },
          ].map(({ label, list, color }) => (
            list.length > 0 && (
              <div key={label}>
                <p className={`text-xs font-semibold text-${color}-700 mb-2`}>{label} ({list.length})</p>
                <div className="space-y-1">
                  {list.slice(0, 4).map(c => (
                    <div key={c.id} className={`flex justify-between items-center p-2 bg-${color}-50 rounded border border-${color}-100`}>
                      <div>
                        <span className="text-xs font-medium text-gray-800">{c.student_name}</span>
                        <span className="text-xs text-gray-500 ml-2">{c.course_name}</span>
                      </div>
                      <span className="text-xs text-gray-600">{c.valid_until ? format(parseISO(c.valid_until), "dd/MM/yyyy") : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
          {metrics.vencendo30.length === 0 && metrics.vencendo60.length === 0 && metrics.vencendo90.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum alerta de vencimento.</p>
          )}
        </CardContent>
      </Card>

      {/* Atividade Recente */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Últimas Assinaturas</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.recenteSigned.map(c => (
                <div key={c.id} className="flex justify-between text-xs p-2 bg-green-50 rounded">
                  <span className="font-medium text-gray-800">{c.student_name}</span>
                  <span className="text-gray-500">{c.signed_at ? format(parseISO(c.signed_at), "dd/MM HH:mm") : "—"}</span>
                </div>
              ))}
              {metrics.recenteSigned.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Nenhuma assinatura recente.</p>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Últimos Certificados Gerados</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.recenteGerados.map(c => (
                <div key={c.id} className="flex justify-between text-xs p-2 bg-blue-50 rounded">
                  <span className="font-medium text-gray-800 truncate max-w-[160px]">{c.student_name}</span>
                  <span className="text-gray-500">{c.created_date ? format(parseISO(c.created_date), "dd/MM") : "—"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}