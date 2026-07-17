import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { LayoutDashboard, Users, Bell, Send, BarChart3, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import VisaoGeralTab from "./VisaoGeralTab";
import AlunosCertificacoesTab from "./AlunosCertificacoesTab";
import AlertasRenovacoesTab from "./AlertasRenovacoesTab";
import SolicitacoesTab from "./SolicitacoesTab";
import RelatoriosTab from "./RelatoriosTab";

const OPCOES = [
  { key: "visao", label: "Visão Geral", icon: LayoutDashboard },
  { key: "alunos", label: "Alunos e Certificações", icon: Users },
  { key: "alertas", label: "Alertas e Renovações", icon: Bell },
  { key: "solicitacoes", label: "Solicitações", icon: Send },
  { key: "relatorios", label: "Relatórios", icon: BarChart3 },
];

export default function CentralConformidade({ companyId }) {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [tab, setTab] = useState("visao");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const res = await base44.functions.invoke("portalEmpresaConformidade", { action: "dados", company_id: companyId });
      setDados(res.data);
    } catch (e) {
      setErro(e?.response?.data?.error || "Não foi possível carregar os dados de conformidade. Entre pelo convite da empresa.");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { carregar(); }, [carregar]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border shadow-sm py-16 text-center text-gray-400">
        <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-emerald-500" />
        <p className="text-sm">Carregando central de conformidade...</p>
      </div>
    );
  }
  if (erro || !dados) {
    return (
      <div className="bg-white rounded-xl border shadow-sm py-12 text-center">
        <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-amber-400" />
        <p className="text-sm text-gray-600 mb-3">{erro || "Dados indisponíveis."}</p>
        <Button size="sm" variant="outline" onClick={carregar}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Tentar novamente</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 bg-gray-100 rounded-lg p-1 mb-4">
        {OPCOES.map((o) => (
          <button
            key={o.key}
            onClick={() => setTab(o.key)}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
              tab === o.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <o.icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{o.label}</span>
          </button>
        ))}
      </div>
      {tab === "visao" && <VisaoGeralTab dados={dados} irPara={setTab} />}
      {tab === "alunos" && <AlunosCertificacoesTab dados={dados} />}
      {tab === "alertas" && <AlertasRenovacoesTab dados={dados} recarregar={carregar} />}
      {tab === "solicitacoes" && <SolicitacoesTab dados={dados} recarregar={carregar} />}
      {tab === "relatorios" && <RelatoriosTab dados={dados} />}
    </div>
  );
}