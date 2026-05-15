import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, CheckCircle, Clock, MessageSquare, Copy, RefreshCw,
  XCircle, Send, DollarSign, Users, Bell, X
} from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS = {
  "Gerada": "bg-blue-100 text-blue-800",
  "Pendente de envio": "bg-yellow-100 text-yellow-800",
  "Pendente por falta de RESEND_API_KEY": "bg-orange-100 text-orange-800",
  "Enviada via WhatsApp": "bg-green-100 text-green-800",
  "Enviada por e-mail": "bg-emerald-100 text-emerald-800",
  "Visualizada pelo aluno no Portal": "bg-cyan-100 text-cyan-800",
  "Regularizada": "bg-gray-100 text-gray-600 line-through",
  "Cancelada": "bg-gray-100 text-gray-500",
  "Erro no envio": "bg-red-100 text-red-800",
  "Ignorada por duplicidade": "bg-gray-100 text-gray-400",
};

function formatMoney(v) {
  if (!v) return "R$ 0,00";
  return `R$ ${parseFloat(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function formatDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function limparTelefone(tel) {
  if (!tel) return "";
  let n = tel.replace(/\D/g, "");
  if (!n.startsWith("55")) n = "55" + n;
  return n;
}

export default function PainelPendenciasFinanceiras() {
  const queryClient = useQueryClient();
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busca, setBusca] = useState("");

  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ["financial-notifications"],
    queryFn: () => base44.entities.FinancialNotification.list("-created_date"),
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FinancialNotification.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-notifications"] });
      toast.success("Notificação atualizada!");
    },
  });

  // Deduplicar: manter apenas o registro mais recente por aluno+tipo+vencimento
  const seen = new Map();
  const deduped = notifs
    .filter(n => n.status !== "Ignorada por duplicidade")
    .sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))
    .filter(n => {
      const key = `${n.aluno_cpf || n.aluno_nome}_${n.tipo}_${n.data_vencimento || ""}`;
      if (seen.has(key)) return false;
      seen.set(key, true);
      return true;
    });

  const filtrados = deduped.filter(n => {
    const statusOk = filtroStatus === "todos" || n.status === filtroStatus;
    const tipoOk = filtroTipo === "todos" || n.tipo === filtroTipo;
    const buscaOk = !busca || (n.aluno_nome || "").toLowerCase().includes(busca.toLowerCase()) || (n.aluno_cpf || "").includes(busca);
    return statusOk && tipoOk && buscaOk;
  });

  // Cards de resumo
  const hoje = new Date().toISOString().split("T")[0];
  const vencidosHoje = notifs.filter(n => n.data_vencimento === hoje && n.tipo === "boleto_vencido").length;
  const atrasados3 = notifs.filter(n => (n.dias_atraso || 0) >= 3 && n.tipo === "boleto_vencido").length;
  const atrasados7 = notifs.filter(n => (n.dias_atraso || 0) >= 7 && n.tipo === "boleto_vencido").length;
  const atrasados15 = notifs.filter(n => (n.dias_atraso || 0) >= 15 && n.tipo === "boleto_vencido").length;
  const pendentes = notifs.filter(n => ["Gerada", "Pendente de envio", "Pendente por falta de RESEND_API_KEY"].includes(n.status)).length;
  const erros = notifs.filter(n => n.status === "Erro no envio").length;
  const regularizados = notifs.filter(n => n.status === "Regularizada").length;
  const valorTotal = notifs
    .filter(n => !["Regularizada", "Cancelada"].includes(n.status) && n.tipo === "boleto_vencido")
    .reduce((acc, n) => acc + (parseFloat(n.valor_vencido) || 0), 0);

  const handleCopiarMensagem = (n) => {
    navigator.clipboard.writeText(n.mensagem_whatsapp || "");
    toast.success("Mensagem copiada!");
  };

  const handleEnviarWhatsApp = (n) => {
    const tel = limparTelefone(n.aluno_whatsapp);
    if (!tel) { toast.error("WhatsApp não cadastrado para este aluno."); return; }
    const link = `https://wa.me/${tel}?text=${encodeURIComponent(n.mensagem_whatsapp || "")}`;
    window.open(link, "_blank");
    updateMutation.mutate({ id: n.id, data: { status: "Enviada via WhatsApp", data_envio: new Date().toISOString() } });
  };

  const handleMarcarRegularizado = (n) => {
    updateMutation.mutate({ id: n.id, data: { status: "Regularizada" } });
  };

  const handleCancelar = (n) => {
    updateMutation.mutate({ id: n.id, data: { status: "Cancelada" } });
  };

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border border-red-200 bg-red-50">
          <CardContent className="p-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mb-1" />
            <p className="text-xl font-bold text-red-700">{vencidosHoje}</p>
            <p className="text-xs text-red-600">Vencidos hoje</p>
          </CardContent>
        </Card>
        <Card className="border border-orange-200 bg-orange-50">
          <CardContent className="p-3">
            <Clock className="w-5 h-5 text-orange-500 mb-1" />
            <p className="text-xl font-bold text-orange-700">{atrasados7}</p>
            <p className="text-xs text-orange-600">+7 dias em atraso</p>
          </CardContent>
        </Card>
        <Card className="border border-red-300 bg-red-100">
          <CardContent className="p-3">
            <XCircle className="w-5 h-5 text-red-600 mb-1" />
            <p className="text-xl font-bold text-red-800">{atrasados15}</p>
            <p className="text-xs text-red-700">+15 dias em atraso</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-3">
            <DollarSign className="w-5 h-5 text-gray-600 mb-1" />
            <p className="text-base font-bold text-gray-900">{formatMoney(valorTotal)}</p>
            <p className="text-xs text-gray-500">Valor total em atraso</p>
          </CardContent>
        </Card>
        <Card className="border border-yellow-200 bg-yellow-50">
          <CardContent className="p-3">
            <Bell className="w-5 h-5 text-yellow-500 mb-1" />
            <p className="text-xl font-bold text-yellow-700">{pendentes}</p>
            <p className="text-xs text-yellow-600">Notificações pendentes</p>
          </CardContent>
        </Card>
        <Card className="border border-red-200">
          <CardContent className="p-3">
            <X className="w-5 h-5 text-red-400 mb-1" />
            <p className="text-xl font-bold text-red-600">{erros}</p>
            <p className="text-xs text-red-500">Erros de envio</p>
          </CardContent>
        </Card>
        <Card className="border border-green-200 bg-green-50">
          <CardContent className="p-3">
            <CheckCircle className="w-5 h-5 text-green-500 mb-1" />
            <p className="text-xl font-bold text-green-700">{regularizados}</p>
            <p className="text-xs text-green-600">Regularizados</p>
          </CardContent>
        </Card>
        <Card className="border border-orange-200">
          <CardContent className="p-3">
            <AlertTriangle className="w-5 h-5 text-orange-400 mb-1" />
            <p className="text-xl font-bold text-orange-600">{atrasados3}</p>
            <p className="text-xs text-orange-500">+3 dias em atraso</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Buscar por nome ou CPF..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="Gerada">Gerada</SelectItem>
            <SelectItem value="Pendente de envio">Pendente de envio</SelectItem>
            <SelectItem value="Pendente por falta de RESEND_API_KEY">Sem Resend</SelectItem>
            <SelectItem value="Enviada via WhatsApp">Enviada via WhatsApp</SelectItem>
            <SelectItem value="Enviada por e-mail">Enviada por e-mail</SelectItem>
            <SelectItem value="Regularizada">Regularizada</SelectItem>
            <SelectItem value="Erro no envio">Erro no envio</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="boleto_vencido">Boleto vencido</SelectItem>
            <SelectItem value="proximo_vencimento">Próximo do vencimento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de notificações */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4" /> Fila de Notificações Financeiras
            <span className="ml-auto text-xs font-normal text-gray-500">{filtrados.length} registro(s)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-10 text-gray-500">Carregando...</div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhuma notificação encontrada</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtrados.map(n => {
                const tel = limparTelefone(n.aluno_whatsapp);
                const podeWA = !!tel;
                const bloqueadoCertificado = (n.dias_atraso || 0) >= 7;

                return (
                  <div key={n.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 text-sm">{n.aluno_nome}</p>
                          {n.aluno_cpf && <span className="text-xs text-gray-400">CPF: {n.aluno_cpf}</span>}
                          {bloqueadoCertificado && (
                            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                              🔒 Certificado bloqueado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{n.curso_nome}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                          <span>Valor: <strong className="text-gray-800">{formatMoney(n.valor_vencido)}</strong></span>
                          <span>Venc.: <strong>{formatDate(n.data_vencimento)}</strong></span>
                          {n.dias_atraso > 0 && (
                            <span className="text-red-600 font-semibold">{n.dias_atraso} dia(s) em atraso</span>
                          )}
                        </div>
                        {n.aluno_whatsapp && (
                          <p className="text-xs text-gray-400 mt-0.5">📱 {n.aluno_whatsapp}</p>
                        )}
                      </div>
                      <Badge className={`text-xs flex-shrink-0 ${STATUS_COLORS[n.status] || "bg-gray-100 text-gray-600"}`}>
                        {n.status}
                      </Badge>
                    </div>

                    {/* Botões de ação */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {podeWA && !["Regularizada", "Cancelada"].includes(n.status) && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                          onClick={() => handleEnviarWhatsApp(n)}
                        >
                          <MessageSquare className="w-3 h-3 mr-1" /> Enviar WhatsApp
                        </Button>
                      )}
                      {n.mensagem_whatsapp && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleCopiarMensagem(n)}>
                          <Copy className="w-3 h-3 mr-1" /> Copiar Mensagem
                        </Button>
                      )}
                      {n.invoice_url && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => window.open(n.invoice_url, "_blank")}>
                          <Send className="w-3 h-3 mr-1" /> Ver Fatura
                        </Button>
                      )}
                      {!["Regularizada", "Cancelada"].includes(n.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 text-green-700 border-green-300 hover:bg-green-50"
                          onClick={() => handleMarcarRegularizado(n)}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" /> Regularizado
                        </Button>
                      )}
                      {!["Regularizada", "Cancelada"].includes(n.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7 text-gray-400 hover:text-red-500"
                          onClick={() => handleCancelar(n)}
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}