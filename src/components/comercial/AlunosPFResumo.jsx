import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Users, BookOpen, DollarSign, Shield, TrendingUp, Clock,
  CheckCircle, XCircle, AlertTriangle, ArrowRight, UserPlus
} from "lucide-react";

export default function AlunosPFResumo() {
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["students-pf"],
    queryFn: () => base44.entities.Student.list("-created_date"),
    initialData: [],
  });

  const { data: enrollments = [], isLoading: loadingEnrollments } = useQuery({
    queryKey: ["enrollments-pf"],
    queryFn: async () => {
      const all = await base44.entities.StudentCourseEnrollment.list("-created_date", 500);
      return (all || []).filter(e => !e.company_id || e.company_id === "individual" || e.company_name === "Individual (PF)");
    },
    initialData: [],
  });

  const isLoading = loadingStudents || loadingEnrollments;

  // KPIs Cadastro
  const totalAlunos = students.length;
  const alunosAtivos = students.filter(s => s.status === "Ativo").length;
  const alunosInativos = students.filter(s => s.status !== "Ativo").length;
  const today = new Date().toISOString().split("T")[0];
  const novosHoje = students.filter(s => (s.created_date || "").startsWith(today)).length;

  // KPIs Matrículas
  const totalMatriculas = enrollments.length;
  const aguardando = enrollments.filter(e => e.status === "Aguardando Autorização").length;
  const autorizados = enrollments.filter(e => e.status === "Autorizado").length;
  const certificados = enrollments.filter(e => e.status === "Certificado Gerado").length;

  // KPIs Financeiro
  const totalReceita = enrollments.reduce((acc, e) => acc + (parseFloat(e.unit_value) || 0), 0);
  const pagos = enrollments.filter(e => e.status_pagamento === "Pago");
  const pendentes = enrollments.filter(e => e.status_pagamento === "Pendente");
  const inadimplentes = enrollments.filter(e => e.status_pagamento === "Inadimplente");
  const totalRecebido = pagos.reduce((acc, e) => acc + (parseFloat(e.unit_value) || 0), 0);
  const totalPendente = pendentes.reduce((acc, e) => acc + (parseFloat(e.unit_value) || 0), 0);

  const fmt = (v) => `R$ ${(parseFloat(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  // Últimos 5 cadastros
  const recentes = students.slice(0, 5);

  // Matrículas recentes aguardando autorização
  const pendentesAutorizacao = enrollments
    .filter(e => e.status === "Aguardando Autorização")
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-2" />
        Carregando dados de Alunos PF...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com link */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Alunos Individuais — Pessoa Física
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Cadastro, Matrículas, Financeiro e Controle de Acesso</p>
        </div>
        <Link to="/GestaoAlunosIndividuais">
          <Button className="bg-gray-900 hover:bg-gray-800 flex items-center gap-2">
            Abrir Gestão Completa
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Bloco 1: Cadastro */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-blue-500" /> Cadastro
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <Users className="w-5 h-5 text-blue-600 mb-1" />
              <p className="text-2xl font-bold text-blue-900">{totalAlunos}</p>
              <p className="text-xs text-blue-700">Total de Alunos</p>
            </CardContent>
          </Card>
          <Card className="border border-green-200 bg-green-50">
            <CardContent className="p-4">
              <CheckCircle className="w-5 h-5 text-green-600 mb-1" />
              <p className="text-2xl font-bold text-green-800">{alunosAtivos}</p>
              <p className="text-xs text-green-700">Ativos</p>
            </CardContent>
          </Card>
          <Card className="border border-red-200 bg-red-50">
            <CardContent className="p-4">
              <XCircle className="w-5 h-5 text-red-500 mb-1" />
              <p className="text-2xl font-bold text-red-700">{alunosInativos}</p>
              <p className="text-xs text-red-600">Inativos / Bloqueados</p>
            </CardContent>
          </Card>
          <Card className="border border-indigo-200 bg-indigo-50">
            <CardContent className="p-4">
              <TrendingUp className="w-5 h-5 text-indigo-600 mb-1" />
              <p className="text-2xl font-bold text-indigo-800">{novosHoje}</p>
              <p className="text-xs text-indigo-700">Novos Hoje</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bloco 2: Matrículas */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-purple-500" /> Matrículas
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <BookOpen className="w-5 h-5 text-gray-600 mb-1" />
              <p className="text-2xl font-bold text-gray-900">{totalMatriculas}</p>
              <p className="text-xs text-gray-500">Total de Matrículas</p>
            </CardContent>
          </Card>
          <Card className="border border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <Clock className="w-5 h-5 text-yellow-600 mb-1" />
              <p className="text-2xl font-bold text-yellow-800">{aguardando}</p>
              <p className="text-xs text-yellow-700">Aguardando Autorização</p>
            </CardContent>
          </Card>
          <Card className="border border-green-200 bg-green-50">
            <CardContent className="p-4">
              <CheckCircle className="w-5 h-5 text-green-600 mb-1" />
              <p className="text-2xl font-bold text-green-800">{autorizados}</p>
              <p className="text-xs text-green-700">Autorizados</p>
            </CardContent>
          </Card>
          <Card className="border border-emerald-200 bg-emerald-50">
            <CardContent className="p-4">
              <Shield className="w-5 h-5 text-emerald-600 mb-1" />
              <p className="text-2xl font-bold text-emerald-800">{certificados}</p>
              <p className="text-xs text-emerald-700">Certificados Gerados</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bloco 3: Financeiro */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-500" /> Financeiro
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <TrendingUp className="w-5 h-5 text-gray-600 mb-1" />
              <p className="text-lg font-bold text-gray-900">{fmt(totalReceita)}</p>
              <p className="text-xs text-gray-500">Receita Total Prevista</p>
            </CardContent>
          </Card>
          <Card className="border border-green-200 bg-green-50">
            <CardContent className="p-4">
              <CheckCircle className="w-5 h-5 text-green-600 mb-1" />
              <p className="text-lg font-bold text-green-800">{fmt(totalRecebido)}</p>
              <p className="text-xs text-green-700">Recebido ({pagos.length})</p>
            </CardContent>
          </Card>
          <Card className="border border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <Clock className="w-5 h-5 text-yellow-600 mb-1" />
              <p className="text-lg font-bold text-yellow-800">{fmt(totalPendente)}</p>
              <p className="text-xs text-yellow-700">A Receber ({pendentes.length})</p>
            </CardContent>
          </Card>
          <Card className="border border-red-200 bg-red-50">
            <CardContent className="p-4">
              <AlertTriangle className="w-5 h-5 text-red-500 mb-1" />
              <p className="text-2xl font-bold text-red-700">{inadimplentes.length}</p>
              <p className="text-xs text-red-600">Inadimplentes</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bloco 4: Listas rápidas lado a lado */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Cadastros recentes */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-2 border-b border-gray-100">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-500" /> Cadastros Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentes.length === 0 ? (
              <p className="text-center py-6 text-gray-400 text-sm">Nenhum cadastro ainda</p>
            ) : (
              <div className="divide-y">
                {recentes.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{s.full_name}</p>
                      <p className="text-xs text-gray-400">CPF: {s.cpf}</p>
                    </div>
                    <Badge className={s.status === "Ativo" ? "bg-green-100 text-green-800 text-xs" : "bg-red-100 text-red-700 text-xs"}>
                      {s.status || "Ativo"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Matrículas aguardando autorização */}
        <Card className="border border-yellow-200">
          <CardHeader className="pb-2 border-b border-yellow-100 bg-yellow-50">
            <CardTitle className="text-sm font-semibold text-yellow-800 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Aguardando Autorização
              {aguardando > 0 && <Badge className="bg-yellow-200 text-yellow-900 ml-auto text-xs">{aguardando}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {pendentesAutorizacao.length === 0 ? (
              <p className="text-center py-6 text-gray-400 text-sm">Nenhuma matrícula pendente</p>
            ) : (
              <div className="divide-y">
                {pendentesAutorizacao.map(e => (
                  <div key={e.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{e.student_name}</p>
                      <p className="text-xs text-gray-500">{e.course_name}</p>
                    </div>
                    <Badge className={
                      e.status_pagamento === "Pago" ? "bg-green-100 text-green-800 text-xs" :
                      e.status_pagamento === "Inadimplente" ? "bg-red-100 text-red-700 text-xs" :
                      "bg-yellow-100 text-yellow-800 text-xs"
                    }>
                      {e.status_pagamento || "Pendente"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CTA para gestão completa */}
      <div className="flex justify-center pt-2">
        <Link to="/GestaoAlunosIndividuais">
          <Button variant="outline" className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 gap-2">
            <Users className="w-4 h-4" />
            Ver Gestão Completa de Alunos PF
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}