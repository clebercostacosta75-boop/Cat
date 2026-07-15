import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserCog, Plus, Search, Shield, Edit, Mail, Phone, X, Check, Send, Trash2, Clock, CheckCircle, Ban, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import PermissionsPanel from "@/components/users/PermissionsPanel";
import CredentialsModal from "@/components/users/CredentialsModal";
import { defaultPermissionsForRole } from "@/lib/moduleCatalog";

const ROLE_OPTIONS = [
  { value: "gestor_master", label: "Gestor Master" },
  { value: "admin", label: "Administrador" },
  { value: "comercial", label: "Comercial" },
  { value: "financeiro", label: "Financeiro" },
  { value: "coordenacao", label: "Coordenação" },
  { value: "certificacao", label: "Certificação" },
  { value: "atendimento", label: "Atendimento" },
  { value: "instrutor", label: "Instrutor" },
  { value: "aluno", label: "Aluno" },
  { value: "empresa", label: "Empresa" },
  { value: "auditor", label: "Auditor" },
  { value: "editor", label: "Editor" },
  { value: "cliente", label: "Cliente" },
  { value: "personalizado", label: "Personalizado" },
];

const ROLE_COLORS = {
  gestor_master: "bg-purple-100 text-purple-800", admin: "bg-red-100 text-red-800",
  comercial: "bg-cyan-100 text-cyan-800", financeiro: "bg-emerald-100 text-emerald-800",
  coordenacao: "bg-indigo-100 text-indigo-800", certificacao: "bg-teal-100 text-teal-800",
  atendimento: "bg-sky-100 text-sky-800", instrutor: "bg-amber-100 text-amber-800",
  aluno: "bg-blue-100 text-blue-800", empresa: "bg-slate-100 text-slate-800",
  auditor: "bg-violet-100 text-violet-800", editor: "bg-blue-100 text-blue-800",
  cliente: "bg-green-100 text-green-800", personalizado: "bg-orange-100 text-orange-800",
};

const ROLE_LABELS = {
  gestor_master: "Gestor Master", admin: "Administrador", comercial: "Comercial",
  financeiro: "Financeiro", coordenacao: "Coordenação", certificacao: "Certificação",
  atendimento: "Atendimento", instrutor: "Instrutor",
  aluno: "Aluno", empresa: "Empresa", auditor: "Auditor", editor: "Editor",
  cliente: "Cliente", personalizado: "Personalizado",
};

function UserForm({ profile, onSave, onCancel }) {
  const isNew = !profile;
  const [form, setForm] = useState({
    user_name: profile?.user_name || "",
    user_email: profile?.user_email || "",
    phone: profile?.phone || "",
    role: profile?.role || "editor",
    initial_password: "",
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Nome completo</Label>
          <Input value={form.user_name} onChange={e => set("user_name", e.target.value)} placeholder="Nome completo" required />
        </div>
        <div className="space-y-1">
          <Label>E-mail</Label>
          <Input type="email" value={form.user_email} onChange={e => set("user_email", e.target.value)} placeholder="email@exemplo.com" required disabled={!!profile} />
        </div>
        <div className="space-y-1">
          <Label>Telefone</Label>
          <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="(00) 00000-0000" />
        </div>
        <div className="space-y-1">
          <Label>Perfil de Acesso</Label>
          <select
            value={form.role}
            onChange={e => set("role", e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {isNew && <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">O usuário receberá um link individual para criar a própria senha e ativar a conta.</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
        <Button type="submit"><Check className="w-4 h-4 mr-1" /> {isNew ? "Criar Usuário" : "Salvar"}</Button>
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
  const [deletingProfile, setDeletingProfile] = useState(null);
  const [credentialsModal, setCredentialsModal] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.UserProfile.list("-created_date", 200);
      setProfiles(data);
    } catch {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfiles(); }, []);

  const handleSave = async (formData) => {
    try {
      if (editingProfile) {
        await base44.functions.invoke("atualizarPerfilUsuario", {
          profile_id: editingProfile.id,
          user_name: formData.user_name,
          phone: formData.phone,
          role: formData.role,
        });

        // Se mudou o role, notifica o contexto de permissões
        window.dispatchEvent(new Event("permissions-updated"));
        toast.success("Usuário atualizado com sucesso!");
      } else {
        // Verificar duplicidade
        const existing = profiles.find(p => p.user_email?.toLowerCase() === formData.user_email?.toLowerCase());
        if (existing) {
          toast.warning(`O e-mail ${formData.user_email} já está cadastrado.`);
          return;
        }

        // Criar perfil
        const createdProfile = await base44.entities.UserProfile.create({
          user_name: formData.user_name,
          user_email: formData.user_email,
          phone: formData.phone,
          role: formData.role,
          permissions: defaultPermissionsForRole(formData.role),
          status: "pending_password_change",
          credentials_sent_at: new Date().toISOString(),
          credentials_sent_via: "manual",
          password_changed: false,
        });

        // Convidar no sistema Base44 (não bloqueia a criação do perfil)
        let inviteOk = true;
        let activationUrl = "";
        try {
          const inviteRes = await base44.functions.invoke("convidarUsuario", {
            email: formData.user_email,
            user_name: formData.user_name,
            role: formData.role,
            profile_id: createdProfile.id,
            app_url: window.location.origin,
          });
          activationUrl = inviteRes.data?.activation_url || "";
          if (!inviteRes.data?.success) {
            inviteOk = false;
            toast.warning(`Usuário criado, mas o envio do convite falhou: ${inviteRes.data?.details || ""} Use o botão "Reenviar" na lista.`);
          }
        } catch (inviteErr) {
          inviteOk = false;
          const status = inviteErr?.response?.status;
          const detail = inviteErr?.response?.data?.error || inviteErr?.message || "";
          toast.warning(`Usuário criado, mas o envio do convite falhou${status ? ` (erro ${status})` : ""}. ${detail} Use o botão "Reenviar" na lista.`);
        }

        // Enviar WhatsApp se tiver telefone
        if (inviteOk && formData.phone) {
          try {
            await base44.functions.invoke("enviarNotificacaoWhatsApp", {
              recipient_type: "user",
              recipient_name: formData.user_name,
              recipient_phone: formData.phone,
              message_type: "credentials",
              credential_email: formData.user_email,
              credential_password: "",
              app_url: activationUrl || window.location.origin,
            });
            toast.success(`Usuário criado! Credenciais enviadas por WhatsApp.`);
          } catch {
            toast.success(`Usuário ${formData.user_name} criado com sucesso!`);
          }
        } else if (inviteOk) {
          toast.success(`Usuário ${formData.user_name} criado com sucesso!`);
        }

        setCredentialsModal({
          name: formData.user_name,
          email: formData.user_email,
          password: "",
          activationUrl: inviteOk ? activationUrl : "",
        });
      }

      setShowForm(false);
      setEditingProfile(null);
      await loadProfiles();
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.error || err?.message || "";
      toast.error(`Erro ao salvar usuário${status ? ` (erro ${status})` : ""}: ${detail}`);
    }
  };

  const handleResendInvite = async (profile) => {
    try {
      const res = await base44.functions.invoke("reenviarCredenciais", {
        user_email: profile.user_email,
        user_name: profile.user_name,
        profile_id: profile.id,
        app_url: window.location.origin,
      });
      if (res.data?.success) {
        if (profile.phone) {
          try {
            await base44.functions.invoke("enviarNotificacaoWhatsApp", {
              recipient_type: "user",
              recipient_name: profile.user_name,
              recipient_phone: profile.phone,
              message_type: "credentials",
              credential_email: profile.user_email,
              credential_password: "",
              app_url: res.data.activation_url || window.location.origin,
            });
          } catch {}
        }
        setCredentialsModal({
          name: profile.user_name,
          email: profile.user_email,
          password: "",
          activationUrl: res.data.activation_url,
        });
        toast.success("Convite reenviado com link de ativação da conta.");
        await loadProfiles();
      } else {
        toast.error(res.data?.error || "Erro ao reenviar convite");
      }
    } catch {
      toast.error("Erro ao reenviar convite");
    }
  };

  const handleStatus = async (profile) => {
    const nextStatus = profile.status === "blocked" ? "active" : "blocked";
    try {
      await base44.functions.invoke("atualizarStatusUsuario", { profile_id: profile.id, status: nextStatus });
      window.dispatchEvent(new Event("permissions-updated"));
      await loadProfiles();
      toast.success(nextStatus === "blocked" ? "Usuário bloqueado" : "Usuário reativado");
    } catch (error) {
      toast.error(error?.response?.data?.error || "Não foi possível alterar o status");
    }
  };

  const handleDelete = async () => {
    if (!deletingProfile) return;
    try {
      await base44.entities.UserProfile.delete(deletingProfile.id);
      setProfiles(prev => prev.filter(p => p.id !== deletingProfile.id));
      toast.success(`Usuário ${deletingProfile.user_name || deletingProfile.user_email} excluído.`);
    } catch {
      toast.error("Erro ao excluir usuário");
    } finally {
      setDeletingProfile(null);
    }
  };

  const canDelete = currentUser?.role === "admin";

  const filtered = profiles.filter(p => {
    const q = search.toLowerCase();
    return !q || (p.user_name || "").toLowerCase().includes(q) || (p.user_email || "").toLowerCase().includes(q);
  });

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
          <Button onClick={() => { setEditingProfile(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Novo Usuário
          </Button>
        )}
      </div>

      {/* Formulário inline */}
      {showForm && (
        <Card className="mb-6 border-2 border-blue-200">
          <CardContent className="pt-4">
            <h3 className="text-base font-semibold mb-4">{editingProfile ? "Editar Usuário" : "Novo Usuário"}</h3>
            <UserForm
              key={editingProfile?.id || "new"}
              profile={editingProfile}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditingProfile(null); }}
            />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="usuarios">
        <TabsList className="mb-4">
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="permissoes">Permissões de Acesso</TabsTrigger>
        </TabsList>

        {/* Aba: Usuários */}
        <TabsContent value="usuarios">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input className="pl-9" placeholder="Buscar por nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} />
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
                              <span>Convite em {format(new Date(profile.credentials_sent_at), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-orange-500 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>Convite não enviado</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                        <Badge className={ROLE_COLORS[profile.role] || "bg-gray-100 text-gray-800"}>
                          {ROLE_LABELS[profile.role] || profile.role || "—"}
                        </Badge>
                        <Badge className={profile.status === "active" ? "bg-green-100 text-green-800" : profile.status === "blocked" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>
                          {profile.status === "active" ? "Ativo" : profile.status === "blocked" ? "Bloqueado" : profile.status === "pending_password_change" ? "Aguardando 1º acesso" : profile.status || "—"}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => handleResendInvite(profile)} className="text-xs gap-1 text-blue-600 border-blue-200 hover:bg-blue-50">
                          <Send className="w-3 h-3" /> Reenviar convite
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => { setEditingProfile(profile); setShowForm(true); }} title="Editar">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleStatus(profile)} title={profile.status === "blocked" ? "Reativar" : "Bloquear"}>
                          {profile.status === "blocked" ? <UserCheck className="w-4 h-4 text-green-600" /> : <Ban className="w-4 h-4 text-amber-600" />}
                        </Button>
                        {canDelete && (
                          <Button size="icon" variant="ghost" onClick={() => setDeletingProfile(profile)} title="Excluir">
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

        {/* Aba: Permissões */}
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

      <CredentialsModal isOpen={!!credentialsModal} credentials={credentialsModal} onClose={() => setCredentialsModal(null)} />

      <AlertDialog open={!!deletingProfile} onOpenChange={open => !open && setDeletingProfile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deletingProfile?.user_name || deletingProfile?.user_email}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}