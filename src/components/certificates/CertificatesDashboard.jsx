import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, PenLine, CheckCircle, Clock, Link } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Link as RouterLink } from "react-router-dom";

const COLORS = ["#059669", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1"];

function getMonthLabel(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
  } catch { return null; }
}

export default function CertificatesDashboard() {
  const { data: certs = [], isLoading } = useQuery({
    queryKey: ["certs-dashboard"],
    queryFn: () => base44.entities.Certificate.list("-created_date", 500),
    staleTime: 60_000,
  });

  const total = certs.length;
  const pending = certs.filter(c => c.status === "pending_signature").length;
  const signed = certs.filter(c => c.status === "signed" || c.status === "active").length;
  const revoked = certs.filter(c => c.status === "revoked").length;

  // Assinados por mês (últimos 6 meses)
  const signedByMonth = useMemo(() => {
    const map = {};
    certs
      .filter(c => (c.status === "signed" || c.status === "active") && c.signed_at)
      .forEach(c => {
        const label = getMonthLabel(c.signed_at);
        if (!label) return;
        map[label] = (map[label] || 0) + 1;
      });

    // Últimos 6 meses com dados
    return Object.entries(map)
      .map(([month, qty]) => ({ month, qty }))
      .slice(-7);
  }, [certs]);

  // Pendentes por curso (top 5)
  const pendingByCourse = useMemo(() => {
    const map = {};
    certs
      .filter(c => c.status === "pending_signature")
      .forEach(c => {
        const course = c.course_name || "Sem curso";
        map[course] = (map[course] || 0) + 1;
      });
    return Object.entries(map)
      .map(([course, qty]) => ({ course: course.length > 22 ? course.slice(0, 20) + "…" : course, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [certs]);

  const stats = [
    { label: "Total Emitidos", value: total, icon: Award, color: "bg-blue-50 border-blue-200 text-blue-700", iconColor: "text-blue-500" },
    { label: "Pendentes de Assinatura", value: pending, icon: Clock, color: "bg-amber-50 border-amber-200 text-amber-700", iconColor: "text-amber-500" },
    { label: "Assinados", value: signed, icon: CheckCircle, color: "bg-emerald-50 border-emerald-200 text-emerald-700", iconColor: "text-emerald-500" },
    { label: "Revogados", value: revoked, icon: PenLine, color: "bg-red-50 border-red-200 text-red-600", iconColor: "text-red-400" },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Título da seção */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-700 flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-600" />
          Painel de Certificados
        </h2>
        <RouterLink
          to="/Certificacoes"
          className="text-xs text-emerald-600 hover:underline font-medium"
        >
          Ver todos →
        </RouterLink>
      </div>

      {/* Cards de indicadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`border rounded-xl p-4 ${s.color}`}>
              <Icon className={`w-5 h-5 mb-2 ${s.iconColor}`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Gráficos lado a lado */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Assinados por mês */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Certificados Assinados por Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            {signedByMonth.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">
                Sem dados de assinatura
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={signedByMonth} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" fontSize={11} stroke="#9ca3af" />
                  <YAxis allowDecimals={false} fontSize={11} stroke="#9ca3af" width={28} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    formatter={(v) => [v, "Assinados"]}
                  />
                  <Bar dataKey="qty" radius={[4, 4, 0, 0]} name="Assinados">
                    {signedByMonth.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pendentes por curso */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Pendentes por Curso (Top 5)
            </CardTitle>
            {pending > 0 && (
              <RouterLink to="/Certificacoes">
                <Badge className="bg-amber-100 text-amber-700 border-0 text-xs cursor-pointer hover:bg-amber-200">
                  <PenLine className="w-3 h-3 mr-1" /> Ver pendentes
                </Badge>
              </RouterLink>
            )}
          </CardHeader>
          <CardContent>
            {pendingByCourse.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">
                Nenhum certificado pendente 🎉
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={pendingByCourse} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} fontSize={11} stroke="#9ca3af" />
                  <YAxis type="category" dataKey="course" fontSize={10} stroke="#9ca3af" width={90} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    formatter={(v) => [v, "Pendentes"]}
                  />
                  <Bar dataKey="qty" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Pendentes" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}