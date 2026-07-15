import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { usePermissions } from "@/lib/PermissionsContext";
import { MODULE_BY_ID } from "@/lib/moduleCatalog";

export default function AuthorizedDashboard() {
  const { access } = usePermissions();
  const modules = (access?.allowedModules || [])
    .filter((id) => id !== "dashboard" && MODULE_BY_ID[id]?.route)
    .map((id) => MODULE_BY_ID[id]);

  return <section className="space-y-5">
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Visão geral</h2>
      <p className="text-sm text-gray-500 mt-1">Acesse somente os módulos liberados para o seu perfil.</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {modules.map((module) => <Link key={module.module_id} to={module.route} className="group flex items-center justify-between rounded-lg border bg-white p-4 hover:border-gray-400">
        <span className="flex items-center gap-3 text-sm font-medium text-gray-800"><LayoutDashboard className="w-4 h-4 text-gray-500" />{module.name}</span>
        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700" />
      </Link>)}
    </div>
  </section>;
}