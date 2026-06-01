import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CalendarPlus, Calendar, Eye, Clock, User, MessageCircle,
  MapPin, Users, Edit2, Trash2, BookOpen, List, LayoutGrid,
  Search, ChevronLeft, ChevronRight, Filter, CheckCircle2
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ClassScheduleForm from "@/components/schedule/ClassScheduleForm";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Normaliza dados das duas entidades num formato comum ───────────────────
function normalizeClassSchedule(c) {
  const datas = (c.realization_dates || []).filter(Boolean);
  const dataInicio = datas[0] || null;
  const dataFim = datas.length > 1 ? datas[datas.length - 1] : dataInicio;

  // Converte YYYY-MM-DD para DD/MM/YYYY sem problema de timezone
  const toBR = (d) => {
    if (!d) return null;
    const parts = d.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };

  // Monta período descritivo a partir das datas ou do specific_days
  let periodoDescritivo = c.specific_days || null;
  if (!periodoDescritivo && dataInicio) {
    periodoDescritivo = dataFim && dataFim !== dataInicio
      ? `${toBR(dataInicio)} → ${toBR(dataFim)}`
      : toBR(dataInicio);
  }

  return {
    id: c.id,
    _source: "ClassSchedule",
    _raw: c,
    titulo: c.training_name,
    curso_nome: c.training_name,
    empresa_nome: c.company_name,
    instrutor_nome: c.instructor_name || "—",
    data_inicio: dataInicio,
    data_fim: dataFim,
    horario: c.training_schedule || "—",
    periodo_descritivo: periodoDescritivo,
    local: c.location || "—",
    carga_horaria: c.duration_hours ? `${c.duration_hours}h` : "—",
    status: c.status || "Agendado",
    alunos: c.students_count || 0,
    modalidade: c.category || c.modality || "—",
    notes: c.notes,
    datas_realizacao: datas,
  };
}

function normalizeAgendaTreinamento(a) {
  return {
    id: a.id,
    _source: "AgendaTreinamento",
    _raw: a,
    titulo: a.titulo || a.curso_nome,
    curso_nome: a.curso_nome,
    empresa_nome: a.empresa_nome || "—",
    instrutor_nome: a.instrutor_nome || "—",
    data_inicio: a.data_inicio || null,
    horario: a.horario_inicio ? `${a.horario_inicio}${a.horario_fim ? ` - ${a.horario_fim}` : ""}` : "—",
    local: a.local || "—",
    carga_horaria: "—",
    status: a.status || "Agendado",
    alunos: a.alunos_inscritos?.length || 0,
    modalidade: a.modalidade || "—",
    notes: a.observacoes,
    datas_realizacao: a.data_inicio ? [a.data_inicio] : [],
  };
}

// ─── Cores de status ─────────────────────────────────────────────────────────
const STATUS_COLORS = {
  Agendado:      "bg-blue-100 text-blue-800 border-blue-200",
  Confirmado:    "bg-green-100 text-green-800 border-green-200",
  "Em Andamento":"bg-yellow-100 text-yellow-800 border-yellow-200",
  Concluído:     "bg-gray-100 text-gray-700 border-gray-200",
  Cancelado:     "bg-red-100 text-red-700 border-red-200",
  Aguardando:    "bg-orange-100 text-orange-800 border-orange-200",
};

const STATUS_DOT = {
  Agendado:      "bg-blue-500",
  Confirmado:    "bg-green-500",
  "Em Andamento":"bg-yellow-500",
  Concluído:     "bg-gray-400",
  Cancelado:     "bg-red-500",
  Aguardando:    "bg-orange-400",
};

// ─── Componente: Calendário mensal ───────────────────────────────────────────
function CalendarView({ items, onCardClick }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // preencher dias antes do início da semana
  const firstDayOfWeek = days[0].getDay(); // 0=dom
  const paddingDays = Array.from({ length: firstDayOfWeek });

  function getItemsForDay(day) {
    return items.filter((item) => {
      if (!item.data_inicio) return false;
      try { return isSameDay(parseISO(item.data_inicio), day); } catch { return false; }
    });
  }

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Cabeçalho do mês */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded-full">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-800 capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded-full">
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {weekDays.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-500 uppercase">{d}</div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-7">
        {paddingDays.map((_, i) => (
          <div key={`pad-${i}`} className="min-h-[90px] border-b border-r border-gray-100 bg-gray-50/50" />
        ))}
        {days.map((day) => {
          const dayItems = getItemsForDay(day);
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[90px] border-b border-r border-gray-100 p-1.5 ${isToday ? "bg-blue-50" : "hover:bg-gray-50"}`}
            >
              <span className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full mb-1 ${isToday ? "bg-blue-600 text-white" : "text-gray-500"}`}>
                {format(day, "d")}
              </span>
              <div className="space-y-0.5">
                {dayItems.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onCardClick(item)}
                    className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate font-medium ${STATUS_COLORS[item.status] || "bg-gray-100 text-gray-700"}`}
                  >
                    {item.titulo}
                  </button>
                ))}
                {dayItems.length > 3 && (
                  <span className="text-xs text-gray-400 pl-1">+{dayItems.length - 3} mais</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Componente: Visualização em Lista ───────────────────────────────────────
function ListView({ items, onEdit, onDelete, onWhatsApp, sendingWhatsApp }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Treinamento</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Empresa</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Data / Horário</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Instrutor</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Carga</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Local</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Alunos</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.length === 0 && (
            <tr>
              <td colSpan={9} className="py-12 text-center text-gray-400">Nenhum treinamento encontrado.</td>
            </tr>
          )}
          {items.map((item) => (
            <tr key={`${item._source}-${item.id}`} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{item.titulo}</div>
                <div className="text-xs text-gray-400">{item.modalidade}</div>
              </td>
              <td className="px-4 py-3 text-gray-700">{item.empresa_nome}</td>
              <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                <div>{item.periodo_descritivo || "—"}</div>
                <div className="text-xs text-gray-400">{item.horario !== "—" ? item.horario : ""}</div>
              </td>
              <td className="px-4 py-3 text-gray-700">{item.instrutor_nome}</td>
              <td className="px-4 py-3 text-gray-700">{item.carga_horaria}</td>
              <td className="px-4 py-3 text-gray-700">{item.local}</td>
              <td className="px-4 py-3 text-gray-700">{item.alunos}</td>
              <td className="px-4 py-3">
                <Badge className={`text-xs border ${STATUS_COLORS[item.status] || "bg-gray-100"}`}>
                  {item.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  {item._source === "ClassSchedule" && (
                    <>
                      <Link to={createPageUrl(`ClassDetails?id=${item.id}`)}>
                        <Button size="sm" variant="ghost" className="h-7 text-xs"><Eye className="w-3 h-3" /></Button>
                      </Link>
                      {item.instrutor_nome !== "—" && (
                        <Button size="sm" variant="ghost" className="h-7 text-green-600" onClick={() => onWhatsApp(item._raw)} disabled={sendingWhatsApp === item.id}>
                          <MessageCircle className="w-3 h-3" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => onEdit(item._raw)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-red-500" onClick={() => onDelete(item.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Componente: Cartão individual ───────────────────────────────────────────
function CardItem({ item, onEdit, onDelete, onWhatsApp, sendingWhatsApp, onConcluir, concluding }) {
  const isClassSchedule = item._source === "ClassSchedule";
  return (
    <Card className="border border-gray-200 bg-white hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex flex-col lg:flex-row justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[item.status] || "bg-gray-400"}`} />
              <h3 className="text-base font-bold text-gray-900">{item.titulo}</h3>
              {item._raw?.notes?.startsWith('📋 Proposta:') && (
                <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded px-1.5 py-0.5">📋 Da Proposta</span>
              )}
            </div>
            <p className="text-sm text-gray-500 ml-4">{item.empresa_nome}</p>
            </div>
            <Badge className={`text-xs border flex-shrink-0 ${STATUS_COLORS[item.status] || "bg-gray-100"}`}>
            {item.status}
            </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
              <div className="flex items-start gap-2">
                <Calendar className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Período</p>
                  <p className="text-xs font-semibold text-gray-800">
                    {item.periodo_descritivo || "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Horário</p>
                  <p className="text-xs font-semibold text-gray-800">{item.horario}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Instrutor</p>
                  <p className="text-xs font-semibold text-gray-800">{item.instrutor_nome}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <BookOpen className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Carga Horária</p>
                  <p className="text-xs font-semibold text-gray-800">{item.carga_horaria}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Local</p>
                  <p className="text-xs font-semibold text-gray-800">{item.local}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Users className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Alunos</p>
                  <p className="text-xs font-semibold text-gray-800">{item.alunos}</p>
                </div>
              </div>
            </div>

            {item.notes && (
              <div className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-2 border-l-2 border-gray-300">
                {item.notes}
              </div>
            )}
          </div>

          {isClassSchedule && (
            <div className="flex lg:flex-col gap-2 flex-shrink-0">
              <Link to={createPageUrl(`ClassDetails?id=${item.id}`)}>
                <Button size="sm" className="w-full bg-gray-900 hover:bg-gray-800 text-white text-xs">
                  <Eye className="w-3.5 h-3.5 mr-1" /> Ver
                </Button>
              </Link>
              {item.instrutor_nome !== "—" && (
                <Button size="sm" onClick={() => onWhatsApp(item._raw)} disabled={sendingWhatsApp === item.id} className="w-full bg-green-600 hover:bg-green-700 text-white text-xs">
                  <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => onEdit(item._raw)} className="w-full text-xs">
                <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
              </Button>
              {item.status !== 'Concluído' && (
                <Button
                  size="sm"
                  onClick={() => onConcluir(item._raw)}
                  disabled={concluding === item.id}
                  className="w-full text-xs bg-green-700 hover:bg-green-800 text-white"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  {concluding === item.id ? 'Concluindo...' : 'Concluir'}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => onDelete(item.id)} className="w-full text-xs text-red-600">
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function SchedulePage() {
  const [view, setView] = useState("cards"); // cards | list | calendar
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(null);
  const [concluding, setConcluding] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [selectedCalendarItem, setSelectedCalendarItem] = useState(null);
  const queryClient = useQueryClient();

  // Busca as duas entidades em paralelo
  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ["classSchedules"],
    queryFn: () => base44.entities.ClassSchedule.list("-created_date", 300),
    initialData: [],
  });

  const { data: agendamentos = [], isLoading: loadingAgenda } = useQuery({
    queryKey: ["agendamentos"],
    queryFn: () => base44.entities.AgendaTreinamento.list("-data_inicio", 300),
    initialData: [],
  });

  const isLoading = loadingClasses || loadingAgenda;

  // Normaliza e combina
  const allItems = useMemo(() => {
    const cs = classes.map(normalizeClassSchedule);
    const ag = agendamentos.map(normalizeAgendaTreinamento);
    const combined = [...cs, ...ag];
    combined.sort((a, b) => {
      if (!a.data_inicio) return 1;
      if (!b.data_inicio) return -1;
      return new Date(b.data_inicio) - new Date(a.data_inicio);
    });
    return combined;
  }, [classes, agendamentos]);

  // Filtros
  const filtered = useMemo(() => {
    return allItems.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch = !search ||
        item.titulo?.toLowerCase().includes(q) ||
        item.empresa_nome?.toLowerCase().includes(q) ||
        item.instrutor_nome?.toLowerCase().includes(q) ||
        item.local?.toLowerCase().includes(q);
      const matchStatus = filterStatus === "todos" || item.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [allItems, search, filterStatus]);

  // Estatísticas
  const stats = useMemo(() => {
    const datas = allItems.map(i => i.data_inicio).filter(Boolean).sort();
    const datasTermino = allItems.map(i => i.data_fim || i.data_inicio).filter(Boolean).sort();
    return {
      total: allItems.length,
      agendado: allItems.filter((c) => c.status === "Agendado").length,
      emAndamento: allItems.filter((c) => c.status === "Em Andamento").length,
      concluido: allItems.filter((c) => c.status === "Concluído").length,
      totalAlunos: classes.reduce((s, c) => s + (c.students_count || 0), 0),
      dataInicio: datas[0] || null,
      dataFim: datasTermino[datasTermino.length - 1] || datas[datas.length - 1] || null,
    };
  }, [allItems, classes]);

  // Mutações ClassSchedule
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClassSchedule.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["classSchedules"] }); setShowForm(false); setEditingClass(null); toast.success("✅ Turma criada!"); },
    onError: (e) => toast.error("❌ Erro ao criar turma", { description: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClassSchedule.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["classSchedules"] }); setShowForm(false); setEditingClass(null); toast.success("✅ Turma atualizada!"); },
    onError: (e) => toast.error("❌ Erro ao atualizar turma", { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClassSchedule.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["classSchedules"] }); toast.success("✅ Turma excluída!"); },
    onError: (e) => toast.error("❌ Erro ao excluir turma", { description: e.message }),
  });

  const handleSubmit = (data) => {
    if (editingClass) updateMutation.mutate({ id: editingClass.id, data });
    else createMutation.mutate(data);
  };

  const handleEdit = (rawItem) => { setEditingClass(rawItem); setShowForm(true); };

  const handleConcluir = async (rawItem) => {
    setConcluding(rawItem.id);
    try {
      // Deriva o mês a partir de realization_dates se month estiver vazio
      let month = rawItem.month;
      if (!month) {
        const date = rawItem.realization_dates?.[0];
        if (date) {
          const [year, m] = date.split('-');
          const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
          month = `${monthNames[parseInt(m) - 1]}/${year}`;
        }
      }
      await base44.entities.ClassSchedule.update(rawItem.id, {
        status: 'Concluído',
        month: month || rawItem.month,
      });
      queryClient.invalidateQueries({ queryKey: ["classSchedules"] });
      toast.success(`✅ Turma "${rawItem.training_name}" concluída! Já disponível no BMM.`);
    } catch (e) {
      toast.error('❌ Erro ao concluir turma', { description: e.message });
    } finally {
      setConcluding(null);
    }
  };

  const handleSendWhatsApp = async (classItem) => {
    setSendingWhatsApp(classItem.id);
    try {
      // Se não tem instructor_id, tenta buscar o instrutor pelo nome para obter o telefone
      let recipientPhone = null;
      let recipientId = classItem.instructor_id || null;

      if (!recipientId && classItem.instructor_name && classItem.instructor_name !== "—") {
        const instructors = await base44.entities.Instructor.list();
        const found = instructors.find(i =>
          i.name?.toLowerCase().trim() === classItem.instructor_name?.toLowerCase().trim()
        );
        if (found) {
          recipientId = found.id;
          recipientPhone = found.phone || null;
        }
      }

      if (!recipientId && !recipientPhone) {
        toast.error("❌ Instrutor não encontrado no sistema", {
          description: `Verifique se "${classItem.instructor_name}" está cadastrado com telefone.`,
        });
        setSendingWhatsApp(null);
        return;
      }

      const response = await base44.functions.invoke("enviarNotificacaoWhatsApp", {
        recipient_type: "instructor",
        recipient_id: recipientId,
        recipient_name: classItem.instructor_name,
        recipient_phone: recipientPhone,
        message_type: "class_schedule",
        class_schedule_id: classItem.id,
      });

      if (response.data?.success) {
        toast.success("✅ WhatsApp enviado ao instrutor com sucesso!", {
          description: `Mensagem entregue para ${response.data.recipient} (${response.data.phone})`,
        });
      } else {
        toast.error("❌ Não foi possível enviar o WhatsApp", {
          description: response.data?.error || "Verifique se o instrutor tem telefone cadastrado.",
        });
      }
    } catch (e) {
      toast.error("❌ Erro ao enviar WhatsApp", { description: e.message });
    } finally {
      setSendingWhatsApp(null);
    }
  };

  const VIEWS = [
    { key: "cards", label: "Cartões", icon: LayoutGrid },
    { key: "list", label: "Lista", icon: List },
    { key: "calendar", label: "Calendário", icon: Calendar },
  ];

  const STATUS_OPTIONS = ["todos", "Aguardando", "Agendado", "Confirmado", "Em Andamento", "Concluído", "Cancelado"];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cronograma de Turmas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {stats.total} treinamento(s) no total
            {stats.dataInicio && (
              <span className="ml-2 text-gray-400">
                · de{" "}
                <span className="font-medium text-gray-600">
                  {format(parseISO(stats.dataInicio), "dd/MM/yyyy")}
                </span>
                {stats.dataFim && stats.dataFim !== stats.dataInicio && (
                  <>
                    {" "}até{" "}
                    <span className="font-medium text-gray-600">
                      {format(parseISO(stats.dataFim), "dd/MM/yyyy")}
                    </span>
                  </>
                )}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => { setEditingClass(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
        >
          <CalendarPlus className="w-4 h-4" /> Nova Turma
        </button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Agendadas", value: stats.agendado, icon: Calendar, color: "text-blue-600 bg-blue-50" },
          { label: "Em Andamento", value: stats.emAndamento, icon: Clock, color: "text-yellow-600 bg-yellow-50" },
          { label: "Concluídas", value: stats.concluido, icon: BookOpen, color: "text-gray-600 bg-gray-50" },
          { label: "Total Alunos", value: stats.totalAlunos, icon: Users, color: "text-green-600 bg-green-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color}`}><Icon className="w-4 h-4" /></div>
              <div>
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Barra de ferramentas */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Busca */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por treinamento, empresa, instrutor, local..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        {/* Filtro status */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-2 bg-white text-gray-700 focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === "todos" ? "Todos os status" : s}</option>
            ))}
          </select>
        </div>

        {/* Toggle view */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
          {VIEWS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${view === key ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <Card className="border border-gray-300 bg-white">
          <CardContent className="p-6">
            <ClassScheduleForm
              classSchedule={editingClass}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditingClass(null); }}
            />
          </CardContent>
        </Card>
      )}

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-3" />
          Carregando treinamentos...
        </div>
      ) : view === "calendar" ? (
        <>
          <CalendarView items={filtered} onCardClick={setSelectedCalendarItem} />
          {selectedCalendarItem && (
            <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCalendarItem(null)}>
              <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-bold text-lg text-gray-900 mb-1">{selectedCalendarItem.titulo}</h3>
                <p className="text-sm text-gray-500 mb-4">{selectedCalendarItem.empresa_nome}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2"><span className="text-gray-400 w-24">Data:</span><span>{selectedCalendarItem.data_inicio ? format(parseISO(selectedCalendarItem.data_inicio), "dd/MM/yyyy") : "—"}</span></div>
                  <div className="flex gap-2"><span className="text-gray-400 w-24">Horário:</span><span>{selectedCalendarItem.horario}</span></div>
                  <div className="flex gap-2"><span className="text-gray-400 w-24">Instrutor:</span><span>{selectedCalendarItem.instrutor_nome}</span></div>
                  <div className="flex gap-2"><span className="text-gray-400 w-24">Local:</span><span>{selectedCalendarItem.local}</span></div>
                  <div className="flex gap-2"><span className="text-gray-400 w-24">Carga:</span><span>{selectedCalendarItem.carga_horaria}</span></div>
                  <div className="flex gap-2"><span className="text-gray-400 w-24">Alunos:</span><span>{selectedCalendarItem.alunos}</span></div>
                  <div className="flex gap-2"><span className="text-gray-400 w-24">Status:</span>
                    <Badge className={`text-xs border ${STATUS_COLORS[selectedCalendarItem.status] || "bg-gray-100"}`}>{selectedCalendarItem.status}</Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setSelectedCalendarItem(null)}>Fechar</Button>
              </div>
            </div>
          )}
        </>
      ) : view === "list" ? (
        <ListView
          items={filtered}
          onEdit={handleEdit}
          onDelete={(id) => deleteMutation.mutate(id)}
          onWhatsApp={handleSendWhatsApp}
          sendingWhatsApp={sendingWhatsApp}
        />
      ) : (
        /* Cartões */
        filtered.length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="p-12 text-center">
              <Calendar className="w-14 h-14 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-bold text-gray-700 mb-1">Nenhum treinamento encontrado</h3>
              <p className="text-gray-400 text-sm">Ajuste os filtros ou crie uma nova turma</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map((item) => (
              <CardItem
                key={`${item._source}-${item.id}`}
                item={item}
                onEdit={handleEdit}
                onDelete={(id) => deleteMutation.mutate(id)}
                onWhatsApp={handleSendWhatsApp}
                sendingWhatsApp={sendingWhatsApp}
                onConcluir={handleConcluir}
                concluding={concluding}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}