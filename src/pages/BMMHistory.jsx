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
  Calendar, Building2, CheckCircle, Clock, Send 
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
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-stone-900">Histórico de BMMs</h1>
              <p className="text-stone-500 text-sm">Todos os BMMs gerados e enviados</p>
            </div>
          </div>
          <Link to={createPageUrl('BMMGenerator')}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <FileText className="w-4 h-4 mr-2" />
              Gerar Novo BMM
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-none shadow-md">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{stats.total}</p>
                <p className="text-sm text-stone-500">BMMs Gerados</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <Send className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{stats.sent}</p>
                <p className="text-sm text-stone-500">BMMs Enviados</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <span className="text-lg">💰</span>
              </div>
              <div>
                <p className="text-xl font-bold text-stone-900">{formatCurrency(stats.totalValue)}</p>
                <p className="text-sm text-stone-500">Valor Total</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="border-none shadow-lg">
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
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-stone-50">
                    <TableHead className="font-bold">Empresa</TableHead>
                    <TableHead className="font-bold">Período</TableHead>
                    <TableHead className="font-bold text-center">Turmas</TableHead>
                    <TableHead className="font-bold text-center">Alunos</TableHead>
                    <TableHead className="font-bold text-right">Valor</TableHead>
                    <TableHead className="font-bold text-center">Status</TableHead>
                    <TableHead className="font-bold">Gerado em</TableHead>
                    <TableHead className="font-bold text-center">Ações</TableHead>
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
                        <TableRow key={record.id} className="hover:bg-stone-50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-stone-400" />
                              <span className="font-medium">{record.company_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-stone-400" />
                              {record.period}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{record.total_classes || 0}</TableCell>
                          <TableCell className="text-center">{record.total_students || 0}</TableCell>
                          <TableCell className="text-right font-semibold text-emerald-600">
                            {formatCurrency(record.total_value)}
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
                                  variant="outline"
                                  onClick={() => window.open(record.pdf_url, '_blank')}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              )}
                              {record.sent_to && (
                                <span className="text-xs text-stone-500" title={`Enviado para: ${record.sent_to}`}>
                                  <Mail className="w-4 h-4 text-emerald-600" />
                                </span>
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