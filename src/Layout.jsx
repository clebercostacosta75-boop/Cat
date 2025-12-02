import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { LayoutDashboard, Calendar, Users, BookOpen, Upload, BarChart3, FileText, Building2, Bell, UserCog } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import IAFloatingButton from "./components/IAFloatingButton";

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

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

  // Definir items de navegação baseado no role
  const getNavigationItems = () => {
    const allItems = [
      {
        title: "Dashboard",
        url: createPageUrl("Dashboard"),
        icon: LayoutDashboard,
        roles: ['admin', 'Administrador Master', 'Financeiro', 'Instrutor']
      },
      {
        title: "Cronograma",
        url: createPageUrl("Schedule"),
        icon: Calendar,
        roles: ['admin', 'Administrador Master', 'Financeiro', 'Coordenador de Operações', 'Instrutor']
      },
      {
        title: "Instrutores",
        url: createPageUrl("Instructors"),
        icon: Users,
        roles: ['admin', 'Administrador Master', 'Financeiro', 'Coordenador de Operações']
      },
      {
        title: "Empresas",
        url: createPageUrl("Companies"),
        icon: Building2,
        roles: ['admin', 'Administrador Master', 'Financeiro', 'Coordenador de Operações']
      },
      {
        title: "Contratadas",
        url: createPageUrl("Contractors"),
        icon: Building2,
        roles: ['admin', 'Administrador Master', 'Financeiro', 'Coordenador de Operações']
      },
      {
        title: "Cursos",
        url: createPageUrl("Courses"),
        icon: BookOpen,
        roles: ['admin', 'Administrador Master', 'Financeiro', 'Coordenador de Operações']
      },
      {
        title: "Notificações",
        url: createPageUrl("NotificationCenter"),
        icon: Bell,
        roles: ['admin', 'Administrador Master', 'Financeiro']
      },
      {
        title: "Gerar BMM",
        url: createPageUrl("GenerateBMM"),
        icon: FileText,
        roles: ['admin', 'Administrador Master', 'Financeiro']
      },
      {
        title: "Importar Excel",
        url: createPageUrl("Import"),
        icon: Upload,
        roles: ['admin', 'Administrador Master', 'Financeiro', 'Coordenador de Operações']
      },
      {
        title: "Relatórios",
        url: createPageUrl("Reports"),
        icon: BarChart3,
        roles: ['admin', 'Administrador Master', 'Financeiro', 'Coordenador de Operações']
      },
      {
        title: "Usuários",
        url: createPageUrl("Users"),
        icon: UserCog,
        roles: ['admin', 'Administrador Master', 'Financeiro']
      },
      ];

    // Filtrar items baseado no role do usuário
    if (!userRole) return [];
    
    return allItems.filter(item => 
      item.roles.includes(userRole) || item.roles.includes('admin')
    );
  };

  const navigationItems = getNavigationItems();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#FAFAF9]">
        <Sidebar className="border-r border-stone-200">
          <SidebarHeader className="border-b border-stone-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png" 
                  alt="CAT Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h2 className="font-bold text-stone-900">Sistema de Treinamento</h2>
                <p className="text-xs text-stone-500">
                  {userRole === 'Instrutor' && '👨‍🏫 Instrutor'}
                  {userRole === 'Coordenador de Operações' && '⚙️ Coordenador'}
                  {userRole === 'Financeiro' && '💰 Financeiro'}
                  {(userRole === 'admin' || userRole === 'Administrador Master') && '👑 Administrador'}
                </p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-stone-500 uppercase tracking-wider px-2 py-2">
                Navegação
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-emerald-50 hover:text-emerald-700 transition-colors duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url ? 'bg-emerald-50 text-emerald-700' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                          <item.icon className="w-4 h-4" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white/80 backdrop-blur-sm border-b border-stone-200 px-6 py-4 md:hidden sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-stone-100 p-2 rounded-lg transition-colors duration-200" />
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png" 
                alt="CAT Logo" 
                className="h-8 w-auto"
              />
              <h1 className="text-xl font-semibold text-stone-900">Sistema de Treinamento</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
          
          <IAFloatingButton />
        </main>
      </div>
    </SidebarProvider>
  );
}