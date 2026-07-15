import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLE_LABELS = { coordenacao: "Coordenação", admin: "Administrador", gestor_master: "Gestor Master" };

export default function AccountActivationForm({ invite, busy, error, onCreate, onExisting }) {
  const [email, setEmail] = useState(invite.recipient_email);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const submit = (event) => {
    event.preventDefault();
    if (!accepted) return;
    if (!invite.account_exists && (password.length < 8 || password !== confirm)) return;
    invite.account_exists ? onExisting(accepted) : onCreate({ email, newPassword: password, termsAccepted: accepted });
  };
  return <form onSubmit={submit} className="space-y-4">
    <p className="text-sm text-gray-600">Olá, {invite.recipient_name}. Ative seu acesso ao Portal CAT Cursos.</p>
    <div className="rounded-lg border bg-gray-50 p-3 text-sm text-gray-600"><p>Tipo: <strong>{invite.access_type?.replaceAll("_", " ")}</strong></p><p>Perfil: <strong>{ROLE_LABELS[invite.role] || invite.role}</strong></p><p>Destino: <strong>{invite.portal}</strong></p>{invite.access_type === "usuario_cat" && <p>Módulos liberados: <strong>{invite.modules_count}</strong></p>}</div>
    <div><Label>Nome</Label><Input value={invite.recipient_name || ""} readOnly className="mt-1 bg-gray-50" /></div>
    <div><Label>Confirmar e-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" /></div>
    {!invite.account_exists && <><div><Label>Criar senha</Label><Input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" required /></div><div><Label>Confirmar senha</Label><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1" required /></div></>}
    {invite.account_exists && <p className="text-sm p-3 bg-blue-50 border border-blue-200 rounded-lg">Sua conta já existe. Entre com este e-mail para concluir o vínculo e trocar a senha no primeiro acesso.</p>}
    <label className="flex items-start gap-3 text-sm text-gray-600"><Checkbox checked={accepted} onCheckedChange={setAccepted} className="mt-0.5" /><span>Aceito os Termos de Uso e a Política de Privacidade.</span></label>
    {error && <p className="text-sm text-red-600">{error}</p>}
    {!invite.account_exists && confirm && password !== confirm && <p className="text-sm text-red-600">As senhas não coincidem.</p>}
    <Button className="w-full h-11" disabled={busy || !accepted}>{busy ? "Ativando..." : invite.account_exists ? "Entrar e ativar conta" : "Criar minha conta e acessar"}</Button>
  </form>;
}