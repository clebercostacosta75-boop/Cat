import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";

const STATUS_COLORS = {
  "Em Dia": "bg-green-100 text-green-700",
  "Pendente": "bg-amber-100 text-amber-700",
  "Vencido": "bg-red-100 text-red-700",
};

export default function EPIFichasTab({ entregas, colaboradores }) {
  const [search, setSearch] = useState("");
  const [selectedCol, setSelectedCol] = useState(null);
  const [colEntregas, setColEntregas] = useState([]);

  // Agrupar entregas por colaborador
  const fichas = colaboradores
    .filter(c => entregas.some(e => e.colaborador_sst_id === c.id || e.nome_colaborador === c.nome))
    .map(c => {
      const minhasEntregas = entregas.filter(e => e.colaborador_sst_id === c.id || e.nome_colaborador === c.nome);
      const vencidos = minhasEntregas.filter(e => {
        if (!e.data_proxima_troca) return false;
        return new Date(e.data_proxima_troca + "T00:00:00") < new Date();
      }).length;
      const pendentes = minhasEntregas.filter(e => e.status_assinatura === "Pendente").length;
      const status = vencidos > 0 ? "Vencido" : pendentes > 0 ? "Pendente" : "Em Dia";
      return {
        colaborador: c,
        total: minhasEntregas.length,
        pendentes,
        vencidos,
        status
      };
    });

  const filtered = fichas.filter(f =>
    f.colaborador.nome?.toLowerCase().includes(search.toLowerCase()) ||
    f.colaborador.cpf?.includes(search)
  );

  const openFicha = (ficha) => {
    setSelectedCol(ficha);
    setColEntregas(entregas.filter(e =>
      e.colaborador_sst_id === ficha.colaborador.id || e.nome_colaborador === ficha.colaborador.nome
    ));
  };

  if (selectedCol) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <Button variant="ghost" onClick={() => setSelectedCol(null)}>← Voltar</Button>
          <div>
            <h2 className="font-bold text-gray-800">{selectedCol.colaborador.nome}</h2>
            <p className="text-sm text-gray-500">{selectedCol.colaborador.funcao || selectedCol.colaborador.cargo} — CPF: {selectedCol.colaborador.cpf || "—"}</p>
          </div>
          <Badge className={`ml-auto text-xs ${STATUS_COLORS[selectedCol.status] || ""}`}>{selectedCol.status}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-green-50 border rounded-lg p-3 text-center"><p className="text-2xl font-bold text-green-700">{selectedCol.total}</p><p className="text-xs text-gray-500">Entregues</p></div>
          <div className="bg-amber-50 border rounded-lg p-3 text-center"><p className="text-2xl font-bold text-amber-700">{selectedCol.pendentes}</p><p className="text-xs text-gray-500">Assinatura Pendente</p></div>
          <div className="bg-red-50 border rounded-lg p-3 text-center"><p className="text-2xl font-bold text-red-700">{selectedCol.vencidos}</p><p className="text-xs text-gray-500">Vencidos</p></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
            <thead><tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-medium text-gray-600">EPI</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">CA</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Data Entrega</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Próxima Troca</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Qtd</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Assinatura</th>
            </tr></thead>
            <tbody>
              {colEntregas.map(e => {
                const vencido = e.data_proxima_troca && new Date(e.data_proxima_troca + "T00:00:00") < new Date();
                return (
                  <tr key={e.id} className={`border-b ${vencido ? "bg-red-50/50" : ""}`}>
                    <td className="px-4 py-3 font-medium">{e.epi_nome || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{e.numero_ca || "—"}</td>
                    <td className="px-4 py-3">{e.data_entrega ? format(parseISO(e.data_entrega), "dd/MM/yyyy") : "—"}</td>
                    <td className={`px-4 py-3 ${vencido ? "text-red-600 font-medium" : ""}`}>{e.data_proxima_troca ? format(parseISO(e.data_proxima_troca), "dd/MM/yyyy") : "—"}</td>
                    <td className="px-4 py-3">{e.quantidade || 1}</td>
                    <td className="px-4 py-3"><Badge className={`text-xs ${{"Pendente":"bg-amber-100 text-amber-700","Assinado":"bg-green-100 text-green-700","Recusado":"bg-red-100 text-red-700"}[e.status_assinatura]||""}`}>{e.status_assinatura}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="outline" className="gap-1.5"><FileText className="w-4 h-4" /> Gerar PDF da Ficha</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative max-w-xs mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Buscar colaborador ou CPF..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
          <thead><tr className="bg-gray-50 border-b">
            <th className="text-left px-4 py-3 font-medium text-gray-600">Colaborador</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Função</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">EPIs Entregues</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Pendentes</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Vencidos</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Status Geral</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Nenhuma ficha encontrada</td></tr>
            ) : filtered.map((f, i) => (
              <tr key={i} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => openFicha(f)}>
                <td className="px-4 py-3 font-medium">{f.colaborador.nome}</td>
                <td className="px-4 py-3 text-gray-600">{f.colaborador.funcao || f.colaborador.cargo || "—"}</td>
                <td className="px-4 py-3 text-center">{f.total}</td>
                <td className="px-4 py-3 text-center">{f.pendentes > 0 ? <span className="text-amber-600 font-medium">{f.pendentes}</span> : 0}</td>
                <td className="px-4 py-3 text-center">{f.vencidos > 0 ? <span className="text-red-600 font-medium">{f.vencidos}</span> : 0}</td>
                <td className="px-4 py-3"><Badge className={`text-xs ${STATUS_COLORS[f.status] || ""}`}>{f.status}</Badge></td>
                <td className="px-4 py-3 text-right"><Button size="icon" variant="ghost" onClick={() => openFicha(f)}><ChevronRight className="w-4 h-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}