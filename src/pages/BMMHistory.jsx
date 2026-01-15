import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  FileText, Search, Filter, Download, Eye, Mail, 
  Calendar, Building2, CheckCircle, Clock, Send, History, TrendingUp, DollarSign, Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function BMMHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCompany, setFilterCompany] = useState("all");

  const { data: bmmRecords = [], isLoading } = useQuery({
    queryKey: ['bmmRecords'],
    queryFn: () => base44.entities.BMMRecord.list('-created_date'),
    initialData: [],
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    initialData: [],
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleString('pt-BR');
    } catch {
      return '-';
    }
  };

  const statusColors = {
    'Rascunho': 'bg-stone-100 text-stone-800',
    'Gerado': 'bg-blue-100 text-blue-800',
    'Enviado': 'bg-emerald-100 text-emerald-800',
    'Confirmado': 'bg-green-100 text-green-800'
  };

  const statusIcons = {
    'Rascunho': Clock,
    'Gerado': FileText,
    'Enviado': Send,
    'Confirmado': CheckCircle
  };

  const filteredRecords = bmmRecords.filter(record => {
    const matchSearch = !searchTerm || 
      record.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.period?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || record.status === filterStatus;
    const matchCompany = filterCompany === 'all' || record.company_id === filterCompany;
    return matchSearch && matchStatus && matchCompany;
  });

  // Estatísticas
  const stats = {
    total: bmmRecords.length,
    sent: bmmRecords.filter(r => r.status === 'Enviado' || r.status === 'Confirmado').length,
    totalValue: bmmRecords.reduce((sum, r) => sum + (r.total_value || 0), 0)
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-black">
              Histórico de BMMs
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {stats.total} {stats.total === 1 ? 'BMM gerado' : 'BMMs gerados'} • Registros completos
            </p>
          </div>
          <Link to={createPageUrl('BMMGenerator')}>
            <Button className="bg-gray-900 hover:bg-gray-800">
              <FileText className="w-5 h-5 mr-2" />
              Gerar Novo BMM
            </Button>
          </Link>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <FileText className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{stats.total}</p>
              <p className="text-sm text-gray-600">BMMs Gerados</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <Send className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{stats.sent}</p>
              <p className="text-sm text-gray-600">BMMs Enviados</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <DollarSign className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-lg font-bold text-black">{formatCurrency(stats.totalValue)}</p>
              <p className="text-sm text-gray-600">Valor Total Processado</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="border border-gray-300">
          <CardHeader className="bg-gray-100">
            <h2 className="text-lg font-bold flex items-center gap-2 text-black">
              <Filter className="w-5 h-5" />
              Filtros de Busca
            </h2>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-stone-500" />
                <span className="font-medium text-stone-700">Filtros:</span>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <Input
                    placeholder="Buscar por empresa ou período..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-stone-500">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Rascunho">Rascunho</SelectItem>
                    <SelectItem value="Gerado">Gerado</SelectItem>
                    <SelectItem value="Enviado">Enviado</SelectItem>
                    <SelectItem value="Confirmado">Confirmado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-stone-500">Empresa</Label>
                <Select value={filterCompany} onValueChange={setFilterCompany}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.nome_fantasia || company.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card className="border border-gray-300">
          <CardHeader className="bg-gray-100">
            <h2 className="text-xl font-bold flex items-center gap-2 text-black">
              <FileText className="w-6 h-6" />
              Registros de BMMs
            </h2>
            <p className="text-gray-600 text-sm mt-1">Histórico completo de documentos gerados</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100 border-b-2 border-gray-200">
                    <TableHead className="font-bold text-black">🏢 Empresa</TableHead>
                    <TableHead className="font-bold text-black">📅 Período</TableHead>
                    <TableHead className="font-bold text-center text-black">📚 Turmas</TableHead>
                    <TableHead className="font-bold text-center text-black">👥 Alunos</TableHead>
                    <TableHead className="font-bold text-right text-black">💰 Valor</TableHead>
                    <TableHead className="font-bold text-center text-black">📊 Status</TableHead>
                    <TableHead className="font-bold text-black">🕒 Gerado em</TableHead>
                    <TableHead className="font-bold text-center text-black">📋 Histórico</TableHead>
                    <TableHead className="font-bold text-center text-black">⚙️ Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-stone-500">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-stone-500">
                        Nenhum BMM encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map(record => {
                      const StatusIcon = statusIcons[record.status] || FileText;
                      return (
                        <TableRow key={record.id} className="hover:bg-gray-50 transition-all duration-200 border-b border-gray-100">
                          <TableCell className="font-bold text-black">{record.company_name}</TableCell>
                          <TableCell className="font-medium text-gray-700">{record.period}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{record.total_classes || 0}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{record.total_students || 0}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-black">
                              {formatCurrency(record.total_value)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {formatDateTime(record.created_date)}
                          </TableCell>
                          <TableCell className="text-center">
                            {record.history && record.history.length > 0 ? (
                              <div className="space-y-1">
                                {record.history.slice(-3).map((event, idx) => (
                                  <div key={idx} className="text-xs text-gray-600">
                                    <Badge variant="outline" className="text-xs">
                                      {event?.action || 'Ação'}
                                    </Badge>
                                    {event?.timestamp && (
                                      <div className="text-[10px] text-gray-500 mt-0.5">
                                        {formatDateTime(event.timestamp)}
                                      </div>
                                    )}
                                    {event?.user_email && (
                                      <div className="text-[10px] text-gray-500">
                                        {event.user_email}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              {record.pdf_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(record.pdf_url, '_blank')}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              )}
                              {record.sent_to && (
                                <Mail className="w-5 h-5 text-gray-600" title={`Enviado para: ${record.sent_to}`} />
                              )}
                            </div>
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