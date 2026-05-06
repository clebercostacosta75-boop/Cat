import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCog, Plus, Search, Shield, Edit, Lock, Unlock, Mail, Phone, X, Check, Send, CheckCircle, Clock, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import EmailDeliveryPanel from "@/components/users/EmailDeliveryPanel";
import PermissionsPanel from "@/components/users/PermissionsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const ROLE_OPTIONS = [
  { value: "gestor_master", label: "Gestor Master" },
  { value: "editor", label: "Editor" },
  { value: "cliente", label: "Cliente" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "blocked", label: "Bloqueado" },
  { value: "pending_password_change", label: "Pendente" },
];

const ROLE_COLORS = {
  gestor_master: "bg-purple-100 text-purple-800",
  editor: "bg-blue-100 text-blue-800",
  cliente: "bg-green-100 text-green-800",
};

const STATUS_COLORS = {
  active: "bg-green-100 text-green-800",
  blocked: "bg-red-100 text-red-800",
  pending_password_change: "bg-yellow-100 text-yellow-800",
};

// Formulário isolado para evitar conflitos com o Dialog
function UserForm({ profile, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    user_name: profile?.user_name || "",
    user_email: profile?.user_email || "",
    phone: profile?.phone || "",
    role: profile?.role || "cliente",
    status: profile?.status || "active",
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="user_name">Nome</Label>
        <Input
          id="user_name"
          value={formData.user_name}
          onChange={e => handleChange("user_name", e.target.value)}
          placeholder="Nome completo"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="user_email">E-mail</Label>
        <Input
          id="user_email"
          type="email"
          value={formData.user_email}
          onChange={e => handleChange("user_email", e.target.value)}
          placeholder="email@exemplo.com"
          required
          disabled={!!profile}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefone</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={e => handleChange("phone", e.target.value)}
          placeholder="(00) 00000-0000"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Perfil de Acesso</Label>
        <select
          id="role"
          value={formData.role}
          onChange={e => handleChange("role", e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {ROLE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          value={formData.status}
          onChange={e => handleChange("status", e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" /> Cancelar
        </Button>
        <Button type="submit">
          <Check className="w-4 h-4 mr-1" /> Salvar
        </Button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  const canDelete = currentUser?.role === "admin" || currentUser?.role === "gestor_master";

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.UserProfile.list("-created_date", 200);
      setProfiles(data);
    } catch (err) {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);



  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (editingProfile) {
        // Usa o id do registro (hex), não o user_id (UUID)
        const profileId = editingProfile.id;
        await base44.entities.UserProfile.update(profileId, formData);
        toast.success("Usuário atualizado com sucesso!");
      } else {
        // Cria o perfil primeiro
        const created = await base44.entities.UserProfile.create({
          ...formData,
          status: "pending_password_change",
        });
        // Envia convite + e-mail com credenciais
        const result = await base44.functions.invoke("convidarUsuario", {
          email: formData.user_email,
          user_name: formData.user_name,
          role: formData.role,
        });
        if (result.data?.success || result.data?.already_exists) {
          toast.success(`Usuário criado! Credenciais enviadas para ${formData.user_email}`);
        } else {
          toast.warning("Usuário criado, mas houve um problema ao enviar as credenciais. Use o botão de reenvio.");
        }
      }
      setShowForm(false);
      setEditingProfile(null);
      await loadProfiles();
    } catch (err) {
      toast.error("Erro ao salvar usuário");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (profile) => {
    setEditingProfile(profile);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingProfile(null);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingProfile(null);
  };

  const handleResendInvite = async (profile) => {
    try {
      const res = await base44.functions.invoke("reenviarCredenciais", {
        user_email: profile.user_email,
        user_name: profile.user_name,
        profile_id: profile.id,
      });
      if (res.data?.success) {
        toast.success(`Credenciais reenviadas para ${profile.user_email} ✓`);
        await loadProfiles();
      } else {
        toast.error(res.data?.error || "Erro ao reenviar credenciais");
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao reenviar credenciais");
    }
  };

  const handleDelete = async () => {
    if (!deletingProfile) return;
    try {
      await base44.entities.UserProfile.delete(deletingProfile.id);
      setProfiles(prev => prev.filter(p => p.id !== deletingProfile.id));
      toast.success(`Usuário ${deletingProfile.user_name || deletingProfile.user_email} excluído com sucesso.`);
    } catch {
      toast.error("Erro ao excluir usuário");
    } finally {
      setDeletingProfile(null);
    }
  };

  const handleToggleBlock = async (profile) => {
    const newStatus = profile.status === "blocked" ? "active" : "blocked";
    try {
      await base44.entities.UserProfile.update(profile.id, { status: newStatus });
      toast.success(newStatus === "blocked" ? "Usuário bloqueado" : "Usuário desbloqueado");
      await loadProfiles();
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  const filtered = profiles.filter(p => {
    const q = search.toLowerCase();
    return (
      !q ||
      (p.user_name || "").toLowerCase().includes(q) ||
      (p.user_email || "").toLowerCase().includes(q)
    );
  });

  const roleLabel = (r) => ROLE_OPTIONS.find(o => o.value === r)?.label || r;
  const statusLabel = (s) => STATUS_OPTIONS.find(o => o.value === s)?.label || s;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UserCog className="w-7 h-7 text-gray-700" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
            <p className="text-sm text-gray-500">Gerenciamento de perfis e permissões</p>
          </div>
        </div>
        {!showForm && (
          <Button onClick={handleNew}>
            <Plus className="w-4 h-4 mr-2" /> Novo Usuário
          </Button>
        )}
      </div>

      {/* Formulário inline */}
      {showForm && (
        <Card className="mb-6 border-2 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {editingProfile ? "Editar Usuário" : "Novo Usuário"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UserForm
              key={editingProfile?.id || "new"}
              profile={editingProfile}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="usuarios">
        <TabsList className="mb-4">
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="entregas">
            Status de E-mails
            {profiles.filter(p => !p.credentials_sent_at).length > 0 && (
              <span className="ml-2 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {profiles.filter(p => !p.credentials_sent_at).length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="permissoes">Permissões de Acesso</TabsTrigger>
        </TabsList>

        {/* Aba: lista de usuários */}
        <TabsContent value="usuarios">
          {/* Busca */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <UserCog className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum usuário encontrado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(profile => (
                <Card key={profile.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Shield className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{profile.user_name || "—"}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{profile.user_email}</span>
                          </div>
                          {profile.phone && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Phone className="w-3 h-3" />
                              <span>{profile.phone}</span>
                            </div>
                          )}
                          {profile.credentials_sent_at ? (
                            <div className="flex items-center gap-1 text-xs text-green-600 mt-0.5">
                              <CheckCircle className="w-3 h-3" />
                              <span>Convite enviado em {format(new Date(profile.credentials_sent_at), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-orange-500 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>Convite não enviado ainda</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={ROLE_COLORS[profile.role] || "bg-gray-100 text-gray-800"}>
                          {roleLabel(profile.role)}
                        </Badge>
                        <Badge className={STATUS_COLORS[profile.status] || "bg-gray-100 text-gray-800"}>
                          {statusLabel(profile.status)}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResendInvite(profile)}
                          title="Reenviar credenciais por e-mail"
                          className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50 gap-1"
                        >
                          <Send className="w-3 h-3" /> Reenviar
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(profile)} title="Editar">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleToggleBlock(profile)} title={profile.status === "blocked" ? "Desbloquear" : "Bloquear"}>
                          {profile.status === "blocked"
                            ? <Unlock className="w-4 h-4 text-green-600" />
                            : <Lock className="w-4 h-4 text-red-500" />}
                        </Button>
                        {canDelete && (
                          <Button size="icon" variant="ghost" onClick={() => setDeletingProfile(profile)} title="Excluir usuário">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Aba: status de entregas */}
        <TabsContent value="entregas">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
            </div>
          ) : (
            <EmailDeliveryPanel profiles={profiles} onRefresh={loadProfiles} />
          )}
        </TabsContent>

        {/* Aba: permissões de acesso */}
        <TabsContent value="permissoes">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
            </div>
          ) : (
            <PermissionsPanel profiles={profiles} onRefresh={loadProfiles} />
          )}
        </TabsContent>
      </Tabs>
      <AlertDialog open={!!deletingProfile} onOpenChange={open => !open && setDeletingProfile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{deletingProfile?.user_name || deletingProfile?.user_email}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}