import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { LayoutDashboard, Calendar, Users, BookOpen, Upload, BarChart3, FileText, Building2, UserCog, Mail, History, Bell, DollarSign } from "lucide-react";
import NotificationBell from "./components/notifications/NotificationBell";
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
import { Toaster } from "sonner";

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
        title: "Alertas de Reciclagem",
        url: createPageUrl("RecyclingAlerts"),
        icon: Bell,
        key: "Alertas de Reciclagem"
      },
      {
        title: "Análise de Lucratividade",
        url: createPageUrl("ProfitabilityAnalysis"),
        icon: BarChart3,
        key: "Análise de Lucratividade"
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
        title: "Controle Financeiro Instrutor",
        url: createPageUrl("InstructorFinancialControl"),
        icon: DollarSign,
        key: "Controle Financeiro Instrutor"
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
      {
        title: "Log de Auditoria",
        url: createPageUrl("AuditLog"),
        icon: FileText,
        key: "Log de Auditoria"
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <Sidebar className="border-r border-gray-200 bg-white">
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
                  <p className="text-xs text-gray-500">
                    {userRole === 'Instrutor' && 'Instrutor'}
                    {userRole === 'Coordenador de Operações' && 'Coordenador'}
                    {userRole === 'Financeiro' && 'Financeiro'}
                    {(userRole === 'admin' || userRole === 'Administrador Master') && 'Administrador'}
                  </p>
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
                          location.pathname === item.url ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
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
          <header className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-10">
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