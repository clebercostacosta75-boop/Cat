import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Check, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Grupos de permissões organizados por categoria
const PERMISSION_GROUPS = [
  {
    label: "Geral",
    color: "bg-gray-100 text-gray-700",
    items: ["Dashboard", "Agenda de Treinamentos", "Cronograma", "Chamada Presencial"],
  },
  {
    label: "Operacional",
    color: "bg-blue-100 text-blue-700",
    items: ["Entrada de Propostas", "Gestão de BMM", "Instrutores", "Empresas", "Contratadas", "Cursos", "Importar Excel", "Alunos Individuais (PF)"],
  },
  {
    label: "Alunos Individuais (PF) — Seções",
    color: "bg-orange-100 text-orange-700",
    items: [
      "Alunos PF: Cadastro",
      "Alunos PF: Matrículas",
      "Alunos PF: Financeiro",
      "Alunos PF: Controle de Acesso",
    ],
  },
  {
    label: "Financeiro",
    color: "bg-green-100 text-green-700",
    items: ["Dashboard Financeiro"],
  },
  {
    label: "Certificações",
    color: "bg-yellow-100 text-yellow-700",
    items: ["Certificações", "Alertas de Vencimento", "Designer de Certificados", "Assinaturas Digitais", "Auditoria de Certificados"],
  },
  {
    label: "Comercial / Atendimento",
    color: "bg-purple-100 text-purple-700",
    items: ["Dashboard Comercial", "Gestão de Leads", "Assistente de Cadastros", "Caixa de Entrada", "Base de Conhecimento", "Contas Sociais"],
  },
  {
    label: "Comunicação",
    color: "bg-pink-100 text-pink-700",
    items: ["Modelos E-mail", "Central de Comunicação", "Config. Notificações", "Log de Notificações"],
  },
  {
    label: "Relatórios",
    color: "bg-indigo-100 text-indigo-700",
    items: ["Dashboard de Relatórios", "Dashboard Admin"],
  },
  {
    label: "Administração",
    color: "bg-red-100 text-red-700",
    items: ["Usuários", "Log de Auditoria", "Log de Acesso"],
  },
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.items);

function PermissionEditor({ profile, onSaved }) {
  // Carrega permissões salvas no UserProfile
  const [selected, setSelected] = useState(new Set(profile.permissions || []));
  const [saving, setSaving] = useState(false);

  const toggle = (perm) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  };

  const toggleGroup = (items) => {
    const allSelected = items.every(i => selected.has(i));
    setSelected(prev => {
      const next = new Set(prev);
      items.forEach(i => allSelected ? next.delete(i) : next.add(i));
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(ALL_PERMISSIONS));
  const clearAll = () => setSelected(new Set());

  const handleSave = async () => {
    setSaving(true);
    try {
      const perms = Array.from(selected);
      const res = await base44.functions.invoke("atualizarPermissoesUsuario", {
        user_email: profile.user_email,
        profile_id: profile.id,
        permissions: perms,
      });
      if (res.data?.success) {
        toast.success(`Permissões de ${profile.user_name} salvas com sucesso! O menu será atualizado automaticamente.`);
        window.dispatchEvent(new Event("permissions-updated"));
        onSaved();
      } else {
        const errMsg = res.data?.error || "Erro ao salvar permissões";
        toast.error(errMsg);
      }
    } catch (err) {
      const detail = err?.response?.data?.error || err?.response?.data?.details || err?.message || "";
      if (detail.includes("403") || detail.toLowerCase().includes("sem permissão") || detail.toLowerCase().includes("forbidden")) {
        toast.error("Sem permissão para alterar permissões. Apenas Administradores e Gestores Master podem fazer isso.");
      } else if (detail.includes("404") || detail.toLowerCase().includes("não encontrado")) {
        toast.error("Perfil do usuário não encontrado no sistema.");
      } else {
        toast.error(detail ? `Erro: ${detail}` : "Erro ao salvar permissões. Tente novamente.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pt-3">
      {/* Controles globais */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={selectAll}>Selecionar Tudo</Button>
        <Button size="sm" variant="outline" onClick={clearAll}>Limpar Tudo</Button>
        <span className="ml-auto text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
          {selected.size} / {ALL_PERMISSIONS.length} permissões selecionadas
        </span>
      </div>

      {/* Grupos */}
      {PERMISSION_GROUPS.map(group => {
        const groupSelected = group.items.filter(i => selected.has(i)).length;
        const allGroupSelected = groupSelected === group.items.length;
        return (
          <div key={group.label} className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${group.color}`}>{group.label}</span>
                <span className="text-xs text-gray-400">{groupSelected}/{group.items.length}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-6 px-2"
                onClick={() => toggleGroup(group.items)}
              >
                {allGroupSelected ? "Desmarcar grupo" : "Marcar grupo"}
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3">
              {group.items.map(perm => (
                <label
                  key={perm}
                  className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors text-sm ${
                    selected.has(perm)
                      ? "bg-blue-50 border-blue-400 text-blue-800"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(perm)}
                    onChange={() => toggle(perm)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  {perm}
                </label>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex justify-end pt-1">
        <Button onClick={handleSave} disabled={saving} className="min-w-[160px]">
          <Check className="w-4 h-4 mr-1" />
          {saving ? "Salvando..." : "Salvar Permissões"}
        </Button>
      </div>
    </div>
  );
}

export default function PermissionsPanel({ profiles, onRefresh }) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const filtered = profiles.filter(p => {
    const q = search.toLowerCase();
    return !q || (p.user_name || "").toLowerCase().includes(q) || (p.user_email || "").toLowerCase().includes(q);
  });

  const isAdmin = (p) => p.role === "admin" || p.role === "Administrador Master" || p.role === "gestor_master";

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        <Shield className="w-4 h-4 inline mr-1" />
        Admins e Gestores Master têm acesso total automaticamente. Para os demais, defina as permissões individualmente.
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Buscar usuário..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {filtered.map(profile => (
          <Card key={profile.id} className="overflow-hidden">
            <CardHeader
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedId(expandedId === profile.id ? null : profile.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{profile.user_name || "—"}</p>
                    <p className="text-xs text-gray-500">{profile.user_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin(profile) ? (
                    <Badge className="bg-purple-100 text-purple-800">Acesso Total</Badge>
                  ) : (
                    <Badge className={`${(profile.permissions || []).length > 0 ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-500"}`}>
                      {(profile.permissions || []).length} permissões
                    </Badge>
                  )}
                  {expandedId === profile.id
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>
            </CardHeader>

            {expandedId === profile.id && (
              <CardContent className="p-4 pt-0 border-t">
                {isAdmin(profile) ? (
                  <p className="text-sm text-gray-500 py-3 text-center">
                    Este usuário tem acesso total — não é necessário configurar permissões individualmente.
                  </p>
                ) : (
                  <PermissionEditor
                    key={profile.id}
                    profile={profile}
                    onSaved={() => { onRefresh(); }}
                  />
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}