import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

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
          
          // Detecta perfil do usuário e redireciona
          const userEmail = user.email;
          
          // Busca perfil do usuário
          const profiles = await base44.entities.UserProfile.filter({ 
            user_email: userEmail 
          });

          if (profiles.length > 0) {
            const profile = profiles[0];
            const role = profile.role || user.role;

            // Redireciona de acordo com o perfil
            const redirects = {
              'gestor_master': '/DashboardMaster',
              'Administrador Master': '/DashboardMaster',
              'admin': '/AdminDashboard',
              'editor': '/Dashboard',
              'cliente': '/StudentPortal'
            };

            const redirectPath = redirects[role] || '/Dashboard';
            navigate(redirectPath);
          } else {
            // Se não tem perfil, vai para dashboard padrão
            navigate('/Dashboard');
          }
        } else {
          // Não autenticado, redireciona para StudentPortal (público)
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