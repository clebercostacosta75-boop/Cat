import React from "react";
import { Button } from "@/components/ui/button";
import { FilterX } from "lucide-react";
import { FILTROS_DASH_INICIAIS } from "./dashDataEmpresas";

const Sel = ({ label, value, onChange, options }) => (
  <label className="flex flex-col gap-0.5 text-xs text-gray-500">
    {label}
    <select value={value} onChange={e => onChange(e.target.value)}
      className="border rounded-md px-2 py-1.5 text-xs text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 min-w-[120px]">
      <option value="">Todos</option>
      {options.map(o => typeof o === "string"
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </label>
);

export default function DashFiltros({ filtros, setFiltros, opcoes }) {
  const set = (k) => (v) => setFiltros(f => ({ ...f, [k]: v }));
  const ativos = Object.values(filtros).some(Boolean);
  return (
    <div className="bg-white border rounded-lg p-3 flex flex-wrap gap-3 items-end">
      <Sel label="Empresa" value={filtros.empresa} onChange={set("empresa")} options={opcoes.empresas} />
      <Sel label="Curso" value={filtros.curso} onChange={set("curso")} options={opcoes.cursos} />
      <Sel label="Instrutor" value={filtros.instrutor} onChange={set("instrutor")} options={opcoes.instrutores} />
      <Sel label="Período" value={filtros.periodo} onChange={set("periodo")} options={[
        { value: "hoje", label: "Hoje" }, { value: "semana", label: "Esta semana" },
        { value: "mes", label: "Este mês" }, { value: "futuros", label: "Futuros" },
        { value: "atrasados", label: "Atrasados" },
      ]} />
      <Sel label="Status da turma" value={filtros.statusTurma} onChange={set("statusTurma")}
        options={["Agendado", "Confirmado", "Em Andamento", "Concluído", "Cancelado", "Pendente", "Aguardando"]} />
      <Sel label="Status acadêmico" value={filtros.statusAcad} onChange={set("statusAcad")}
        options={["Pendente", "Aprovado", "Reprovado", "Não Concluiu"]} />
      <Sel label="Modalidade" value={filtros.modalidade} onChange={set("modalidade")} options={opcoes.modalidades} />
      <Sel label="Local" value={filtros.local} onChange={set("local")} options={opcoes.locais} />
      <Sel label="Pendências" value={filtros.pendencia} onChange={set("pendencia")} options={[
        "Sem instrutor", "Sem alunos", "Sem curso", "Sem empresa",
        "Concluída sem encerramento", "Sem resultado acadêmico", "Sem envio p/ Certificação",
      ]} />
      {ativos && (
        <Button size="sm" variant="ghost" className="h-8 text-xs text-gray-500"
          onClick={() => setFiltros(FILTROS_DASH_INICIAIS)}>
          <FilterX className="w-3.5 h-3.5 mr-1" /> Limpar
        </Button>
      )}
    </div>
  );
}