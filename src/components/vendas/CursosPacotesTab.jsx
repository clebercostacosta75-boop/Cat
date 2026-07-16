import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Plus, Package, BookOpen, Edit, Calendar, MapPin, Users, QrCode, MoreVertical, AlertTriangle, XCircle, Ban } from "lucide-react";
import OfertaFormModal from "./OfertaFormModal";
import PacoteFormModal from "./PacoteFormModal";
import QRCodeInscricaoModal from "./QRCodeInscricaoModal";
import CadastroInteligenteDialog from "@/components/alunos/central/CadastroInteligenteDialog";
import { toast } from "sonner";
import { registrarEventoMatricula } from "@/lib/centralMatricula";
import { usePermissions } from "@/hooks/usePermissions";

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

// ─── Modal: Cancelar Curso/Oferta ────────────────────────────────────────────
function CancelarOfertaModal({ oferta, onClose, onDone }) {
  const [motivo, setMotivo] = useState("");
  const [tratamento, setTratamento] = useState("pendencia");
  const [saving, setSaving] = useState(false);

  const { data: enrollments = [] } = useQuery({
    queryKey: ["enrollments-oferta-cancel", oferta?.id],
    queryFn: async () => {
      const all = await base44.entities.StudentCourseEnrollment.list("-created_date", 500);
      return (all || []).filter(e => (e.course_offer_id === oferta.id || e.oferta_id === oferta.id) && e.status_matricula !== "Cancelado" && e.workflow_stage !== "Cancelled");
    },
    enabled: !!oferta,
  });

  const handleCancelar = async () => {
    if (!motivo.trim()) { toast.error("O motivo é obrigatório."); return; }
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      const agora = new Date().toISOString();

      // Atualizar oferta para Cancelada
      await base44.entities.CourseOffer.update(oferta.id, {
        status: "Cancelada",
        publication_status: "Cancelled",
        observacoes: [oferta.observacoes, `Cancelada em ${new Date().toLocaleString("pt-BR")} por ${user?.email || "desconhecido"}. Motivo: ${motivo.trim()}. Tratamento: ${tratamento}. Alunos afetados: ${enrollments.length}.`].filter(Boolean).join(" | "),
      });

      // Registrar pendência em cada matrícula afetada
      for (const e of enrollments) {
        const pendReason = `Curso/oferta cancelado(a). Tratamento: ${tratamento}. Motivo: ${motivo.trim()}`;
        await base44.entities.StudentCourseEnrollment.update(e.id, {
          last_pending_reason: pendReason,
          last_pending_at: agora,
        });
        await registrarEventoMatricula({
          enrollment: e,
          eventType: "pendencia_registrada",
          title: "Oferta cancelada — pendência criada",
          description: pendReason,
          metadata: { oferta_id: oferta.id, tratamento },
        });
      }

      // Auditoria
      await base44.entities.AuditLog.create({
        user_email: user?.email || "desconhecido",
        user_name: user?.full_name || user?.email || "sistema",
        action: "update",
        entity_type: "CourseOffer",
        entity_id: oferta.id,
        entity_name: oferta.nome_comercial,
        details: `Oferta cancelada. Motivo: ${motivo.trim()}. Tratamento: ${tratamento}. Alunos afetados: ${enrollments.length}. — ${new Date().toLocaleString("pt-BR")}`,
      });

      toast.success("Oferta cancelada. Pendências criadas para os alunos afetados.");
      onDone();
      onClose();
    } catch (err) {
      toast.error("Erro: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!oferta) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" /> Cancelar Curso / Oferta
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-gray-50 border rounded-md p-3 text-sm space-y-1">
            <p><span className="text-gray-500">Oferta:</span> <strong>{oferta.nome_comercial}</strong></p>
            <p><span className="text-gray-500">Curso base:</span> {oferta.course_name}</p>
            <p><span className="text-gray-500">Período:</span> {oferta.data_inicio || "—"} → {oferta.data_termino || "—"}</p>
          </div>

          {enrollments.length > 0 && (
            <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                <strong>{enrollments.length} aluno(s)</strong> serão afetados. Nenhuma matrícula será excluída — pendências serão criadas para análise.
              </p>
            </div>
          )}

          <div>
            <Label>Motivo do cancelamento *</Label>
            <Textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} placeholder="Descreva o motivo..." className="mt-1" />
          </div>

          <div>
            <Label>Tratamento dos alunos afetados</Label>
            <Select value={tratamento} onValueChange={setTratamento}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendencia">Criar pendência para análise individual</SelectItem>
                <SelectItem value="transferir">Transferir alunos para outra oferta/turma (manual)</SelectItem>
                <SelectItem value="credito">Gerar crédito para os alunos</SelectItem>
                <SelectItem value="financeiro">Encaminhar ao Financeiro</SelectItem>
                <SelectItem value="cancelar_definitivo">Cancelar definitivamente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-gray-400">
            Esta ação não exclui a oferta, matrículas ou históricos. Cobranças, contratos e mensagens não serão afetados automaticamente.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Voltar</Button>
            <Button variant="destructive" onClick={handleCancelar} disabled={saving || !motivo.trim()}>
              {saving ? "Processando..." : "Confirmar cancelamento"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function CursosPacotesTab() {
  const queryClient = useQueryClient();
  const [sub, setSub] = useState("ofertas");
  const [ofertaModal, setOfertaModal] = useState(false);
  const [editOferta, setEditOferta] = useState(null);
  const [pacoteModal, setPacoteModal] = useState(false);
  const [editPacote, setEditPacote] = useState(null);
  const [qrOferta, setQrOferta] = useState(null); // oferta para QR individual
  const [cancelarOferta, setCancelarOferta] = useState(null);
  const [inteligenteOpen, setInteligenteOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const { role: profileRole, allowedKeys } = usePermissions();

  useEffect(() => {
    base44.auth.me().then(u => setUserRole(u?.role || "user")).catch(() => {});
  }, []);

  const canCancelOffer =
    allowedKeys === null ||
    ["admin", "gestor_master", "Administrador Master", "coordenacao"].includes(profileRole || "") ||
    ["admin", "gestor_master", "Administrador Master"].includes(userRole || "");

  const { data: ofertas = [], isLoading: loadingOf } = useQuery({
    queryKey: ["course-offers"],
    queryFn: () => base44.entities.CourseOffer.list("-created_date", 200),
  });
  const { data: pacotes = [], isLoading: loadingPc } = useQuery({
    queryKey: ["course-packages"],
    queryFn: () => base44.entities.CoursePackage.list("-created_date", 200),
  });

  const encerrarMutation = useMutation({
    mutationFn: async (oferta) => {
      await base44.entities.CourseOffer.update(oferta.id, { status: "Encerrada" });
      const user = await base44.auth.me().catch(() => null);
      await base44.entities.AuditLog.create({
        user_email: user?.email || "desconhecido",
        user_name: user?.full_name || user?.email || "sistema",
        action: "update", entity_type: "CourseOffer", entity_id: oferta.id,
        entity_name: oferta.nome_comercial,
        details: `Inscrições encerradas — ${new Date().toLocaleString("pt-BR")}`,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["course-offers"] }); toast.success("Inscrições encerradas."); },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["course-offers"] });
    queryClient.invalidateQueries({ queryKey: ["course-packages"] });
  };

  return (
    <div className="space-y-4">
      <OfertaFormModal open={ofertaModal} onClose={() => { setOfertaModal(false); setEditOferta(null); }} oferta={editOferta} onSaved={refresh} />
      <PacoteFormModal open={pacoteModal} onClose={() => { setPacoteModal(false); setEditPacote(null); }} pacote={editPacote} onSaved={refresh} />
      {qrOferta && <QRCodeInscricaoModal open onClose={() => setQrOferta(null)} presetOferta={qrOferta} />}
      <CadastroInteligenteDialog open={inteligenteOpen} onClose={() => setInteligenteOpen(false)} />
      {cancelarOferta && <CancelarOfertaModal oferta={cancelarOferta} onClose={() => setCancelarOferta(null)} onDone={refresh} />}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setSub("ofertas")} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${sub === "ofertas" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>
            <BookOpen className="w-4 h-4" /> Ofertas ({ofertas.length})
          </button>
          <button onClick={() => setSub("pacotes")} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${sub === "pacotes" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>
            <Package className="w-4 h-4" /> Pacotes ({pacotes.length})
          </button>
        </div>
        <div className="flex gap-2">
          {sub === "ofertas" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-gray-900 hover:bg-gray-800">
                  <Plus className="w-4 h-4 mr-1.5" /> Nova Oferta
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setEditOferta(null); setOfertaModal(true); }}>✏️ Cadastro manual</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInteligenteOpen(true)}>✨ Cadastro inteligente (colar texto)</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setEditPacote(null); setPacoteModal(true); }}>📦 Novo Pacote</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {sub === "pacotes" && (
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
              <div className="text-center py-16 text-gray-400 space-y-3">
                <BookOpen className="w-12 h-12 mx-auto text-gray-300" />
                <p className="font-medium text-gray-500">Nenhuma oferta cadastrada</p>
                <p className="text-sm text-gray-400">Crie a primeira oferta de curso para a comunidade.</p>
                <Button onClick={() => { setEditOferta(null); setOfertaModal(true); }} className="bg-gray-900 hover:bg-gray-800">
                  <Plus className="w-4 h-4 mr-1.5" /> Criar primeira oferta
                </Button>
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
                      <span className="font-bold text-gray-800">R$ {(o.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setEditOferta(o); setOfertaModal(true); }}>
                          <Edit className="w-3 h-3 mr-1" /> Editar
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem onClick={() => setQrOferta(o)}>
                              <QrCode className="w-3.5 h-3.5 mr-1.5" /> Gerar QR Code de Inscrição
                            </DropdownMenuItem>
                            {o.status !== "Encerrada" && o.status !== "Cancelada" && (
                              <DropdownMenuItem onClick={() => {
                                if (window.confirm(`Encerrar inscrições para "${o.nome_comercial}"?`)) encerrarMutation.mutate(o);
                              }}>
                                <Ban className="w-3.5 h-3.5 mr-1.5" /> Encerrar inscrições
                              </DropdownMenuItem>
                            )}
                            {canCancelOffer && o.status !== "Cancelada" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600 focus:text-red-700" onClick={() => setCancelarOferta(o)}>
                                  <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancelar curso
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
              <div className="text-center py-16 text-gray-400 space-y-3">
                <Package className="w-12 h-12 mx-auto text-gray-300" />
                <p className="font-medium text-gray-500">Nenhum pacote cadastrado</p>
                <p className="text-sm text-gray-400">Crie um pacote de cursos para venda.</p>
                <Button onClick={() => { setEditPacote(null); setPacoteModal(true); }} className="bg-gray-900 hover:bg-gray-800">
                  <Plus className="w-4 h-4 mr-1.5" /> Criar primeiro pacote
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {pacotes.map(p => (
                  <div key={p.id} className="p-4 hover:bg-gray-50 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 flex items-center gap-1.5"><Package className="w-4 h-4 text-gray-500" /> {p.nome}</p>
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
                      <span className="font-bold text-gray-800">R$ {(p.valor_final ?? p.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
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