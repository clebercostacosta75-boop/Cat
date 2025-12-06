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
      return new Date(dateStr).toLocaleString('pt-BR');
    } catch {
      return dateStr;
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
        {/* Cabeçalho Moderno */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-xl">
                <History className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center">
                <span className="text-white text-xs font-bold">{stats.total}</span>
              </div>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-stone-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Histórico de BMMs
              </h1>
              <p className="text-stone-600 text-sm mt-1 font-medium">
                {stats.total} {stats.total === 1 ? 'BMM gerado' : 'BMMs gerados'} • Registros completos
              </p>
            </div>
          </div>
          <Link to={createPageUrl('BMMGenerator')}>
            <Button className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-200">
              <FileText className="w-5 h-5 mr-2" />
              Gerar Novo BMM
            </Button>
          </Link>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-blue-100 to-indigo-50 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <FileText className="w-10 h-10 text-blue-600 mb-3" />
                  <p className="text-4xl font-black text-blue-900 mb-1">{stats.total}</p>
                  <p className="text-xs font-semibold text-blue-700">BMMs Gerados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-emerald-100 to-teal-50 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <Send className="w-10 h-10 text-emerald-600 mb-3" />
                  <p className="text-4xl font-black text-emerald-900 mb-1">{stats.sent}</p>
                  <p className="text-xs font-semibold text-emerald-700">BMMs Enviados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-amber-100 to-orange-50 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <DollarSign className="w-10 h-10 text-amber-600 mb-3" />
                  <p className="text-2xl font-black text-amber-900 mb-1">{formatCurrency(stats.totalValue)}</p>
                  <p className="text-xs font-semibold text-amber-700">Valor Total Processado</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="border-none shadow-xl">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros de Busca
            </h2>
          </div>
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
        <Card className="border-none shadow-xl">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Registros de BMMs
            </h2>
            <p className="text-blue-100 text-sm mt-1">Histórico completo de documentos gerados</p>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-stone-50 to-stone-100 border-b-2 border-stone-200">
                    <TableHead className="font-bold text-stone-700">🏢 Empresa</TableHead>
                    <TableHead className="font-bold text-stone-700">📅 Período</TableHead>
                    <TableHead className="font-bold text-center text-stone-700">📚 Turmas</TableHead>
                    <TableHead className="font-bold text-center text-stone-700">👥 Alunos</TableHead>
                    <TableHead className="font-bold text-right text-stone-700">💰 Valor</TableHead>
                    <TableHead className="font-bold text-center text-stone-700">📊 Status</TableHead>
                    <TableHead className="font-bold text-stone-700">🕒 Gerado em</TableHead>
                    <TableHead className="font-bold text-center text-stone-700">⚙️ Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-stone-500">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-stone-500">
                        Nenhum BMM encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map(record => {
                      const StatusIcon = statusIcons[record.status] || FileText;
                      return (
                        <TableRow key={record.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 border-b border-stone-100">
                          <TableCell className="font-bold text-stone-900">{record.company_name}</TableCell>
                          <TableCell className="font-medium text-stone-700">{record.period}</TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-purple-100 text-purple-700">{record.total_classes || 0}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-blue-100 text-blue-700">{record.total_students || 0}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-black text-emerald-600 text-lg">
                              {formatCurrency(record.total_value)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={statusColors[record.status] || statusColors['Rascunho']}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-stone-600">
                            {formatDateTime(record.created_date)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              {record.pdf_url && (
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-md"
                                  onClick={() => window.open(record.pdf_url, '_blank')}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              )}
                              {record.sent_to && (
                                <Mail className="w-5 h-5 text-emerald-600" title={`Enviado para: ${record.sent_to}`} />
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