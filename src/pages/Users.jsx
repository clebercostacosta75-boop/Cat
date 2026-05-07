import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCog, Plus, Search, Shield, Edit, Mail, Phone, X, Check, Send, CheckCircle, Clock, Trash2, Key } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import PermissionsPanel from "@/components/users/PermissionsPanel";
import CredentialsModal from "@/components/users/CredentialsModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const ROLE_OPTIONS = [
  { value: "gestor_master", label: "Gestor Master" },
  { value: "editor", label: "Editor" },
  { value: "cliente", label: "Cliente" },
];

const ROLE_COLORS = {
  gestor_master: "bg-purple-100 text-purple-800",
  editor: "bg-blue-100 text-blue-800",
  cliente: "bg-green-100 text-green-800",
};

const STATUS_COLORS = {
  active: "bg-green-100 text-green-800",
  pending_password_change: "bg-yellow-100 text-yellow-800",
};

const STATUS_LABELS = {
  active: "Ativo",
  pending_password_change: "Aguardando 1º acesso",
};

// Formulário isolado para evitar conflitos com o Dialog
function UserForm({ profile, onSave, onCancel }) {
  const isNew = !profile;
  const [formData, setFormData] = useState({
    user_name: profile?.user_name || "",
    user_email: profile?.user_email || "",
    phone: profile?.phone || "",
    role: profile?.role || "editor",
    initial_password: "",
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
        <Label htmlFor="user_name">Nome completo</Label>
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

      {isNew && (
        <div className="space-y-2">
          <Label htmlFor="initial_password">
            Senha inicial <span className="text-gray-400 font-normal">(sugestão: o e-mail do usuário)</span>
          </Label>
          <Input
            id="initial_password"
            type="text"
            value={formData.initial_password}
            onChange={e => handleChange("initial_password", e.target.value)}
            placeholder="Ex: usuario@empresa.com"
          />
          <p className="text-xs text-gray-500">Esta senha será exibida no modal para você comunicar ao usuário. O usuário deverá trocá-la no primeiro acesso.</p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" /> Cancelar
        </Button>
        <Button type="submit">
          <Check className="w-4 h-4 mr-1" /> {isNew ? "Criar Usuário" : "Salvar"}
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
  const [credentialsModal, setCredentialsModal] = useState(null);

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
        const { initial_password, ...updateData } = formData;
        await base44.entities.UserProfile.update(editingProfile.id, updateData);
        toast.success("Usuário atualizado com sucesso!");
      } else {
        // Verifica se já existe
        const existing = profiles.find(p => p.user_email?.toLowerCase() === formData.user_email?.toLowerCase());
        if (existing) {
          toast.warning(`O e-mail ${formData.user_email} já está cadastrado.`);
          setSaving(false);
          return;
        }
        // Cria perfil já ativo
        await base44.entities.UserProfile.create({
          user_name: formData.user_name,
          user_email: formData.user_email,
          phone: formData.phone,
          role: formData.role,
          status: "pending_password_change",
          initial_password: formData.initial_password || formData.user_email,
          credentials_sent_at: new Date().toISOString(),
          credentials_sent_via: "manual",
        });
        // Convida no sistema Base44
        await base44.functions.invoke("convidarUsuario", {
          email: formData.user_email,
          user_name: formData.user_name,
          role: formData.role,
        });
        toast.success(`Usuário ${formData.user_name} criado com sucesso!`);
        setCredentialsModal({
          name: formData.user_name,
          email: formData.user_email,
          password: formData.initial_password || formData.user_email,
        });
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
        // Exibe modal de confirmação com link do app para compartilhar
        setCredentialsModal({
          name: profile.user_name,
          email: profile.user_email,
        });
        await loadProfiles();
      } else {
        toast.error(res.data?.error || "Erro ao reenviar convite");
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao reenviar convite");
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

  const filtered = profiles.filter(p => {
    const q = search.toLowerCase();
    return (
      !q ||
      (p.user_name || "").toLowerCase().includes(q) ||
      (p.user_email || "").toLowerCase().includes(q)
    );
  });

  const roleLabel = (r) => ROLE_OPTIONS.find(o => o.value === r)?.label || r;

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
                          {STATUS_LABELS[profile.status] || profile.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResendInvite(profile)}
                          title="Reenviar convite por e-mail"
                          className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50 gap-1"
                        >
                          <Send className="w-3 h-3" /> Reenviar
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(profile)} title="Editar">
                          <Edit className="w-4 h-4" />
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
      <CredentialsModal
        isOpen={!!credentialsModal}
        credentials={credentialsModal}
        onClose={() => setCredentialsModal(null)}
      />
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