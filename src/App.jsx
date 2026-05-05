import './App.css'
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
import CertificateValidate from './pages/CertificateValidate';
import CertificateEmissao from './pages/CertificateEmissao';
import StudentPortal from './pages/StudentPortal';
import AttendanceConfirm from './pages/AttendanceConfirm';
import DigitalSignatures from './pages/DigitalSignatures';
import AlertasConfig from './pages/AlertasConfig';
import AgendaTreinamentos from './pages/AgendaTreinamentos';
import ConfigNotificacoes from './pages/ConfigNotificacoes';
import AdminDashboard from './pages/AdminDashboard';
import LogNotificacoes from './pages/LogNotificacoes';
import CertificateAuditPanel from './pages/CertificateAuditPanel';
import Certificacoes from './pages/Certificacoes';
import CompanyPortal from './pages/CompanyPortal';
import DashboardOperacional from './pages/DashboardOperacional';
import DashboardFinanceiro from './pages/DashboardFinanceiro';
import DashboardCertificacao from './pages/DashboardCertificacao';
import DashboardMaster from './pages/DashboardMaster';
import DashboardInstrutor from './pages/DashboardInstrutor';
import AcessoNegado from './pages/AcessoNegado';
import ProposalEntry from './pages/ProposalEntry';
import DashboardComercial from './pages/DashboardComercial.jsx';
import GestaoBMM from './pages/GestaoBMM.jsx';
import GestaoAlunosIndividuais from './pages/GestaoAlunosIndividuais.jsx';
import GestaoLeads from './pages/GestaoLeads.jsx';
import ContasSociais from './pages/ContasSociais.jsx';
import BaseConhecimento from './pages/BaseConhecimento.jsx';
import CaixaEntrada from './pages/CaixaEntrada.jsx';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

setupIframeMessaging();

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
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

  // Render the main app
  return (
    <Routes>
      {/* Rotas públicas (sem layout) */}
      <Route path="/CertificateSign" element={<CertificateSign />} />
      <Route path="/CertificateValidate" element={<CertificateValidate />} />
      <Route path="/StudentPortal" element={<StudentPortal />} />
      <Route path="/AttendanceConfirm" element={<AttendanceConfirm />} />
      <Route path="/CompanyPortal" element={<CompanyPortal />} />
      <Route path="/AcessoNegado" element={<AcessoNegado />} />
      <Route path="/DashboardComercial" element={<LayoutWrapper currentPageName="DashboardComercial"><DashboardComercial /></LayoutWrapper>} />
      <Route path="/GestaoLeads" element={<LayoutWrapper currentPageName="GestaoLeads"><GestaoLeads /></LayoutWrapper>} />
      <Route path="/ContasSociais" element={<LayoutWrapper currentPageName="ContasSociais"><ContasSociais /></LayoutWrapper>} />
      <Route path="/BaseConhecimento" element={<LayoutWrapper currentPageName="BaseConhecimento"><BaseConhecimento /></LayoutWrapper>} />
      <Route path="/CaixaEntrada" element={<LayoutWrapper currentPageName="CaixaEntrada"><CaixaEntrada /></LayoutWrapper>} />
      <Route path="/ProposalEntry" element={<LayoutWrapper currentPageName="ProposalEntry"><ProposalEntry /></LayoutWrapper>} />
      <Route path="/GestaoBMM" element={<LayoutWrapper currentPageName="GestaoBMM"><GestaoBMM /></LayoutWrapper>} />
      <Route path="/GestaoAlunosIndividuais" element={<LayoutWrapper currentPageName="GestaoAlunosIndividuais"><GestaoAlunosIndividuais /></LayoutWrapper>} />

      {/* Rotas autenticadas com layout */}
      <Route path="/" element={<LayoutWrapper currentPageName={mainPageKey}><MainPage /></LayoutWrapper>} />
      <Route path="/Dashboard" element={<LayoutWrapper currentPageName="Dashboard"><DashboardMaster /></LayoutWrapper>} />
      <Route path="/CertificateEmissao" element={<LayoutWrapper currentPageName="CertificateEmissao"><CertificateEmissao /></LayoutWrapper>} />
      <Route path="/DigitalSignatures" element={<LayoutWrapper currentPageName="DigitalSignatures"><DigitalSignatures /></LayoutWrapper>} />
      <Route path="/AlertasConfig" element={<LayoutWrapper currentPageName="AlertasConfig"><AlertasConfig /></LayoutWrapper>} />
      <Route path="/AgendaTreinamentos" element={<LayoutWrapper currentPageName="AgendaTreinamentos"><AgendaTreinamentos /></LayoutWrapper>} />
      <Route path="/ConfigNotificacoes" element={<LayoutWrapper currentPageName="ConfigNotificacoes"><ConfigNotificacoes /></LayoutWrapper>} />
      <Route path="/AdminDashboard" element={<LayoutWrapper currentPageName="AdminDashboard"><AdminDashboard /></LayoutWrapper>} />
      <Route path="/LogNotificacoes" element={<LayoutWrapper currentPageName="LogNotificacoes"><LogNotificacoes /></LayoutWrapper>} />
      <Route path="/CertificateAuditPanel" element={<LayoutWrapper currentPageName="CertificateAuditPanel"><CertificateAuditPanel /></LayoutWrapper>} />
      <Route path="/Certificacoes" element={<LayoutWrapper currentPageName="Certificacoes"><Certificacoes /></LayoutWrapper>} />
      <Route path="/DashboardMaster" element={<LayoutWrapper currentPageName="DashboardMaster"><DashboardMaster /></LayoutWrapper>} />
      <Route path="/DashboardOperacional" element={<LayoutWrapper currentPageName="DashboardOperacional"><DashboardOperacional /></LayoutWrapper>} />
      <Route path="/DashboardFinanceiro" element={<LayoutWrapper currentPageName="DashboardFinanceiro"><DashboardFinanceiro /></LayoutWrapper>} />
      <Route path="/DashboardCertificacao" element={<LayoutWrapper currentPageName="DashboardCertificacao"><DashboardCertificacao /></LayoutWrapper>} />
      <Route path="/DashboardInstrutor" element={<LayoutWrapper currentPageName="DashboardInstrutor"><DashboardInstrutor /></LayoutWrapper>} />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route key={path} path={`/${path}`} element={<LayoutWrapper currentPageName={path}><Page /></LayoutWrapper>} />
      ))}
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
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App