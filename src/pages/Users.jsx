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
import { Users, Plus, Edit2, X, Check, Trash2, Crown, Settings, Eye, Lock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function UsersPage() {
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [editName, setEditName] = useState("");
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
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
      setEditName("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.User.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleEditUser = (user) => {
    setEditingUser(user.id);
    setEditRole(user.custom_role || user.role || 'user');
    setEditName(user.full_name || '');
  };

  const handleSaveUser = (userId) => {
    updateMutation.mutate({ 
      id: userId, 
      data: { 
        custom_role: editRole,
        full_name: editName 
      } 
    });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditRole("");
    setEditName("");
  };

  const handleDeleteUser = (userId) => {
    deleteMutation.mutate(userId);
  };

  const roles = [
    { value: 'Administrador Master', label: '👑 Administrador Master', shortLabel: 'Gestor Master', color: 'bg-purple-100 text-purple-800 border-purple-200', iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
    { value: 'Financeiro', label: '💰 Financeiro', shortLabel: 'Editor/Operador', color: 'bg-blue-100 text-blue-800 border-blue-200', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { value: 'Coordenador de Operações', label: '⚙️ Coordenador de Operações', shortLabel: 'Coordenador', color: 'bg-green-100 text-green-800 border-green-200', iconBg: 'bg-green-100', iconColor: 'text-green-600' },
    { value: 'Instrutor', label: '👨‍🏫 Instrutor', shortLabel: 'Cliente/Viewer', color: 'bg-amber-100 text-amber-800 border-amber-200', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
    { value: 'Bloqueado', label: '🔒 Bloqueado', shortLabel: 'Bloqueados', color: 'bg-red-100 text-red-800 border-red-200', iconBg: 'bg-red-100', iconColor: 'text-red-600' },
    { value: 'user', label: '👤 Usuário', shortLabel: 'Usuário', color: 'bg-stone-100 text-stone-800 border-stone-200', iconBg: 'bg-stone-100', iconColor: 'text-stone-600' },
  ];

  const getRoleDisplay = (user) => {
    const role = user.custom_role || user.role || 'user';
    const roleConfig = roles.find(r => r.value === role) || roles[roles.length - 1];
    return roleConfig;
  };

  // Contagem por tipo de role
  const countByRole = (roleValue) => {
    return users.filter(u => (u.custom_role || u.role || 'user') === roleValue).length;
  };

  const statsCards = [
    { 
      label: 'Gestor Master', 
      count: countByRole('Administrador Master') + countByRole('admin'), 
      icon: Crown, 
      iconBg: 'bg-purple-100', 
      iconColor: 'text-purple-600' 
    },
    { 
      label: 'Editor/Operador', 
      count: countByRole('Financeiro') + countByRole('Coordenador de Operações'), 
      icon: Settings, 
      iconBg: 'bg-blue-100', 
      iconColor: 'text-blue-600' 
    },
    { 
      label: 'Cliente/Viewer', 
      count: countByRole('Instrutor') + countByRole('user'), 
      icon: Eye, 
      iconBg: 'bg-green-100', 
      iconColor: 'text-green-600' 
    },
    { 
      label: 'Bloqueados', 
      count: countByRole('Bloqueado'), 
      icon: Lock, 
      iconBg: 'bg-red-100', 
      iconColor: 'text-red-600' 
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-stone-900">Gestão de Usuários</h1>
              <p className="text-stone-500 text-sm">{users.length} usuários cadastrados</p>
            </div>
          </div>
          <Button 
            onClick={() => setShowNewUserDialog(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statsCards.map((stat, index) => (
            <Card key={index} className="border-none shadow-md">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-12 h-12 ${stat.iconBg} rounded-full flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">{stat.count}</p>
                  <p className="text-sm text-stone-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Lista de Usuários */}
        <Card className="border-none shadow-xl">
          <CardContent className="p-0">
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
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-stone-500">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => {
                      const roleConfig = getRoleDisplay(user);
                      const isEditing = editingUser === user.id;
                      
                      return (
                        <TableRow key={user.id} className="hover:bg-stone-50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-purple-700 font-semibold">
                                  {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              </div>
                              <div>
                                {isEditing ? (
                                  <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Nome do usuário"
                                    className="w-[200px]"
                                  />
                                ) : (
                                  <p className="font-medium text-stone-900">{user.full_name || 'Sem nome'}</p>
                                )}
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
                                  onClick={() => handleSaveUser(user.id)}
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
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditUser(user)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Edit2 className="w-4 h-4 mr-1" />
                                  Editar
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir o usuário <strong>{user.full_name || user.email}</strong>? Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
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

        {/* Dialog Novo Usuário */}
        <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Usuário</DialogTitle>
              <DialogDescription>
                Para adicionar um novo usuário, utilize a funcionalidade de convite do sistema. 
                Acesse as configurações do app e convide o usuário pelo email.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-stone-600">
                Os usuários são adicionados através do sistema de convite da plataforma Base44. 
                Após o convite, você poderá definir o nível de acesso do usuário nesta página.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewUserDialog(false)}>
                Entendi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}