import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Unlock, CheckCircle, XCircle, Clock, Shield } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/lib/PermissionsContext";

const STATUS_CLS = {
  "Pendente": "bg-yellow-100 text-yellow-800",
  "Aprovada": "bg-green-100 text-green-800",
  "Negada": "bg-red-100 text-red-700",
  "Cancelada": "bg-gray-100 text-gray-500",
};

export default function LiberacoesCertificacaoTab() {
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState("Pendente");
  const [analise, setAnalise] = useState(null); // { solicitacao, acao: "Aprovada" | "Negada" }
  const [justificativa, setJustificativa] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const { allowedKeys, hasPermission } = usePermissions();

  // Somente quem tem acesso ao módulo Financeiro (ou acesso total) pode aprovar/negar
  const podeAnalisar = allowedKeys === null || hasPermission("Financeiro");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ["solicitacoes-liberacao"],
    queryFn: () => base44.entities.SolicitacaoLiberacaoFinanceira.list("-created_date", 300),
    initialData: [],
  });

  const analisar = useMutation({
    mutationFn: async ({ solicitacao, acao, justificativaTexto }) => {
      const agora = new Date().toISOString();
      const quem = currentUser?.email || "desconhecido";

      if (acao === "Aprovada") {
        // Grava a liberação manual na matrícula
        await base44.entities.StudentCourseEnrollment.update(solicitacao.enrollment_id, {
          liberacao_financeira_manual: true,
          liberacao_financeira_por: quem,
          liberacao_financeira_em: agora,
          liberacao_financeira_justificativa: justificativaTexto,
        });
      }

      await base44.entities.SolicitacaoLiberacaoFinanceira.update(solicitacao.id, {
        status_solicitacao: acao,
        analisado_por: quem,
        analisado_em: agora,
        justificativa_analise: justificativaTexto,
      });

      await base44.entities.AuditLog.create({
        user_email: quem,
        user_name: currentUser?.full_name || quem,
        action: "update",
        entity_type: "SolicitacaoLiberacaoFinanceira",
        entity_id: solicitacao.id,
        entity_name: `${solicitacao.student_name} — ${solicitacao.course_name}`,
        company_id: solicitacao.company_id || "",
        company_name: solicitacao.company_name || "",
        details: `LIBERAÇÃO FINANCEIRA ${acao.toUpperCase()} em ${new Date().toLocaleString("pt-BR")}. Origem: ${solicitacao.origem_matricula}. Situação financeira no momento da solicitação: ${solicitacao.status_financeiro_no_momento || "—"}. ANTES: solicitação Pendente / certificação bloqueada por financeiro. DEPOIS: ${acao === "Aprovada" ? "liberação manual ativa — apto para certificação (se aprovado academicamente)" : "bloqueio financeiro mantido"}. Justificativa: ${justificativaTexto}`,
      });
    },
    onSuccess: (_, { acao }) => {
      queryClient.invalidateQueries({ queryKey: ["solicitacoes-liberacao"] });
      queryClient.invalidateQueries({ queryKey: ["enrollments-control"] });
      toast.success(acao === "Aprovada" ? "Liberação aprovada — matrícula liberada para certificação." : "Liberação negada — bloqueio financeiro mantido.");
      setAnalise(null);
      setJustificativa("");
    },
    onError: (e) => toast.error("Erro ao processar: " + e.message),
  });

  const confirmarAnalise = () => {
    if (!justificativa.trim()) {
      toast.error("Justificativa é obrigatória.");
      return;
    }
    analisar.mutate({ solicitacao: analise.solicitacao, acao: analise.acao, justificativaTexto: justificativa.trim() });
  };

  const filtradas = solicitacoes.filter((s) => filtro === "all" || s.status_solicitacao === filtro);
  const fmtDt = (d) => (d ? new Date(d).toLocaleString("pt-BR") : "—");

  return (
    <div className="space-y-4">
      {!podeAnalisar && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <Shield className="w-4 h-4 flex-shrink-0" />
          <span>Você tem acesso de visualização. Somente usuários do <strong>Financeiro</strong> podem aprovar ou negar liberações.</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Pendente">🟡 Pendentes</SelectItem>
            <SelectItem value="Aprovada">🟢 Aprovadas</SelectItem>
            <SelectItem value="Negada">🔴 Negadas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-500">{filtradas.length} solicitação(ões)</span>
      </div>

      <Card className="border border-gray-200">
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Unlock className="w-4 h-4 text-emerald-600" /> Liberações para Certificação
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-10 text-gray-400">Carregando...</div>
          ) : filtradas.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma solicitação {filtro !== "all" ? `com status "${filtro}"` : ""}</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtradas.map((s) => (
                <div key={s.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{s.student_name}</p>
                        <Badge className={`text-xs ${s.origem_matricula === "Empresa" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                          {s.origem_matricula}
                        </Badge>
                        <Badge className={`text-xs ${STATUS_CLS[s.status_solicitacao] || "bg-gray-100"}`}>{s.status_solicitacao}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{s.course_name}</p>
                      {s.company_name && s.origem_matricula === "Empresa" && (
                        <p className="text-xs text-blue-700">🏢 {s.company_name}</p>
                      )}
                      <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                        <p>💰 Situação financeira: <strong>{s.status_financeiro_no_momento || "—"}</strong></p>
                        <p>📝 Motivo: {s.motivo_solicitacao || "—"}</p>
                        <p>👤 Solicitado por {s.solicitado_por || "—"} em {fmtDt(s.solicitado_em || s.created_date)}</p>
                        {s.analisado_por && (
                          <p>⚖️ Analisado por {s.analisado_por} em {fmtDt(s.analisado_em)} — {s.justificativa_analise}</p>
                        )}
                      </div>
                    </div>
                    {podeAnalisar && s.status_solicitacao === "Pendente" && (
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                          onClick={() => { setAnalise({ solicitacao: s, acao: "Aprovada" }); setJustificativa(""); }}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Aprovar liberação
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs h-7 text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => { setAnalise({ solicitacao: s, acao: "Negada" }); setJustificativa(""); }}>
                          <XCircle className="w-3 h-3 mr-1" /> Negar liberação
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {analise && (
        <Dialog open onOpenChange={() => setAnalise(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {analise.acao === "Aprovada" ? "✅ Aprovar liberação financeira" : "🚫 Negar liberação financeira"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-gray-600">
                Aluno: <strong>{analise.solicitacao.student_name}</strong><br />
                Curso: <strong>{analise.solicitacao.course_name}</strong><br />
                Origem: <strong>{analise.solicitacao.origem_matricula}</strong>
              </p>
              {analise.acao === "Aprovada" && (
                <p className="text-xs bg-green-50 border border-green-200 rounded p-2 text-green-800">
                  A matrícula será marcada como <strong>Liberada Manualmente</strong> e ficará apta para certificação (se aprovada academicamente).
                </p>
              )}
              <div>
                <label className="text-xs font-medium text-gray-700">Justificativa (obrigatória)</label>
                <Textarea value={justificativa} onChange={(e) => setJustificativa(e.target.value)}
                  placeholder="Descreva a justificativa da decisão..." rows={3} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setAnalise(null)}>Cancelar</Button>
                <Button className={analise.acao === "Aprovada" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                  onClick={confirmarAnalise} disabled={analisar.isPending}>
                  {analisar.isPending ? "Processando..." : `Confirmar ${analise.acao === "Aprovada" ? "aprovação" : "negação"}`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}