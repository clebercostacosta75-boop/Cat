import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { differenceInDays, parseISO, format } from "date-fns";
import { Search, Download, AlertTriangle } from "lucide-react";

function certStatus(valid_until, status) {
  if (status === "revoked") return { label: "Revogado", color: "bg-gray-100 text-gray-500" };
  if (!valid_until) return { label: "Sem Validade", color: "bg-gray-100 text-gray-500" };
  const d = differenceInDays(parseISO(valid_until), new Date());
  if (d < 0) return { label: "Vencido", color: "bg-red-100 text-red-700", bg: "border-red-300" };
  if (d <= 30) return { label: `Vencendo ${d}d`, color: "bg-yellow-100 text-yellow-700", bg: "border-yellow-200" };
  return { label: "Válido", color: "bg-green-100 text-green-700", bg: "border-green-100" };
}

export default function C360Certificados({ certificados }) {
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  const vencidos = (certificados || []).filter(c => {
    if (!c.valid_until) return false;
    return differenceInDays(parseISO(c.valid_until), new Date()) < 0;
  });

  const filtered = (certificados || []).filter(c =>
    (c.student_name?.toLowerCase().includes(search.toLowerCase()) || c.course_name?.toLowerCase().includes(search.toLowerCase())) &&
    (!filtroStatus || (() => {
      const st = certStatus(c.valid_until, c.status);
      if (filtroStatus === "Válido") return st.label === "Válido";
      if (filtroStatus === "Vencido") return st.label === "Vencido";
      if (filtroStatus === "Vencendo") return st.label.includes("Vencendo");
      return true;
    })())
  );

  return (
    <div className="space-y-4">
      {vencidos.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <strong>{vencidos.length} certificado(s) vencido(s)</strong> nesta empresa. Solicite renovação.
        </div>
      )}

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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.length === 0 ? <div className="col-span-3 text-center py-12 text-gray-400">Nenhum certificado encontrado</div> :
          filtered.map(c => {
            const st = certStatus(c.valid_until, c.status);
            return (
              <div key={c.id} className={`bg-white border rounded-xl p-4 ${st.bg || "border-gray-200"}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{c.student_name}</p>
                    <p className="text-xs text-gray-500">{c.course_name}</p>
                  </div>
                  <Badge className={`text-xs ${st.color}`}>{st.label}</Badge>
                </div>
                <div className="text-xs text-gray-500 space-y-0.5 mb-3">
                  {c.end_date && <p>Emissão: {format(parseISO(c.end_date), "dd/MM/yyyy")}</p>}
                  {c.valid_until && <p>Validade: {format(parseISO(c.valid_until), "dd/MM/yyyy")}</p>}
                  {c.certificate_code && <p className="font-mono">{c.certificate_code}</p>}
                </div>
                <Button size="sm" variant="outline" className="w-full gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </Button>
              </div>
            );
          })}
      </div>
    </div>
  );
}