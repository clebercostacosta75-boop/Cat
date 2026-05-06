import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCog, Plus, Search, Shield, Edit, Lock, Unlock, Mail, Phone, X, Check, Send, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import EmailDeliveryPanel from "@/components/users/EmailDeliveryPanel";
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

  const sendInviteAndRecord = async (email, profileId, role) => {
    try {
      const res = await base44.functions.invoke("convidarUsuario", {
        email,
        role: role || "user",
      });
      const success = res.data?.success || res.data?.already_exists;
      await base44.entities.UserProfile.update(profileId, {
        credentials_sent_at: new Date().toISOString(),
        credentials_sent_via: "email",
        credentials_sent_by: "sistema",
      });
      return success;
    } catch {
      return false;
    }
  };

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (editingProfile) {
        await base44.entities.UserProfile.update(editingProfile.id, formData);
        toast.success("Usuário atualizado com sucesso!");
      } else {
        // Cria o perfil primeiro
        const created = await base44.entities.UserProfile.create(formData);
        // Envia convite por e-mail automaticamente e registra
        const sent = await sendInviteAndRecord(formData.user_email, created.id, formData.role);
        if (sent) {
          toast.success(`Usuário criado! Convite enviado para ${formData.user_email}`);
        } else {
          toast.warning("Usuário criado, mas houve um problema ao enviar o convite. Use o botão de reenvio.");
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
      const sent = await sendInviteAndRecord(profile.user_email, profile.id, profile.role);
      if (sent) {
        toast.success(`Convite reenviado para ${profile.user_email} ✓`);
        await loadProfiles();
      } else {
        toast.error("Erro ao reenviar convite");
      }
    } catch {
      toast.error("Erro ao reenviar convite");
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
                        <Button size="icon" variant="ghost" onClick={() => handleResendInvite(profile)} title="Reenviar convite">
                          <Send className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(profile)} title="Editar">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleToggleBlock(profile)} title={profile.status === "blocked" ? "Desbloquear" : "Bloquear"}>
                          {profile.status === "blocked"
                            ? <Unlock className="w-4 h-4 text-green-600" />
                            : <Lock className="w-4 h-4 text-red-500" />}
                        </Button>
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
      </Tabs>
    </div>
  );
}