import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

export const FILTROS_INICIAIS = { busca: "", origem: "todos", curso: "", empresa: "", de: "", ate: "" };

export default function FilaFiltros({ filtros, setFiltros, origemBloqueada = false }) {
  const set = (k, v) => setFiltros((f) => ({ ...f, [k]: v }));
  return (
    <div className="bg-gray-50 border rounded-lg p-3 flex flex-wrap gap-2 items-center">
      <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
      <Input placeholder="Buscar aluno/CPF" value={filtros.busca} onChange={(e) => set("busca", e.target.value)} className="h-8 text-xs w-40" />
      {!origemBloqueada && (
        <select value={filtros.origem} onChange={(e) => set("origem", e.target.value)} className="border rounded-md px-2 h-8 text-xs text-gray-600 bg-white">
          <option value="todos">Todos (origem)</option>
          <option value="empresa">🏢 Empresas</option>
          <option value="individual">👤 Individual</option>
        </select>
      )}
      <Input placeholder="Curso" value={filtros.curso} onChange={(e) => set("curso", e.target.value)} className="h-8 text-xs w-36" />
      <Input placeholder="Empresa contratante" value={filtros.empresa} onChange={(e) => set("empresa", e.target.value)} className="h-8 text-xs w-40" />
      <Input type="date" title="Conclusão de" value={filtros.de} onChange={(e) => set("de", e.target.value)} className="h-8 text-xs w-36" />
      <Input type="date" title="Conclusão até" value={filtros.ate} onChange={(e) => set("ate", e.target.value)} className="h-8 text-xs w-36" />
      <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setFiltros(FILTROS_INICIAIS)}>
        <X className="w-3 h-3" /> Limpar
      </Button>
    </div>
  );
}