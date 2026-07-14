import React from "react";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function AccessDeniedScreen({ module, reason, reasonCode }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4 p-8">
        <ShieldOff className="w-16 h-16 text-red-400 mx-auto" />
        <h1 className="text-2xl font-bold text-gray-800">Acesso Negado</h1>
        <p className="text-gray-500 max-w-sm mx-auto">
          Você não tem permissão para acessar o módulo <strong>{module || "solicitado"}</strong>.
          {reason ? <span className="block text-xs text-gray-500 mt-2">Motivo: {reason}</span> : null}
          {reasonCode ? <span className="block text-xs text-gray-400 mt-1">Diagnóstico: {reasonCode}</span> : null}
        </p>
        <Link to="/">
          <Button variant="outline">Voltar ao início</Button>
        </Link>
      </div>
    </div>
  );
}