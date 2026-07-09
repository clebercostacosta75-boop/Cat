import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, ChevronUp, Search, Shield } from "lucide-react";
import { toast } from "sonner";
import { ALL_MODULES } from "@/lib/PermissionsContext";

// Nomes de exibição (a chave interna de permissão permanece inalterada)
const MODULE_DISPLAY = { "Alunos Individuais (PF)": "Gestão Acadêmica" };

const MODULE_GROUPS = [
  { label: "Geral", color: "bg-gray-100 text-gray-700", items: ["Dashboard", "Cronograma", "Agenda de Treinamentos", "Chamada Presencial"] },
  { label: "Operacional", color: "bg-blue-100 text-blue-700", items: ["Entrada de Propostas", "Gestão de BMM", "Instrutores", "Empresas", "Contratadas", "Cursos", "Alunos Individuais (PF)", "Gestão de Contratos", "Dashboard Operacional", "Dashboard Financeiro", "Financeiro", "ProntuarioDigital", "GestaoDocumentosAluno"] },
  { label: "Certificações", color: "bg-yellow-100 text-yellow-700", items: ["Certificações", "Alertas de Vencimento", "Designer de Certificados", "Assinaturas Digitais", "Auditoria de Certificados"] },
  { label: "Comercial", color: "bg-purple-100 text-purple-700", items: ["Dashboard Comercial"] },
  { label: "Comunicação", color: "bg-pink-100 text-pink-700", items: ["Central de Comunicação"] },
  { label: "Relatórios", color: "bg-indigo-100 text-indigo-700", items: ["Dashboard de Relatórios", "Dashboard Admin", "DashboardMaster", "DashboardCertificacao", "DashboardInstrutor"] },
  { label: "Homologação", color: "bg-teal-100 text-teal-700", items: ["Homologações", "DossieHomologacao", "Matriz de Treinamentos"] },
  { label: "Administração", color: "bg-red-100 text-red-700", items: ["Usuários", "Log de Auditoria", "Auditoria Completa", "Log de Acesso", "BackupDownload", "AlertasConfig"] },
];

function CustomPermissionEditor({ profile, onSaved }) {
  const [selected, setSelected] = useState(new Set(profile.permissions || []));
  const [saving, setSaving] = useState(false);

  const toggle = (perm) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(perm) ? next.delete(perm) : next.add(perm);
      return next;
    });
  };

  const toggleGroup = (items) => {
    const allOn = items.every(i => selected.has(i));
    setSelected(prev => {
      const next = new Set(prev);
      items.forEach(i => allOn ? next.delete(i) : next.add(i));
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke("atualizarPermissoesUsuario", {
        user_email: profile.user_email,
        permissions: Array.from(selected),
      });
      if (res.data?.success) {
        toast.success("Permissões salvas com sucesso!");
        window.dispatchEvent(new Event("permissions-updated"));
        onSaved();
      } else {
        toast.error(res.data?.error || "Erro ao salvar permissões");
      }
    } catch (err) {
      toast.error("Erro ao salvar permissões: " + (err?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => setSelected(new Set(ALL_MODULES))}>Selecionar Tudo</Button>
        <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Limpar Tudo</Button>
        <span className="ml-auto text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
          {selected.size} / {ALL_MODULES.length} módulos
        </span>
      </div>

      {MODULE_GROUPS.map(group => {
        const count = group.items.filter(i => selected.has(i)).length;
        const allOn = count === group.items.length;
        return (
          <div key={group.label} className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${group.color}`}>{group.label}</span>
                <span className="text-xs text-gray-400">{count}/{group.items.length}</span>
              </div>
              <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => toggleGroup(group.items)}>
                {allOn ? "Desmarcar grupo" : "Marcar grupo"}
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3">
              {group.items.map(perm => (
                <label key={perm} className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer text-sm transition-colors ${
                  selected.has(perm) ? "bg-blue-50 border-blue-400 text-blue-800" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}>
                  <input type="checkbox" checked={selected.has(perm)} onChange={() => toggle(perm)} className="w-4 h-4 accent-blue-600" />
                  {MODULE_DISPLAY[perm] || perm}
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

const ROLE_DESCRIPTION = {
  gestor_master: { label: "Gestor Master", desc: "Acesso total irrestrito a todos os módulos.", badge: "bg-purple-100 text-purple-800" },
  editor: { label: "Editor", desc: "Acesso a todos os módulos, exceto área de Administração.", badge: "bg-blue-100 text-blue-800" },
  cliente: { label: "Cliente", desc: "Acesso restrito: Dashboard, Certificações e Alertas de Vencimento.", badge: "bg-green-100 text-green-800" },
  personalizado: { label: "Personalizado", desc: "Acesso configurado individualmente abaixo.", badge: "bg-orange-100 text-orange-800" },
};

export default function PermissionsPanel({ profiles, onRefresh }) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const filtered = profiles.filter(p => {
    const q = search.toLowerCase();
    return !q || (p.user_name || "").toLowerCase().includes(q) || (p.user_email || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        <Shield className="w-4 h-4 inline mr-1" />
        <strong>Gestor Master</strong> = acesso total. <strong>Editor</strong> = tudo exceto Administração. <strong>Cliente</strong> = apenas Dashboard, Certificações e Alertas. <strong>Personalizado</strong> = configure abaixo.
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input className="pl-9" placeholder="Buscar usuário..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-2">
        {filtered.map(profile => {
          const roleInfo = ROLE_DESCRIPTION[profile.role] || { label: profile.role, desc: "", badge: "bg-gray-100 text-gray-800" };
          return (
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
                      {roleInfo.desc && <p className="text-xs text-gray-400 mt-0.5">{roleInfo.desc}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={roleInfo.badge}>{roleInfo.label}</Badge>
                    {profile.role === "personalizado" && (
                      <Badge className="bg-gray-100 text-gray-600">{(profile.permissions || []).length} módulos</Badge>
                    )}
                    {expandedId === profile.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>
              </CardHeader>

              {expandedId === profile.id && (
                <CardContent className="p-4 pt-0 border-t">
                  {profile.role === "personalizado" ? (
                    <CustomPermissionEditor key={profile.id} profile={profile} onSaved={() => { onRefresh(); }} />
                  ) : (
                    <div className="py-3 text-sm text-gray-500 text-center">
                      As permissões são definidas automaticamente pelo perfil <strong>{roleInfo.label}</strong>.<br />
                      Para controle individual, altere o perfil para <strong>Personalizado</strong> na aba Usuários.
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}