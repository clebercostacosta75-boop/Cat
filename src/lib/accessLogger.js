import { base44 } from '@/api/base44Client';

// Identificador de sessão do navegador (persiste até fechar a aba)
const getSessionId = () => {
  let sid = sessionStorage.getItem('cat_session_id');
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('cat_session_id', sid);
  }
  return sid;
};

export function clearLocalAccessState() {
  Object.keys(sessionStorage).filter(key => key.startsWith('cat_')).forEach(key => sessionStorage.removeItem(key));
  Object.keys(localStorage).filter(key => key.startsWith('cat_permissions') || key.startsWith('cat_access')).forEach(key => localStorage.removeItem(key));
}

let cachedIp = null;
async function getIp() {
  if (cachedIp !== null) return cachedIp;
  try {
    const r = await fetch('https://api.ipify.org?format=json');
    cachedIp = (await r.json()).ip || '';
  } catch {
    cachedIp = '';
  }
  return cachedIp;
}

// Registra o login uma única vez por sessão
export async function logLoginSuccess() {
  if (sessionStorage.getItem('cat_login_logged')) return;
  sessionStorage.setItem('cat_login_logged', '1');
  try {
    const user = await base44.auth.me();
    if (!user) return;
    const ip = await getIp();
    await base44.entities.AccessLog.create({
      user_email: user.email,
      event_type: 'login_success',
      reason: 'Sessão iniciada no portal',
      module: 'Login',
      session_id: getSessionId(),
      ip_address: ip,
      user_agent: navigator.userAgent,
    });
  } catch {
    // logging nunca deve quebrar o app
  }
}

// Registra falha de acesso (login negado) via backend — uma vez por sessão/motivo
export async function logAccessDenied(eventType, reason) {
  try {
    const key = `cat_denied_${eventType}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    await base44.functions.invoke('registrarAcessoNegado', {
      event_type: eventType,
      reason,
      session_id: getSessionId(),
    });
  } catch {
    // logging nunca deve quebrar o app
  }
}

// Registra negação de acesso a rota/módulo — uma vez por módulo/sessão
export async function logRouteDenied(module, reason) {
  try {
    const key = `cat_route_denied_${module}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    await base44.functions.invoke('registrarAcessoNegado', {
      event_type: 'access_denied',
      reason,
      module,
      session_id: getSessionId(),
    });
  } catch {
    // logging nunca deve quebrar o app
  }
}

// Intercepta o logout para registrar a saída antes de encerrar a sessão
if (typeof window !== 'undefined' && base44?.auth?.logout && !base44.auth.__logoutWrapped) {
  const origLogout = base44.auth.logout.bind(base44.auth);
  base44.auth.logout = async (...args) => {
    try {
      const user = await base44.auth.me();
      if (user) {
        await base44.entities.AccessLog.create({
          user_email: user.email,
          event_type: 'logout',
          reason: 'Sessão encerrada pelo usuário',
          module: 'Logout',
          session_id: getSessionId(),
          ip_address: cachedIp || '',
          user_agent: navigator.userAgent,
        });
      }
    } catch {
      // logging nunca deve quebrar o logout
    }
    clearLocalAccessState();
    cachedIp = null;
    return origLogout(...args);
  };
  base44.auth.__logoutWrapped = true;
}

// Registra o acesso a cada módulo uma vez por sessão
export async function logModuleAccess(module) {
  if (!module) return;
  try {
    const key = 'cat_modules_logged';
    const logged = JSON.parse(sessionStorage.getItem(key) || '[]');
    if (logged.includes(module)) return;
    sessionStorage.setItem(key, JSON.stringify([...logged, module]));
    const user = await base44.auth.me();
    if (!user) return;
    const ip = await getIp();
    await base44.entities.AccessLog.create({
      user_email: user.email,
      event_type: 'module_access',
      reason: `Acesso ao módulo ${module}`,
      module,
      session_id: getSessionId(),
      ip_address: ip,
      user_agent: navigator.userAgent,
    });
  } catch {
    // logging nunca deve quebrar o app
  }
}