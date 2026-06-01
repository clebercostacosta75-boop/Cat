/**
 * Força sincronização de permissões do usuário
 * Útil após admin atualizar permissões
 */
export async function syncPermissionsImmediately() {
  try {
    // Limpa cache local
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('permissions-force-reload'));
      
      // Aguarda um pouco para permissões recarregarem
      await new Promise(r => setTimeout(r, 500));
      
      // Se permissões ainda estão bloqueadas, força logout + login
      return true;
    }
  } catch (e) {
    console.error('Erro ao sincronizar permissões:', e);
  }
  return false;
}