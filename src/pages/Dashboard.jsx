import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

const ROLE_REDIRECT = {
  admin: "/DashboardMaster",
  "Administrador Master": "/DashboardMaster",
  Operacional: "/DashboardOperacional",
  Financeiro: "/DashboardFinanceiro",
  Certificacao: "/DashboardCertificacao",
  Instrutor: "/DashboardInstrutor",
  "Coordenador de Operações": "/DashboardOperacional",
  PortalEmpresa: "/CompanyPortal",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();

  useEffect(() => {
    if (!loading && role) {
      const path = ROLE_REDIRECT[role] || "/DashboardMaster";
      navigate(path, { replace: true });
    }
  }, [role, loading, navigate]);

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );
}