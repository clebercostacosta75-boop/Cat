import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function F({ value, onChange, placeholder, options }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-44 h-9 text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}: Todos</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function RelatoriosFiltros({ filters, setFilters, opcoes }) {
  const set = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }));
  const temFiltro = Object.entries(filters).some(([k, v]) => (k === "de" || k === "ate" ? !!v : v !== "all"));

  return (
    <div className="flex flex-wrap gap-2 items-center bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">Período:</span>
        <Input type="date" className="w-36 h-9 text-xs" value={filters.de} onChange={(e) => set("de")(e.target.value)} />
        <span className="text-xs text-gray-400">a</span>
        <Input type="date" className="w-36 h-9 text-xs" value={filters.ate} onChange={(e) => set("ate")(e.target.value)} />
      </div>
      <F value={filters.curso} onChange={set("curso")} placeholder="Curso" options={opcoes.cursos} />
      <F value={filters.pacote} onChange={set("pacote")} placeholder="Pacote" options={opcoes.pacotes} />
      <F value={filters.atendente} onChange={set("atendente")} placeholder="Atendente" options={opcoes.atendentes} />
      <F value={filters.statusFinanceiro} onChange={set("statusFinanceiro")} placeholder="Financeiro"
        options={["Pendente", "Pago", "Parcialmente Pago", "Inadimplente", "Aguardando Confirmação", "Cortesia", "Cancelado"]} />
      <F value={filters.statusAcademico} onChange={set("statusAcademico")} placeholder="Acadêmico"
        options={["Pendente", "Aprovado", "Reprovado", "Não Concluiu"]} />
      <F value={filters.statusContrato} onChange={set("statusContrato")} placeholder="Contrato"
        options={[{ value: "sem_contrato", label: "Sem contrato" }, { value: "aguardando", label: "Aguardando assinatura" }, { value: "assinado", label: "Assinado" }]} />
      <F value={filters.origem} onChange={set("origem")} placeholder="Origem" options={opcoes.origens} />
      <F value={filters.formaPagamento} onChange={set("formaPagamento")} placeholder="Forma Pgto" options={opcoes.formasPagamento} />
      <F value={filters.statusOferta} onChange={set("statusOferta")} placeholder="Status Oferta"
        options={["Aberta", "Em divulgação", "Esgotada", "Encerrada", "Cancelada"]} />
      <F value={filters.pendencia} onChange={set("pendencia")} placeholder="Pendência"
        options={[
          { value: "pagamento", label: "Pagamento pendente" },
          { value: "contrato", label: "Contrato não assinado" },
          { value: "sem_datas", label: "Sem datas" },
          { value: "sem_resultado", label: "Sem resultado acadêmico" },
          { value: "apto", label: "Apto p/ certificação" },
          { value: "bloqueado", label: "Bloqueado p/ certificação" },
        ]} />
      {temFiltro && (
        <Button variant="outline" size="sm" className="text-xs h-9" onClick={() =>
          setFilters({ de: "", ate: "", curso: "all", pacote: "all", atendente: "all", statusFinanceiro: "all", statusAcademico: "all", statusContrato: "all", origem: "all", formaPagamento: "all", statusOferta: "all", pendencia: "all" })
        }>
          Limpar filtros
        </Button>
      )}
    </div>
  );
}