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
import PortalAluno from './pages/PortalAluno.jsx';
import AttendanceConfirm from './pages/AttendanceConfirm';
import DigitalSignatures from './pages/DigitalSignatures';
import AlertasConfig from './pages/AlertasConfig';
import AgendaTreinamentos from './pages/AgendaTreinamentos';
import AdminDashboard from './pages/AdminDashboard';
import CertificateAuditPanel from './pages/CertificateAuditPanel';
import Certificacoes from './pages/Certificacoes';
import CompanyPortal from './pages/CompanyPortal';
import DashboardOperacional from './pages/DashboardOperacional';
import DashboardFinanceiro from './pages/DashboardFinanceiro';
import DashboardCertificacao from './pages/DashboardCertificacao';
import DashboardMaster from './pages/DashboardMaster';
import DashboardInstrutor from './pages/DashboardInstrutor';
import DashboardCentral from './pages/DashboardCentral';
import AcessoNegado from './pages/AcessoNegado';
import ProposalEntry from './pages/ProposalEntry';
import DashboardComercial from './pages/DashboardComercial.jsx';
import GestaoBMM from './pages/GestaoBMM.jsx';
import GestaoAlunosIndividuais from './pages/GestaoAlunosIndividuais.jsx';
import GestaoAcademicaEmpresas from './pages/GestaoAcademicaEmpresas.jsx';
import AutoCadastroAluno from './pages/AutoCadastroAluno.jsx';
import InscricaoAluno from './pages/InscricaoAluno.jsx';
import GestaoContratos from './pages/GestaoContratos.jsx';
import ConsentForm from './pages/ConsentForm.jsx';
import TrocarSenha from './pages/TrocarSenha.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';
import Analytics from './pages/Analytics.jsx';
import AccessLog from './pages/AccessLog.jsx';
import ProtectedRoute from './components/ProtectedRoute';
import PostLoginGate from './components/auth/PostLoginGate';
import { PermissionsProvider, usePermissions } from '@/lib/PermissionsContext';
import { logAccessDenied } from '@/lib/accessLogger';
import AuditoriaCompleta from './pages/AuditoriaCompleta.jsx';
import BackupDownload from './pages/BackupDownload.jsx';
import PortalInstrutor from './pages/PortalInstrutor.jsx';
import ProntuarioDigital from './pages/ProntuarioDigital.jsx';
import GestaoDocumentosAluno from './pages/GestaoDocumentosAluno.jsx';
import Homologacoes from './pages/Homologacoes.jsx';
import MatrizTreinamentos from './pages/MatrizTreinamentos.jsx';
import DossieHomologacao from './pages/DossieHomologacao.jsx';
import FinanceiroHub from './pages/FinanceiroHub.jsx';
import AtivarAcesso from './pages/AtivarAcesso.jsx';
import ComunicacaoAdmin from './pages/ComunicacaoAdmin.jsx';
import DiagnosticoAcesso from './pages/DiagnosticoAcesso.jsx';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

setupIframeMessaging();

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();
  const { profile, loading: permissionsLoading, reload: reloadPermissions } = usePermissions();
  const [consentChecked, setConsentChecked] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);

  useEffect(() => {
    setNeedsConsent(false);
    setNeedsPasswordChange(false);
    if (!isAuthenticated) {
      setConsentChecked(true);
      return;
    }
    if (permissionsLoading) {
      setConsentChecked(false);
      return;
    }
    if (profile && !profile._access_error) {
      if (profile.status === "pending_password_change" && !profile.password_changed) {
        setNeedsPasswordChange(true);
      } else if (!["admin", "gestor_master"].includes(profile.role) && !profile.consent_accepted_at) {
        setNeedsConsent(true);
      }
    }
    setConsentChecked(true);
  }, [isAuthenticated, permissionsLoading, profile]);

  // Log de Acesso: registra tentativas de login negadas
  useEffect(() => {
    if (authError?.type === 'user_not_registered') {
      logAccessDenied('not_registered', 'Usuário autenticado mas não cadastrado no sistema');
    }
  }, [authError]);

  if (isLoadingPublicSettings || isLoadingAuth || permissionsLoading || !consentChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  if (needsConsent) {
    return <ConsentForm onConsented={() => {
      setNeedsConsent(false);
      setNeedsPasswordChange(true);
    }} />;
  }

  if (needsPasswordChange) {
    return <TrocarSenha onPasswordChanged={async () => {
      setNeedsPasswordChange(false);
      await reloadPermissions(true);
      window.location.assign("/");
    }} />;
  }

  return (
    <Routes>
      {/* Rotas públicas (sem layout) */}
      <Route path="/CertificateSign" element={<CertificateSign />} />
      <Route path="/ContractSign" element={<ContractSign />} />
      <Route path="/CertificateValidate" element={<CertificateValidate />} />
      <Route path="/StudentPortal" element={<StudentPortal />} />
      <Route path="/PortalAluno" element={<PortalAluno />} />
      <Route path="/AttendanceConfirm" element={<AttendanceConfirm />} />
      <Route path="/CompanyPortal" element={<CompanyPortal />} />
      <Route path="/AcessoNegado" element={<AcessoNegado />} />
      <Route path="/AutoCadastroAluno" element={<AutoCadastroAluno />} />
      <Route path="/InscricaoAluno" element={<InscricaoAluno />} />
      <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
      <Route path="/PortalInstrutor" element={<PortalInstrutor />} />
      <Route path="/ativar-acesso" element={<AtivarAcesso />} />
      <Route path="/AtivarAcesso" element={<AtivarAcesso />} />

      {/* Rotas autenticadas com layout */}
      <Route path="/" element={<PostLoginGate />} />
      <Route path="/Dashboard" element={<LayoutWrapper currentPageName="Dashboard"><ProtectedRoute pageKey="Dashboard"><DashboardCentral /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/DashboardCentral" element={<LayoutWrapper currentPageName="Dashboard"><ProtectedRoute pageKey="Dashboard"><DashboardCentral /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/GestaoContratos" element={<LayoutWrapper currentPageName="GestaoContratos"><ProtectedRoute pageKey="Gestão de Contratos"><GestaoContratos /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/DashboardComercial" element={<LayoutWrapper currentPageName="DashboardComercial"><ProtectedRoute pageKey="Dashboard Comercial"><DashboardComercial /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/GestaoLeads" element={<LayoutWrapper currentPageName="DashboardComercial"><ProtectedRoute pageKey="Dashboard Comercial"><DashboardComercial /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/Analytics" element={<LayoutWrapper currentPageName="Analytics"><ProtectedRoute pageKey="Dashboard de Relatórios"><Analytics /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/AccessLog" element={<LayoutWrapper currentPageName="AccessLog"><ProtectedRoute pageKey="Log de Acesso"><AccessLog /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/AuditoriaCompleta" element={<LayoutWrapper currentPageName="AuditoriaCompleta"><ProtectedRoute pageKey="Auditoria Completa"><AuditoriaCompleta /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/ProposalEntry" element={<LayoutWrapper currentPageName="ProposalEntry"><ProtectedRoute pageKey="Entrada de Propostas"><ProposalEntry /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/GestaoBMM" element={<LayoutWrapper currentPageName="GestaoBMM"><ProtectedRoute pageKey="Gestão de BMM"><GestaoBMM /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/GestaoAlunosIndividuais" element={<LayoutWrapper currentPageName="GestaoAlunosIndividuais"><ProtectedRoute pageKey={["Alunos Individuais (PF)", "Gestão Acadêmica Individual"]}><GestaoAlunosIndividuais /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/GestaoAcademicaEmpresas" element={<LayoutWrapper currentPageName="GestaoAcademicaEmpresas"><ProtectedRoute pageKey="Gestão Acadêmica Empresas"><GestaoAcademicaEmpresas /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/BackupDownload" element={<LayoutWrapper currentPageName="BackupDownload"><ProtectedRoute pageKey="BackupDownload"><BackupDownload /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/ProntuarioDigital" element={<LayoutWrapper currentPageName="ProntuarioDigital"><ProtectedRoute pageKey="ProntuarioDigital"><ProntuarioDigital /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/GestaoDocumentosAluno" element={<LayoutWrapper currentPageName="GestaoDocumentosAluno"><ProtectedRoute pageKey="GestaoDocumentosAluno"><GestaoDocumentosAluno /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/Homologacoes" element={<LayoutWrapper currentPageName="Homologacoes"><ProtectedRoute pageKey="Homologações"><Homologacoes /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/MatrizTreinamentos" element={<LayoutWrapper currentPageName="MatrizTreinamentos"><ProtectedRoute pageKey="Matriz de Treinamentos"><MatrizTreinamentos /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/Financeiro" element={<LayoutWrapper currentPageName="Financeiro"><ProtectedRoute pageKey="Financeiro"><FinanceiroHub /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/DossieHomologacao" element={<LayoutWrapper currentPageName="DossieHomologacao"><ProtectedRoute pageKey="DossieHomologacao"><DossieHomologacao /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/ComunicacaoAdmin" element={<LayoutWrapper currentPageName="ComunicacaoAdmin"><ProtectedRoute pageKey="comunicacao_admin"><ComunicacaoAdmin /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/DiagnosticoAcesso" element={<LayoutWrapper currentPageName="DiagnosticoAcesso"><ProtectedRoute pageKey="diagnostico_acesso"><DiagnosticoAcesso /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/CertificateEmissao" element={<LayoutWrapper currentPageName="CertificateEmissao"><ProtectedRoute pageKey="Certificações"><CertificateEmissao /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/DigitalSignatures" element={<LayoutWrapper currentPageName="DigitalSignatures"><ProtectedRoute pageKey="Assinaturas Digitais"><DigitalSignatures /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/AlertasConfig" element={<LayoutWrapper currentPageName="AlertasConfig"><ProtectedRoute pageKey="AlertasConfig"><AlertasConfig /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/AgendaTreinamentos" element={<LayoutWrapper currentPageName="AgendaTreinamentos"><ProtectedRoute pageKey="Agenda de Treinamentos"><AgendaTreinamentos /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/AdminDashboard" element={<LayoutWrapper currentPageName="AdminDashboard"><ProtectedRoute pageKey="Dashboard Admin"><AdminDashboard /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/CertificateAuditPanel" element={<LayoutWrapper currentPageName="CertificateAuditPanel"><ProtectedRoute pageKey="Auditoria de Certificados"><CertificateAuditPanel /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/Certificacoes" element={<LayoutWrapper currentPageName="Certificacoes"><ProtectedRoute pageKey="Certificações"><Certificacoes /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/DashboardMaster" element={<LayoutWrapper currentPageName="DashboardMaster"><ProtectedRoute pageKey="DashboardMaster"><DashboardMaster /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/DashboardOperacional" element={<LayoutWrapper currentPageName="DashboardOperacional"><ProtectedRoute pageKey="Dashboard Operacional"><DashboardOperacional /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/DashboardOperacionalV2" element={<LayoutWrapper currentPageName="DashboardOperacionalV2"><ProtectedRoute pageKey="Dashboard Operacional"><DashboardOperacional /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/DashboardFinanceiro" element={<LayoutWrapper currentPageName="DashboardFinanceiro"><ProtectedRoute pageKey="Dashboard Financeiro"><DashboardFinanceiro /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/DashboardCertificacao" element={<LayoutWrapper currentPageName="DashboardCertificacao"><ProtectedRoute pageKey="DashboardCertificacao"><DashboardCertificacao /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/DashboardInstrutor" element={<LayoutWrapper currentPageName="DashboardInstrutor"><ProtectedRoute pageKey="DashboardInstrutor"><DashboardInstrutor /></ProtectedRoute></LayoutWrapper>} />
      {Object.entries(Pages).map(([path, Page]) => {
        return (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <ProtectedRoute pageKey={path}>
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