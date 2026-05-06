import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Check, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ALL_PERMISSIONS = [
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
  "Log de Acesso",
  "Dashboard Admin",
  "Dashboard Comercial",
  "Gestão de Leads",
  "Caixa de Entrada",
  "Base de Conhecimento",
  "Contas Sociais",
  "Dashboard de Relatórios",
];

function PermissionEditor({ profile, onSaved }) {
  const current = profile.permissions || [];
  const [selected, setSelected] = useState(new Set(current));
  const [saving, setSaving] = useState(false);

  const toggle = (perm) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(ALL_PERMISSIONS));
  const clearAll = () => setSelected(new Set());

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.UserProfile.update(profile.id, {
        permissions: Array.from(selected),
      });
      toast.success(`Permissões de ${profile.user_name} salvas!`);
      onSaved();
    } catch {
      toast.error("Erro ao salvar permissões");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={selectAll}>Selecionar Tudo</Button>
        <Button size="sm" variant="outline" onClick={clearAll}>Limpar Tudo</Button>
        <span className="ml-auto text-sm text-gray-500 self-center">{selected.size} de {ALL_PERMISSIONS.length} selecionados</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {ALL_PERMISSIONS.map(perm => (
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
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving}>
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
                    <Badge className="bg-gray-100 text-gray-700">
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
                  <PermissionEditor profile={profile} onSaved={() => { onRefresh(); }} />
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}