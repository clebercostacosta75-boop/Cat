import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Search, Edit2, X, Check } from "lucide-react";

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState("");
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      setEditRole("");
    },
  });

  const handleEditRole = (user) => {
    setEditingUser(user.id);
    setEditRole(user.custom_role || user.role || 'user');
  };

  const handleSaveRole = (userId) => {
    updateMutation.mutate({ 
      id: userId, 
      data: { custom_role: editRole } 
    });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditRole("");
  };

  const roles = [
    { value: 'Administrador Master', label: '👑 Administrador Master', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    { value: 'Financeiro', label: '💰 Financeiro', color: 'bg-green-100 text-green-800 border-green-200' },
    { value: 'Coordenador de Operações', label: '⚙️ Coordenador de Operações', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { value: 'Instrutor', label: '👨‍🏫 Instrutor', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    { value: 'user', label: '👤 Usuário', color: 'bg-stone-100 text-stone-800 border-stone-200' },
  ];

  const getRoleDisplay = (user) => {
    const role = user.custom_role || user.role || 'user';
    const roleConfig = roles.find(r => r.value === role) || roles[roles.length - 1];
    return roleConfig;
  };

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Logo e Título */}
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
          <div className="flex-shrink-0">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png" 
              alt="CAT Logo" 
              className="h-24 w-auto"
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-stone-900">Gerenciamento de Usuários</h1>
            <p className="text-stone-600 mt-1">Controle de acessos e permissões do sistema</p>
          </div>
        </div>

        {/* Informação sobre Roles */}
        <Card className="border-none shadow-lg bg-gradient-to-r from-purple-50 to-blue-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Shield className="w-8 h-8 text-purple-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-stone-900 mb-2">Níveis de Acesso</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {roles.slice(0, 4).map(role => (
                    <div key={role.value} className="flex items-center gap-2">
                      <Badge className={`${role.color} border`}>{role.label}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filtro de Busca */}
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input
                  placeholder="Pesquisar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="text-sm text-stone-500">
                {filteredUsers.length} usuário(s) encontrado(s)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Usuários */}
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-600" />
              Usuários do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-stone-50">
                    <TableHead className="font-bold">Nome</TableHead>
                    <TableHead className="font-bold">Email</TableHead>
                    <TableHead className="font-bold">Nível de Acesso</TableHead>
                    <TableHead className="font-bold text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-stone-500">
                        Carregando usuários...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-stone-500">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => {
                      const roleConfig = getRoleDisplay(user);
                      const isEditing = editingUser === user.id;
                      
                      return (
                        <TableRow key={user.id} className="hover:bg-stone-50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                <span className="text-emerald-700 font-semibold">
                                  {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-stone-900">{user.full_name || 'Sem nome'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-stone-600">{user.email}</TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Select value={editRole} onValueChange={setEditRole}>
                                <SelectTrigger className="w-[220px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles.map(role => (
                                    <SelectItem key={role.value} value={role.value}>
                                      {role.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge className={`${roleConfig.color} border`}>
                                {roleConfig.label}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveRole(user.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                  disabled={updateMutation.isPending}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEdit}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditRole(user)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Edit2 className="w-4 h-4 mr-1" />
                                Editar Acesso
                              </Button>
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

        {/* Legenda de Permissões */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Permissões por Nível de Acesso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-purple-50 rounded-lg">
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 border mb-2">👑 Administrador Master</Badge>
                <p className="text-sm text-stone-600">Acesso total: Dashboard, Cronograma, Instrutores, Empresas, Contratadas, Cursos, Notificações, BMM, Importar, Relatórios e Usuários</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <Badge className="bg-green-100 text-green-800 border-green-200 border mb-2">💰 Financeiro</Badge>
                <p className="text-sm text-stone-600">Dashboard, Cronograma, Instrutores, Empresas, Contratadas, Cursos, Notificações, BMM, Importar e Relatórios</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 border mb-2">⚙️ Coordenador de Operações</Badge>
                <p className="text-sm text-stone-600">Cronograma, Instrutores, Empresas, Contratadas, Cursos, Importar e Relatórios</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 border mb-2">👨‍🏫 Instrutor</Badge>
                <p className="text-sm text-stone-600">Dashboard (visualização pessoal) e Cronograma (apenas seus treinamentos)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}