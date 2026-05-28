import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Mapeamento de permissões legadas para atuais
const LEGACY_MAP = {
  "Gerar BMM": "Gestão de BMM",
  "Histórico BMM": "Gestão de BMM",
  "Relatórios": "Dashboard de Relatórios",
  "Alertas de Reciclagem": "Alertas de Vencimento",
  "Análise de Lucratividade": "Dashboard Financeiro",
  "Analytics": "Dashboard de Relatórios",
};

const normalize = (perms) => {
  if (!perms) return null;
  const set = new Set();
  perms.forEach(p => set.add(LEGACY_MAP[p] || p));
  return Array.from(set);
};

// Perfis que têm acesso total (null = sem restrição)
const FULL_ACCESS_ROLES = ["admin", "Administrador Master", "gestor_master", "editor", "Editor"];

// Menus padrão por perfil (fallback quando sem permissões customizadas)
const ROLE_MENUS = {
  Operacional: [
    "Dashboard","Dashboard Operacional","Agenda de Treinamentos","Cronograma","Chamada Presencial",
    "Entrada de Propostas","Gestão de BMM","Instrutores","Empresas","Contratadas",
    "Cursos","Importar Excel","Central de Comunicação","Config. Notificações",
    "Log de Notificações","Alunos Individuais (PF)","Dashboard Comercial",
    "Gestão de Leads","Caixa de Entrada","Base de Conhecimento","Contas Sociais","Dashboard de Relatórios",
  ],
  Financeiro: ["Dashboard","Dashboard Financeiro","Dashboard de Relatórios"],
  Certificacao: [
    "Dashboard","Certificações","Alertas de Vencimento","Designer de Certificados",
    "Assinaturas Digitais","Auditoria de Certificados","Agenda de Treinamentos",
    "Cronograma","Chamada Presencial","Modelos E-mail","Central de Comunicação",
  ],
  "Certificação": [
    "Dashboard","Certificações","Alertas de Vencimento","Designer de Certificados",
    "Assinaturas Digitais","Auditoria de Certificados","Agenda de Treinamentos",
    "Cronograma","Chamada Presencial","Modelos E-mail","Central de Comunicação",
  ],
  Atendimento: [
    "Dashboard","Caixa de Entrada","Gestão de Leads","Base de Conhecimento",
    "Contas Sociais","Dashboard Comercial","Central de Comunicação",
  ],
  Instrutor: ["Dashboard"],
  "Coordenador de Operações": ["Dashboard","Cronograma","Agenda de Treinamentos","Chamada Presencial"],
  PortalEmpresa: [],
  // Roles sem permissões configuradas = acesso mínimo (admin deve configurar explicitamente)
  editor: ["Dashboard"],
  cliente: ["Dashboard"],
};

export function usePermissions() {
  const [role, setRole] = useState(null);
  const [allowedKeys, setAllowedKeys] = useState(null); // null = acesso total
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const u = await base44.auth.me();

      // Admin da plataforma = acesso total imediato
      if (u.role === "admin") {
        setRole("admin");
        setAllowedKeys(null);
        setLoading(false);
        return;
      }

      // Busca o UserProfile pelo email para obter role e permissões reais
      let profile = null;
      try {
        const profiles = await base44.entities.UserProfile.filter({ user_email: u.email });
        if (profiles.length > 0) {
          profile = profiles[0];
        } else {
          // Cria UserProfile automaticamente com role padrão se não existir
          // role "cliente" = acesso mínimo, admin deve configurar permissões explicitamente
          profile = await base44.entities.UserProfile.create({
            user_email: u.email,
            user_name: u.full_name || u.email,
            role: "cliente",
            status: "active",
          });
        }
      } catch {
        // Se falhar ao buscar/criar, continua sem profile
      }

      const profileRole = profile?.role || "editor";
      setRole(profileRole);

      // Roles com acesso total
      if (FULL_ACCESS_ROLES.includes(profileRole)) {
        setAllowedKeys(null);
        setLoading(false);
        return;
      }

      // Verifica se é instrutor
      try {
        const insts = await base44.entities.Instructor.filter({ email: u.email });
        if (insts.length > 0) {
          setRole("Instrutor");
          setAllowedKeys(["Dashboard"]);
          setLoading(false);
          return;
        }
      } catch {
        // ignora falha na busca de instrutor
      }

      // Permissões customizadas salvas no UserProfile — SEMPRE respeitadas
      const profilePerms = normalize(profile?.permissions);
      if (profilePerms && profilePerms.length > 0) {
        setAllowedKeys(profilePerms);
        setLoading(false);
        return;
      }

      // Fallback: menu padrão do perfil por role
      // Se não tiver mapeamento específico, acesso mínimo (somente Dashboard)
      const menuFallback = ROLE_MENUS[profileRole] ?? ["Dashboard"];
      setAllowedKeys(menuFallback);
    } catch {
      // Em qualquer erro inesperado, acesso mínimo (não libera tudo)
      setAllowedKeys(["Dashboard"]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    // Escuta evento customizado disparado após salvar permissões
    const handler = () => load();
    window.addEventListener("permissions-updated", handler);
    return () => window.removeEventListener("permissions-updated", handler);
  }, [load]);

  const hasPermission = useCallback((key) => {
    if (allowedKeys === null) return true; // acesso total
    return allowedKeys.includes(key);
  }, [allowedKeys]);

  return { role, allowedKeys, loading, hasPermission, reload: load };
}