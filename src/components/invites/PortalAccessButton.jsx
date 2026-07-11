import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";
import GerarAcessoPortalModal from "./GerarAcessoPortalModal";

export default function PortalAccessButton({ portalType, entityId, name, email, phone, size = "sm", variant = "outline" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size={size} variant={variant} onClick={() => setOpen(true)} title={`Gerar acesso ao Portal ${portalType}`} className="gap-1">
        <KeyRound className="w-3.5 h-3.5" /> Portal
      </Button>
      {open && (
        <GerarAcessoPortalModal
          open={open}
          onClose={() => setOpen(false)}
          portalType={portalType}
          entityId={entityId}
          name={name}
          email={email}
          phone={phone}
        />
      )}
    </>
  );
}