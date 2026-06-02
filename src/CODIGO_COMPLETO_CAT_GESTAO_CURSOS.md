# 📦 Código Completo - CAT Gestão Cursos

## Arquivo: App.jsx - Roteamento Principal

```javascript
import './App.css'
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { setupIframeMessaging } from './lib/iframe-messaging';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import CertificateSign from './pages/CertificateSign';
import ContractSign from './pages/ContractSign';
import CertificateValidate from './pages/CertificateValidate';
import CertificateEmissao from './pages/CertificateEmissao';
import StudentPortal from './pages/StudentPortal';
import AttendanceConfirm from './pages/AttendanceConfirm';
import DigitalSignatures from './pages/DigitalSignatures';
import AlertasConfig from './pages/AlertasConfig';
import AgendaTreinamentos from './pages/AgendaTreinamentos';
import AdminDashboard from './pages/AdminDashboard';
import CertificateAuditPanel from './pages/CertificateAuditPanel';
import Certificacoes from './pages/Certificacoes';
import CompanyPortal from './pages/CompanyPortal';
import DashboardOperacional from './pages/DashboardOperacional';
import DashboardOperacionalV2 from './pages/DashboardOperacional';
import DashboardFinanceiro from './pages/DashboardFinanceiro';
import DashboardCertificacao from './pages/DashboardCertificacao';
import DashboardMaster from './pages/DashboardMaster';
import DashboardInstrutor from './pages/DashboardInstrutor';
import DashboardCentral from './pages/DashboardCentral';
import AcessoNegado from './pages/AcessoNegado';
import ProposalEntry from './pages/ProposalEntry';
import DashboardComercial from './pages/DashboardComercial.jsx';
import GestaoLeads from './pages/GestaoLeads.jsx';
import BaseConhecimento from './pages/BaseConhecimento.jsx';
import GestaoBMM from './pages/GestaoBMM.jsx';
import GestaoAlunosIndividuais from './pages/GestaoAlunosIndividuais.jsx';
import AutoCadastroAluno from './pages/AutoCadastroAluno.jsx';
import GestaoContratos from './pages/GestaoContratos.jsx';
import ConsentForm from './pages/ConsentForm.jsx';
import TrocarSenha from './pages/TrocarSenha.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';
import Analytics from './pages/Analytics.jsx';
import AccessLog from './pages/AccessLog.jsx';
import ProtectedRoute from './components/ProtectedRoute';
import { PermissionsProvider } from '@/lib/PermissionsContext';
import AuditoriaCompleta from './pages/AuditoriaCompleta.jsx';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

setupIframeMessaging();

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();
  const [consentChecked, setConsentChecked] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);

  useEffect(() => {
    const checkConsent = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) { setConsentChecked(true); return; }

        // gestor_master e admin nunca precisam de gates
        if (['admin', 'gestor_master', 'Administrador Master'].includes(user.role)) {
          setConsentChecked(true);
          return;
        }

        const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
        const profile = profiles[0];
        // Só pede consentimento se: perfil existe, nunca aceitou, e ainda não trocou a senha
        if (profile && !profile.consent_accepted_at && !profile.password_changed) {
          setNeedsConsent(true);
        } else if (profile && profile.status === "pending_password_change" && !profile.password_changed) {
          setNeedsPasswordChange(true);
        }
      } catch {}
      setConsentChecked(true);
    };
    if (isAuthenticated) checkConsent();
    else setConsentChecked(true);
  }, [isAuthenticated]);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth || !consentChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Gate de consentimento LGPD
  if (needsConsent) {
    return <ConsentForm onConsented={() => setNeedsConsent(false)} />;
  }

  // Gate de troca de senha obrigatória no primeiro acesso
  if (needsPasswordChange) {
    return <TrocarSenha onPasswordChanged={() => setNeedsPasswordChange(false)} />;
  }

  // Render the main app
  return (
    <Routes>
      {/* Rotas públicas (sem layout) */}
      <Route path="/CertificateSign" element={<CertificateSign />} />
      <Route path="/ContractSign" element={<ContractSign />} />
      <Route path="/CertificateValidate" element={<CertificateValidate />} />
      <Route path="/StudentPortal" element={<StudentPortal />} />
      <Route path="/AttendanceConfirm" element={<AttendanceConfirm />} />
      <Route path="/CompanyPortal" element={<CompanyPortal />} />
      <Route path="/AcessoNegado" element={<AcessoNegado />} />
      <Route path="/AutoCadastroAluno" element={<AutoCadastroAluno />} />
      <Route path="/GestaoContratos" element={<LayoutWrapper currentPageName="GestaoContratos"><ProtectedRoute pageKey="Gestão de Contratos"><GestaoContratos /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
      <Route path="/DashboardComercial" element={<LayoutWrapper currentPageName="DashboardComercial"><ProtectedRoute pageKey="Dashboard Comercial"><DashboardComercial /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/GestaoLeads" element={<LayoutWrapper currentPageName="DashboardComercial"><ProtectedRoute pageKey="Dashboard Comercial"><DashboardComercial /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/BaseConhecimento" element={<LayoutWrapper currentPageName="DashboardComercial"><ProtectedRoute pageKey="Dashboard Comercial"><DashboardComercial /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/Analytics" element={<LayoutWrapper currentPageName="Analytics"><ProtectedRoute pageKey="Dashboard de Relatórios"><Analytics /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/AccessLog" element={<LayoutWrapper currentPageName="AccessLog"><ProtectedRoute pageKey="Log de Acesso"><AccessLog /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/AuditoriaCompleta" element={<LayoutWrapper currentPageName="AuditoriaCompleta"><ProtectedRoute pageKey="Auditoria Completa"><AuditoriaCompleta /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/ProposalEntry" element={<LayoutWrapper currentPageName="ProposalEntry"><ProtectedRoute pageKey="Entrada de Propostas"><ProposalEntry /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/GestaoBMM" element={<LayoutWrapper currentPageName="GestaoBMM"><ProtectedRoute pageKey="Gestão de BMM"><GestaoBMM /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/GestaoAlunosIndividuais" element={<LayoutWrapper currentPageName="GestaoAlunosIndividuais"><ProtectedRoute pageKey="Alunos Individuais (PF)"><GestaoAlunosIndividuais /></ProtectedRoute></LayoutWrapper>} />

      {/* Rotas autenticadas com layout */}
      <Route path="/" element={<LayoutWrapper currentPageName="Dashboard"><ProtectedRoute pageKey="Dashboard"><DashboardCentral /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/Dashboard" element={<LayoutWrapper currentPageName="Dashboard"><ProtectedRoute pageKey="Dashboard"><DashboardCentral /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/DashboardCentral" element={<LayoutWrapper currentPageName="Dashboard"><ProtectedRoute pageKey="Dashboard"><DashboardCentral /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/CertificateEmissao" element={<LayoutWrapper currentPageName="CertificateEmissao"><ProtectedRoute pageKey="Certificações"><CertificateEmissao /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/DigitalSignatures" element={<LayoutWrapper currentPageName="DigitalSignatures"><ProtectedRoute pageKey="Assinaturas Digitais"><DigitalSignatures /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/AlertasConfig" element={<LayoutWrapper currentPageName="AlertasConfig"><AlertasConfig /></LayoutWrapper>} />
      <Route path="/AgendaTreinamentos" element={<LayoutWrapper currentPageName="AgendaTreinamentos"><ProtectedRoute pageKey="Agenda de Treinamentos"><AgendaTreinamentos /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/AdminDashboard" element={<LayoutWrapper currentPageName="AdminDashboard"><ProtectedRoute pageKey="Dashboard Admin"><AdminDashboard /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/CertificateAuditPanel" element={<LayoutWrapper currentPageName="CertificateAuditPanel"><ProtectedRoute pageKey="Auditoria de Certificados"><CertificateAuditPanel /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/Certificacoes" element={<LayoutWrapper currentPageName="Certificacoes"><ProtectedRoute pageKey="Certificações"><Certificacoes /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/DashboardMaster" element={<LayoutWrapper currentPageName="DashboardMaster"><ProtectedRoute pageKey="Dashboard"><DashboardMaster /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/DashboardOperacional" element={<LayoutWrapper currentPageName="DashboardOperacional"><ProtectedRoute pageKey="Dashboard"><DashboardOperacional /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/DashboardOperacionalV2" element={<LayoutWrapper currentPageName="DashboardOperacionalV2"><ProtectedRoute pageKey="Dashboard Operacional"><DashboardOperacionalV2 /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/DashboardFinanceiro" element={<LayoutWrapper currentPageName="DashboardFinanceiro"><ProtectedRoute pageKey="Dashboard Financeiro"><DashboardFinanceiro /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/DashboardCertificacao" element={<LayoutWrapper currentPageName="DashboardCertificacao"><ProtectedRoute pageKey="Dashboard"><DashboardCertificacao /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/DashboardInstrutor" element={<LayoutWrapper currentPageName="DashboardInstrutor"><ProtectedRoute pageKey="Dashboard"><DashboardInstrutor /></ProtectedRoute></LayoutWrapper>} />
      {Object.entries(Pages).map(([path, Page]) => {
        // Mapeamento de path para chave de permissão do menu
        const PAGE_PERMISSION_KEYS = {
          AuditLog: "Log de Auditoria",
          Schedule: "Cronograma",
          AttendanceCall: "Chamada Presencial",
          CertDesigner: "Designer de Certificados",
          CertificateAlerts: "Alertas de Vencimento",
          CommunicationCenter: "Central de Comunicação",
          Companies: "Empresas",
          Contractors: "Contratadas",
          Courses: "Cursos",
          Instructors: "Instrutores",
          Users: "Usuários",
        };
        const pageKey = PAGE_PERMISSION_KEYS[path];
        return (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <ProtectedRoute pageKey={pageKey || path}>
                  <Page />
                </ProtectedRoute>
              </LayoutWrapper>
            }
          />
        );
      })}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <PermissionsProvider>
            <AuthenticatedApp />
          </PermissionsProvider>
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
```

---

## Arquivo: layout.jsx - Layout Principal

```javascript
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, Calendar, Users, BookOpen, Upload, BarChart3, FileText,
  Building2, UserCog, Mail, Bell, Award,
  TrendingUp, PenLine, Settings, Target, MessageSquare, ShieldAlert, Shield
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
];

const ROLE_LABEL = {
  admin: "Administrador",
  gestor_master: "Gestor Master",
  editor: "Editor",
  cliente: "Cliente",
  personalizado: "Personalizado",
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
```

---

## Arquivo: lib/PermissionsContext.jsx - Gerenciamento de Permissões

```javascript
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// ─── TODOS OS MÓDULOS DO SISTEMA ────────────────────────────────────────────
export const ALL_MODULES = [
  // Geral
  "Dashboard",
  "Cronograma",
  "Agenda de Treinamentos",
  "Chamada Presencial",
  // Operacional
  "Entrada de Propostas",
  "Gestão de BMM",
  "Instrutores",
  "Empresas",
  "Contratadas",
  "Cursos",
  "Alunos Individuais (PF)",
  "Gestão de Contratos",
  "Dashboard Operacional",
  "Dashboard Financeiro",
  // Certificações
  "Certificações",
  "Alertas de Vencimento",
  "Designer de Certificados",
  "Assinaturas Digitais",
  "Auditoria de Certificados",
  // Comercial
  "Dashboard Comercial",
  // Comunicação
  "Central de Comunicação",
  // Relatórios
  "Dashboard de Relatórios",
  "Dashboard Admin",
  // Administração
  "Usuários",
  "Log de Auditoria",
  "Auditoria Completa",
  "Log de Acesso",
];

// Mapa de chaves de rota → chave de módulo (para ProtectedRoute)
export const ROUTE_TO_MODULE = {
  "Schedule": "Cronograma",
  "AttendanceCall": "Chamada Presencial",
  "CertDesigner": "Designer de Certificados",
  "CertificateAlerts": "Alertas de Vencimento",
  "CommunicationCenter": "Central de Comunicação",
  "Companies": "Empresas",
  "Contractors": "Contratadas",
  "Courses": "Cursos",
  "Instructors": "Instrutores",
  "Users": "Usuários",
  "AuditLog": "Log de Auditoria",
};

// Módulos bloqueados para perfil Editor
const ADMIN_MODULES = [
  "Usuários",
  "Log de Auditoria",
  "Auditoria Completa",
  "Log de Acesso",
  "Dashboard Admin",
];

// Módulos do perfil Cliente
const CLIENT_MODULES = ["Dashboard", "Certificações", "Alertas de Vencimento"];

// Módulos do perfil Editor (tudo exceto Administração)
const EDITOR_MODULES = ALL_MODULES.filter(m => !ADMIN_MODULES.includes(m));

// ─── CONTEXT ────────────────────────────────────────────────────────────────
const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  const [role, setRole] = useState(null);
  // null = acesso total (gestor_master / admin da plataforma)
  // array = lista exata de módulos permitidos
  const [allowedKeys, setAllowedKeys] = useState(null);
  const [loading, setLoading] = useState(true);
  // Cache local com TTL de 5 minutos para evitar recarregamentos desnecessários
  const [permissionCache, setPermissionCache] = useState({ data: null, timestamp: null });

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // CACHE: Se houver dados em cache e ainda válidos (< 5 min), usar cache
      const now = Date.now();
      if (permissionCache.data && permissionCache.timestamp && (now - permissionCache.timestamp) < 300000) {
        setRole(permissionCache.data.role);
        setAllowedKeys(permissionCache.data.allowedKeys);
        setLoading(false);
        return;
      }

      // PASSO 1: Verificar autenticação
      let u;
      try {
        u = await base44.auth.me();
      } catch {
        setAllowedKeys([]);
        setLoading(false);
        return;
      }

      if (!u) {
        setAllowedKeys([]);
        setLoading(false);
        return;
      }

      // PASSO 2: Admin da plataforma Base44 = acesso total
      if (u.role === "admin") {
        setRole("admin");
        setAllowedKeys(null);
        setPermissionCache({ data: { role: "admin", allowedKeys: null }, timestamp: Date.now() });
        setLoading(false);
        return;
      }

      // PASSO 3: Buscar perfil SEMPRE do servidor, sem cache
      // Pega o mais recente (updated_date desc) para evitar usar perfil duplicado/antigo
      let profile = null;
      try {
        const profiles = await base44.entities.UserProfile.filter({ user_email: u.email }, "-updated_date", 10);
        // Prioriza perfil com role definido; fallback para o mais recente
        profile = profiles.find(p => p.role) || profiles[0] || null;
      } catch {
        // Se falhar a busca, nega acesso por segurança
        setAllowedKeys([]);
        setLoading(false);
        return;
      }

      if (!profile) {
        // Usuário sem perfil = acesso mínimo
        setRole("cliente");
        setAllowedKeys(CLIENT_MODULES);
        setPermissionCache({ data: { role: "cliente", allowedKeys: CLIENT_MODULES }, timestamp: Date.now() });
        setLoading(false);
        return;
      }

      const profileRole = profile.role || "cliente";
      setRole(profileRole);

      // PASSO 4: Aplicar regras por perfil
      let finalAllowedKeys = null;
      if (profileRole === "gestor_master") {
        // Acesso total irrestrito
        finalAllowedKeys = null;
      } else if (profileRole === "editor") {
        // Tudo exceto Administração
        finalAllowedKeys = EDITOR_MODULES;
      } else if (profileRole === "cliente") {
        // Apenas Dashboard, Certificações, Alertas
        finalAllowedKeys = CLIENT_MODULES;
      } else if (profileRole === "personalizado") {
        // Lista definida manualmente pelo admin
        const perms = profile.permissions || [];
        finalAllowedKeys = perms.length > 0 ? perms : [];
      } else {
        // Qualquer outro perfil legado: usar permissões salvas ou lista vazia
        const perms = profile.permissions || [];
        finalAllowedKeys = perms.length > 0 ? perms : [];
      }
      
      setAllowedKeys(finalAllowedKeys);
      // Cache o resultado por 5 minutos
      setPermissionCache({ data: { role: profileRole, allowedKeys: finalAllowedKeys }, timestamp: Date.now() });
    } catch {
      setAllowedKeys([]);
    } finally {
      setLoading(false);
    }
  }, [permissionCache]);

  useEffect(() => {
    load();

    // Recarrega quando admin salvar permissões (mesma janela)
    const handler = () => load();
    window.addEventListener("permissions-updated", handler);
    
    // Recarrega imediatamente quando permissões são alteradas
    const forceReloadHandler = () => load(true);
    window.addEventListener("permissions-force-reload", forceReloadHandler);

    // Polling a cada 30 segundos (balanço entre segurança e performance)
    const interval = setInterval(() => load(false), 30000);

    return () => {
      window.removeEventListener("permissions-updated", handler);
      window.removeEventListener("permissions-force-reload", forceReloadHandler);
      clearInterval(interval);
    };
  }, [load]);

  const hasPermission = useCallback((key) => {
    if (allowedKeys === null) return true;
    if (!Array.isArray(allowedKeys)) return false;
    return allowedKeys.includes(key);
  }, [allowedKeys]);

  const refreshPermissions = useCallback(() => {
    load(false);
  }, [load]);

  return (
    <PermissionsContext.Provider value={{ role, allowedKeys, loading, hasPermission, reload: load, refreshPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions deve ser usado dentro de PermissionsProvider");
  return ctx;
}
```

---

## Arquivo: lib/AuthContext.jsx - Gerenciamento de Autenticação

```javascript
import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

// Grava tentativa de acesso com falha
const logAccessEvent = async (eventType, reason, userEmail) => {
  try {
    await base44.entities.AccessLog.create({
      event_type: eventType,
      reason: reason,
      user_email: userEmail || null,
      user_agent: navigator.userAgent,
    });
  } catch { /* silencioso — não bloquear o fluxo */ }
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `${appParams.serverUrl}/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({ type: 'auth_required', message: 'Authentication required' });
            logAccessEvent('login_failed', 'auth_required', null);
          } else if (reason === 'user_not_registered') {
            setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
            logAccessEvent('not_registered', 'user_not_registered', null);
          } else {
            setAuthError({ type: reason, message: appError.message });
            logAccessEvent('login_failed', reason, null);
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
        logAccessEvent('token_expired', 'token_expired', null);
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null); // Limpa erros ao fazer logout
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

---

## Estrutura de Arquivos Recomendada

```
src/
├── App.jsx                          # Roteador principal
├── layout.jsx                       # Layout com sidebar
├── index.css                        # Design tokens CSS
├── tailwind.config.js               # Configuração Tailwind
│
├── lib/
│   ├── PermissionsContext.jsx       # Gerenciamento de permissões
│   ├── AuthContext.jsx              # Gerenciamento de autenticação
│   ├── app-params.js                # Parâmetros da aplicação
│   ├── query-client.js              # Configuração React Query
│   ├── utils.js                     # Utilitários gerais
│   ├── iframe-messaging.js          # Comunicação iframe
│   ├── billingCalculations.js       # Cálculos de faturamento
│   ├── NavigationTracker.jsx        # Rastreamento de navegação
│   ├── PageNotFound.jsx             # Página 404
│   └── VisualEditAgent.jsx          # Agente visual
│
├── api/
│   ├── base44Client.js              # Cliente Base44 inicializado
│   └── entities.js                  # Definições de entidades
│
├── components/
│   ├── ProtectedRoute.jsx           # Proteção de rotas
│   ├── UserNotRegisteredError.jsx   # Erro de usuário não registrado
│   │
│   ├── ui/                          # Componentes shadcn/ui
│   │   ├── button.jsx
│   │   ├── card.jsx
│   │   ├── input.jsx
│   │   ├── label.jsx
│   │   ├── badge.jsx
│   │   ├── tabs.jsx
│   │   ├── dialog.jsx
│   │   ├── select.jsx
│   │   └── ... (outros componentes)
│   │
│   ├── notifications/
│   │   └── NotificationBell.jsx
│   │
│   ├── company/
│   │   ├── CompanyForm.jsx
│   │   ├── LogoUploader.jsx
│   │   ├── BulkCoursesUploader.jsx
│   │   └── ... (componentes de empresa)
│   │
│   ├── certificates/
│   │   ├── CertificatePreview.jsx
│   │   ├── CertificateStatusBadge.jsx
│   │   ├── CertificateDownloader.jsx
│   │   ├── CertificateEmissaoIndividual.jsx
│   │   └── ... (componentes de certificado)
│   │
│   ├── bmm/
│   │   ├── BMMPreview.jsx
│   │   ├── BMMEditor.jsx
│   │   ├── BMMEmailSender.jsx
│   │   ├── BMMExporter.jsx
│   │   └── ExcedentesDetailBlock.jsx
│   │
│   ├── students/
│   │   ├── StudentForm.jsx
│   │   ├── StudentList.jsx
│   │   ├── StudentBulkImport.jsx
│   │   └── ... (componentes de aluno)
│   │
│   └── ... (outros componentes)
│
├── pages/
│   ├── DashboardCentral.jsx         # Dashboard principal
│   ├── GestaoBMM.jsx                # Gestão de BMM
│   ├── ProposalEntry.jsx            # Entrada de propostas
│   ├── Certificacoes.jsx            # Gestão de certificados
│   ├── Companies.jsx                # Gestão de empresas
│   ├── Courses.jsx                  # Gestão de cursos
│   ├── Users.jsx                    # Gestão de usuários
│   ├── Schedule.jsx                 # Cronograma de turmas
│   ├── GestaoAlunosIndividuais.jsx  # Gestão de alunos PF
│   ├── GestaoContratos.jsx          # Gestão de contratos
│   ├── CertificateSign.jsx          # Assinatura de certificados
│   ├── ContractSign.jsx             # Assinatura de contratos
│   ├── StudentPortal.jsx            # Portal do aluno
│   ├── CompanyPortal.jsx            # Portal da empresa
│   └── ... (outras páginas)
│
├── entities/
│   ├── Company.json                 # Schema de empresa
│   ├── Certificate.json             # Schema de certificado
│   ├── Contract.json                # Schema de contrato
│   ├── BMMRecord.json               # Schema de BMM
│   ├── ClassSchedule.json           # Schema de turma
│   ├── UserProfile.json             # Schema de perfil
│   ├── AuditLog.json                # Schema de auditoria
│   ├── Proposal.json                # Schema de proposta
│   └── ... (outras entidades)
│
├── functions/
│   ├── registrarAlteracao.js        # Auditoria de mudanças
│   ├── validarIntegridadeDados.js   # Validação de integridade
│   ├── calcularExcedenteTurma.js    # Cálculo de excedentes
│   ├── gerarContrato.js             # Geração de contratos
│   ├── processProposal.js           # Processamento de propostas com IA
│   ├── enviarCertificadoWhatsApp.js # Envio WhatsApp
│   ├── sendBMMEmailUOL.js           # Envio de BMM por email
│   └── ... (outras funções)
│
├── hooks/
│   ├── usePermissions.js            # Hook de permissões
│   ├── useUserRole.js               # Hook de role do usuário
│   └── ... (outros hooks)
│
├── agents/
│   ├── assistente_cadastros.json    # Agente de cadastros
│   └── comercial_ia.json            # Agente comercial
│
├── index.html                       # Documento HTML principal
└── main.jsx                         # Entry point React
```

---

**Fim do Código Completo**

Total: 3 arquivos principais + 50+ páginas + 20+ entidades + 50+ funções backend + 100+ componentes