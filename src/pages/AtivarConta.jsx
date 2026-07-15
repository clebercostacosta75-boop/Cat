import React from "react";
import ActivationShell from "@/components/activation/ActivationShell";
import AccountActivationForm from "@/components/activation/AccountActivationForm";
import OtpVerificationForm from "@/components/activation/OtpVerificationForm";
import useAccountActivation from "@/hooks/useAccountActivation";

export default function AtivarConta() {
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const activation = useAccountActivation(token);
  return <ActivationShell>
    {activation.stage === "loading" && <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" /></div>}
    {activation.stage === "error" && <div className="text-center"><h2 className="font-semibold text-gray-900">Convite inválido ou expirado</h2><p className="text-sm text-red-600 mt-2">{activation.error}</p><p className="text-sm text-gray-500 mt-3">Solicite um novo convite ao administrador.</p></div>}
    {activation.stage === "activate" && <AccountActivationForm invite={activation.invite} busy={activation.busy} error={activation.error} onCreate={activation.createAccount} onExisting={activation.activateExisting} />}
    {activation.stage === "otp" && <OtpVerificationForm email={activation.invite.recipient_email} busy={activation.busy} error={activation.error} onVerify={activation.verifyCode} />}
  </ActivationShell>;
}