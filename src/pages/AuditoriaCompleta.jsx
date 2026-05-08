import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Download, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';

export default function AuditoriaCompleta() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => base44.asServiceRole.entities.AuditLog.list('-created_date', 200),
  });

  const filteredLogs = logs.filter(log => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        log.user_email?.toLowerCase().includes(searchLower) ||
        log.entity_name?.toLowerCase().includes(searchLower) ||
        log.entity_type?.toLowerCase().includes(searchLower)
      );
    }
    return filter === 'all' || log.action === filter;
  });

  const getActionBadge = (action) => {
    if (action === 'delete') return <Badge className="bg-destructive">🗑️ Deletado</Badge>;
    if (action === 'update') return <Badge className="bg-blue-600">✏️ Atualizado</Badge>;
    if (action === 'create') return <Badge className="bg-green-600">➕ Criado</Badge>;
    if (action === 'backup_executado') return <Badge className="bg-purple-600">💾 Backup</Badge>;
    return <Badge>{action}</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Auditoria Completa</h1>
        <p className="text-gray-600">Rastreie todas as ações realizadas no sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por usuário, entidade ou tipo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 border rounded-md"
            >
              <option value="all">Todas as ações</option>
              <option value="create">Criação</option>
              <option value="update">Atualização</option>
              <option value="delete">Deleção</option>
              <option value="backup_executado">Backups</option>
            </select>
          </div>
          <p className="text-sm text-gray-500">
            Total de eventos: {filteredLogs.length}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-center py-8">Carregando logs...</p>
        ) : filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              Nenhum evento encontrado
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map((log) => (
            <Card key={log.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getActionBadge(log.action)}
                      <span className="text-sm font-mono text-gray-500">
                        {new Date(log.created_date).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="font-medium">{log.entity_name}</p>
                    <p className="text-sm text-gray-600">
                      Tipo: {log.entity_type} | ID: {log.entity_id || 'sistema'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Usuário: {log.user_email}
                    </p>
                    {log.details && (
                      <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                        {log.details}
                      </p>
                    )}
                  </div>
                  {log.action === 'delete' && (
                    <div className="flex-shrink-0 p-2 bg-destructive/10 rounded">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}