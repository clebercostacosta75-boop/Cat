import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OtpVerificationForm({ email, busy, error, onVerify }) {
  const [code, setCode] = useState("");
  return <form onSubmit={(event) => { event.preventDefault(); onVerify(code); }} className="space-y-4">
    <div><h2 className="font-semibold text-gray-900">Verifique seu e-mail</h2><p className="text-sm text-gray-600 mt-1">Enviamos um código para {email}. Digite-o abaixo para confirmar a conta.</p></div>
    <div><Label>Código de verificação</Label><Input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" className="mt-1" required /></div>
    {error && <p className="text-sm text-red-600">{error}</p>}
    <Button className="w-full h-11" disabled={busy || !code}>{busy ? "Verificando..." : "Confirmar e acessar"}</Button>
  </form>;
}