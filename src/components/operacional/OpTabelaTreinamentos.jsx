import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, MessageCircle, Pencil, CheckCircle, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Clock, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_COLORS = {
  "Agendado": "bg-blue-100 text-blue-700 border-blue-200",
  "Em Andamento": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Concluído": "bg-green-100 text-green-700 border-green-200",
  "Cancelado": "bg-red-100 text-red-700 border-red-200",
  "Pendente": "bg-orange-100 text-orange-700 border-orange-200",
  "Aguardando": "bg-purple-100 text-purple-700 border-purple-200",
};

const PAGE_SIZE = 20;

function SortHeader({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <th
      className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-gray-700"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active ? (
          sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3 opacity-30" />
        )}
      </span>
    </th>
  );
}

function formatDate(d) {
  if (!d) return "—";
  try { return format(parseISO(d), "dd/MM/yy", { locale: ptBR }); } catch { return d; }
}

export default function OpTabelaTreinamentos({ schedules, onView, onEdit, onConcluir, onDelete, onWhatsApp, onPendente, onAguardando }) {
  const [sortField, setSortField] = useState("created_date");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(0);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
    setPage(0);
  };

  const sorted = [...schedules].sort((a, b) => {
    const va = a[sortField] ?? "";
    const vb = b[sortField] ?? "";
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const pages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const cols = [
    { label: "Treinamento", field: "training_name" },
    { label: "Modalidade", field: "modality" },
    { label: "Categoria", field: "category" },
    { label: "Empresa", field: "company_name" },
    { label: "Alunos", field: "students_count" },
    { label: "Local", field: "location" },
    { label: "Status", field: "status" },
    { label: "CH (h)", field: "duration_hours" },
    { label: "Mês", field: "month" },
    { label: "Início", field: null },
    { label: "Fim", field: null },
    { label: "Dias Espec.", field: "specific_days" },
    { label: "Horário", field: "training_schedule" },
    { label: "Instrutor", field: "instructor_name" },
    { label: "Ações", field: null },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {cols.map(c => c.field ? (
                <SortHeader key={c.label} label={c.label} field={c.field} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              ) : (
                <th key={c.label} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={cols.length} className="px-4 py-8 text-center text-gray-400 text-sm">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : paginated.map(s => {
              const firstDate = s.realization_dates?.[0] || null;
              const lastDate = s.realization_dates?.[s.realization_dates.length - 1] || null;
              return (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 font-medium text-gray-900 max-w-[180px] truncate">{s.training_name || "—"}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{s.modality || "—"}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{s.category || "—"}</td>
                  <td className="px-3 py-2 text-gray-600 max-w-[140px] truncate">{s.company_name || "—"}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{s.students_count ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-600 max-w-[100px] truncate">{s.location || "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Badge className={`text-xs border ${STATUS_COLORS[s.status] || "bg-gray-100 text-gray-600"}`}>
                      {s.status || "—"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-center text-gray-700">{s.duration_hours ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{s.month || "—"}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatDate(firstDate)}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatDate(lastDate)}</td>
                  <td className="px-3 py-2 text-gray-600 max-w-[100px] truncate">{s.specific_days || "—"}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{s.training_schedule || "—"}</td>
                  <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate">{s.instructor_name || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      {onView && (
                        <button onClick={() => onView(s)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Ver">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onWhatsApp && (
                        <button onClick={() => onWhatsApp(s)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="WhatsApp">
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onEdit && (
                        <button onClick={() => onEdit(s)} className="p-1 text-gray-600 hover:bg-gray-100 rounded" title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onConcluir && s.status !== "Concluído" && s.status !== "Cancelado" && (
                        <button onClick={() => onConcluir(s)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Concluir">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onPendente && s.status !== "Cancelado" && (
                        <button onClick={() => onPendente(s)} className="p-1 text-orange-600 hover:bg-orange-50 rounded" title="Marcar como Pendente">
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onAguardando && s.status !== "Cancelado" && (
                        <button onClick={() => onAguardando(s)} className="p-1 text-purple-600 hover:bg-purple-50 rounded" title="Marcar como Aguardando">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDelete && (
                        <button onClick={() => onDelete(s)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Excluir">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <span className="text-xs text-gray-500">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} de {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <span className="text-xs text-gray-700 mx-1">{page + 1} / {pages}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}