import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Users, MessageSquare, TrendingUp, Target, BookOpen, Instagram,
  ArrowRight, UserCheck, Clock, CheckCircle, XCircle
} from "lucide-react";

const STATUS_COLORS = {
  "Novo": "bg-blue-100 text-blue-800",
  "Em Atendimento": "bg-yellow-100 text-yellow-800",
  "Qualificado": "bg-purple-100 text-purple-800",
  "Proposta Enviada": "bg-orange-100 text-orange-800",
  "Matriculado": "bg-green-100 text-green-800",
  "Perdido": "bg-red-100 text-red-800",
  "Sem Interesse": "bg-gray-100 text-gray-600",
};

function StatCard({ title, value, icon: IconComp, color, sub }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value ?? "—"}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            <IconComp className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardComercial() {
  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list("-created_date", 500),
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => base44.entities.Conversation.list("-last_message_at", 200),
  });

  const { data: knowledgeEntries = [] } = useQuery({
    queryKey: ["knowledgeBase"],
    queryFn: () => base44.entities.KnowledgeBaseEntry.list("-created_date", 200),
  });

  // KPIs
  const totalLeads = leads.length;
  const novos = leads.filter(l => l.status === "Novo").length;
  const emAtendimento = leads.filter(l => l.status === "Em Atendimento").length;
  const matriculados = leads.filter(l => l.status === "Matriculado").length;
  const perdidos = leads.filter(l => l.status === "Perdido").length;
  const taxaConversao = totalLeads > 0 ? ((matriculados / totalLeads) * 100).toFixed(1) : 0;

  const convAberta = conversations.filter(c => ["Aberta", "Em Atendimento IA", "Aguardando Humano"].includes(c.status)).length;
  const convAguardando = conversations.filter(c => c.status === "Aguardando Humano").length;

  // Funil
  const funilStatuses = ["Novo", "Em Atendimento", "Qualificado", "Proposta Enviada", "Matriculado"];
  const funil = funilStatuses.map(s => ({
    status: s,
    count: leads.filter(l => l.status === s).length,
  }));

  // Leads recentes
  const leadsRecentes = leads.slice(0, 5);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-7 h-7 text-indigo-600" />
            Dashboard Comercial
          </h1>
          <p className="text-sm text-gray-500 mt-1">Funil de vendas e atendimento multicanal da CAT Cursos</p>
        </div>
        <div className="flex gap-2">
          <Link to="/GestaoLeads">
            <Button variant="outline" size="sm" className="gap-1">
              <Users className="w-4 h-4" /> Ver Leads
            </Button>
          </Link>
          <Link to="/CaixaEntrada">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1">
              <MessageSquare className="w-4 h-4" /> Caixa de Entrada
              {convAguardando > 0 && <Badge className="bg-red-500 text-white text-xs ml-1">{convAguardando}</Badge>}
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total de Leads" value={totalLeads} icon={Users} color="bg-blue-100 text-blue-600" sub={`${novos} novos`} />
        <StatCard title="Em Atendimento" value={emAtendimento} icon={Clock} color="bg-yellow-100 text-yellow-600" />
        <StatCard title="Matriculados" value={matriculados} icon={CheckCircle} color="bg-green-100 text-green-600" sub={`${taxaConversao}% de conversão`} />
        <StatCard title="Perdidos" value={perdidos} icon={XCircle} color="bg-red-100 text-red-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Conversas Ativas" value={convAberta} icon={MessageSquare} color="bg-purple-100 text-purple-600" sub={`${convAguardando} aguardando humano`} />
        <StatCard title="Base de Conhecimento" value={knowledgeEntries.filter(e => e.is_active !== false).length} icon={BookOpen} color="bg-indigo-100 text-indigo-600" sub="entradas ativas" />
        <StatCard title="Taxa de Conversão" value={`${taxaConversao}%`} icon={TrendingUp} color="bg-emerald-100 text-emerald-600" sub="leads → matriculados" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funil */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" /> Funil de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funil.map((item, idx) => {
              const pct = totalLeads > 0 ? (item.count / totalLeads) * 100 : 0;
              return (
                <div key={item.status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{item.status}</span>
                    <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div
                      className="h-2 rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${pct}%`, opacity: 1 - idx * 0.15 }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Leads recentes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> Leads Recentes
              </CardTitle>
              <Link to="/GestaoLeads">
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-indigo-600">
                  Ver todos <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {leadsRecentes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhum lead cadastrado ainda</p>
            ) : leadsRecentes.map(lead => (
              <div key={lead.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700">
                    {lead.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                    <p className="text-xs text-gray-400">{lead.origin_channel} · {lead.interest_course || "Curso não informado"}</p>
                  </div>
                </div>
                <Badge className={`text-xs ${STATUS_COLORS[lead.status] || "bg-gray-100"}`}>{lead.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Atalhos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Gestão de Leads", to: "/GestaoLeads", icon: Users, color: "text-blue-600" },
          { label: "Caixa de Entrada", to: "/CaixaEntrada", icon: MessageSquare, color: "text-purple-600" },
          { label: "Base de Conhecimento", to: "/BaseConhecimento", icon: BookOpen, color: "text-indigo-600" },
          { label: "Contas Sociais", to: "/ContasSociais", icon: Instagram, color: "text-pink-600" },
        ].map(({ label, to, icon: Icon, color }) => (
          <Link key={to} to={to}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <ArrowRight className="w-3 h-3 text-gray-400 ml-auto" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}