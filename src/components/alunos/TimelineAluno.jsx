import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  UserPlus, FileText, CheckCircle, XCircle, BookOpen, CreditCard,
  Award, Lock, Unlock, MessageSquare, PenLine, DollarSign, Send, Loader2
} from "lucide-react";

const EVENT_CONFIG = {
  cadastro:            { icon: UserPlus,    color: "bg-blue-500",    label: "Cadastro Realizado" },
  auto_cadastro:       { icon: UserPlus,    color: "bg-blue-400",    label: "Auto-Cadastro" },
  documento_enviado:   { icon: FileText,    color: "bg-yellow-500",  label: "Documento Enviado" },
  documento_aprovado:  { icon: CheckCircle, color: "bg-green-500",   label: "Documento Aprovado" },
  documento_rejeitado: { icon: XCircle,     color: "bg-red-500",     label: "Documento Rejeitado" },
  matricula_criada:    { icon: BookOpen,    color: "bg-purple-500",  label: "Matrícula Criada" },
  matricula_autorizada:{ icon: CheckCircle, color: "bg-green-600",   label: "Matrícula Autorizada" },
  contrato_gerado:     { icon: FileText,    color: "bg-gray-600",    label: "Contrato Gerado" },
  contrato_enviado:    { icon: Send,        color: "bg-blue-600",    label: "Contrato Enviado" },
  contrato_assinado:   { icon: PenLine,     color: "bg-emerald-600", label: "Contrato Assinado" },
  cobranca_gerada:     { icon: CreditCard,  color: "bg-orange-500",  label: "Cobrança Gerada" },
  pagamento_confirmado:{ icon: DollarSign,  color: "bg-green-700",   label: "Pagamento Confirmado" },
  certificado_gerado:  { icon: Award,       color: "bg-yellow-600",  label: "Certificado Gerado" },
  certificado_assinado:{ icon: Award,       color: "bg-yellow-700",  label: "Certificado Assinado" },
  acesso_liberado:     { icon: Unlock,      color: "bg-teal-500",    label: "Acesso Liberado" },
  acesso_bloqueado:    { icon: Lock,        color: "bg-red-600",     label: "Acesso Bloqueado" },
  observacao:          { icon: MessageSquare,color:"bg-gray-400",    label: "Observação" },
};

export default function TimelineAluno({ studentId }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["timeline", studentId],
    queryFn: () => base44.entities.StudentTimeline.filter({ student_id: studentId }),
    enabled: !!studentId,
    initialData: [],
  });

  const sorted = [...events].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  if (isLoading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  );

  if (sorted.length === 0) return (
    <div className="text-center py-12 text-gray-400">
      <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-200" />
      <p className="text-sm">Nenhum evento registrado ainda</p>
    </div>
  );

  return (
    <div className="relative">
      {/* Linha vertical */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-4">
        {sorted.map((ev, idx) => {
          const cfg = EVENT_CONFIG[ev.event_type] || EVENT_CONFIG.observacao;
          const Icon = cfg.icon;
          const date = new Date(ev.created_date);

          return (
            <div key={ev.id} className="flex items-start gap-4 relative">
              {/* Ícone */}
              <div className={`w-10 h-10 rounded-full ${cfg.color} flex items-center justify-center flex-shrink-0 z-10 shadow-sm`}>
                <Icon className="w-4 h-4 text-white" />
              </div>

              {/* Conteúdo */}
              <div className="flex-1 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-900 text-sm">{ev.title}</p>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {date.toLocaleDateString("pt-BR")} {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {ev.description && <p className="text-sm text-gray-600 mt-0.5">{ev.description}</p>}
                <div className="flex items-center gap-3 mt-1">
                  {ev.performed_by && (
                    <span className="text-xs text-gray-400">Por: {ev.performed_by}</span>
                  )}
                  {ev.ip_address && (
                    <span className="text-xs text-gray-400 font-mono">IP: {ev.ip_address}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}