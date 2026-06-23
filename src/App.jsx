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
import BackupDownload from './pages/BackupDownload.jsx';
import PortalInstrutor from './pages/PortalInstrutor.jsx';
import ProntuarioDigital from './pages/ProntuarioDigital.jsx';

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
      <Route path="/BackupDownload" element={<LayoutWrapper currentPageName="BackupDownload"><ProtectedRoute pageKey="Dashboard"><BackupDownload /></ProtectedRoute></LayoutWrapper>} />
      <Route path="/PortalInstrutor" element={<PortalInstrutor />} />
      <Route path="/ProntuarioDigital" element={<LayoutWrapper currentPageName="ProntuarioDigital"><ProtectedRoute pageKey="Dashboard"><ProntuarioDigital /></ProtectedRoute></LayoutWrapper>} />

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