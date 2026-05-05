import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard, Calendar, Users, BookOpen, Upload, BarChart3, FileText,
  Building2, UserCog, Mail, History, Bell, DollarSign, Award, TrendingUp,
  PenLine, Settings, AlertTriangle
} from "lucide-react";
import NotificationBell from "./components/notifications/NotificationBell";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "sonner";

// ── Todos os itens possíveis do menu ──────────────────────────────────────────
const ALL_ITEMS = [
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard, key: "Dashboard" },
  { title: "Cronograma", url: createPageUrl("Schedule"), icon: Calendar, key: "Cronograma" },
  { title: "Agenda de Treinamentos", url: "/AgendaTreinamentos", icon: Calendar, key: "Agenda de Treinamentos" },
  { title: "Chamada Presencial", url: createPageUrl("AttendanceCall"), icon: Users, key: "Chamada Presencial" },
  { title: "Entrada de Propostas", url: "/ProposalEntry", icon: Upload, key: "Entrada de Propostas" },
  { title: "Gerar BMM", url: createPageUrl("BMMGenerator"), icon: FileText, key: "Gerar BMM" },
  { title: "Histórico BMM", url: createPageUrl("BMMHistory"), icon: History, key: "Histórico BMM" },
  { title: "Instrutores", url: createPageUrl("Instructors"), icon: Users, key: "Instrutores" },
  { title: "Empresas", url: createPageUrl("Companies"), icon: Building2, key: "Empresas" },
  { title: "Contratadas", url: createPageUrl("Contractors"), icon: Building2, key: "Contratadas" },
  { title: "Cursos", url: createPageUrl("Courses"), icon: BookOpen, key: "Cursos" },
  { title: "Importar Excel", url: createPageUrl("Import"), icon: Upload, key: "Importar Excel" },
  { title: "Análise de Lucratividade", url: createPageUrl("ProfitabilityAnalysis"), icon: BarChart3, key: "Análise de Lucratividade" },
  { title: "Dashboard Financeiro", url: createPageUrl("FinancialDashboard"), icon: TrendingUp, key: "Dashboard Financeiro" },
  { title: "Relatórios", url: createPageUrl("Reports"), icon: BarChart3, key: "Relatórios" },
  { title: "Controle Financeiro Instrutor", url: createPageUrl("InstructorFinancialControl"), icon: DollarSign, key: "Controle Financeiro Instrutor" },
  { title: "Automação de Pagamentos", url: createPageUrl("PaymentAutomation"), icon: DollarSign, key: "Automação de Pagamentos" },
  { title: "Certificações", url: "/Certificacoes", icon: Award, key: "Certificações" },
  { title: "Alertas de Vencimento", url: createPageUrl("CertificateAlerts"), icon: Bell, key: "Alertas de Vencimento" },
  { title: "Designer de Certificados", url: createPageUrl("CertDesigner"), icon: Award, key: "Designer de Certificados" },
  { title: "Assinaturas Digitais", url: createPageUrl("DigitalSignatures"), icon: PenLine, key: "Assinaturas Digitais" },
  { title: "Auditoria de Certificados", url: "/CertificateAuditPanel", icon: FileText, key: "Auditoria de Certificados" },
  { title: "Config. Notificações", url: "/ConfigNotificacoes", icon: Settings, key: "Config. Notificações" },
  { title: "Log de Notificações", url: "/LogNotificacoes", icon: FileText, key: "Log de Notificações" },
  { title: "Modelos E-mail", url: createPageUrl("EmailTemplates"), icon: Mail, key: "Modelos E-mail" },
  { title: "Central de Comunicação", url: createPageUrl("CommunicationCenter"), icon: Mail, key: "Central de Comunicação" },
  { title: "Usuários", url: createPageUrl("Users"), icon: UserCog, key: "Usuários" },
  { title: "Log de Auditoria", url: createPageUrl("AuditLog"), icon: FileText, key: "Log de Auditoria" },
  { title: "Dashboard Admin", url: "/AdminDashboard", icon: TrendingUp, key: "Dashboard Admin" },
];

// ── Chaves permitidas por perfil ───────────────────────────────────────────────
const ROLE_MENUS = {
  admin: null, // null = tudo
  "Administrador Master": null,
  Operacional: [
    "Dashboard", "Agenda de Treinamentos", "Cronograma", "Chamada Presencial",
    "Entrada de Propostas", "Gerar BMM", "Histórico BMM", "Instrutores", "Empresas", "Contratadas",
    "Cursos", "Importar Excel", "Central de Comunicação",
    "Config. Notificações", "Log de Notificações",
  ],
  Financeiro: [
    "Dashboard", "Controle Financeiro Instrutor", "Automação de Pagamentos",
    "Dashboard Financeiro", "Análise de Lucratividade", "Relatórios",
  ],
  Certificacao: [
    "Dashboard", "Certificações", "Alertas de Vencimento", "Designer de Certificados",
    "Assinaturas Digitais", "Auditoria de Certificados",
    "Agenda de Treinamentos", "Cronograma", "Chamada Presencial",
    "Gerar BMM", "Modelos E-mail", "Central de Comunicação",
  ],
  Instrutor: ["Dashboard"],
  "Coordenador de Operações": [
    "Dashboard", "Cronograma", "Agenda de Treinamentos", "Chamada Presencial",
  ],
  PortalEmpresa: [],
};

const ROLE_LABEL = {
  Instrutor: "Instrutor",
  "Coordenador de Operações": "Coordenador",
  Financeiro: "Financeiro",
  Operacional: "Operacional",
  Certificacao: "Certificação",
  admin: "Administrador",
  "Administrador Master": "Administrador",
  PortalEmpresa: "Portal Empresa",
};

export default function Layout({ children }) {
  const location = useLocation();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const u = await base44.auth.me();
        if (u.email) {
          const insts = await base44.entities.Instructor.filter({ email: u.email });
          if (insts.length > 0) { setUserRole("Instrutor"); return; }
        }
        setUserRole(u.custom_role || u.role || "user");
      } catch { /* silent */ }
    };
    load();
  }, []);

  const allowedKeys = userRole ? ROLE_MENUS[userRole] : [];
  const navigationItems = allowedKeys === null
    ? ALL_ITEMS
    : ALL_ITEMS.filter(i => allowedKeys?.includes(i.key));

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
                {userRole && (
                  <p className="text-xs text-gray-500">{ROLE_LABEL[userRole] || userRole}</p>
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
                <SidebarMenu>
                  {navigationItems.map((item) => (
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
                  ))}
                </SidebarMenu>
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