import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

// Mapa de chave de permissão → rota
const PERMISSION_ROUTES = {
  "Dashboard": "/Dashboard",
  "Dashboard Comercial": "/DashboardComercial",
  "Dashboard Financeiro": "/DashboardFinanceiro",
  "Dashboard de Relatórios": "/Analytics",
  "Agenda de Treinamentos": "/AgendaTreinamentos",
  "Cronograma": "/Schedule",
  "Certificações": "/Certificacoes",
  "Caixa de Entrada": "/CaixaEntrada",
  "Gestão de Leads": "/GestaoLeads",
  "Alunos Individuais (PF)": "/GestaoAlunosIndividuais",
  "Gestão de BMM": "/GestaoBMM",
  "Entrada de Propostas": "/ProposalEntry",
  "Instrutores": "/Instructors",
  "Empresas": "/Companies",
  "Cursos": "/Courses",
  "Base de Conhecimento": "/BaseConhecimento",
  "Contas Sociais": "/ContasSociais",
};

export default function Home() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [redirecting, setRedirecting] = React.useState(false);

  useEffect(() => {
    const determineRedirect = async () => {
      if (isLoadingAuth) return;

      try {
        if (isAuthenticated && user) {
           setRedirecting(true);

           const userRole = user.role || 'user';

           // Admins vão direto para o DashboardMaster
           if (['admin', 'Administrador Master', 'gestor_master'].includes(userRole)) {
             navigate('/DashboardMaster');
             return;
           }

           // Busca o perfil para descobrir as permissões reais
           try {
             const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
             const profile = profiles.find(p => p.status === 'active') || profiles[0];
             const perms = profile?.permissions || [];

             if (perms.length > 0) {
               // Redireciona para a primeira rota que o usuário tem permissão
               for (const perm of perms) {
                 if (PERMISSION_ROUTES[perm]) {
                   navigate(PERMISSION_ROUTES[perm]);
                   return;
                 }
               }
             }
           } catch {
             // ignora e usa fallback
           }

           // Fallback padrão
           navigate('/Dashboard');
        } else {
          navigate('/StudentPortal');
        }
      } catch (err) {
        console.error('Erro ao determinar redirecionamento:', err);
        navigate('/Dashboard');
      }
    };

    determineRedirect();
  }, [isAuthenticated, isLoadingAuth, user, navigate]);

  // Tela de carregamento enquanto determina para onde redirecionar
  if (isLoadingAuth || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-gray-400 mx-auto" />
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return null;
}