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

const formatPhoneNumber = (value) => {
  if (!value) return value;
  const phoneNumber = value.replace(/[^\d]/g, '');
  const phoneNumberLength = phoneNumber.length;
  if (phoneNumberLength < 3) return phoneNumber;
  if (phoneNumberLength < 7) {
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
  }
  return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
};

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Edit2, X, Check, Trash2, Crown, Settings, Eye, Lock, MessageCircle, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
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
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const [newUserPermissions, setNewUserPermissions] = useState([]);
  const [inviteSending, setInviteSending] = useState(false);
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
    "Agenda de Treinamentos",
    "Chamada Presencial",
    "Entrada de Propostas",
    "Gestão de BMM",
    "Instrutores",
    "Empresas",
    "Contratadas",
    "Cursos",
    "Importar Excel",
    "Dashboard Financeiro",
    "Alunos Individuais (PF)",
    "Certificações",
    "Alertas de Vencimento",
    "Designer de Certificados",
    "Assinaturas Digitais",
    "Auditoria de Certificados",
    "Config. Notificações",
    "Log de Notificações",
    "Modelos E-mail",
    "Central de Comunicação",
    "Usuários",
    "Log de Auditoria",
    "Dashboard Admin",
    "Dashboard Comercial",
    "Gestão de Leads",
    "Caixa de Entrada",
    "Base de Conhecimento",
    "Contas Sociais",
    "Dashboard de Relatórios",
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
      toast.success('✅ Usuário atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('❌ Erro ao atualizar usuário', {
        description: error.message || 'Não foi possível atualizar o usuário. Verifique os dados e tente novamente.'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.User.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('✅ Usuário excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('❌ Erro ao excluir usuário', {
        description: error.message || 'Não foi possível excluir o usuário. Tente novamente.'
      });
    }
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

  const handleInviteUser = async () => {
    if (!newUserEmail) { toast.error("Informe o e-mail do usuário"); return; }
    setInviteSending(true);
    try {
      // 1. Convidar o usuário via Base44 (envia e-mail de convite)
      await base44.users.inviteUser(newUserEmail, "user");

      toast.success(`✅ Convite enviado para ${newUserEmail}!`);
      setShowNewUserDialog(false);

      // 2. Se tem telefone, abrir WhatsApp com mensagem pré-preenchida
      if (newUserPhone) {
        const phone = newUserPhone.replace(/\D/g, '');
        const phoneWithCountry = phone.startsWith('55') ? phone : '55' + phone;
        const msg = `🔐 *Bem-vindo ao Sistema CAT Cursos!*\n\n` +
          `Olá *${newUserName || newUserEmail}*! 👋\n\n` +
          `Você recebeu um convite de acesso ao Sistema de Treinamento CAT.\n\n` +
          `📧 *E-mail de acesso:* ${newUserEmail}\n` +
          `🔑 *Perfil:* ${roles.find(r => r.value === newUserRole)?.label || newUserRole}\n\n` +
          `📩 Verifique sua caixa de entrada (e o spam) para o link de confirmação e criação de senha.\n\n` +
          `Em caso de dúvidas, entre em contato com o administrador.`;

        const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`;
        window.open(whatsappUrl, '_blank');
      }

      setNewUserEmail(""); setNewUserName(""); setNewUserPhone(""); setNewUserRole("user"); setNewUserPermissions([]);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      const msg = error.message || '';
      if (msg.includes('already') || msg.includes('exists') || msg.includes('500') || msg.includes('registrado')) {
        toast.error("❌ Usuário já cadastrado", { description: "Este e-mail já está registrado no sistema." });
      } else if (msg.includes('invalid') || msg.includes('email')) {
        toast.error("❌ E-mail inválido", { description: "Verifique o endereço de e-mail informado." });
      } else {
        toast.error("❌ Erro ao convidar usuário", { description: msg || "Tente novamente." });
      }
    } finally {
      setInviteSending(false);
    }
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

    const currentUserRole = currentUser.custom_role || currentUser.role;
    const targetUserRole = targetUser.custom_role || targetUser.role;

    // Administrador Master pode editar/excluir outros Administradores Master
    if (currentUserRole === 'Administrador Master' || currentUserRole === 'admin') {
      if (targetUserRole === 'Administrador Master' || targetUserRole === 'admin') {
        return true;
      }
    }

    const currentLevel = getUserHierarchyLevel(currentUser);
    const targetLevel = getUserHierarchyLevel(targetUser);

    return currentLevel > targetLevel;
  };

  const roles = [
    { value: 'Administrador Master', label: '👑 Administrador Master', shortLabel: 'Gestor Master', color: 'bg-purple-100 text-purple-800 border-purple-200', iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
    { value: 'Financeiro', label: '💰 Financeiro', shortLabel: 'Editor/Operador', color: 'bg-blue-100 text-blue-800 border-blue-200', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { value: 'Coordenador de Operações', label: '⚙️ Coordenador de Operações', shortLabel: 'Coordenador', color: 'bg-green-100 text-green-800 border-green-200', iconBg: 'bg-green-100', iconColor: 'text-green-600' },
    { value: 'Certificação', label: '🏆 Certificação', shortLabel: 'Certificação', color: 'bg-teal-100 text-teal-800 border-teal-200', iconBg: 'bg-teal-100', iconColor: 'text-teal-600' },
    { value: 'Atendimento', label: '🎧 Atendimento', shortLabel: 'Atendimento', color: 'bg-orange-100 text-orange-800 border-orange-200', iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
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
                                  onChange={(e) => setEditPhone(formatPhoneNumber(e.target.value))}
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
                             <div className="space-y-3 max-w-lg w-full">
                                <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white px-4 py-3 rounded-lg shadow-md">
                                  <p className="text-sm font-bold flex items-center gap-2">
                                    <Lock className="w-4 h-4" />
                                    PERMISSÕES DE ACESSO
                                  </p>
                                  <p className="text-xs opacity-90 mt-1">
                                    Marque as funcionalidades que este usuário poderá acessar
                                  </p>
                                </div>
                                <div className="grid grid-cols-1 gap-2.5 max-h-96 overflow-y-auto p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border-2 border-purple-300 shadow-inner">
                                  {availablePermissions.map(permission => (
                                    <label
                                      key={permission}
                                      htmlFor={`perm-${user.id}-${permission}`}
                                      className="flex items-center space-x-3 cursor-pointer hover:bg-white p-3 rounded-lg transition-all duration-200 hover:shadow-md border border-transparent hover:border-purple-300"
                                    >
                                      <input
                                        type="checkbox"
                                        id={`perm-${user.id}-${permission}`}
                                        checked={editPermissions.includes(permission)}
                                        onChange={() => togglePermission(permission)}
                                        className="w-5 h-5 accent-purple-600 cursor-pointer"
                                      />
                                      <span className="text-sm text-stone-900 font-semibold">
                                        {permission}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                                <div className="bg-blue-50 border border-blue-300 rounded-lg p-3">
                                  <p className="text-xs text-blue-800 font-medium">
                                    ℹ️ Selecionadas: <strong>{editPermissions.length}</strong> de {availablePermissions.length}
                                  </p>
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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">➕ Convidar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados do usuário. Um convite será enviado por e-mail e, se informado, também via WhatsApp.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input
                  placeholder="Ex: João da Silva"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail <span className="text-red-500">*</span></Label>
                <Input
                  type="email"
                  placeholder="email@empresa.com"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> WhatsApp <span className="text-gray-400 text-xs">(opcional)</span>
                </Label>
                <Input
                  placeholder="(91) 99999-9999"
                  value={newUserPhone}
                  onChange={e => setNewUserPhone(formatPhoneNumber(e.target.value))}
                />
                <p className="text-xs text-gray-500">Se preenchido, os dados de acesso serão enviados via WhatsApp.</p>
              </div>
              <div className="space-y-2">
                <Label>Perfil de acesso</Label>
                <Select value={newUserRole} onValueChange={setNewUserRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowNewUserDialog(false)} disabled={inviteSending}>
                Cancelar
              </Button>
              <Button onClick={handleInviteUser} disabled={inviteSending || !newUserEmail} className="bg-gray-900 hover:bg-gray-800">
                {inviteSending ? "Enviando..." : "Enviar Convite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}