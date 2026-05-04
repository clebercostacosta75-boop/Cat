import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Resolve o perfil do usuário logado.
 * Retorna: { user, role, loading }
 * role pode ser: 'admin' | 'Operacional' | 'Financeiro' | 'Certificacao' | 'PortalEmpresa' | 'Instrutor' | 'Coordenador de Operações'
 */
export function useUserRole() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Verificar se é instrutor pelo e-mail
        if (currentUser.email) {
          const instructors = await base44.entities.Instructor.filter({ email: currentUser.email });
          if (instructors.length > 0) {
            setRole("Instrutor");
            setLoading(false);
            return;
          }
        }

        // Usar custom_role ou role do sistema
        const r = currentUser.custom_role || currentUser.role || "user";
        setRole(r);
      } catch (e) {
        console.error("useUserRole:", e);
        setRole("user");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return { user, role, loading };
}