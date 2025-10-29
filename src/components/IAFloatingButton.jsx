import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Brain, Sparkles } from "lucide-react";

export default function IAFloatingButton() {
  return (
    <Link to={createPageUrl("Import")}>
      <div className="fixed bottom-6 right-6 z-50 group cursor-pointer">
        {/* Botão Principal */}
        <div className="relative flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-purple-500/50">
          {/* Ícone */}
          <div className="relative">
            <Brain className="w-6 h-6" />
            <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-yellow-300 animate-pulse" />
          </div>
          
          {/* Texto */}
          <span className="font-bold text-lg whitespace-nowrap">
            IA Sentinela
          </span>
          
          {/* Badge de Status */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
        </div>
        
        {/* Efeito de Brilho */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300 -z-10" />
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-stone-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl">
          Clique para processar com IA
          <div className="absolute top-full right-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-stone-900" />
        </div>
      </div>
    </Link>
  );
}