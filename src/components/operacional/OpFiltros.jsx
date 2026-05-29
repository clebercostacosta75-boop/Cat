import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, ChevronDown, Building2 } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function OpFiltros({ filtros, setFiltros, companies, instructors, onFiltrar, onLimpar }) {
  const [openCompany, setOpenCompany] = useState(false);
  const [searchCompany, setSearchCompany] = useState("");

  const locais = [...new Set(
    (companies || []).map(c => c.city).filter(Boolean)
  )];

  const filteredCompanies = (companies || []).filter(c =>
    (c.company_name || c.nome_fantasia || c.name || "")
      .toLowerCase()
      .includes(searchCompany.toLowerCase()) ||
    (c.cnpj || "").includes(searchCompany)
  );

  const selectedCompanyName = companies?.find(c => c.id === filtros.empresa)
    ?.company_name || companies?.find(c => c.id === filtros.empresa)?.nome_fantasia
    || companies?.find(c => c.id === filtros.empresa)?.name || "Selecione uma empresa";

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Filter className="w-4 h-4 text-blue-600" />
        <span className="font-semibold text-gray-800 text-sm">Filtros Globais</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Data Início</label>
          <Input
            type="date"
            value={filtros.dataInicio}
            onChange={e => setFiltros(f => ({ ...f, dataInicio: e.target.value }))}
            className="text-sm h-8"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Data Fim</label>
          <Input
            type="date"
            value={filtros.dataFim}
            onChange={e => setFiltros(f => ({ ...f, dataFim: e.target.value }))}
            className="text-sm h-8"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Empresa</label>
          <Popover open={openCompany} onOpenChange={setOpenCompany}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-8 text-sm w-full justify-between px-2"
                onClick={() => setOpenCompany(true)}
              >
                <span className="truncate text-left">
                  {filtros.empresa === "_all" ? "Todas" : selectedCompanyName}
                </span>
                <ChevronDown className="w-3 h-3 ml-1 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-72" align="start">
              <Command>
                <CommandInput
                  placeholder="Buscar empresa..."
                  value={searchCompany}
                  onValueChange={setSearchCompany}
                  className="text-xs h-7"
                />
                <CommandEmpty>
                  <div className="text-xs text-gray-500 py-2">Nenhuma empresa encontrada</div>
                </CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  <CommandItem
                    value="_all"
                    onSelect={() => {
                      setFiltros(f => ({ ...f, empresa: "_all" }));
                      setOpenCompany(false);
                      setSearchCompany("");
                    }}
                    className="text-xs cursor-pointer"
                  >
                    <span className="font-medium">Todas as Empresas</span>
                  </CommandItem>
                  {filteredCompanies.map(c => (
                    <CommandItem
                      key={c.id}
                      value={c.id}
                      onSelect={() => {
                        setFiltros(f => ({ ...f, empresa: c.id }));
                        setOpenCompany(false);
                        setSearchCompany("");
                      }}
                      className="text-xs cursor-pointer flex items-start gap-2"
                    >
                      <Building2 className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-600" />
                      <div className="flex-1">
                        <div className="font-medium">{c.company_name || c.nome_fantasia || c.name}</div>
                        {c.cnpj && <div className="text-gray-500 text-xs">{c.cnpj}</div>}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Instrutor</label>
          <Select value={filtros.instrutor} onValueChange={v => setFiltros(f => ({ ...f, instrutor: v }))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {(instructors || []).map(i => (
                <SelectItem key={i.id} value={i.id}>{i.full_name || i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Status</label>
          <Select value={filtros.status} onValueChange={v => setFiltros(f => ({ ...f, status: v }))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              <SelectItem value="Agendado">Agendado</SelectItem>
              <SelectItem value="Em Andamento">Em Andamento</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Modalidade</label>
          <Select value={filtros.modalidade} onValueChange={v => setFiltros(f => ({ ...f, modalidade: v }))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas</SelectItem>
              <SelectItem value="Formação">Formação</SelectItem>
              <SelectItem value="Periódico">Periódico</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
          <Select value={filtros.categoria} onValueChange={v => setFiltros(f => ({ ...f, categoria: v }))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas</SelectItem>
              <SelectItem value="Presencial">Presencial</SelectItem>
              <SelectItem value="Híbrido">Híbrido</SelectItem>
              <SelectItem value="Online">Online</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Busca livre</label>
          <Input
            placeholder="Buscar..."
            value={filtros.busca}
            onChange={e => setFiltros(f => ({ ...f, busca: e.target.value }))}
            className="text-sm h-8"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" className="bg-blue-700 hover:bg-blue-800 gap-1" onClick={onFiltrar}>
          <Filter className="w-3 h-3" /> Filtrar
        </Button>
        <Button size="sm" variant="outline" onClick={onLimpar} className="gap-1">
          <X className="w-3 h-3" /> Limpar Filtros
        </Button>
      </div>
    </div>
  );
}