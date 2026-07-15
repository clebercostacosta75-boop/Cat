import React from "react";
import { KeyRound } from "lucide-react";

export default function ActivationShell({ children }) {
  return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-900 text-white px-8 py-6">
        <div className="flex items-center gap-3"><KeyRound className="w-7 h-7" /><h1 className="text-xl font-bold">Ativar minha conta</h1></div>
        <p className="text-gray-400 text-sm mt-1">CAT Cursos e Treinamentos</p>
      </div>
      <div className="p-8">{children}</div>
    </div>
  </div>;
}