import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen, Clock, Award, PenLine, AlertTriangle, RefreshCw, DollarSign
} from "lucide-react";
import { getDaysLeft, matriculasComunidade } from "@/lib/portalAluno";

function StatCard({ icon: Icon, value, label, color }) {
  return (
    <Card className="border border-gray-200">
      <CardContent className="p-4">
        <Icon className={`w-5 h-5 mb-1 ${color}`} />
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function PortalDashboard({ enrollments, certificates, showFinanceiro }) {
  const todayStr = new Date().toISOString().split("T")[0];

  const realizados = enrollments.filter((e) => e.end_date && e.end_date < todayStr).length;
  const emAndamento = enrollments.filter(
    (e) => e.start_date && e.end_date && e.start_date <= todayStr && e.end_date >= todayStr
  ).length;

  const emitidos = certificates.length;
  const pendentesAssinatura = certificates.filter((c) => c.status === "pending_signature").length;
  const vencidos = certificates.filter((c) => {
    if (c.status === "expired") return true;
    const days = getDaysLeft(c.valid_until);
    return days !== null && days < 0;
  }).length;
  const proximasReciclagens = certificates.filter((c) => {
    if (c.status === "revoked") return false;
    const days = getDaysLeft(c.valid_until);
    return days !== null && days >= 0 && days <= 90;
  }).length;

  const pendenciasFinanceiras = matriculasComunidade(enrollments).filter((e) =>
    ["Pendente", "Parcialmente Pago", "Inadimplente"].includes(e.status_pagamento)
  ).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard icon={BookOpen} value={realizados} label="Cursos realizados" color="text-blue-600" />
      <StatCard icon={Clock} value={emAndamento} label="Cursos em andamento" color="text-indigo-600" />
      <StatCard icon={Award} value={emitidos} label="Certificados emitidos" color="text-emerald-600" />
      <StatCard icon={PenLine} value={pendentesAssinatura} label="Pendentes de assinatura" color="text-yellow-600" />
      <StatCard icon={AlertTriangle} value={vencidos} label="Certificados vencidos" color="text-red-600" />
      <StatCard icon={RefreshCw} value={proximasReciclagens} label="Próximas reciclagens (90d)" color="text-orange-600" />
      {showFinanceiro && (
        <StatCard icon={DollarSign} value={pendenciasFinanceiras} label="Pendências financeiras" color="text-rose-600" />
      )}
    </div>
  );
}