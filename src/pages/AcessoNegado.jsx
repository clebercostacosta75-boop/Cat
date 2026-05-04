import React from "react";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function AcessoNegado() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4 p-8">
        <ShieldOff className="w-16 h-16 text-red-400 mx-auto" />
        <h1 className="text-2xl font-bold text-gray-800">Acesso Negado</h1>
        <p className="text-gray-500 max-w-sm mx-auto">
          Você não tem permissão para acessar esta área. Caso acredite que isso é um erro, entre em contato com o administrador.
        </p>
        <Link to="/">
          <Button variant="outline">Voltar ao início</Button>
        </Link>
      </div>
    </div>
  );
}