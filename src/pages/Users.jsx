import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Users, Plus, Edit2, X, Check, Trash2, Crown, Settings, Eye, Lock,
  MessageCircle, Mail, Phone,
} from "lucide-react";
import { toast } from "sonner";

// ── Constantes fora do componente ──────────────────────────────────────────────
const ROLE_HIERARCHY = {
  'Administrador Master': 3, 'admin': 3,
  'Operacional': 2, 'Financeiro': 2, 'Coordenador de Operações': 2,
  'Certificação': 2, 'Certificacao': 2, 'Atendimento': 2,
  'Instrutor': 1, 'user': 1,
  'Bloqueado': 0,
};

const ROLES = [
  { value: 'Administrador Master', label: 'Administrador Master' },
  { value: 'Operacional',          label: 'Operacional' },
  { value: 'Financeiro',           label: 'Financeiro' },
  { value: 'Coordenador de Operações', label: 'Coordenador de Operações' },
  { value: 'Certificação',         label: 'Certificação' },
  { value: 'Atendimento',          label: 'Atendimento' },
  { value: 'Instrutor',            label: 'Instrutor' },
  { value: 'Bloqueado',            label: 'Bloqueado' },
  { value: 'user',                 label: 'Usuário Padrão' },
];

const ROLE_COLORS = {
  'Administrador Master': 'bg-purple-100 text-purple-800',
  'admin':                'bg-purple-100 text-purple-800',
  'Operacional':          'bg-indigo-100 text-indigo-800',
  'Financeiro':           'bg-blue-100 text-blue-800',
  'Coordenador de Operações': 'bg-green-100 text-green-800',
  'Certificação':         'bg-teal-100 text-teal-800',
  'Certificacao':         'bg-teal-100 text-teal-800',
  'Atendimento':          'bg-orange-100 text-orange-800',
  'Instrutor':            'bg-amber-100 text-amber-800',
  'Bloqueado':            'bg-red-100 text-red-800',
  'user':                 'bg-gray-100 text-gray-800',
};

const AVAILABLE_PERMISSIONS = [
  "Dashboard", "Cronograma", "Agenda de Treinamentos", "Chamada Presencial",
  "Entrada de Propostas", "Gestão de BMM", "Instrutores", "Empresas",
  "Contratadas", "Cursos", "Importar Excel", "Dashboard Financeiro",
  "Alunos Individuais (PF)", "Certificações", "Alertas de Vencimento",
  "Designer de Certificados", "Assinaturas Digitais", "Auditoria de Certificados",
  "Config. Notificações", "Log de Notificações", "Modelos E-mail",
  "Central de Comunicação", "Usuários", "Log de Auditoria", "Dashboard Admin",
  "Dashboard Comercial", "Gestão de Leads", "Caixa de Entrada",
  "Base de Conhecimento", "Contas Sociais", "Dashboard de Relatórios",
];

const formatPhone = (value) => {
  if (!value) return "";
  const d = value.replace(/\D/g, "");
  if (d.length < 3) return d;
  if (d.length < 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
};

const getRoleLevel = (user) =>
  ROLE_HIERARCHY[user.custom_role || user.role || 'user'] ?? 0;

// ── Componente principal ───────────────────────────────────────────────────────
export default function UsersPage() {
  const [currentUser, setCurrentUser]         = useState(null);
  const [editingUserId, setEditingUserId]     = useState(null);
  const [editState, setEditState]             = useState({});
  const [showDialog, setShowDialog]           = useState(false);
  const [newUser, setNewUser]                 = useState({ email: "", name: "", phone: "", role: "user" });
  const [sending, setSending]                 = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditingUserId(null);
      setEditState({});
      toast.success("Usuário atualizado com sucesso!");
    },
    onError: (err) => toast.error("Erro ao atualizar usuário", { description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.User.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário excluído com sucesso!");
    },
    onError: (err) => toast.error("Erro ao excluir usuário", { description: err.message }),
  });

  const canEdit = (target) => {
    if (!currentUser || target.id === currentUser.id) return false;
    const myLevel = getRoleLevel(currentUser);
    const theirLevel = getRoleLevel(target);
    if (myLevel === 3) return true; // admin pode editar qualquer um
    return myLevel > theirLevel;
  };

  const startEdit = (user) => {
    setEditingUserId(user.id);
    setEditState({
      custom_role: user.custom_role || user.role || "user",
      full_name: user.full_name || "",
      phone: user.phone || "",
      is_whatsapp: user.is_whatsapp || false,
      permissions: user.permissions || [],
    });
  };

  const saveEdit = (userId) => {
    updateMutation.mutate({ id: userId, data: editState });
  };

  const togglePerm = (perm) => {
    setEditState(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const handleInvite = async () => {
    if (!newUser.email) { toast.error("Informe o e-mail do usuário"); return; }
    setSending(true);
    try {
      const res = await base44.functions.invoke("convidarUsuario", {
        email: newUser.email,
        role: "user",
      });
      if (res.data?.already_exists) {
        toast.warning("Usuário já cadastrado", { description: res.data.message });
        return;
      }
      toast.success(`Convite enviado para ${newUser.email}!`);
      setShowDialog(false);
      setNewUser({ email: "", name: "", phone: "", role: "user" });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err) {
      toast.error("Erro ao convidar usuário", { description: err.message });
    } finally {
      setSending(false);
    }
  };

  const countRole = (v) => users.filter(u => (u.custom_role || u.role || "user") === v).length;

  const stats = [
    { label: "Gestores", count: countRole("Administrador Master") + countRole("admin"), icon: Crown },
    { label: "Operadores",  count: countRole("Operacional") + countRole("Financeiro") + countRole("Coordenador de Operações"), icon: Settings },
    { label: "Instrutores/Usuários", count: countRole("Instrutor") + countRole("user"), icon: Eye },
    { label: "Bloqueados",  count: countRole("Bloqueado"), icon: Lock },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestão de Usuários</h1>
            <p className="text-gray-500 text-sm mt-1">
              {users.length} {users.length === 1 ? "usuário" : "usuários"} cadastrados
            </p>
          </div>
          <Button onClick={() => setShowDialog(true)} className="bg-gray-900 hover:bg-gray-800">
            <Plus className="w-4 h-4 mr-2" /> Novo Usuário
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="border border-gray-200">
              <CardContent className="p-4">
                <s.icon className="w-5 h-5 text-gray-500 mb-2" />
                <p className="text-2xl font-bold text-gray-900">{s.count}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabela */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-gray-50 pb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-900">Lista de Usuários</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="font-semibold text-gray-700">Nome</TableHead>
                    <TableHead className="font-semibold text-gray-700">E-mail</TableHead>
                    <TableHead className="font-semibold text-gray-700">Telefone</TableHead>
                    <TableHead className="font-semibold text-gray-700">Perfil</TableHead>
                    <TableHead className="font-semibold text-gray-700">Permissões</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : users.map((user) => {
                    const isEditing = editingUserId === user.id;
                    const role = user.custom_role || user.role || "user";
                    const roleColor = ROLE_COLORS[role] || "bg-gray-100 text-gray-800";

                    return (
                      <TableRow key={user.id} className="border-b border-gray-100 hover:bg-gray-50">

                        {/* Nome */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-gray-600">
                                {(user.full_name || "?").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            {isEditing ? (
                              <Input
                                value={editState.full_name}
                                onChange={e => setEditState(p => ({ ...p, full_name: e.target.value }))}
                                className="w-44 h-8 text-sm"
                                placeholder="Nome completo"
                              />
                            ) : (
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{user.full_name || "Sem nome"}</p>
                                <p className="text-xs text-gray-400">{user.id.slice(0, 8)}</p>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* E-mail */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-600 truncate max-w-[200px]">{user.email}</span>
                          </div>
                        </TableCell>

                        {/* Telefone */}
                        <TableCell>
                          {isEditing ? (
                            <div className="space-y-1.5">
                              <Input
                                value={editState.phone}
                                onChange={e => setEditState(p => ({ ...p, phone: formatPhone(e.target.value) }))}
                                placeholder="(00) 00000-0000"
                                className="w-40 h-8 text-sm"
                              />
                              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editState.is_whatsapp}
                                  onChange={e => setEditState(p => ({ ...p, is_whatsapp: e.target.checked }))}
                                  className="w-3.5 h-3.5"
                                />
                                É WhatsApp
                              </label>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {user.phone ? (
                                <>
                                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="text-sm text-gray-600">{user.phone}</span>
                                  {user.is_whatsapp && (
                                    <MessageCircle className="w-3.5 h-3.5 text-green-500" title="WhatsApp" />
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-gray-400 italic">—</span>
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* Perfil */}
                        <TableCell>
                          {isEditing ? (
                            <Select
                              value={editState.custom_role}
                              onValueChange={v => setEditState(p => ({ ...p, custom_role: v }))}
                            >
                              <SelectTrigger className="w-52 h-8 text-sm">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES.map(r => (
                                  <SelectItem key={r.value} value={r.value}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${roleColor}`}>
                              {ROLES.find(r => r.value === role)?.label || role}
                            </span>
                          )}
                        </TableCell>

                        {/* Permissões */}
                        <TableCell>
                          {isEditing && editState.custom_role !== 'Administrador Master' && editState.custom_role !== 'admin' ? (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Permissões ({editState.permissions.length}/{AVAILABLE_PERMISSIONS.length})
                              </p>
                              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1 bg-gray-50">
                                {AVAILABLE_PERMISSIONS.map(perm => (
                                  <label key={perm} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1.5 rounded text-xs">
                                    <input
                                      type="checkbox"
                                      checked={editState.permissions.includes(perm)}
                                      onChange={() => togglePerm(perm)}
                                      className="w-3.5 h-3.5 accent-gray-800"
                                    />
                                    <span className="text-gray-700">{perm}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {(role === 'Administrador Master' || role === 'admin') ? (
                                <span className="text-xs text-purple-700 font-medium">Acesso total</span>
                              ) : (user.permissions || []).length > 0 ? (
                                <>
                                  {user.permissions.slice(0, 2).map((p, i) => (
                                    <Badge key={i} variant="outline" className="text-xs py-0">{p}</Badge>
                                  ))}
                                  {user.permissions.length > 2 && (
                                    <Badge variant="outline" className="text-xs py-0">+{user.permissions.length - 2}</Badge>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-gray-400 italic">Sem permissões</span>
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* Ações */}
                        <TableCell className="text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm" variant="default"
                                onClick={() => saveEdit(user.id)}
                                disabled={updateMutation.isPending}
                                className="h-7 px-2.5 text-xs bg-gray-900 hover:bg-gray-800"
                              >
                                <Check className="w-3 h-3 mr-1" /> Salvar
                              </Button>
                              <Button
                                size="sm" variant="outline"
                                onClick={() => { setEditingUserId(null); setEditState({}); }}
                                className="h-7 px-2.5 text-xs"
                              >
                                <X className="w-3 h-3 mr-1" /> Cancelar
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm" variant="outline"
                                onClick={() => startEdit(user)}
                                disabled={!canEdit(user)}
                                className="h-7 px-2.5 text-xs"
                                title={!canEdit(user) ? "Sem permissão para editar" : "Editar usuário"}
                              >
                                <Edit2 className="w-3 h-3 mr-1" /> Editar
                              </Button>

                              {canEdit(user) && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600 hover:bg-red-50">
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
                                        onClick={() => deleteMutation.mutate(user.id)}
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
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Dialog Novo Usuário */}
        <Dialog open={showDialog} onOpenChange={(open) => { if (!sending) setShowDialog(open); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Convidar Novo Usuário</DialogTitle>
              <DialogDescription>
                Um convite será enviado por e-mail para o endereço informado.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="inv-name">Nome completo</Label>
                <Input
                  id="inv-name"
                  placeholder="Ex: João da Silva"
                  value={newUser.name}
                  onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv-email">E-mail <span className="text-red-500">*</span></Label>
                <Input
                  id="inv-email"
                  type="email"
                  placeholder="email@empresa.com"
                  value={newUser.email}
                  onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv-phone">WhatsApp <span className="text-gray-400 text-xs">(opcional)</span></Label>
                <Input
                  id="inv-phone"
                  placeholder="(91) 99999-9999"
                  value={newUser.phone}
                  onChange={e => setNewUser(p => ({ ...p, phone: formatPhone(e.target.value) }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv-role">Perfil de acesso</Label>
                <Select
                  value={newUser.role}
                  onValueChange={v => setNewUser(p => ({ ...p, role: v }))}
                >
                  <SelectTrigger id="inv-role">
                    <SelectValue placeholder="Selecione um perfil..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)} disabled={sending}>
                Cancelar
              </Button>
              <Button
                onClick={handleInvite}
                disabled={sending || !newUser.email}
                className="bg-gray-900 hover:bg-gray-800"
              >
                {sending ? "Enviando..." : "Enviar Convite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}