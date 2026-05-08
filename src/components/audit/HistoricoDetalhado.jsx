import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function HistoricoDetalhado({ log }) {
  const [expanded, setExpanded] = useState(false);

  const getActionColor = (action) => {
    if (action === 'create') return 'bg-green-100 text-green-800';
    if (action === 'update') return 'bg-blue-100 text-blue-800';
    if (action === 'delete') return 'bg-red-100 text-red-800';
    if (action === 'login') return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getActionLabel = (action) => {
    const labels = {
      create: '➕ Criado',
      update: '✏️ Atualizado',
      delete: '🗑️ Deletado',
      login: '🔐 Login',
      logout: '🚪 Logout',
    };
    return labels[action] || action;
  };

  const parseChanges = (details) => {
    try {
      const match = details.match(/Mudanças: (\{.*\})/);
      if (match) {
        return JSON.parse(match[1]);
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const changes = parseChanges(log.details || '');
  const isDelete = log.action === 'delete';

  return (
    <Card className={`hover:shadow-md transition-all ${isDelete ? 'border-red-200 bg-red-50' : ''}`}>
      <CardContent className="pt-6">
        <div className="flex gap-4">
          {/* Timeline dot */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className={`w-3 h-3 rounded-full ${isDelete ? 'bg-red-500' : 'bg-blue-500'}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge className={getActionColor(log.action)}>
                {getActionLabel(log.action)}
              </Badge>
              <span className="text-sm text-gray-500">
                {log.entity_type}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(log.created_date).toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="space-y-1">
              <p className="font-medium text-sm">
                {log.entity_name || log.entity_id}
              </p>
              <p className="text-sm text-gray-600">
                {log.user_email}
              </p>
            </div>

            {/* Detalhes */}
            {log.details && (
              <div className="mt-3">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                </button>

                {expanded && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs space-y-1">
                    <p className="text-gray-700 whitespace-pre-wrap break-words">
                      {log.details.split(' | ')[0]}
                    </p>

                    {changes && Object.keys(changes).length > 0 && (
                      <div className="mt-2 border-t border-gray-200 pt-2">
                        <p className="font-medium text-gray-700 mb-1">Alterações:</p>
                        {Object.entries(changes).map(([field, values]) => (
                          <div key={field} className="text-gray-600">
                            <span className="font-mono">{field}:</span>
                            <div className="ml-2">
                              <span className="line-through text-red-600">
                                {JSON.stringify(values.antes)}
                              </span>
                              {' → '}
                              <span className="text-green-600">
                                {JSON.stringify(values.depois)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}