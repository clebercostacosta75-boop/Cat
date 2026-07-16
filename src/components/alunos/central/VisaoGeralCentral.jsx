import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus, FileText, DollarSign, PenLine, Shield, TrendingUp, Copy, MailWarning, ChevronRight,
} from "lucide-react";
import { isMatriculaIndividual } from "@/lib/origemMatricula";
import { agruparDuplicidadesCpf, calcularVagasOferta, derivarEtapa, WORKFLOW_STAGES, WORKFLOW_STAGE_COLORS } from "@/lib/centralMatricula";
import MatriculaFicha from "@/components/alunos/central/MatriculaFicha";

const safe = (fn) => async () => { try { return (await fn()) || []; } catch { return []; } };

export default function VisaoGeralCentral() {
  const [filaAtiva, setFilaAtiva] = useState("novas");
  const [fichaEnrollment, setFichaEnrollment] = useState(null);

  const { data: enrollments = [] } = useQuery({
    queryKey: ["central-enrollments"],
    queryFn: safe(async () => {
      const all = await base44.entities.StudentCourseEnrollment.list("-created_date", 500);
      return (all || []).filter(isMatriculaIndividual);
    }),
  });
  const { data: students = [] } = useQuery({ queryKey: ["central-students"], queryFn: safe(() => base44.entities.Student.list("-created_date", 2000)) });
  const { data: contracts = [] } = useQuery({ queryKey: ["central-contracts"], queryFn: safe(() => base44.entities.Contract.list("-created_date", 500)) });
  const { data: documents = [] } = useQuery({ queryKey: ["central-docs"], queryFn: safe(() => base44.entities.StudentDocument.filter({ status: "Pendente_Revisao" })) });
  const { data: accessAccounts = [] } = useQuery({ queryKey: ["central-access"], queryFn: safe(() => base44.entities.AccessAccount.filter({ access_type: "aluno", status: "aguardando_ativacao" })) });
  const { data: offers = [] } = useQuery({ queryKey: ["central-offers"], queryFn: safe(() => base44.entities.CourseOffer.list("-created_date", 200)) });
  const { data: reservations = [] } = useQuery({ queryKey: ["central-reservas"], queryFn: safe(() => base44.entities.SeatReservation.list("-created_date", 500)) });
  const { data: filaMsgs = [] } = useQuery({ queryKey: ["central-fila-msgs"], queryFn: safe(() => base44.entities.FilaMensagem.list("-created_date", 300)) });
  const { data: preCadastros = [] } = useQuery({ queryKey: ["central-precad"], queryFn: safe(() => base44.entities.PreCadastro.filter({ status: "Aguardando validação" })) });

  const seteDiasAtras = new Date(Date.now() - 7 * 86400000).toISOString();
  const hoje = new Date().toISOString().split("T")[0];

  const enrollAtivas = enrollments.filter((e) => !["Cancelled", "Transferred", "Refunded"].includes(derivarEtapa(e)));
  const novas = enrollments.filter((e) => (e.created_date || "") >= seteDiasAtras);
  const pagamentosPend = enrollAtivas.filter((e) =>
    ["Pendente", "Inadimplente", "Parcialmente Pago", "Aguardando Confirmação"].includes(e.status_pagamento) ||
    (e.data_vencimento_pagamento && e.data_vencimento_pagamento < hoje && e.status_pagamento !== "Pago")
  );
  const enrollIds = new Set(enrollments.map((e) => e.id));
  const contratosNaoAssinados = contracts.filter((c) =>
    enrollIds.has(c.enrollment_id) &&
    !["Assinado_Todas_Partes", "PDF_Gerado", "Enviado_WhatsApp", "Cancelado", "Substituido_Aditivo"].includes(c.status)
  );
  const semContrato = enrollAtivas.filter((e) => !contracts.some((c) => c.enrollment_id === e.id));
  const duplicidades = agruparDuplicidadesCpf(students);
  const falhasComunicacao = filaMsgs.filter((m) => /erro|falha|failed/i.test(m.status || ""));

  const CARDS = [
    { id: "novas", title: "Novas Matrículas (7 dias)", icon: UserPlus, color: "text-indigo-600 bg-indigo-50 border-indigo-200", count: novas.length },
    { id: "documentos", title: "Documentos Pendentes", icon: FileText, color: "text-orange-600 bg-orange-50 border-orange-200", count: documents.length + preCadastros.length },
    { id: "pagamentos", title: "Pagamentos Pendentes/Vencidos", icon: DollarSign, color: "text-yellow-700 bg-yellow-50 border-yellow-200", count: pagamentosPend.length },
    { id: "contratos", title: "Contratos Não Assinados", icon: PenLine, color: "text-blue-600 bg-blue-50 border-blue-200", count: contratosNaoAssinados.length + semContrato.length },
    { id: "acessos", title: "Acessos Aguardando Ativação", icon: Shield, color: "text-purple-600 bg-purple-50 border-purple-200", count: accessAccounts.length },
    { id: "ofertas", title: "Ofertas e Vagas", icon: TrendingUp, color: "text-emerald-600 bg-emerald-50 border-emerald-200", count: offers.length },
    { id: "duplicidades", title: "Duplicidades de CPF", icon: Copy, color: "text-red-600 bg-red-50 border-red-200", count: duplicidades.length },
    { id: "comunicacao", title: "Falhas de Comunicação", icon: MailWarning, color: "text-rose-600 bg-rose-50 border-rose-200", count: falhasComunicacao.length },
  ];

  const RowMatricula = ({ e, extra }) => (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0" onClick={() => setFichaEnrollment(e)}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{e.student_name}</p>
        <p className="text-xs text-gray-500 truncate">{e.course_name}{extra ? ` • ${extra}` : ""}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge className={`text-xs ${WORKFLOW_STAGE_COLORS[derivarEtapa(e)] || "bg-gray-100 text-gray-600"}`}>{WORKFLOW_STAGES[derivarEtapa(e)]}</Badge>
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </div>
    </div>
  );

  const RowSimples = ({ titulo, subtitulo, badge, badgeClass = "bg-gray-100 text-gray-600" }) => (
    <div className="flex items-center justify-between p-3 border-b last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{titulo}</p>
        {subtitulo && <p className="text-xs text-gray-500 truncate">{subtitulo}</p>}
      </div>
      {badge && <Badge className={`text-xs flex-shrink-0 ${badgeClass}`}>{badge}</Badge>}
    </div>
  );

  const renderFila = () => {
    switch (filaAtiva) {
      case "novas":
        return novas.length === 0 ? <Vazio msg="Nenhuma matrícula nova nos últimos 7 dias" /> : novas.map((e) => <RowMatricula key={e.id} e={e} extra={new Date(e.created_date).toLocaleDateString("pt-BR")} />);
      case "documentos":
        return documents.length + preCadastros.length === 0 ? <Vazio msg="Nenhum documento pendente" /> : (
          <>
            {documents.map((d) => <RowSimples key={d.id} titulo={d.student_name || d.file_name} subtitulo={`${d.document_type} — pendente de revisão`} badge="Documento" badgeClass="bg-orange-100 text-orange-700" />)}
            {preCadastros.map((p) => <RowSimples key={p.id} titulo={p.nome_completo} subtitulo="Pré-cadastro aguardando validação" badge="Pré-cadastro" badgeClass="bg-cyan-100 text-cyan-700" />)}
          </>
        );
      case "pagamentos":
        return pagamentosPend.length === 0 ? <Vazio msg="Nenhum pagamento pendente" /> : pagamentosPend.map((e) => <RowMatricula key={e.id} e={e} extra={`${e.status_pagamento}${e.data_vencimento_pagamento ? ` • vence ${e.data_vencimento_pagamento}` : ""}`} />);
      case "contratos":
        return contratosNaoAssinados.length + semContrato.length === 0 ? <Vazio msg="Nenhum contrato pendente" /> : (
          <>
            {contratosNaoAssinados.map((c) => <RowSimples key={c.id} titulo={c.student_name} subtitulo={`${c.course_name || ""} — ${(c.status || "").replace(/_/g, " ")}`} badge="Não assinado" badgeClass="bg-blue-100 text-blue-700" />)}
            {semContrato.map((e) => <RowMatricula key={e.id} e={e} extra="Sem contrato gerado" />)}
          </>
        );
      case "acessos":
        return accessAccounts.length === 0 ? <Vazio msg="Nenhum acesso aguardando ativação" /> : accessAccounts.map((a) => <RowSimples key={a.id} titulo={a.person_name} subtitulo={a.email} badge="Aguardando ativação" badgeClass="bg-purple-100 text-purple-700" />);
      case "ofertas":
        return offers.length === 0 ? <Vazio msg="Nenhuma oferta cadastrada" /> : offers.map((o) => {
          const v = calcularVagasOferta(o, reservations, enrollments);
          return <RowSimples key={o.id} titulo={o.nome_comercial} subtitulo={`Total ${v.total} • Reservadas ${v.reservadas} • Confirmadas ${v.confirmadas} • Disponíveis ${v.disponiveis}`} badge={o.publication_status || o.status || "—"} badgeClass={v.disponiveis === 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"} />;
        });
      case "duplicidades":
        return duplicidades.length === 0 ? <Vazio msg="Nenhuma duplicidade de CPF detectada" /> : duplicidades.map((d) => (
          <RowSimples key={d.cpf} titulo={d.alunos.map((a) => a.full_name).join(" / ")} subtitulo={`CPF ${d.cpf.slice(0, 3)}.***.***-** — ${d.alunos.length} cadastros. Duplicidade para análise manual (nunca consolidar automaticamente).`} badge="Análise" badgeClass="bg-red-100 text-red-700" />
        ));
      case "comunicacao":
        return falhasComunicacao.length === 0 ? <Vazio msg="Nenhuma falha de comunicação" /> : falhasComunicacao.map((m) => <RowSimples key={m.id} titulo={m.destinatario_nome || m.destinatario || m.canal || "Mensagem"} subtitulo={m.assunto || m.tipo || m.template || ""} badge={m.status} badgeClass="bg-rose-100 text-rose-700" />);
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {fichaEnrollment && (
        <MatriculaFicha enrollment={fichaEnrollment} onClose={() => setFichaEnrollment(null)} />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CARDS.map((c) => (
          <Card
            key={c.id}
            className={`cursor-pointer border transition-all ${filaAtiva === c.id ? "ring-2 ring-gray-900 " : ""}${c.color.split(" ").slice(1).join(" ")}`}
            onClick={() => setFilaAtiva(c.id)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <c.icon className={`w-5 h-5 ${c.color.split(" ")[0]}`} />
                <span className="text-2xl font-bold text-gray-900">{c.count}</span>
              </div>
              <p className="text-xs font-medium text-gray-600 mt-1 leading-tight">{c.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-0">
          <div className="px-4 py-2.5 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {CARDS.find((c) => c.id === filaAtiva)?.title}
          </div>
          <div className="max-h-96 overflow-y-auto">{renderFila()}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function Vazio({ msg }) {
  return <div className="py-10 text-center text-sm text-gray-400">{msg}</div>;
}