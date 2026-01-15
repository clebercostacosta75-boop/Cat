import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, FileText, Filter, Calendar, User } from "lucide-react";
import { format } from "date-fns";

export default function AuditLogPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 500),
    initialData: [],
  });

  // Filtrar logs
  const filteredLogs = logs.filter(log => {
    if (!log.created_date) return false;
    
    const logDate = new Date(log.created_date);
    if (isNaN(logDate.getTime())) return false;
    
    const logMonth = logDate.getMonth();
    const logYear = logDate.getFullYear();
    
    const matchesSearch = 
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesEntity = entityFilter === "all" || log.entity === entityFilter;
    const matchesMonth = logMonth === parseInt(selectedMonth);
    const matchesYear = logYear === parseInt(selectedYear);
    
    return matchesSearch && matchesAction && matchesEntity && matchesMonth && matchesYear;
  });

  // Estatísticas
  const stats = {
    total: filteredLogs.length,
    criacao: filteredLogs.filter(l => l.action === 'CRIAÇÃO').length,
    edicao: filteredLogs.filter(l => l.action === 'EDIÇÃO').length,
    exclusao: filteredLogs.filter(l => l.action === 'EXCLUSÃO').length,
  };

  const actionColors = {
    'CRIAÇÃO': 'bg-green-100 text-green-800',
    'EDIÇÃO': 'bg-blue-100 text-blue-800',
    'EXCLUSÃO': 'bg-red-100 text-red-800',
    'VISUALIZAÇÃO': 'bg-gray-100 text-gray-800',
    'ENVIO_EMAIL': 'bg-purple-100 text-purple-800',
    'ENVIO_WHATSAPP': 'bg-emerald-100 text-emerald-800',
    'GERAÇÃO_BMM': 'bg-amber-100 text-amber-800',
    'EXPORTAÇÃO': 'bg-indigo-100 text-indigo-800',
  };

  const entities = [...new Set(logs.map(log => log.entity))];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black flex items-center gap-2">
            <FileText className="w-7 h-7" />
            Log de Auditoria
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Rastreamento completo de todas as ações realizadas no sistema
          </p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <FileText className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{stats.total}</p>
              <p className="text-sm text-gray-600">Total de Ações</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="w-6 h-6 text-green-600 mb-2">+</div>
              <p className="text-2xl font-bold text-black">{stats.criacao}</p>
              <p className="text-sm text-gray-600">Criações</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="w-6 h-6 text-blue-600 mb-2">✏️</div>
              <p className="text-2xl font-bold text-black">{stats.edicao}</p>
              <p className="text-sm text-gray-600">Edições</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="w-6 h-6 text-red-600 mb-2">🗑️</div>
              <p className="text-2xl font-bold text-black">{stats.exclusao}</p>
              <p className="text-sm text-gray-600">Exclusões</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs mb-1">Pesquisar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Usuário, entidade..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Ação</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Ações</SelectItem>
                    <SelectItem value="CRIAÇÃO">Criação</SelectItem>
                    <SelectItem value="EDIÇÃO">Edição</SelectItem>
                    <SelectItem value="EXCLUSÃO">Exclusão</SelectItem>
                    <SelectItem value="ENVIO_EMAIL">Envio Email</SelectItem>
                    <SelectItem value="ENVIO_WHATSAPP">Envio WhatsApp</SelectItem>
                    <SelectItem value="GERAÇÃO_BMM">Geração BMM</SelectItem>
                    <SelectItem value="EXPORTAÇÃO">Exportação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Entidade</Label>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {entities.filter(entity => entity && entity.trim() !== '').map(entity => (
                      <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Mês</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((month, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Ano</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["2024", "2025", "2026"].map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Logs */}
        <Card className="border border-gray-300">
          <CardHeader className="bg-gray-100">
            <h2 className="text-lg font-bold">Histórico de Ações</h2>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="font-bold">Data/Hora</TableHead>
                    <TableHead className="font-bold">Usuário</TableHead>
                    <TableHead className="font-bold">Ação</TableHead>
                    <TableHead className="font-bold">Entidade</TableHead>
                    <TableHead className="font-bold">Registro</TableHead>
                    <TableHead className="font-bold">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Carregando logs...
                      </TableCell>
                    </TableRow>
                  ) : filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nenhum log encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => {
                      const logDate = log.created_date ? new Date(log.created_date) : null;
                      const isValidDate = logDate && !isNaN(logDate.getTime());

                      return (
                        <TableRow key={log.id} className="hover:bg-gray-50">
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="font-medium">
                                  {isValidDate ? format(logDate, 'dd/MM/yyyy') : '-'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {isValidDate ? format(logDate, 'HH:mm:ss') : '-'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-medium">{log.user_name}</p>
                              <p className="text-xs text-gray-500">{log.user_email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={actionColors[log.action] || 'bg-gray-100'}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{log.entity}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {log.entity_name || log.entity_id?.slice(0, 8) || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 max-w-xs">
                          {log.details && Object.keys(log.details).length > 0 ? (
                            <pre className="whitespace-pre-wrap font-mono text-xs">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}