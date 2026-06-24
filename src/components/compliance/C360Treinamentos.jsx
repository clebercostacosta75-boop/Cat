import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { differenceInDays, parseISO, format } from "date-fns";
import { Search } from "lucide-react";

export default function C360Treinamentos({ empresa }) {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  useEffect(() => {
    if (empresa?.id) {
      base44.entities.Certificate.filter({ client_id: empresa.id }).then(data => {
        setCerts(data);
        setLoading(false);
      });
    } else setLoading(false);
  }, [empresa?.id]);

  const getStatus = (valid_until) => {
    if (!valid_until) return { label: "Sem Validade", color: "bg-gray-100 text-gray-500" };
    const d = differenceInDays(parseISO(valid_until), new Date());
    if (d < 0) return { label: "Vencido", color: "bg-red-100 text-red-700" };
    if (d <= 30) return { label: `${d}d`, color: "bg-orange-100 text-orange-700" };
    return { label: "Válido", color: "bg-green-100 text-green-700" };
  };

  const filtered = certs.filter(c =>
    (c.student_name?.toLowerCase().includes(search.toLowerCase()) || c.course_name?.toLowerCase().includes(search.toLowerCase())) &&
    (!filtroStatus || (() => {
      const st = getStatus(c.valid_until);
      if (filtroStatus === "Válido") return st.label === "Válido";
      if (filtroStatus === "Vencido") return st.label === "Vencido";
      if (filtroStatus === "Vencendo") return !["Válido","Vencido","Sem Validade"].includes(st.label);
      return true;
    })())
  );

  const total = certs.length;
  const emitidos = certs.filter(c => c.status === "active" || c.status === "signed").length;
  const vencendo30 = certs.filter(c => {
    if (!c.valid_until) return false;
    const d = differenceInDays(parseISO(c.valid_until), new Date());
    return d >= 0 && d <= 30;
  }).length;
  const vencidos = certs.filter(c => {
    if (!c.valid_until) return false;
    return differenceInDays(parseISO(c.valid_until), new Date()) < 0;
  }).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center"><p className="text-3xl font-bold text-blue-700">{total}</p><p className="text-xs text-gray-500">Total Treinamentos</p></div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center"><p className="text-3xl font-bold text-green-700">{emitidos}</p><p className="text-xs text-gray-500">Certificados Emitidos</p></div>
        <div className={`border rounded-xl p-4 text-center ${vencendo30 > 0 ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-gray-100"}`}><p className={`text-3xl font-bold ${vencendo30 > 0 ? "text-orange-600" : "text-gray-500"}`}>{vencendo30}</p><p className="text-xs text-gray-500">Vencendo em 30d</p></div>
        <div className={`border rounded-xl p-4 text-center ${vencidos > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-100"}`}><p className={`text-3xl font-bold ${vencidos > 0 ? "text-red-600" : "text-gray-500"}`}>{vencidos}</p><p className="text-xs text-gray-500">Vencidos</p></div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar colaborador ou curso..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todos</option>
          {["Válido","Vencendo","Vencido"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <div className="text-center py-10 text-gray-400">Carregando...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
            <thead><tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Colaborador</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Curso</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Data Conclusão</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Validade</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={5} className="text-center py-10 text-gray-400">Nenhum treinamento encontrado</td></tr> :
                filtered.map(c => {
                  const st = getStatus(c.valid_until);
                  return (
                    <tr key={c.id} className={`border-b hover:bg-gray-50 ${st.label === "Vencido" ? "bg-red-50/30" : ""}`}>
                      <td className="px-4 py-3 font-medium">{c.student_name}</td>
                      <td className="px-4 py-3">{c.course_name}</td>
                      <td className="px-4 py-3">{c.end_date ? format(parseISO(c.end_date), "dd/MM/yyyy") : "—"}</td>
                      <td className="px-4 py-3">{c.valid_until ? format(parseISO(c.valid_until), "dd/MM/yyyy") : "—"}</td>
                      <td className="px-4 py-3"><Badge className={`text-xs ${st.color}`}>{st.label}</Badge></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}