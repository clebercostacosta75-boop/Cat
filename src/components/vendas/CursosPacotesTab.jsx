import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, BookOpen, Edit, Zap, Calendar, MapPin, Users } from "lucide-react";
import OfertaFormModal from "./OfertaFormModal";
import PacoteFormModal from "./PacoteFormModal";
import MatriculaRapidaModal from "./MatriculaRapidaModal";

const STATUS_COLOR = {
  "Aberta": "bg-green-100 text-green-700",
  "Em divulgação": "bg-blue-100 text-blue-700",
  "Esgotada": "bg-orange-100 text-orange-700",
  "Encerrada": "bg-gray-100 text-gray-600",
  "Cancelada": "bg-red-100 text-red-700",
};

function VagasBar({ total = 0, preenchidas = 0 }) {
  const pct = total > 0 ? Math.min(100, Math.round((preenchidas / total) * 100)) : 0;
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <Users className="w-3.5 h-3.5" />
      <span>{preenchidas}/{total} vagas ({pct}%)</span>
      <div className="flex-1 max-w-[120px] bg-gray-200 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${pct >= 100 ? "bg-orange-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-medium text-gray-700">{Math.max(0, total - preenchidas)} disponíveis</span>
    </div>
  );
}

export default function CursosPacotesTab() {
  const queryClient = useQueryClient();
  const [sub, setSub] = useState("ofertas");
  const [ofertaModal, setOfertaModal] = useState(false);
  const [editOferta, setEditOferta] = useState(null);
  const [pacoteModal, setPacoteModal] = useState(false);
  const [editPacote, setEditPacote] = useState(null);
  const [rapidaOpen, setRapidaOpen] = useState(false);

  const { data: ofertas = [], isLoading: loadingOf } = useQuery({
    queryKey: ["course-offers"],
    queryFn: () => base44.entities.CourseOffer.list("-created_date", 200),
  });
  const { data: pacotes = [], isLoading: loadingPc } = useQuery({
    queryKey: ["course-packages"],
    queryFn: () => base44.entities.CoursePackage.list("-created_date", 200),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["course-offers"] });
    queryClient.invalidateQueries({ queryKey: ["course-packages"] });
  };

  return (
    <div className="space-y-4">
      <OfertaFormModal open={ofertaModal} onClose={() => { setOfertaModal(false); setEditOferta(null); }} oferta={editOferta} onSaved={refresh} />
      <PacoteFormModal open={pacoteModal} onClose={() => { setPacoteModal(false); setEditPacote(null); }} pacote={editPacote} onSaved={refresh} />
      <MatriculaRapidaModal open={rapidaOpen} onClose={() => setRapidaOpen(false)} onSuccess={refresh} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setSub("ofertas")} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${sub === "ofertas" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>
            <BookOpen className="w-4 h-4" /> Ofertas de Cursos ({ofertas.length})
          </button>
          <button onClick={() => setSub("pacotes")} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${sub === "pacotes" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>
            <Package className="w-4 h-4" /> Pacotes ({pacotes.length})
          </button>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setRapidaOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white">
            <Zap className="w-4 h-4 mr-1.5" /> Matrícula Rápida
          </Button>
          {sub === "ofertas" ? (
            <Button onClick={() => { setEditOferta(null); setOfertaModal(true); }} className="bg-gray-900 hover:bg-gray-800">
              <Plus className="w-4 h-4 mr-1.5" /> Nova Oferta
            </Button>
          ) : (
            <Button onClick={() => { setEditPacote(null); setPacoteModal(true); }} className="bg-gray-900 hover:bg-gray-800">
              <Plus className="w-4 h-4 mr-1.5" /> Novo Pacote
            </Button>
          )}
        </div>
      </div>

      {sub === "ofertas" && (
        <Card className="border border-gray-200">
          <CardContent className="p-0">
            {loadingOf ? (
              <div className="text-center py-12 text-gray-400">Carregando...</div>
            ) : ofertas.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Nenhuma oferta cadastrada. Crie a primeira oferta de curso para a comunidade.</p>
              </div>
            ) : (
              <div className="divide-y">
                {ofertas.map(o => (
                  <div key={o.id} className="p-4 hover:bg-gray-50 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{o.nome_comercial}</p>
                        <Badge className={`text-xs ${STATUS_COLOR[o.status] || "bg-gray-100 text-gray-600"}`}>{o.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">Curso base: {o.course_name} {o.carga_horaria && `• ${o.carga_horaria}`} {o.modalidade && `• ${o.modalidade}`}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {o.data_inicio || "—"} → {o.data_termino || "—"}
                        {o.horario && ` • ${o.horario}`}
                        {o.local && <span className="flex items-center gap-0.5 ml-1"><MapPin className="w-3 h-3" />{o.local}</span>}
                      </p>
                      <VagasBar total={o.vagas_total} preenchidas={o.vagas_preenchidas} />
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="font-bold text-emerald-700">R$ {(o.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setEditOferta(o); setOfertaModal(true); }}>
                        <Edit className="w-3 h-3 mr-1" /> Editar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {sub === "pacotes" && (
        <Card className="border border-gray-200">
          <CardContent className="p-0">
            {loadingPc ? (
              <div className="text-center py-12 text-gray-400">Carregando...</div>
            ) : pacotes.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Nenhum pacote cadastrado. Crie um pacote de cursos para venda.</p>
              </div>
            ) : (
              <div className="divide-y">
                {pacotes.map(p => (
                  <div key={p.id} className="p-4 hover:bg-gray-50 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 flex items-center gap-1.5"><Package className="w-4 h-4 text-purple-500" /> {p.nome}</p>
                        <Badge className={`text-xs ${STATUS_COLOR[p.status] || "bg-gray-100 text-gray-600"}`}>{p.status}</Badge>
                      </div>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        {(p.cursos || []).map((c, i) => (
                          <p key={i}>• {c.course_name} — {c.data_inicio || "—"} → {c.data_termino || "—"}</p>
                        ))}
                      </div>
                      <VagasBar total={p.vagas_total} preenchidas={p.vagas_preenchidas} />
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {p.desconto > 0 && <span className="text-xs text-gray-400 line-through">R$ {(p.valor_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>}
                      <span className="font-bold text-emerald-700">R$ {(p.valor_final ?? p.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      <Button size="sm" variant="outline" className="text-xs h-7 mt-1" onClick={() => { setEditPacote(p); setPacoteModal(true); }}>
                        <Edit className="w-3 h-3 mr-1" /> Editar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}