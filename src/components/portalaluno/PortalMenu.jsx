import React from "react";
import {
  LayoutDashboard, BookOpen, Calendar, Award, CreditCard,
  User, FileText, Mail, DollarSign
} from "lucide-react";

const BASE_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "cursos", label: "Meus Cursos", icon: BookOpen },
  { key: "agenda", label: "Agenda", icon: Calendar },
  { key: "certificados", label: "Certificados", icon: Award },
  { key: "carteira", label: "Carteira Digital", icon: CreditCard },
  { key: "prontuario", label: "Prontuário", icon: User },
  { key: "documentos", label: "Documentos", icon: FileText },
  { key: "comunicacao", label: "Comunicação", icon: Mail },
];

// Menu adaptativo: "Financeiro" só entra quando há ao menos uma matrícula de origem Comunidade.
export default function PortalMenu({ active, onSelect, showFinanceiro }) {
  const items = showFinanceiro
    ? [...BASE_ITEMS.slice(0, 5), { key: "financeiro", label: "Financeiro", icon: DollarSign }, ...BASE_ITEMS.slice(5)]
    : BASE_ITEMS;

  return (
    <div className="flex gap-1.5 flex-wrap">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onSelect(item.key)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
            active === item.key
              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          <item.icon className="w-3.5 h-3.5" />
          {item.label}
        </button>
      ))}
    </div>
  );
}