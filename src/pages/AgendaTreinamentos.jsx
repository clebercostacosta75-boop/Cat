import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Calendar, List, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AgendaCalendario from "@/components/agenda/AgendaCalendario";
import AgendaDayPanel from "@/components/agenda/AgendaDayPanel";
import AgendaFormModal from "@/components/agenda/AgendaFormModal";

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
        empresa_id: company_id,
        empresa_nome: company_name ? decodeURIComponent(company_name) : '',
      });
      setModalOpen(true);
      // Limpar URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Dados
  const { data: agendamentos = [], isLoading } = useQuery({
    queryKey: ["agendamentos"],
    queryFn: () => base44.entities.AgendaTreinamento.list("-data_inicio", 200),
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

  // Mutações
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AgendaTreinamento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["agendamentos"]);
      setModalOpen(false);
      toast.success("Agendamento criado com sucesso!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AgendaTreinamento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["agendamentos"]);
      setModalOpen(false);
      setEditingItem(null);
      toast.success("Agendamento atualizado!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AgendaTreinamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["agendamentos"]);
      toast.success("Agendamento removido.");
    },
  });

  const handleSave = (formData) => {
    if (editingItem?.id) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
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
        queryClient.invalidateQueries(["agendamentos"]);
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
          <p className="text-sm text-gray-500 mt-0.5">{agendamentos.length} treinamento(s) cadastrado(s)</p>
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
                    {a.curso_nome && a.titulo && <div className="text-xs text-gray-500">{a.curso_nome}</div>}
                    {a.instrutor_nome && <div className="text-xs text-gray-400">{a.instrutor_nome}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{a.empresa_nome || "—"}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    <div>{a.data_inicio ? format(new Date(a.data_inicio + "T00:00:00"), "dd/MM/yyyy") : "—"}</div>
                    {a.horario_inicio && <div className="text-xs text-gray-400">{a.horario_inicio}{a.horario_fim ? ` - ${a.horario_fim}` : ""}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {(a.alunos_inscritos?.length || 0)} / {a.vagas_total || "∞"}
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