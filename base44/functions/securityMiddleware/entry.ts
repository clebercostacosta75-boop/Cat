/**
 * Middleware de Segurança para Backend Functions
 * Funções utilitárias para validação e controle de acesso
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Verifica se o usuário está autenticado
 */
export async function requireAuth(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user) {
    throw new Error('Unauthorized: Usuário não autenticado');
  }
  
  return { base44, user };
}

/**
 * Verifica se o usuário tem uma das roles permitidas
 */
export async function requireRole(req, allowedRoles = []) {
  const { base44, user } = await requireAuth(req);
  
  const userRole = user.custom_role || user.role || 'user';
  
  if (!allowedRoles.includes(userRole) && !allowedRoles.includes('admin') && userRole !== 'admin') {
    throw new Error(`Forbidden: Role '${userRole}' não tem permissão para esta ação`);
  }
  
  return { base44, user, userRole };
}

/**
 * Verifica se o usuário é instrutor da turma específica
 */
export async function requireInstructorOwnership(base44, user, turmaId) {
  // Buscar turma
  const turmas = await base44.asServiceRole.entities.ClassSchedule.filter({ id: turmaId });
  if (turmas.length === 0) {
    throw new Error('Turma não encontrada');
  }
  
  const turma = turmas[0];
  
  // Buscar instrutor pelo email do usuário
  const instrutores = await base44.asServiceRole.entities.Instructor.filter({ email: user.email });
  
  if (instrutores.length === 0) {
    throw new Error('Você não é um instrutor cadastrado');
  }
  
  const instrutor = instrutores[0];
  
  // Verificar se o instrutor é o dono da turma
  if (turma.instructor_id !== instrutor.id) {
    throw new Error('Você não tem permissão para modificar esta turma');
  }
  
  return { turma, instrutor };
}

/**
 * Sanitiza dados sensíveis para logs e notificações
 */
export function sanitizeData(data) {
  const sanitized = { ...data };
  
  // Remover campos sensíveis
  const sensitiveFields = ['password', 'cpf', 'rg', 'bank_data', 'pix_keys'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      delete sanitized[field];
    }
  });
  
  return sanitized;
}

/**
 * Valida formato de telefone brasileiro
 */
export function validatePhone(phone) {
  if (!phone) return false;
  const phoneRegex = /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/;
  return phoneRegex.test(phone);
}

/**
 * Valida formato de email
 */
export function validateEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida e sanitiza entrada de dados
 */
export function validateInput(data, requiredFields = []) {
  const errors = [];
  
  // Verificar campos obrigatórios
  requiredFields.forEach(field => {
    if (!data[field] || data[field] === '') {
      errors.push(`Campo obrigatório ausente: ${field}`);
    }
  });
  
  if (errors.length > 0) {
    throw new Error(`Validação falhou: ${errors.join(', ')}`);
  }
  
  return true;
}

/**
 * Rate limiting simples baseado em memória (para produção, usar Redis)
 */
const rateLimitStore = new Map();

export function checkRateLimit(userId, action, maxRequests = 10, windowMs = 60000) {
  const key = `${userId}:${action}`;
  const now = Date.now();
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, []);
  }
  
  const requests = rateLimitStore.get(key);
  
  // Remover requests antigas
  const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
  
  if (validRequests.length >= maxRequests) {
    throw new Error('Rate limit excedido. Tente novamente em alguns segundos.');
  }
  
  validRequests.push(now);
  rateLimitStore.set(key, validRequests);
  
  return true;
}