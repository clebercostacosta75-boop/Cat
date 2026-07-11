import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, CheckCircle, XCircle, KeyRound } from "lucide-react";

const CONSENT_VERSION = "v1.0";
const PORTAL_ROUTES = { Aluno: "/PortalAluno", Instrutor: "/PortalInstrutor", Empresa: "/CompanyPortal" };

export default function AtivarAcesso() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token") || "";

  const [state, setState] = useState("loading"); // loading | invalid | ready | needs_login | activating | done
  const [invite, setInvite] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const inspect = async () => {
      if (!token) { setState("invalid"); return; }
      try {
        const res = await base44.functions.invoke("activatePortalInvite", { action: "inspect", token });
        if (res.data?.valid) { setInvite(res.data); setState("ready"); }
        else setState("invalid");
      } catch {
        setState("invalid");
      }
    };
    inspect();
  }, [token]);

  const handleActivate = async () => {
    if (!accepted) return;
    setState("activating");
    try {
      const res = await base44.functions.invoke("activatePortalInvite", {
        action: "activate",
        token,
        lgpd: { accepted: true, version: CONSENT_VERSION },
      });
      if (res.data?.success) { setInvite(prev => ({ ...prev, portal_type: res.data.portal_type })); setState("done"); }
      else { setErrorMsg(res.data?.error || "Convite inválido ou expirado."); setState("invalid"); }
    } catch (err) {
      const data = err?.response?.data;
      if (data?.requires_login) {
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
        return;
      }
      setErrorMsg(data?.error || "Convite inválido ou expirado.");
      setState("invalid");
    }
  };

  const Shell = ({ children }) => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-900 text-white px-8 py-6">
          <div className="flex items-center gap-3 mb-1">
            <KeyRound className="w-7 h-7" />
            <h1 className="text-xl font-bold">Ativação de Acesso</h1>
          </div>
          <p className="text-gray-400 text-sm">CAT Cursos e Treinamentos</p>
        </div>
        <div className="p-8">{children}</div>
      </div>
    </div>
  );

  if (state === "loading") {
    return <Shell><div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" /></div></Shell>;
  }

  if (state === "invalid") {
    return (
      <Shell>
        <div className="text-center space-y-3">
          <XCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-lg font-semibold text-gray-800">Convite inválido ou expirado</h2>
          <p className="text-sm text-gray-500">{errorMsg || "Este link de ativação não é válido. Solicite um novo convite ao gestor do sistema."}</p>
        </div>
      </Shell>
    );
  }

  if (state === "done") {
    return (
      <Shell>
        <div className="text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          <h2 className="text-lg font-semibold text-gray-800">Acesso ativado com sucesso!</h2>
          <p className="text-sm text-gray-500">Seu acesso ao Portal {invite?.portal_type} está liberado.</p>
          <Button className="w-full" onClick={() => { window.location.href = PORTAL_ROUTES[invite?.portal_type] || "/"; }}>
            Ir para o Portal {invite?.portal_type}
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-5">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
          <p className="font-semibold mb-1">Convite para o Portal {invite.portal_type}</p>
          <p>Destinatário: <strong>{invite.recipient_name}</strong> ({invite.recipient_email_masked})</p>
          <p className="text-xs text-blue-700 mt-1">Válido até {new Date(invite.expires_at).toLocaleString("pt-BR")} • uso único</p>
        </div>

        <p className="text-sm text-gray-600">
          Para ativar, você precisa estar logado com o e-mail do convite. Se ainda não tiver conta, o login seguro da plataforma criará sua senha.
        </p>

        <div className="flex items-start gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl">
          <Checkbox id="lgpd" checked={accepted} onCheckedChange={setAccepted} className="mt-0.5" />
          <label htmlFor="lgpd" className="text-sm text-gray-700 cursor-pointer leading-relaxed">
            Li e <strong>aceito os Termos de Uso e a Política de Privacidade (LGPD)</strong> da CAT Cursos e Treinamentos ({CONSENT_VERSION}), e consinto com o tratamento dos meus dados. Data, hora e IP serão registrados.
          </label>
        </div>

        <Button className="w-full h-11 bg-gray-900 hover:bg-gray-800" disabled={!accepted || state === "activating"} onClick={handleActivate}>
          <Shield className="w-4 h-4 mr-2" />
          {state === "activating" ? "Ativando..." : "Aceitar e Ativar Acesso"}
        </Button>
      </div>
    </Shell>
  );
}