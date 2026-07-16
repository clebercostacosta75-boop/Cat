// Serviço interno de desconto (Etapa 1): valida e aplica códigos de DiscountAuthorization.
// O desconto nunca altera o preço cadastrado da oferta — apenas retorna snapshot para gravação na matrícula.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const ROLES_BLOQUEADOS = ['aluno', 'empresa', 'cliente'];
const ROLES_GESTAO = ['admin', 'gestor_master', 'financeiro'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email: (user.email || '').toLowerCase() });
    const profileRole = profiles[0]?.role || (user.role === 'admin' ? 'admin' : null);
    if (profileRole && ROLES_BLOQUEADOS.includes(profileRole)) {
      return Response.json({ error: 'Perfil sem permissão para operar descontos' }, { status: 403 });
    }

    const { action = 'validar', code, course_id, course_offer_id, enrollment_id } = await req.json();
    if (!code) return Response.json({ valid: false, reason: 'Código não informado' }, { status: 400 });

    const matches = await base44.asServiceRole.entities.DiscountAuthorization.filter({ code: code.trim() });
    const auth = matches[0];
    if (!auth) return Response.json({ valid: false, reason: 'Código não encontrado' });

    const now = new Date();
    const reasons = [];
    if (auth.status !== 'Active') reasons.push(`Código não está ativo (status: ${auth.status})`);
    if (auth.valid_from && new Date(auth.valid_from) > now) reasons.push('Código ainda não está vigente');
    if (auth.valid_until && new Date(auth.valid_until) < now) reasons.push('Código expirado');
    if ((auth.used_count || 0) >= (auth.max_uses || 0)) reasons.push('Limite de utilizações atingido');
    if (auth.course_id && course_id && auth.course_id !== course_id) reasons.push('Código não vale para este curso');
    if (auth.course_offer_id && course_offer_id && auth.course_offer_id !== course_offer_id) reasons.push('Código não vale para esta oferta');
    if (Array.isArray(auth.allowed_attendant_ids) && auth.allowed_attendant_ids.length > 0
        && !ROLES_GESTAO.includes(profileRole)
        && !auth.allowed_attendant_ids.includes(profiles[0]?.id) && !auth.allowed_attendant_ids.includes(user.id)) {
      reasons.push('Atendente não autorizado a usar este código');
    }

    if (reasons.length > 0) return Response.json({ valid: false, reason: reasons.join('; ') });

    if (action === 'aplicar') {
      const newCount = (auth.used_count || 0) + 1;
      const updates = { used_count: newCount };
      if (newCount >= (auth.max_uses || 0)) updates.status = 'Exhausted';
      await base44.asServiceRole.entities.DiscountAuthorization.update(auth.id, updates);

      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        action: 'update',
        entity_type: 'DiscountAuthorization',
        entity_id: auth.id,
        entity_name: auth.code,
        details: `Código de desconto ${auth.code} (${auth.percentage}%) aplicado${enrollment_id ? ` na matrícula ${enrollment_id}` : ''}. Uso ${newCount}/${auth.max_uses}. ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Belem' })}`,
      });
    }

    return Response.json({
      valid: true,
      discount_authorization_id: auth.id,
      code: auth.code,
      percentage: auth.percentage,
      applied: action === 'aplicar',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});