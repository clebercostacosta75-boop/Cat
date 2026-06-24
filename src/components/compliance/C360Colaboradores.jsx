import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { differenceInDays, parseISO, format } from "date-fns";
import { Search, X } from "lucide-react";

function asoStatus(asos, colaboradorId) {
  const mine = (asos || []).filter(a => a.colaborador_sst_id === colaboradorId);
  if (mine.length === 0) return { label: "Sem ASO", color: "bg-gray-100 text-gray-500" };
  const latest = mine.sort((a, b) => (b.data_vencimento || "").localeCompare(a.data_vencimento || ""))[0];
  if (!latest.data_vencimento) return { label: "Sem Vencimento", color: "bg-gray-100 text-gray-500" };
  const d = differenceInDays(parseISO(latest.data_vencimento), new Date());
  if (d < 0) return { label: `Vencido`, color: "bg-red-100 text-red-700", data: latest.data_vencimento };
  if (d <= 30) return { label: `Vencendo ${d}d`, color: "bg-orange-100 text-orange-700", data: latest.data_vencimento };
  return { label: "Válido", color: "bg-green-100 text-green-700", data: latest.data_vencimento };
}

export default function C360Colaboradores({ colaboradores, asos, entregas, empresa }) {
  const [search, setSearch] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [selected, setSelected] = useState(null);
  const [colDetail, setColDetail] = useState({});
  const [loadingDetail, setLoadingDetail] = useState(false);

  const setores = [...new Set((colaboradores || []).map(c => c.setor).filter(Boolean))];

  const openDetail = async (col) => {
    setSelected(col);
    setLoadingDetail(true);
    const [myAsos, myExames, myEntregas] = await Promise.all([
      base44.entities.ASORegistro.filter({ colaborador_sst_id: col.id }),
      base44.entities.ExameComplementar.filter({ colaborador_sst_id: col.id }),
      base44.entities.EPIEntrega.filter({ colaborador_sst_id: col.id }),
    ]);
    setColDetail({ asos: myAsos, exames: myExames, entregas: myEntregas });
    setLoadingDetail(false);
  };

  const filtered = (colaboradores || []).filter(c =>
    (c.nome?.toLowerCase().includes(search.toLowerCase()) || c.cpf?.includes(search)) &&
    (!filtroSetor || c.setor === filtroSetor) &&
    (!filtroStatus || (() => {
      const st = asoStatus(asos, c.id);
      if (filtroStatus === "Válido") return st.label === "Válido";
      if (filtroStatus === "Vencido") return st.label.includes("Vencido");
      if (filtroStatus === "Vencendo") return st.label.includes("Vencendo");
      return true;
    })())
  );

  if (selected) {
    const { asos: myAsos = [], exames = [], entregas: myEnts = [] } = colDetail;
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" onClick={() => setSelected(null)}><X className="w-4 h-4 mr-1" />Fechar</Button>
          <div>
            <h2 className="font-bold text-gray-800">{selected.nome}</h2>
            <p className="text-sm text-gray-500">{selected.funcao || selected.cargo} — {selected.setor}</p>
          </div>
        </div>
        {loadingDetail ? <div className="text-center py-8 text-gray-400">Carregando...</div> : (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white border rounded-xl p-4">
              <h3 className="font-semibold text-sm mb-3">ASOs ({myAsos.length})</h3>
              {myAsos.map(a => (
                <div key={a.id} className="border-b pb-2 mb-2 text-xs">
                  <p className="font-medium">{a.tipo_exame}</p>
                  <p className="text-gray-500">{a.data_exame} | {a.resultado}</p>
                </div>
              ))}
              {myAsos.length === 0 && <p className="text-xs text-gray-400">Nenhum ASO</p>}
            </div>
            <div className="bg-white border rounded-xl p-4">
              <h3 className="font-semibold text-sm mb-3">Exames ({exames.length})</h3>
              {exames.map(ex => (
                <div key={ex.id} className="border-b pb-2 mb-2 text-xs">
                  <p className="font-medium">{ex.tipo_exame}</p>
                  <p className="text-gray-500">{ex.data_realizacao} | {ex.resultado || "—"}</p>
                </div>
              ))}
              {exames.length === 0 && <p className="text-xs text-gray-400">Nenhum exame</p>}
            </div>
            <div className="bg-white border rounded-xl p-4">
              <h3 className="font-semibold text-sm mb-3">EPIs ({myEnts.length})</h3>
              {myEnts.map(e => (
                <div key={e.id} className="border-b pb-2 mb-2 text-xs">
                  <p className="font-medium">{e.epi_nome}</p>
                  <p className="text-gray-500">{e.data_entrega} | {e.status_assinatura}</p>
                </div>
              ))}
              {myEnts.length === 0 && <p className="text-xs text-gray-400">Nenhum EPI</p>}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar colaborador..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todos os setores</option>
          {setores.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todos os status</option>
          {["Válido", "Vencendo", "Vencido"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
          <thead><tr className="bg-gray-50 border-b">
            <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Cargo/Função</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Setor</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">ASO</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimento ASO</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={5} className="text-center py-10 text-gray-400">Nenhum colaborador</td></tr> :
              filtered.map(c => {
                const st = asoStatus(asos, c.id);
                return (
                  <tr key={c.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(c)}>
                    <td className="px-4 py-3 font-medium text-rose-700 hover:underline">{c.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{c.funcao || c.cargo || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{c.setor || "—"}</td>
                    <td className="px-4 py-3"><Badge className={`text-xs ${st.color}`}>{st.label}</Badge></td>
                    <td className="px-4 py-3 text-gray-600">{st.data ? format(parseISO(st.data), "dd/MM/yyyy") : "—"}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}