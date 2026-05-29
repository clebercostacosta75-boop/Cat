import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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

// Perfis com acesso total irrestrito
const FULL_ACCESS_ROLES = ["admin", "Administrador Master", "gestor_master"];

// Menus padrão por perfil (fallback SOMENTE quando UserProfile.permissions está vazio)
// Editor e Cliente dependem EXCLUSIVAMENTE das permissões individuais configuradas pelo Gestor Master
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
  // editor/Editor/cliente: lista vazia — permissões definidas exclusivamente pelo Gestor Master
  editor: [],
  Editor: [],
  cliente: [],
};

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  const [role, setRole] = useState(null);
  const [allowedKeys, setAllowedKeys] = useState(null); // null = loading ainda não resolvido
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const u = await base44.auth.me();

      // Administrador da plataforma = acesso total imediato
      if (u.role === "admin") {
        setRole("admin");
        setAllowedKeys(null);
        setLoading(false);
        return;
      }

      // Busca UserProfile pelo email para obter role e permissões reais do servidor
      let profile = null;
      try {
        const profiles = await base44.entities.UserProfile.filter({ user_email: u.email });
        if (profiles.length > 0) {
          profile = profiles[0];
        } else {
          // Cria perfil padrão se não existir — admin deve configurar permissões
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

      const profileRole = profile?.role || "cliente";
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

      // FONTE ÚNICA: permissões customizadas salvas no UserProfile pelo Gestor Master
      // Esta é a fonte de verdade — sempre tem prioridade
      const profilePerms = normalize(profile?.permissions);
      if (profilePerms && profilePerms.length > 0) {
        setAllowedKeys(profilePerms);
        setLoading(false);
        return;
      }

      // Fallback: menu padrão do perfil (para roles como Operacional, Financeiro, etc.)
      // Editor, cliente → lista vazia (Gestor Master deve configurar manualmente)
      const menuFallback = ROLE_MENUS[profileRole] ?? [];
      setAllowedKeys(menuFallback);
    } catch {
      // Em qualquer erro inesperado, lista vazia (não libera acesso indevido)
      setAllowedKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    // Escuta evento disparado após salvar permissões no painel de usuários
    const handler = () => load();
    window.addEventListener("permissions-updated", handler);
    return () => window.removeEventListener("permissions-updated", handler);
  }, [load]);

  const hasPermission = useCallback((key) => {
    if (allowedKeys === null) return true; // acesso total
    return allowedKeys.includes(key);
  }, [allowedKeys]);

  return (
    <PermissionsContext.Provider value={{ role, allowedKeys, loading, hasPermission, reload: load }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions deve ser usado dentro de PermissionsProvider");
  return ctx;
}