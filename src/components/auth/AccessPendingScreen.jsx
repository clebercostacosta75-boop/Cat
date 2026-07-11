import React from "react";
import { ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function AccessPendingScreen({ reason }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4 p-8 max-w-md">
        <ShieldAlert className="w-16 h-16 text-amber-400 mx-auto" />
        <h1 className="text-2xl font-bold text-gray-800">Acesso pendente ou bloqueado</h1>
        <p className="text-gray-500">
          Sua conta ainda não possui módulos liberados ou está aguardando ativação.
          Entre em contato com o administrador do sistema.
        </p>
        {reason ? <p className="text-xs text-gray-400">Motivo: {reason}</p> : null}
        <Button variant="outline" onClick={() => base44.auth.logout()}>
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </Button>
      </div>
    </div>
  );
}