import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, ChevronUp, Search, Shield } from "lucide-react";
import { toast } from "sonner";
import { MODULE_GROUPS, MODULE_IDS, normalizePermissionIds } from "@/lib/moduleCatalog";

function PermissionEditor({ profile, onConfirmed }) {
  const [selected, setSelected] = useState(() => new Set(normalizePermissionIds(profile.permissions)));
  const [saving, setSaving] = useState(false);
  useEffect(() => setSelected(new Set(normalizePermissionIds(profile.permissions))), [profile.id, profile.permissions]);

  const toggle = id => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleGroup = modules => setSelected(prev => {
    const next = new Set(prev);
    const allOn = modules.every(m => next.has(m.module_id));
    modules.forEach(m => allOn ? next.delete(m.module_id) : next.add(m.module_id));
    return next;
  });

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const response = await base44.functions.invoke("atualizarPermissoesUsuario", { profile_id: profile.id, permissions: [...selected] });
      if (!response.data?.success) throw new Error(response.data?.error || "O banco não confirmou o salvamento");
      const persisted = new Set(normalizePermissionIds(response.data.confirmed_permissions || []));
      setSelected(persisted);
      await onConfirmed();
      window.dispatchEvent(new Event("permissions-updated"));
      toast.success(response.data.message || "Permissões salvas e confirmadas");
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || "Erro ao salvar permissões");
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-3 pt-3">
    <div className="flex items-center gap-2 flex-wrap">
      <Button size="sm" variant="outline" disabled={saving} onClick={() => setSelected(new Set(MODULE_IDS))}>Selecionar Tudo</Button>
      <Button size="sm" variant="outline" disabled={saving} onClick={() => setSelected(new Set())}>Limpar Tudo</Button>
      <span className="ml-auto text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">{selected.size} / {MODULE_IDS.length} módulos</span>
    </div>
    {MODULE_GROUPS.map(({ group, modules }) => {
      const count = modules.filter(m => selected.has(m.module_id)).length;
      return <div key={group} className="border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
          <div className="flex items-center gap-2"><Badge variant="secondary">{group}</Badge><span className="text-xs text-gray-400">{count}/{modules.length}</span></div>
          <Button size="sm" variant="ghost" disabled={saving} className="text-xs h-6 px-2" onClick={() => toggleGroup(modules)}>{count === modules.length ? "Desmarcar grupo" : "Marcar grupo"}</Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3">
          {modules.map(module => <label key={module.module_id} className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer text-sm ${selected.has(module.module_id) ? "bg-blue-50 border-blue-400 text-blue-800" : "bg-white border-gray-200 text-gray-700"}`}>
            <input type="checkbox" disabled={saving} checked={selected.has(module.module_id)} onChange={() => toggle(module.module_id)} className="w-4 h-4 accent-blue-600" />{module.name}
          </label>)}
        </div>
      </div>;
    })}
    <div className="flex justify-end"><Button onClick={save} disabled={saving} className="min-w-[190px]"><Check className="w-4 h-4 mr-1" />{saving ? "Salvando e confirmando..." : "Salvar Permissões"}</Button></div>
  </div>;
}

const ROLE_LABELS = { gestor_master: "Gestor Master", editor: "Editor", cliente: "Cliente", personalizado: "Personalizado" };

export default function PermissionsPanel({ profiles, onRefresh }) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const filtered = profiles.filter(p => !search || `${p.user_name || ""} ${p.user_email || ""}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="space-y-4">
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800"><Shield className="w-4 h-4 inline mr-1" />UserProfile é a fonte oficial. Perfis ausentes, não vinculados ou sem módulos permanecem sem acesso.</div>
    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input className="pl-9" placeholder="Buscar usuário..." value={search} onChange={e => setSearch(e.target.value)} /></div>
    <div className="space-y-2">{filtered.map(profile => <Card key={profile.id} className="overflow-hidden">
      <CardHeader className="p-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedId(expandedId === profile.id ? null : profile.id)}>
        <div className="flex items-center justify-between"><div className="flex items-center gap-3"><Shield className="w-5 h-5 text-gray-400" /><div><p className="font-medium text-sm">{profile.user_name || "—"}</p><p className="text-xs text-gray-500">{profile.user_email}</p>{!profile.user_id && <p className="text-xs text-amber-600">Aguardando vínculo com uma conta</p>}</div></div>
          <div className="flex items-center gap-2"><Badge>{ROLE_LABELS[profile.role] || profile.role}</Badge><Badge variant="secondary">{normalizePermissionIds(profile.permissions).length} módulos</Badge>{expandedId === profile.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
        </div>
      </CardHeader>
      {expandedId === profile.id && <CardContent className="p-4 pt-0 border-t">{["gestor_master", "admin"].includes(profile.role) ? <p className="py-3 text-sm text-center text-gray-500">Este perfil possui acesso administrativo total quando estiver ativo e corretamente vinculado.</p> : <PermissionEditor profile={profile} onConfirmed={onRefresh} />}</CardContent>}
    </Card>)}</div>
  </div>;
}