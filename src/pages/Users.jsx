import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const ROLE_HIERARCHY = {
  'Administrador Master': 3,
  'Financeiro': 2,
  'Coordenador de Operações': 2,
  'Instrutor': 1,
  'user': 1,
  'Bloqueado': 0
};
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Edit2, X, Check, Trash2, Crown, Settings, Eye, Lock, MessageCircle, Mail, Phone } from "lucide-react";
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
  const [editPhone, setEditPhone] = useState("");
  const [editIsWhatsApp, setEditIsWhatsApp] = useState(false);
  const [editPermissions, setEditPermissions] = useState([]);
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Erro ao carregar usuário atual:', error);
      }
    };
    loadCurrentUser();
  }, []);

  // Lista de todas as permissões disponíveis
  const availablePermissions = [
    "Dashboard",
    "Cronograma",
    "Instrutores",
    "Empresas",
    "Contratadas",
    "Cursos",
    "Relatórios",
    "Gerar BMM",
    "Histórico BMM",
    "Modelos E-mail",
    "Central de Comunicação"
  ];

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
    setEditPhone(user.phone || '');
    setEditIsWhatsApp(user.is_whatsapp || false);
    setEditPermissions(user.permissions || []);
  };

  const handleSaveUser = (userId) => {
    updateMutation.mutate({ 
      id: userId, 
      data: { 
        custom_role: editRole,
        full_name: editName,
        phone: editPhone,
        is_whatsapp: editIsWhatsApp,
        permissions: editPermissions
      } 
    });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditRole("");
    setEditName("");
    setEditPhone("");
    setEditIsWhatsApp(false);
    setEditPermissions([]);
  };

  const togglePermission = (permission) => {
    setEditPermissions(prev => 
      prev.includes(permission) 
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleDeleteUser = (userId) => {
    deleteMutation.mutate(userId);
  };

  const getUserHierarchyLevel = (user) => {
    const role = user.custom_role || user.role || 'user';
    return ROLE_HIERARCHY[role] || 0;
  };

  const canEditUser = (targetUser) => {
    if (!currentUser) return false;
    if (targetUser.id === currentUser.id) return false;
    
    const currentLevel = getUserHierarchyLevel(currentUser);
    const targetLevel = getUserHierarchyLevel(targetUser);
    
    return currentLevel > targetLevel;
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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-black">
              Gestão de Usuários
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {users.length} {users.length === 1 ? 'usuário cadastrado' : 'usuários cadastrados'} • Controle total de acessos
            </p>
          </div>
          <Button 
            onClick={() => setShowNewUserDialog(true)}
            className="bg-gray-900 hover:bg-gray-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {statsCards.map((stat, index) => (
            <Card key={index} className="border border-gray-200">
              <CardContent className="p-4">
                <stat.icon className="w-6 h-6 text-gray-600 mb-2" />
                <p className="text-2xl font-bold text-black">{stat.count}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Lista de Usuários */}
        <Card className="border border-gray-300">
          <CardHeader className="bg-gray-100">
            <h2 className="text-xl font-bold flex items-center gap-2 text-black">
              <Users className="w-6 h-6" />
              Lista de Usuários
            </h2>
            <p className="text-gray-600 text-sm">Gerencie permissões e acessos dos usuários</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100 border-b-2 border-gray-200">
                    <TableHead className="font-bold text-black">👤 Nome</TableHead>
                    <TableHead className="font-bold text-black">📧 Email</TableHead>
                    <TableHead className="font-bold text-black">📱 Telefone/WhatsApp</TableHead>
                    <TableHead className="font-bold text-black">🎯 Nível de Acesso</TableHead>
                    <TableHead className="font-bold text-black">🔐 Permissões</TableHead>
                    <TableHead className="font-bold text-center text-black">⚙️ Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-stone-500">
                        Carregando usuários...
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-stone-500">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => {
                      const roleConfig = getRoleDisplay(user);
                      const isEditing = editingUser === user.id;
                      
                      return (
                        <TableRow key={user.id} className="hover:bg-gray-50 transition-all duration-200 border-b border-gray-100">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                  <span className="text-gray-700 font-bold text-lg">
                                    {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                                  </span>
                                </div>
                              </div>
                              <div>
                                {isEditing ? (
                                  <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Nome do usuário"
                                    className="w-[200px] border-purple-200 focus:border-purple-500"
                                  />
                                ) : (
                                  <>
                                    <p className="font-semibold text-stone-900">{user.full_name || 'Sem nome'}</p>
                                    <p className="text-xs text-stone-500">ID: {user.id.slice(0, 8)}</p>
                                  </>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-stone-400" />
                              <span className="text-stone-600 font-mono text-sm">{user.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="space-y-2">
                                <Input
                                  value={editPhone}
                                  onChange={(e) => setEditPhone(e.target.value)}
                                  placeholder="(00) 00000-0000"
                                  className="w-[160px]"
                                />
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id={`whatsapp-${user.id}`}
                                    checked={editIsWhatsApp}
                                    onChange={(e) => setEditIsWhatsApp(e.target.checked)}
                                    className="w-4 h-4"
                                  />
                                  <label htmlFor={`whatsapp-${user.id}`} className="text-xs text-stone-600">
                                    É WhatsApp
                                  </label>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {user.phone ? (
                                  <>
                                    <Phone className="w-4 h-4 text-stone-400" />
                                    <span className="text-stone-600 font-mono text-sm">{user.phone}</span>
                                    {user.is_whatsapp && (
                                      <Badge variant="outline" className="text-xs">
                                        <MessageCircle className="w-3 h-3 mr-1" />
                                        WhatsApp
                                      </Badge>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-stone-400 text-sm italic">Não cadastrado</span>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Select value={editRole} onValueChange={setEditRole}>
                                <SelectTrigger className="w-[220px] border-purple-200 focus:border-purple-500">
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
                              <Badge variant="outline" className="px-3 py-1">
                                {roleConfig.label}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing && editRole !== 'Administrador Master' && editRole !== 'admin' ? (
                              <div className="space-y-2 max-w-xs">
                                <p className="text-xs text-purple-700 font-bold mb-2 flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  Selecionar Permissões:
                                </p>
                                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-3 bg-purple-50 rounded-lg border border-purple-200">
                                  {availablePermissions.map(permission => (
                                    <label
                                      key={permission}
                                      htmlFor={`perm-${user.id}-${permission}`}
                                      className="flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded transition-colors"
                                    >
                                      <input
                                        type="checkbox"
                                        id={`perm-${user.id}-${permission}`}
                                        checked={editPermissions.includes(permission)}
                                        onChange={() => togglePermission(permission)}
                                        className="w-4 h-4 accent-purple-600"
                                      />
                                      <span className="text-sm text-stone-700 font-medium">
                                        {permission}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs">
                                {(user.custom_role === 'Administrador Master' || user.role === 'admin') ? (
                                  <Badge variant="outline" className="px-3 py-1">
                                    ⭐ Acesso Total
                                  </Badge>
                                ) : user.permissions && user.permissions.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {user.permissions.slice(0, 2).map((perm, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {perm}
                                      </Badge>
                                    ))}
                                    {user.permissions.length > 2 && (
                                      <Badge variant="outline" className="text-xs font-bold">
                                        +{user.permissions.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    Sem permissões
                                  </Badge>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveUser(user.id)}
                                  className="bg-gray-900 hover:bg-gray-800 text-white"
                                  disabled={updateMutation.isPending}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Salvar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEdit}
                                  className="hover:bg-stone-100"
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Cancelar
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleEditUser(user)}
                                  variant="outline"
                                  disabled={!canEditUser(user)}
                                  title={!canEditUser(user) ? (user.id === currentUser?.id ? "Não pode editar a si mesmo" : "Sem permissão para editar este usuário") : ""}
                                >
                                  <Edit2 className="w-3 h-3 mr-1" />
                                  Editar
                                </Button>
                                
                                {currentUser && user.id !== currentUser.id && canEditUser(user) && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Deseja excluir <strong>{user.full_name || user.email}</strong>? Esta ação é irreversível.
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
                                )}
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
              <DialogTitle className="text-xl font-bold">ℹ️ Como Adicionar Usuários</DialogTitle>
              <DialogDescription>
                Usuários devem ser convidados através do sistema Base44
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-stone-700 mb-3">
                  <strong>Para adicionar novos usuários ao sistema:</strong>
                </p>
                <ol className="text-sm text-stone-600 space-y-2 list-decimal list-inside">
                  <li>Acesse as <strong>configurações do app</strong> no painel Base44</li>
                  <li>Vá em <strong>"Usuários"</strong> ou <strong>"Convidar Usuário"</strong></li>
                  <li>Digite o email do usuário e envie o convite</li>
                  <li>Após o usuário aceitar o convite, você poderá definir permissões aqui</li>
                </ol>
              </div>
              <p className="text-xs text-stone-500 italic">
                💡 Os usuários convidados aparecerão automaticamente nesta lista após aceitarem o convite.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowNewUserDialog(false)}>
                Entendi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}