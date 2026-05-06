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
const FULL_ACCESS_ROLES = ["admin", "Administrador Master", "gestor_master"];

// Menus padrão por perfil (fallback quando sem permissões customizadas)
const ROLE_MENUS = {
  Operacional: [
    "Dashboard","Agenda de Treinamentos","Cronograma","Chamada Presencial",
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
};

export function usePermissions() {
  const [role, setRole] = useState(null);
  const [allowedKeys, setAllowedKeys] = useState(null); // null = acesso total
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const u = await base44.auth.me();

      // Verifica se é instrutor
      if (u.email) {
        const insts = await base44.entities.Instructor.filter({ email: u.email });
        if (insts.length > 0) {
          setRole("Instrutor");
          setAllowedKeys([]);
          setLoading(false);
          return;
        }
      }

      const userRole = u.custom_role || u.role || "user";
      setRole(userRole);

      // Admin / Gestor Master = acesso total
      if (FULL_ACCESS_ROLES.includes(userRole)) {
        setAllowedKeys(null);
        setLoading(false);
        return;
      }

      // Permissões customizadas salvas no User da plataforma
      const customPerms = normalize(u.permissions);
      if (customPerms && customPerms.length > 0) {
        setAllowedKeys(customPerms);
        setLoading(false);
        return;
      }

      // Fallback: menu padrão do perfil
      setAllowedKeys(ROLE_MENUS[userRole] ?? []);
    } catch {
      setAllowedKeys([]);
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