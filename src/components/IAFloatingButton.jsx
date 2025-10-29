import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Brain } from "lucide-react";

export default function IAFloatingButton() {
  return (
    <Link to={createPageUrl("Import")}>
      <div className="fixed bottom-6 right-6 z-50 group">
        <button className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 font-bold text-base">
          <Brain className="w-5 h-5" />
          <span>IA Sentinela</span>
        </button>
        
        {/* Efeito de brilho */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity -z-10" />
      </div>
    </Link>
  );
}