import React, { useState } from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AccountLinkAction({ profile, onLinked }) {
  const [loading, setLoading] = useState(false);
  if (profile.user_id && profile.status !== "pending_password_change") return null;

  const linkAccount = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke("concluirVinculoConta", { profile_id: profile.id, app_url: window.location.origin });
      if (!response.data?.success) throw new Error(response.data?.error || "Não foi possível concluir o vínculo");
      toast.success(response.data.message);
      window.dispatchEvent(new Event("permissions-force-reload"));
      await onLinked();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || "Erro ao concluir vínculo");
    } finally {
      setLoading(false);
    }
  };

  return <Button size="sm" variant="outline" disabled={loading} onClick={linkAccount} className="text-blue-700 border-blue-200">
    <Link2 className="w-4 h-4 mr-1" />{loading ? "Verificando conta..." : "Concluir vínculo da conta"}
  </Button>;
}