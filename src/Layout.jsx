import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { LayoutDashboard, Calendar, Users, BookOpen, Upload, BarChart3, FileText, Building2, UserCog, Mail, History, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import IAFloatingButton from "./components/IAFloatingButton";

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Buscar role customizada do instrutor
        if (currentUser.email) {
          const instructors = await base44.entities.Instructor.filter({ email: currentUser.email });
          if (instructors.length > 0) {
            setUserRole('Instrutor');
            return;
          }
        }
        
        // Usar role do sistema ou custom_role
        setUserRole(currentUser.custom_role || currentUser.role || 'user');
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
      }
    };
    loadUser();
  }, []);

  // Definir items de navegação baseado nas permissões do usuário
  const getNavigationItems = () => {
    const allItems = [
      {
        title: "Dashboard",
        url: createPageUrl("Dashboard"),
        icon: LayoutDashboard,
        key: "Dashboard"
      },
      {
        title: "Cronograma",
        url: createPageUrl("Schedule"),
        icon: Calendar,
        key: "Cronograma"
      },
      {
        title: "Instrutores",
        url: createPageUrl("Instructors"),
        icon: Users,
        key: "Instrutores"
      },
      {
        title: "Empresas",
        url: createPageUrl("Companies"),
        icon: Building2,
        key: "Empresas"
      },
      {
        title: "Contratadas",
        url: createPageUrl("Contractors"),
        icon: Building2,
        key: "Contratadas"
      },
      {
        title: "Cursos",
        url: createPageUrl("Courses"),
        icon: BookOpen,
        key: "Cursos"
      },
      {
        title: "Importar Excel",
        url: createPageUrl("Import"),
        icon: Upload,
        key: "Importar Excel"
      },
      {
        title: "Relatórios",
        url: createPageUrl("Reports"),
        icon: BarChart3,
        key: "Relatórios"
      },
      {
        title: "Gerar BMM",
        url: createPageUrl("BMMGenerator"),
        icon: FileText,
        key: "Gerar BMM"
      },
      {
        title: "Histórico BMM",
        url: createPageUrl("BMMHistory"),
        icon: History,
        key: "Histórico BMM"
      },
      {
        title: "Modelos E-mail",
        url: createPageUrl("EmailTemplates"),
        icon: Mail,
        key: "Modelos E-mail"
      },
      {
        title: "Central de Comunicação",
        url: createPageUrl("CommunicationCenter"),
        icon: Mail,
        key: "Central de Comunicação"
      },
      {
        title: "Usuários",
        url: createPageUrl("Users"),
        icon: UserCog,
        key: "Usuários"
      },
    ];

    // Se não há usuário, não mostrar nada
    if (!user) return [];
    
    // Administrador Master vê tudo
    if (userRole === 'Administrador Master' || userRole === 'admin') {
      return allItems;
    }
    
    // Outros usuários: filtrar baseado nas permissões
    const userPermissions = user.permissions || [];
    return allItems.filter(item => userPermissions.includes(item.key));
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-stone-50 to-stone-100">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-stone-200 shadow-sm">
        {/* Header */}
        <div className="p-6 border-b border-stone-200">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png" 
              alt="CAT Logo" 
              className="w-10 h-10 object-contain flex-shrink-0"
            />
            <div>
              <h2 className="font-bold text-stone-900 text-sm leading-tight">Sistema de<br/>Treinamento</h2>
            </div>
          </div>
          {userRole && (
            <div className="px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-xs font-semibold text-emerald-700">
                {userRole === 'Instrutor' && '👨‍🏫 Instrutor'}
                {userRole === 'Coordenador de Operações' && '⚙️ Coordenador'}
                {userRole === 'Financeiro' && '💰 Financeiro'}
                {(userRole === 'admin' || userRole === 'Administrador Master') && '👑 Administrador'}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <Link
                key={item.title}
                to={item.url}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  location.pathname === item.url
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">{item.title}</span>
              </Link>
            ))}
          </div>
        </nav>
      </aside>

      {/* Sidebar Mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <aside 
            className="w-64 bg-white h-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-stone-200">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png" 
                  alt="CAT Logo" 
                  className="w-10 h-10 object-contain"
                />
                <h2 className="font-bold text-stone-900 text-sm">Sistema de Treinamento</h2>
              </div>
              {userRole && (
                <div className="px-3 py-1.5 bg-emerald-50 rounded-lg">
                  <p className="text-xs font-semibold text-emerald-700">
                    {userRole === 'Instrutor' && '👨‍🏫 Instrutor'}
                    {userRole === 'Coordenador de Operações' && '⚙️ Coordenador'}
                    {userRole === 'Financeiro' && '💰 Financeiro'}
                    {(userRole === 'admin' || userRole === 'Administrador Master') && '👑 Administrador'}
                  </p>
                </div>
              )}
            </div>
            <nav className="p-3">
              <div className="space-y-1">
                {navigationItems.map((item) => (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      location.pathname === item.url
                        ? 'bg-emerald-500 text-white'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{item.title}</span>
                  </Link>
                ))}
              </div>
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-stone-200 px-4 py-3 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png" 
              alt="CAT Logo" 
              className="h-8 w-auto"
            />
            <h1 className="text-lg font-bold text-stone-900">CAT</h1>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
        
        <IAFloatingButton />
      </main>
    </div>
  );
}