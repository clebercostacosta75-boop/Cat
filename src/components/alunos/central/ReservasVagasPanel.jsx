import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { isMatriculaIndividual } from "@/lib/origemMatricula";
import { calcularVagasOferta } from "@/lib/centralMatricula";

const safe = (fn) => async () => { try { return (await fn()) || []; } catch { return []; } };

const STATUS_BADGE = {
  Reserved: "bg-yellow-100 text-yellow-800",
  Confirmed: "bg-green-100 text-green-800",
  Expired: "bg-gray-100 text-gray-500",
  Released: "bg-blue-100 text-blue-700",
  Cancelled: "bg-red-100 text-red-700",
};

export default function ReservasVagasPanel() {
  const queryClient = useQueryClient();
  const [novaOfertaId, setNovaOfertaId] = useState("");
  const [minutos, setMinutos] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: offers = [] } = useQuery({ queryKey: ["central-offers"], queryFn: safe(() => base44.entities.CourseOffer.list("-created_date", 200)) });
  const { data: reservations = [] } = useQuery({ queryKey: ["central-reservas"], queryFn: safe(() => base44.entities.SeatReservation.list("-created_date", 500)) });
  const { data: enrollments = [] } = useQuery({
    queryKey: ["central-enrollments"],
    queryFn: safe(async () => {
      const all = await base44.entities.StudentCourseEnrollment.list("-created_date", 500);
      return (all || []).filter(isMatriculaIndividual);
    }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["central-reservas"] });
  const offerName = (id) => offers.find((o) => o.id === id)?.nome_comercial || id;

  const chamar = async (payload, okMsg) => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke("gerenciarReservaVaga", payload);
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(okMsg);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  };

  const novaReserva = () => {
    if (!novaOfertaId) { toast.error("Selecione a oferta."); return; }
    chamar({
      action: "reservar",
      course_offer_id: novaOfertaId,
      origin: "Manual",
      idempotency_key: `manual-${novaOfertaId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...(minutos ? { expires_minutes: Number(minutos) } : {}),
    }, "Vaga reservada!");
  };

  return (
    <div className="space-y-4">
      {/* Resumo de vagas por oferta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {offers.map((o) => {
          const v = calcularVagasOferta(o, reservations, enrollments);
          return (
            <Card key={o.id} className="border border-gray-200">
              <CardContent className="p-3">
                <p className="text-sm font-semibold text-gray-900 truncate">{o.nome_comercial}</p>
                <div className="flex gap-3 mt-2 text-xs text-gray-600">
                  <span>Total: <strong>{v.total}</strong></span>
                  <span className="text-yellow-700">Reserv.: <strong>{v.reservadas}</strong></span>
                  <span className="text-green-700">Confirm.: <strong>{v.confirmadas}</strong></span>
                  <span className={v.disponiveis === 0 ? "text-red-600" : "text-emerald-700"}>Disp.: <strong>{v.disponiveis}</strong></span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {offers.length === 0 && <p className="text-sm text-gray-400 col-span-full py-4 text-center">Nenhuma oferta cadastrada.</p>}
      </div>

      {/* Nova reserva manual */}
      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Nova Reserva Manual</p>
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <div className="flex-1 w-full">
              <Label>Oferta</Label>
              <Select value={novaOfertaId} onValueChange={setNovaOfertaId}>
                <SelectTrigger><SelectValue placeholder="Selecione a oferta" /></SelectTrigger>
                <SelectContent>
                  {offers.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome_comercial}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Label>Expira em (min)</Label>
              <Input type="number" placeholder="Padrão da oferta" value={minutos} onChange={(e) => setMinutos(e.target.value)} />
            </div>
            <Button className="bg-gray-900 hover:bg-gray-800" onClick={novaReserva} disabled={busy}>Reservar Vaga</Button>
            <Button variant="outline" onClick={() => chamar({ action: "expirar_vencidas" }, "Reservas vencidas expiradas.")} disabled={busy}>Expirar Vencidas</Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de reservas */}
      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {reservations.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">Nenhuma reserva registrada.</div>
          ) : (
            <div className="divide-y">
              {reservations.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 flex-wrap gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{offerName(r.course_offer_id)}</p>
                    <p className="text-xs text-gray-400">
                      Reservada {r.reserved_at ? new Date(r.reserved_at).toLocaleString("pt-BR") : "—"}
                      {r.expires_at ? ` • expira ${new Date(r.expires_at).toLocaleString("pt-BR")}` : ""}
                      {r.origin ? ` • ${r.origin}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`text-xs ${STATUS_BADGE[r.status] || "bg-gray-100 text-gray-600"}`}>{r.status}</Badge>
                    {r.status === "Reserved" && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs border-green-300 text-green-700" disabled={busy}
                          onClick={() => chamar({ action: "confirmar", reservation_id: r.id }, "Reserva confirmada.")}>Confirmar</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs border-blue-300 text-blue-700" disabled={busy}
                          onClick={() => chamar({ action: "liberar", reservation_id: r.id }, "Reserva liberada.")}>Liberar</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-600" disabled={busy}
                          onClick={() => chamar({ action: "cancelar", reservation_id: r.id }, "Reserva cancelada.")}>Cancelar</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}