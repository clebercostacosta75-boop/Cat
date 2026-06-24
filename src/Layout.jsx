import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, Calendar, Upload, Users, BookOpen, BarChart3, FileText,
  Building2, UserCog, Mail, Bell, Award,
  TrendingUp, PenLine, Settings, Target, MessageSquare, ShieldAlert, Shield, Download, User, ShieldCheck, Grid3X3, FileCheck, Heart
} from "lucide-react";

import NotificationBell from "./components/notifications/NotificationBell";

import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "sonner";
import { usePermissions } from "@/lib/PermissionsContext";
import { Loader2 } from "lucide-react";

const ALL_ITEMS = [
  { title: "Dashboard", url: "/Dashboard", icon: LayoutDashboard, key: "Dashboard" },
  { title: "Cronograma", url: createPageUrl("Schedule"), icon: Calendar, key: "Cronograma" },
  { title: "Agenda de Treinamentos", url: "/AgendaTreinamentos", icon: Calendar, key: "Agenda de Treinamentos" },
  { title: "Chamada Presencial", url: createPageUrl("AttendanceCall"), icon: Users, key: "Chamada Presencial" },
  { title: "Entrada de Propostas", url: "/ProposalEntry", icon: Upload, key: "Entrada de Propostas" },
  { title: "Gestão de BMM", url: "/GestaoBMM", icon: FileText, key: "Gestão de BMM" },
  { title: "Instrutores", url: createPageUrl("Instructors"), icon: Users, key: "Instrutores" },
  { title: "Empresas", url: createPageUrl("Companies"), icon: Building2, key: "Empresas" },
  { title: "Contratadas", url: createPageUrl("Contractors"), icon: Building2, key: "Contratadas" },
  { title: "Cursos", url: createPageUrl("Courses"), icon: BookOpen, key: "Cursos" },
  // Dashboard Financeiro acessível via aba no Dashboard Central
  // { title: "Dashboard Financeiro", url: "/DashboardFinanceiro", icon: TrendingUp, key: "Dashboard Financeiro" },
  { title: "Alunos Individuais (PF)", url: "/GestaoAlunosIndividuais", icon: Users, key: "Alunos Individuais (PF)" },
  { title: "Gestão de Contratos", url: "/GestaoContratos", icon: FileText, key: "Gestão de Contratos" },
  { title: "Certificações", url: "/Certificacoes", icon: Award, key: "Certificações" },
  { title: "Alertas de Vencimento", url: createPageUrl("CertificateAlerts"), icon: Bell, key: "Alertas de Vencimento" },
  { title: "Designer de Certificados", url: createPageUrl("CertDesigner"), icon: Award, key: "Designer de Certificados" },
  { title: "Assinaturas Digitais", url: createPageUrl("DigitalSignatures"), icon: PenLine, key: "Assinaturas Digitais" },
  { title: "Auditoria de Certificados", url: "/CertificateAuditPanel", icon: FileText, key: "Auditoria de Certificados" },
  { title: "Central de Comunicação", url: createPageUrl("CommunicationCenter"), icon: Mail, key: "Central de Comunicação" },
  { title: "Usuários", url: createPageUrl("Users"), icon: UserCog, key: "Usuários" },
  { title: "Log de Auditoria", url: createPageUrl("AuditLog"), icon: FileText, key: "Log de Auditoria" },
  { title: "Auditoria Completa", url: "/AuditoriaCompleta", icon: FileText, key: "Auditoria Completa" },
  { title: "Log de Acesso", url: "/AccessLog", icon: ShieldAlert, key: "Log de Acesso" },
  { title: "Dashboard Comercial", url: "/DashboardComercial", icon: Target, key: "Dashboard Comercial" },
  { title: "Dashboard Operacional", url: "/DashboardOperacionalV2", icon: BarChart3, key: "Dashboard Operacional" },
  { title: "Dashboard de Relatórios", url: "/Analytics", icon: BarChart3, key: "Dashboard de Relatórios" },
  { title: "📥 Download de Backups", url: "/BackupDownload", icon: Download, key: "BackupDownload" },
  { title: "Prontuário Digital", url: "/ProntuarioDigital", icon: User, key: "ProntuarioDigital" },
  { title: "Documentos de Alunos", url: "/GestaoDocumentosAluno", icon: Upload, key: "GestaoDocumentosAluno" },
  { title: "Homologações", url: "/Homologacoes", icon: ShieldCheck, key: "Homologações" },
  { title: "Matriz de Treinamentos", url: "/MatrizTreinamentos", icon: Grid3X3, key: "Matriz de Treinamentos" },
  { title: "Dossiê de Homologação", url: "/DossieHomologacao", icon: FileCheck, key: "DossieHomologacao" },
  { title: "Compliance 360", url: "/Compliance360", icon: ShieldCheck, key: "Compliance360" },
  // Grupo SST
  { title: "🏥 Dashboard SST", url: "/SSTDashboard", icon: Heart, key: "SSTDashboard" },
  { title: "🏥 Central de Empresas", url: "/EmpresaMestre", icon: Building2, key: "EmpresaMestre" },
  { title: "🏥 Saúde Ocupacional", url: "/SaudeOcupacional", icon: Heart, key: "SaudeOcupacional" },
  { title: "🏥 Colaboradores SST", url: "/ColaboradoresSST", icon: Users, key: "ColaboradoresSST" },
  { title: "🏥 Gestão de Exames", url: "/GestaoExames", icon: Grid3X3, key: "GestaoExames" },
  { title: "🦺 Gestão de EPI", url: "/GestaoEPI", icon: ShieldCheck, key: "GestaoEPI" },
  // Compliance 360 — acessível via rota direta, sem item de menu duplicado
  // Treinamentos
  { title: "📋 Matriz NR × Função", url: "/MatrizTreinamentos", icon: Grid3X3, key: "MatrizTreinamentos" },
  { title: "📅 Agendamento e Cronograma", url: "/AgendamentoTreinamentos", icon: Calendar, key: "AgendamentoTreinamentos" },
  // Colaboradores
  { title: "📁 Prontuário Digital", url: "/ProntuarioDigital", icon: Users, key: "ProntuarioDigital" },
  // Financeiro SST
  { title: "📊 Orçamento de Conformidade", url: "/OrcamentoConformidade", icon: TrendingUp, key: "OrcamentoConformidade" },
  { title: "🩺 PCMSO Inteligente", url: "/PCMSOLeitura", icon: Heart, key: "PCMSOLeitura" },
  { title: "🔗 Conferência PGR × PCMSO", url: "/ConferenciaPGRPCMSO", icon: ShieldCheck, key: "ConferenciaPGRPCMSO" },
  { title: "📋 Auditoria do Sistema", url: "/AuditoriaApp", icon: FileCheck, key: "AuditoriaApp" },
];

const ROLE_LABEL = {
  admin: "Administrador",
  gestor_master: "Gestor Master",
  editor: "Editor",
  cliente: "Cliente",
  personalizado: "Personalizado",
  // legados
  Instrutor: "Instrutor",
  "Coordenador de Operações": "Coordenador",
  Financeiro: "Financeiro",
  Operacional: "Operacional",
  Certificacao: "Certificação",
  "Certificação": "Certificação",
  Atendimento: "Atendimento",
  "Administrador Master": "Administrador",
  PortalEmpresa: "Portal Empresa",
};

export default function Layout({ children }) {
  const location = useLocation();
  const { role, allowedKeys, loading } = usePermissions();

  // null = acesso total, array = filtro
  const navigationItems = allowedKeys === null
    ? ALL_ITEMS
    : ALL_ITEMS.filter(i => allowedKeys.includes(i.key));

  return (
    <SidebarProvider>
      <div id="app-root" className="min-h-screen flex w-full bg-gray-50">
        <Sidebar id="app-sidebar" className="border-r border-gray-200 bg-white">
          <SidebarHeader className="border-b border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png"
                  alt="CAT Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">Sistema de Treinamento</h2>
                {role && (
                  <p className="text-xs text-gray-500">{ROLE_LABEL[role] || role}</p>
                )}
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2">
                Navegação
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {loading ? (
                  <div className="px-3 py-6 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    <p className="text-xs text-gray-400">Carregando permissões...</p>
                  </div>
                ) : (
                  <SidebarMenu>
                    {navigationItems.length === 0 ? (
                      <div className="px-3 py-4 text-center">
                        <Shield className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-400 leading-relaxed">Nenhum módulo liberado.<br />Solicite ao administrador.</p>
                      </div>
                    ) : (
                      navigationItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-gray-100 transition-colors duration-150 rounded-md mb-1 ${
                              location.pathname === item.url ? "bg-gray-100 text-gray-900" : "text-gray-700"
                            }`}
                          >
                            <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                              <item.icon className="w-4 h-4" />
                              <span className="font-normal text-sm">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))
                    )}
                  </SidebarMenu>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col bg-white">
          <header id="app-header" className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-md transition-colors md:hidden" />
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png"
                  alt="CAT Logo"
                  className="h-7 w-auto md:hidden"
                />
                <h1 className="text-base font-semibold text-gray-900 md:hidden">Sistema de Treinamento</h1>
              </div>
              <div className="flex items-center gap-2">
                <NotificationBell />
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </SidebarProvider>
  );
}