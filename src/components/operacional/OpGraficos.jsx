import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS_STATUS = {
  "Agendado": "#3b82f6",
  "Em Andamento": "#eab308",
  "Concluído": "#22c55e",
  "Cancelado": "#ef4444",
};

const PIE_COLORS = ["#3b82f6", "#eab308", "#22c55e", "#ef4444", "#8b5cf6", "#f97316"];

export default function OpGraficos({ schedules }) {
  // GRÁFICO 1 - Treinamentos por Empresa (top 10)
  const byEmpresa = {};
  schedules.forEach(s => {
    if (s.company_name) byEmpresa[s.company_name] = (byEmpresa[s.company_name] || 0) + 1;
  });
  const dataEmpresa = Object.entries(byEmpresa)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 18) + "…" : name, value }));

  // GRÁFICO 2 - Status
  const byStatus = {};
  schedules.forEach(s => { if (s.status) byStatus[s.status] = (byStatus[s.status] || 0) + 1; });
  const dataStatus = Object.entries(byStatus).map(([name, value]) => ({ name, value }));

  // GRÁFICO 3 - Instrutores (top 8)
  const byInstrutor = {};
  schedules.forEach(s => {
    if (s.instructor_name) byInstrutor[s.instructor_name] = (byInstrutor[s.instructor_name] || 0) + 1;
  });
  const dataInstrutor = Object.entries(byInstrutor)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name: name.split(" ")[0], value }));

  // GRÁFICO 4 - Evolução últimos 6 meses
  const now = new Date();
  const meses = Array.from({ length: 6 }, (_, i) => {
    const m = subMonths(now, 5 - i);
    return {
      key: format(m, "yyyy-MM"),
      label: format(m, "MMM/yy", { locale: ptBR }),
    };
  });
  const dataEvolucao = meses.map(({ key, label }) => ({
    name: label,
    value: schedules.filter(s => s.realization_dates?.some(d => d?.startsWith(key))).length,
  }));

  // GRÁFICO 5 - Modalidade
  const byModalidade = {};
  schedules.forEach(s => { if (s.modality) byModalidade[s.modality] = (byModalidade[s.modality] || 0) + 1; });
  const dataModalidade = Object.entries(byModalidade).map(([name, value]) => ({ name, value }));

  // GRÁFICO 6 - Local
  const byLocal = {};
  schedules.forEach(s => { if (s.location) byLocal[s.location] = (byLocal[s.location] || 0) + 1; });
  const dataLocal = Object.entries(byLocal)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name: name.length > 14 ? name.slice(0, 12) + "…" : name, value }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* 1 - Por Empresa */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Treinamentos por Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          {dataEmpresa.length === 0 ? <p className="text-xs text-gray-400 py-4 text-center">Sem dados</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dataEmpresa} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={45} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Treinamentos" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 2 - Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Distribuição por Status</CardTitle>
        </CardHeader>
        <CardContent>
          {dataStatus.length === 0 ? <p className="text-xs text-gray-400 py-4 text-center">Sem dados</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={dataStatus} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {dataStatus.map((entry, i) => (
                    <Cell key={i} fill={COLORS_STATUS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 3 - Por Instrutor */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Treinamentos por Instrutor</CardTitle>
        </CardHeader>
        <CardContent>
          {dataInstrutor.length === 0 ? <p className="text-xs text-gray-400 py-4 text-center">Sem dados</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dataInstrutor} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={60} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 3, 3, 0]} name="Treinamentos" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 4 - Evolução */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Evolução — Últimos 6 Meses</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dataEvolucao} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Treinamentos" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 5 - Modalidade */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Treinamentos por Modalidade</CardTitle>
        </CardHeader>
        <CardContent>
          {dataModalidade.length === 0 ? <p className="text-xs text-gray-400 py-4 text-center">Sem dados</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dataModalidade} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#f97316" radius={[3, 3, 0, 0]} name="Turmas" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 6 - Local */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Distribuição por Local</CardTitle>
        </CardHeader>
        <CardContent>
          {dataLocal.length === 0 ? <p className="text-xs text-gray-400 py-4 text-center">Sem dados</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={dataLocal} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {dataLocal.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}