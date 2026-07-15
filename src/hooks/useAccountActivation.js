import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export default function useAccountActivation(token) {
  const [stage, setStage] = useState("loading");
  const [invite, setInvite] = useState(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) { setStage("error"); setError("Convite inválido ou expirado."); return; }
    base44.functions.invoke("activateUserInvite", { action: "inspect", token })
      .then(({ data }) => { setInvite(data); setStage("activate"); })
      .catch((err) => { setError(err?.response?.data?.error || "Convite inválido ou expirado."); setStage("error"); });
  }, [token]);

  const finish = async (termsAccepted) => {
    const { data } = await base44.functions.invoke("activateUserInvite", { action: "complete", token, terms_accepted: termsAccepted });
    window.dispatchEvent(new Event("permissions-force-reload"));
    window.location.assign(data.redirect_to || "/");
  };

  const createAccount = async ({ email, newPassword, termsAccepted }) => {
    setBusy(true); setError("");
    try {
      if (email.trim().toLowerCase() !== invite.recipient_email) throw new Error("Confirme o mesmo e-mail do convite.");
      await base44.auth.register({ email: invite.recipient_email, password: newPassword });
      setPassword(newPassword); setStage("otp");
    } catch (err) { setError(err?.response?.data?.message || err?.message || "Não foi possível criar a conta."); }
    finally { setBusy(false); }
  };

  const verifyCode = async (otpCode) => {
    setBusy(true); setError("");
    try {
      await base44.auth.verifyOtp({ email: invite.recipient_email, otpCode });
      await base44.auth.loginViaEmailPassword(invite.recipient_email, password);
      await finish(true);
    } catch (err) { setError(err?.response?.data?.message || err?.message || "Código inválido ou expirado."); }
    finally { setBusy(false); }
  };

  const activateExisting = async (termsAccepted) => {
    setBusy(true); setError("");
    try {
      if (!(await base44.auth.isAuthenticated())) { base44.auth.redirectToLogin(window.location.pathname + window.location.search); return; }
      await finish(termsAccepted);
    } catch (err) { setError(err?.response?.data?.error || "Entre com o e-mail do convite para continuar."); }
    finally { setBusy(false); }
  };

  return { stage, invite, busy, error, createAccount, verifyCode, activateExisting };
}