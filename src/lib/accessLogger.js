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