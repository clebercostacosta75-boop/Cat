import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { derivarEtapa, WORKFLOW_STAGES, WORKFLOW_STAGE_COLORS } from "@/lib/centralMatricula";
import ContratoAssinaturaTab from "@/components/contratos/ContratoAssinaturaTab";
import FichaAcoes from "@/components/alunos/central/FichaAcoes";

const safe = (fn) => async () => { try { return (await fn()) || []; } catch { return []; } };
const money = (v) => v || v === 0 ? `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—";

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value || "—"}</p>
    </div>
  );
}

export default function MatriculaFicha({ enrollment: initial, onClose, onChanged }) {
  const [tab, setTab] = useState("resumo");

  // Recarrega a matrícula para refletir alterações feitas na própria ficha
  const { data: enrollList = [], refetch } = useQuery({
    queryKey: ["ficha-enrollment", initial.id],
    queryFn: safe(() => base44.entities.StudentCourseEnrollment.filter({ id: initial.id })),
  });
  const enrollment = enrollList[0] || initial;

  const { data: studentList = [] } = useQuery({
    queryKey: ["ficha-student", enrollment.student_id],
    queryFn: safe(() => base44.entities.Student.filter({ id: enrollment.student_id })),
    enabled: !!enrollment.student_id,
  });
  const student = studentList[0];

  const { data: contracts = [] } = useQuery({
    queryKey: ["ficha-contract", enrollment.id],
    queryFn: safe(() => base44.entities.Contract.filter({ enrollment_id: enrollment.id })),
  });
  const contract = contracts[0];

  const { data: documents = [] } = useQuery({
    queryKey: ["ficha-docs", enrollment.student_id],
    queryFn: safe(() => base44.entities.StudentDocument.filter({ student_id: enrollment.student_id })),
    enabled: !!enrollment.student_id,
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["ficha-timeline", enrollment.student_id],
    queryFn: safe(() => base44.entities.StudentTimeline.filter({ student_id: enrollment.student_id }, "-created_date", 100)),
    enabled: !!enrollment.student_id,
  });

  const { data: accessAccounts = [] } = useQuery({
    queryKey: ["ficha-access", enrollment.student_id],
    queryFn: safe(() => base44.entities.AccessAccount.filter({ access_type: "aluno", student_id: enrollment.student_id })),
    enabled: !!enrollment.student_id,
  });
  const access = accessAccounts[0];

  const etapa = derivarEtapa(enrollment);

  // Pendências calculadas
  const pendencias = [];
  if (documents.some((d) => d.status === "Pendente_Revisao")) pendencias.push("Documento(s) pendente(s) de revisão");
  if (!["Pago", "Cortesia"].includes(enrollment.status_pagamento)) pendencias.push(`Pagamento: ${enrollment.status_pagamento || "Pendente"}`);
  if (!contract) pendencias.push("Contrato não gerado");
  else if (!["Assinado_Todas_Partes", "PDF_Gerado", "Enviado_WhatsApp"].includes(contract.status)) pendencias.push(`Contrato: ${(contract.status || "").replace(/_/g, " ")}`);
  if (enrollment.resultado_academico === "Pendente" || !enrollment.resultado_academico) pendencias.push("Resultado acadêmico pendente");
  if (!access) pendencias.push("Sem conta de acesso ao portal");
  else if (access.status !== "ativo") pendencias.push(`Acesso ao portal: ${access.status}`);
  if (enrollment.last_pending_reason) pendencias.push(`Registrada: ${enrollment.last_pending_reason}`);

  const desconto = enrollment.discount_percentage_snapshot || null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            📋 Ficha da Matrícula — {enrollment.student_name}
            <Badge className={WORKFLOW_STAGE_COLORS[etapa]}>{WORKFLOW_STAGES[etapa]}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 mb-3">
            {[["resumo", "Resumo"], ["aluno", "Aluno"], ["curso", "Curso/Vaga"], ["documentos", `Documentos (${documents.length})`], ["financeiro", "Financeiro"], ["contrato", "Contrato"], ["acesso", "Acesso"], ["timeline", "Linha do Tempo"], ["acoes", "Ações"]].map(([v, l]) => (
              <TabsTrigger key={v} value={v} className="text-xs data-[state=active]:bg-gray-900 data-[state=active]:text-white">{l}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="resumo" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Info label="Aluno" value={enrollment.student_name} />
              <Info label="Curso" value={enrollment.course_name} />
              <Info label="Período" value={`${enrollment.start_date || "—"} → ${enrollment.end_date || "—"}`} />
              <Info label="Etapa Atual" value={WORKFLOW_STAGES[etapa]} />
              <Info label="Status Legado" value={enrollment.status} />
              <Info label="Resultado Acadêmico" value={enrollment.resultado_academico || "Pendente"} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">⚠️ Pendências</p>
              {pendencias.length === 0 ? (
                <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-2.5">✅ Nenhuma pendência identificada</p>
              ) : (
                <ul className="space-y-1.5">
                  {pendencias.map((p, i) => (
                    <li key={i} className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">• {p}</li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          <TabsContent value="aluno">
            {!student ? <p className="text-sm text-gray-400 py-6 text-center">Cadastro do aluno não localizado.</p> : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Info label="Nome Completo" value={student.full_name} />
                <Info label="CPF" value={student.cpf} />
                <Info label="RG" value={student.rg} />
                <Info label="Nascimento" value={student.data_nascimento} />
                <Info label="E-mail" value={student.email} />
                <Info label="WhatsApp" value={student.whatsapp} />
                <Info label="Cidade/UF" value={student.cidade ? `${student.cidade}/${student.estado || ""}` : ""} />
                <Info label="Status" value={student.status} />
                <Info label="Origem" value={student.origem} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="curso">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Info label="Curso" value={enrollment.course_name} />
              <Info label="Carga Horária" value={enrollment.course_duration} />
              <Info label="Oferta" value={enrollment.oferta_nome || (enrollment.course_offer_id || enrollment.oferta_id ? "Vinculada" : "Sem oferta")} />
              <Info label="Pacote" value={enrollment.pacote_nome} />
              <Info label="Turma" value={enrollment.class_schedule_id ? "Vinculada" : "Sem turma"} />
              <Info label="Reserva de Vaga" value={enrollment.seat_reservation_id ? "Vinculada" : "Sem reserva"} />
              <Info label="Origem da Inscrição" value={enrollment.origem_inscricao} />
              <Info label="Atendente" value={enrollment.atendente_nome} />
              <Info label="Tipo de Certificação" value={enrollment.certification_type} />
            </div>
          </TabsContent>

          <TabsContent value="documentos">
            {documents.length === 0 ? <p className="text-sm text-gray-400 py-6 text-center">Nenhum documento anexado.</p> : (
              <div className="divide-y border rounded-md">
                {documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{d.document_type} — {d.file_name || "arquivo"}</p>
                      <p className="text-xs text-gray-400">{new Date(d.created_date).toLocaleString("pt-BR")}</p>
                    </div>
                    <Badge className={d.status === "Aprovado" ? "bg-green-100 text-green-700" : d.status === "Rejeitado" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}>
                      {(d.status || "").replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="financeiro">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Info label="Valor Original" value={money(enrollment.valor_original ?? enrollment.unit_value)} />
              <Info label="Desconto Autorizado" value={desconto ? `${desconto}% (${enrollment.discount_code_snapshot || "código"})` : enrollment.desconto ? money(enrollment.desconto) : "Sem desconto"} />
              <Info label="Valor Descontado" value={enrollment.discount_amount != null ? money(enrollment.discount_amount) : "—"} />
              <Info label="Valor Final" value={money(enrollment.final_amount ?? enrollment.unit_value)} />
              <Info label="Parcelas" value={`${enrollment.parcelas_quantidade || 1}x`} />
              <Info label="Forma de Pagamento" value={enrollment.forma_pagamento} />
              <Info label="Status do Pagamento" value={enrollment.status_pagamento} />
              <Info label="Vencimento" value={enrollment.data_vencimento_pagamento} />
              <Info label="Observação Financeira" value={enrollment.observacao_financeira} />
            </div>
            <p className="text-xs text-gray-400 mt-3">O desconto nunca altera o preço cadastrado da oferta — os valores acima são snapshots gravados na matrícula.</p>
          </TabsContent>

          <TabsContent value="contrato">
            <ContratoAssinaturaTab enrollmentId={enrollment.id} studentId={enrollment.student_id} enrollmentData={enrollment} />
          </TabsContent>

          <TabsContent value="acesso">
            {!access ? (
              <p className="text-sm text-gray-500 bg-gray-50 border rounded-md p-4">Este aluno ainda não possui conta de acesso ao portal.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Info label="Nome" value={access.person_name} />
                <Info label="E-mail" value={access.email} />
                <Info label="Portal" value={access.allowed_portal} />
                <Info label="Status" value={access.status} />
                <Info label="Ativado em" value={access.activated_at ? new Date(access.activated_at).toLocaleString("pt-BR") : "—"} />
                <Info label="Último acesso" value={access.last_access_at ? new Date(access.last_access_at).toLocaleString("pt-BR") : "—"} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="timeline">
            {timeline.length === 0 ? <p className="text-sm text-gray-400 py-6 text-center">Nenhum evento registrado.</p> : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {timeline.map((t) => (
                  <div key={t.id} className="border-l-2 border-gray-300 pl-3 py-1">
                    <p className="text-sm font-semibold text-gray-800">{t.title}</p>
                    {t.description && <p className="text-xs text-gray-600">{t.description}</p>}
                    <p className="text-xs text-gray-400">{new Date(t.created_date).toLocaleString("pt-BR")}{t.performed_by ? ` — ${t.performed_by}` : ""}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="acoes">
            <FichaAcoes
              enrollment={enrollment}
              onChanged={() => { refetch(); onChanged && onChanged(); }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}