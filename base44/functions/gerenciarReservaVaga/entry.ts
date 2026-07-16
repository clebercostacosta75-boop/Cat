// Serviço interno de reserva de vagas (Etapa 1) — sem rota pública.
// Impede vagas negativas e excesso de vagas; usa idempotency_key contra duplicidade.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const ROLES_BLOQUEADOS = ['aluno', 'empresa', 'cliente'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email: (user.email || '').toLowerCase() });
    const profileRole = profiles[0]?.role || (user.role === 'admin' ? 'admin' : null);
    if (profileRole && ROLES_BLOQUEADOS.includes(profileRole)) {
      return Response.json({ error: 'Perfil sem permissão para gerenciar reservas de vagas' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;
    const svc = base44.asServiceRole.entities;
    const nowIso = new Date().toISOString();

    const audit = async (details, entityId, entityName) => {
      await svc.AuditLog.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        action: 'update',
        entity_type: 'SeatReservation',
        entity_id: entityId || '',
        entity_name: entityName || '',
        details: `${details} — ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Belem' })}`,
      });
    };

    if (action === 'reservar') {
      const { course_offer_id, enrollment_id, pre_cadastro_id, student_id, origin = 'Manual', idempotency_key, expires_minutes } = body;
      if (!course_offer_id || !idempotency_key) {
        return Response.json({ error: 'course_offer_id e idempotency_key são obrigatórios' }, { status: 400 });
      }

      // Idempotência: se a chave já existe, devolve a reserva existente
      const existing = await svc.SeatReservation.filter({ idempotency_key });
      if (existing.length > 0) return Response.json({ reservation: existing[0], idempotent: true });

      const offers = await svc.CourseOffer.filter({ id: course_offer_id });
      const offer = offers[0];
      if (!offer) return Response.json({ error: 'Oferta não encontrada' }, { status: 404 });

      // Capacidade: total - reservas ativas - matrículas ativas vinculadas
      const now = new Date();
      const reservations = await svc.SeatReservation.filter({ course_offer_id });
      const reservadas = reservations.filter((r) => r.status === 'Reserved' && (!r.expires_at || new Date(r.expires_at) > now)).length;
      const confirmadasRes = reservations.filter((r) => r.status === 'Confirmed').length;
      const total = Number(offer.vagas_total || 0);
      if (total - reservadas - confirmadasRes <= 0) {
        return Response.json({ error: 'Sem vagas disponíveis nesta oferta', vagas: { total, reservadas, confirmadas: confirmadasRes, disponiveis: 0 } }, { status: 409 });
      }

      const minutes = Number(expires_minutes || offer.reservation_timeout_minutes || 60);
      const reservation = await svc.SeatReservation.create({
        course_offer_id,
        enrollment_id: enrollment_id || undefined,
        pre_cadastro_id: pre_cadastro_id || undefined,
        student_id: student_id || undefined,
        status: 'Reserved',
        reserved_at: nowIso,
        expires_at: new Date(now.getTime() + minutes * 60000).toISOString(),
        created_by_user_id: user.id,
        origin,
        idempotency_key,
      });
      await audit(`Vaga reservada na oferta "${offer.nome_comercial}" (expira em ${minutes} min, origem: ${origin})`, reservation.id, offer.nome_comercial);
      return Response.json({ reservation });
    }

    if (['confirmar', 'liberar', 'cancelar', 'expirar'].includes(action)) {
      const { reservation_id, enrollment_id } = body;
      if (!reservation_id) return Response.json({ error: 'reservation_id é obrigatório' }, { status: 400 });
      const found = await svc.SeatReservation.filter({ id: reservation_id });
      const reservation = found[0];
      if (!reservation) return Response.json({ error: 'Reserva não encontrada' }, { status: 404 });

      const map = {
        confirmar: { status: 'Confirmed', confirmed_at: nowIso, ...(enrollment_id ? { enrollment_id } : {}) },
        liberar: { status: 'Released', released_at: nowIso },
        cancelar: { status: 'Cancelled', released_at: nowIso },
        expirar: { status: 'Expired', released_at: nowIso },
      };
      const updated = await svc.SeatReservation.update(reservation.id, map[action]);
      await audit(`Reserva ${reservation.id} → ${map[action].status}`, reservation.id, reservation.course_offer_id);
      return Response.json({ reservation: updated });
    }

    if (action === 'expirar_vencidas') {
      const now = new Date();
      const reserved = await svc.SeatReservation.filter({ status: 'Reserved' });
      const vencidas = reserved.filter((r) => r.expires_at && new Date(r.expires_at) < now);
      for (const r of vencidas) {
        await svc.SeatReservation.update(r.id, { status: 'Expired', released_at: nowIso });
      }
      if (vencidas.length > 0) await audit(`${vencidas.length} reserva(s) expiradas automaticamente`, '', 'Varredura');
      return Response.json({ expired: vencidas.length });
    }

    return Response.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});