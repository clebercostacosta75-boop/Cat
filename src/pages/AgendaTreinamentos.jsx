import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Calendar, List, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import AgendaCalendario from "@/components/agenda/AgendaCalendario";
import AgendaDayPanel from "@/components/agenda/AgendaDayPanel";
import AgendaFormModal from "@/components/agenda/AgendaFormModal";

// ─── Adaptadores: ClassSchedule (fonte oficial) ⇄ formato de exibição da Agenda ───
function parseHorario(schedule) {
  if (!schedule) return ["", ""];
  const parts = schedule.split(/\s*(?:às|as|-|a)\s*/i).map(p => p.trim()).filter(Boolean);
  return [parts[0] || "", parts[1] || ""];
}

export function toAgendaView(c) {
  const dates = (c.realization_dates || []).filter(Boolean).sort();
  const [horario_inicio, horario_fim] = parseHorario(c.training_schedule);
  return {
    id: c.id,
    _raw: c,
    titulo: c.training_name,
    curso_nome: c.training_name,
    empresa_nome: c.company_name,
    instrutor_nome: c.instructor_name || "",
    data_inicio: dates[0] || null,
    data_fim: dates.length > 1 ? dates[dates.length - 1] : (dates[0] || null),
    horario_inicio,
    horario_fim,
    local: c.location || "",
    modalidade: c.category || "Presencial",
    status: c.status || "Agendado",
    vagas_total: c.vagas_total || "",
    alunos_inscritos: c.alunos_inscritos || [],
    confirmacao_enviada: c.confirmacao_enviada || false,
    link_online: c.link_online || "",
    observacoes: c.notes || "",
  };
}

function toClassSchedule(form) {
  // Monta realization_dates com cada dia entre início e fim
  let realization_dates = [];
  if (form.data_inicio) {
    try {
      const start = parseISO(form.data_inicio);
      const end = form.data_fim ? parseISO(form.data_fim) : start;
      realization_dates = (end >= start ? eachDayOfInterval({ start, end }) : [start])
        .map(d => format(d, "yyyy-MM-dd"));
    } catch {
      realization_dates = [form.data_inicio];
    }
  }
  const alunos = form.alunos_inscritos || [];
  const data = {
    training_name: form.titulo || form.curso_nome,
    company_name: form.empresa_nome || "—",
    instructor_name: form.instrutor_nome || "",
    realization_dates,
    training_schedule: form.horario_inicio
      ? `${form.horario_inicio}${form.horario_fim ? ` às ${form.horario_fim}` : ""}`
      : "",
    location: form.local || "",
    category: form.modalidade || "Presencial",
    status: form.status || "Agendado",
    vagas_total: form.vagas_total ? Number(form.vagas_total) : 0,
    alunos_inscritos: alunos,
    link_online: form.link_online || "",
    notes: form.observacoes || "",
  };
  if (alunos.length > 0) data.students_count = alunos.length;
  return data;
}

export default function AgendaTreinamentos() {
  const queryClient = useQueryClient();
  const [view, setView] = useState("calendar"); // calendar | list
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [preloadData, setPreloadData] = useState(null);

  // Captar parâmetros de URL da proposta
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const company_id = params.get('company_id');
    const company_name = params.get('company_name');

    if (company_id || company_name) {
      setPreloadData({
        empresa_nome: company_name ? decodeURIComponent(company_name) : '',
      });
      setModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Dados — fonte oficial: ClassSchedule (mesma base do Cronograma)
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["classSchedules"],
    queryFn: () => base44.entities.ClassSchedule.list("-created_date", 300),
  });
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("nome_fantasia", 100),
  });
  const { data: instructors = [] } = useQuery({
    queryKey: ["instructors"],
    queryFn: () => base44.entities.Instructor.list("name", 100),
  });
  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => base44.entities.Course.list("name", 100),
  });

  const agendamentos = classes.map(toAgendaView);

  // Mutações — gravam direto na turma (ClassSchedule)
  const createMutation = useMutation({
    mutationFn: (form) => base44.entities.ClassSchedule.create(toClassSchedule(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classSchedules"] });
      setModalOpen(false);
      toast.success("Agendamento criado com sucesso!");
    },
    onError: (e) => toast.error("Erro ao criar agendamento: " + e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, form }) => base44.entities.ClassSchedule.update(id, toClassSchedule(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classSchedules"] });
      setModalOpen(false);
      setEditingItem(null);
      toast.success("Agendamento atualizado!");
    },
    onError: (e) => toast.error("Erro ao atualizar: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClassSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classSchedules"] });
      toast.success("Agendamento removido.");
    },
    onError: (e) => toast.error("Erro ao remover: " + e.message),
  });

  const handleSave = (formData) => {
    if (editingItem?.id) {
      updateMutation.mutate({ id: editingItem.id, form: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingItem(preloadData ? preloadData : null);
    setModalOpen(true);
  };

  const handleSendConfirmation = async (agenda) => {
    if (!agenda.alunos_inscritos?.length) {
      toast.error("Nenhum aluno inscrito neste treinamento.");
      return;
    }
    setSendingId(agenda.id);
    try {
      const res = await base44.functions.invoke("enviarConfirmacaoAgendamento", { agenda_id: agenda.id });
      if (res.data?.success) {
        toast.success(res.data.message || "E-mails enviados com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["classSchedules"] });
      } else {
        toast.error(res.data?.message || "Erro ao enviar e-mails.");
      }
    } catch (e) {
      toast.error("Erro ao enviar confirmações: " + e.message);
    } finally {
      setSendingId(null);
    }
  };

  // Filtro para lista
  const filtered = agendamentos.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.titulo?.toLowerCase().includes(q) ||
      a.curso_nome?.toLowerCase().includes(q) ||
      a.empresa_nome?.toLowerCase().includes(q) ||
      a.instrutor_nome?.toLowerCase().includes(q)
    );
  });

  const STATUS_COLORS = {
    Aguardando: "bg-orange-100 text-orange-800",
    Agendado: "bg-blue-100 text-blue-800",
    Confirmado: "bg-green-100 text-green-800",
    "Em Andamento": "bg-yellow-100 text-yellow-800",
    Concluído: "bg-gray-100 text-gray-700",
    Cancelado: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda de Treinamentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{agendamentos.length} turma(s) — mesma base do Cronograma</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle view */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView("calendar")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${view === "calendar" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              <Calendar className="w-3.5 h-3.5" /> Calendário
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${view === "list" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              <List className="w-3.5 h-3.5" /> Lista
            </button>
          </div>
          <Button onClick={handleNew} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Busca (visível na lista) */}
      {view === "list" && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por título, curso, empresa, instrutor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : view === "calendar" ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <AgendaCalendario
              agendamentos={agendamentos}
              onSelectDay={setSelectedDay}
              selectedDay={selectedDay}
            />
          </div>
          <div>
            <AgendaDayPanel
              day={selectedDay}
              agendamentos={agendamentos}
              onEdit={handleEdit}
              onDelete={(id) => deleteMutation.mutate(id)}
              onSendConfirmation={handleSendConfirmation}
              sendingId={sendingId}
            />
          </div>
        </div>
      ) : (
        /* LISTA */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Treinamento</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Empresa</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Datas</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Alunos</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">Nenhum agendamento encontrado.</td>
                </tr>
              )}
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{a.titulo || a.curso_nome}</div>
                    {a.instrutor_nome && <div className="text-xs text-gray-400">{a.instrutor_nome}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{a.empresa_nome || "—"}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    <div>{a.data_inicio ? format(new Date(a.data_inicio + "T00:00:00"), "dd/MM/yyyy") : "—"}</div>
                    {a.horario_inicio && <div className="text-xs text-gray-400">{a.horario_inicio}{a.horario_fim ? ` - ${a.horario_fim}` : ""}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {(a.alunos_inscritos?.length || 0)} / {a.vagas_total || a._raw?.students_count || "∞"}
                    {a.confirmacao_enviada && <div className="text-xs text-green-600">✓ Confirmados</div>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${STATUS_COLORS[a.status] || "bg-gray-100"}`}>{a.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs h-7"
                        onClick={() => handleSendConfirmation(a)}
                        disabled={sendingId === a.id || !a.alunos_inscritos?.length}
                      >
                        <RefreshCw className={`w-3 h-3 ${sendingId === a.id ? "animate-spin" : ""}`} />
                        {sendingId === a.id ? "..." : "Confirmar"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => handleEdit(a)}>Editar</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-red-500" onClick={() => deleteMutation.mutate(a.id)}>Excluir</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AgendaFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingItem(null); setPreloadData(null); }}
        onSave={handleSave}
        initialData={editingItem || preloadData}
        companies={companies}
        instructors={instructors}
        courses={courses}
      />
    </div>
  );
}