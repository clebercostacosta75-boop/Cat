import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

const MATRIZ_PADRAO = [
  { funcao: "Empilhadeirista", riscos: "Ruído, Vibração, Risco de Colisão", exames: "Audiometria, Acuidade Visual, ECG", periodicidade: "Anual" },
  { funcao: "Soldador", riscos: "Fumos metálicos, Calor, Ruído", exames: "Audiometria, Espirometria, Hemograma", periodicidade: "Anual" },
  { funcao: "Eletricista", riscos: "Riscos elétricos, Trabalho em Altura", exames: "Acuidade Visual, Teste de Daltonismo, ECG", periodicidade: "Anual" },
  { funcao: "Operador de Prensa", riscos: "Ruído, Risco de Acidente", exames: "Audiometria, Acuidade Visual", periodicidade: "Anual" },
  { funcao: "Auxiliar de Produção", riscos: "Ergonômico, Ruído", exames: "Audiometria, Avaliação Psicológica", periodicidade: "Bienal" },
  { funcao: "Motorista", riscos: "Vibração, Estresse", exames: "Acuidade Visual, ECG, Avaliação Psicológica", periodicidade: "Anual" },
];

export default function PCMSODetalhe() {
  const [detalhes, setDetalhes] = useState([]);
  const [matrizes, setMatrizes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [d, m] = await Promise.all([
        base44.entities.PCMSODetalhe.list("-created_date", 100),
        base44.entities.PCMSOMatrizExame.list("-created_date", 500)
      ]);
      setDetalhes(d);
      setMatrizes(m);
      setLoading(false);
    };
    load();
  }, []);

  const getDiasVenc = (d) => {
    if (!d) return null;
    return differenceInDays(parseISO(d), new Date());
  };

  const getAlerta = (dias) => {
    if (dias === null) return null;
    if (dias < 0) return { label: "Vencido", color: "bg-red-100 text-red-700" };
    if (dias <= 45) return { label: `Vence em ${dias}d`, color: "bg-red-100 text-red-700" };
    if (dias <= 60) return { label: `Vence em ${dias}d`, color: "bg-orange-100 text-orange-700" };
    if (dias <= 90) return { label: `Vence em ${dias}d`, color: "bg-amber-100 text-amber-700" };
    return { label: "Vigente", color: "bg-green-100 text-green-700" };
  };

  const totalAptos = detalhes.reduce((s, d) => s + (d.total_aptos || 0), 0);
  const totalInaptos = detalhes.reduce((s, d) => s + (d.total_inaptos || 0), 0);
  const totalRestricao = detalhes.reduce((s, d) => s + (d.total_aptos_restricao || 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">PCMSO — Detalhamento</h1>
        <p className="text-gray-500 text-sm">Controle, Matriz de Exames e Dashboard Médico</p>
      </div>

      <Tabs defaultValue="controle">
        <TabsList className="mb-4">
          <TabsTrigger value="controle">Controle</TabsTrigger>
          <TabsTrigger value="matriz">Matriz de Exames</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard Médico</TabsTrigger>
        </TabsList>

        <TabsContent value="controle">
          {loading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
            <div className="space-y-3">
              {detalhes.length === 0 ? <p className="text-center py-12 text-gray-400">Nenhum PCMSO detalhado</p> :
                detalhes.map(d => {
                  const dias = getDiasVenc(d.vigencia_fim);
                  const alerta = getAlerta(dias);
                  return (
                    <div key={d.id} className={`bg-white border rounded-xl p-4 ${dias !== null && dias <= 45 ? "border-red-300" : "border-gray-200"}`}>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-semibold">{d.empresa_mestre_nome || "Empresa"}</p>
                          <p className="text-sm text-gray-600">Dr. {d.medico_coordenador || "—"} {d.crm ? `| CRM ${d.crm}` : ""} {d.rqe ? `| RQE ${d.rqe}` : ""}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {alerta && <Badge className={`text-xs ${alerta.color}`}>{alerta.label}</Badge>}
                          <Badge className={d.status_doc === "Vigente" ? "bg-green-100 text-green-700 text-xs" : "bg-red-100 text-red-700 text-xs"}>{d.status_doc}</Badge>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-4 gap-3 mt-3 text-center">
                        <div className="bg-gray-50 rounded-lg p-2"><p className="text-lg font-bold text-gray-800">{d.total_colaboradores || 0}</p><p className="text-xs text-gray-500">Total</p></div>
                        <div className="bg-green-50 rounded-lg p-2"><p className="text-lg font-bold text-green-700">{d.total_aptos || 0}</p><p className="text-xs text-gray-500">Aptos</p></div>
                        <div className="bg-amber-50 rounded-lg p-2"><p className="text-lg font-bold text-amber-700">{d.total_aptos_restricao || 0}</p><p className="text-xs text-gray-500">c/ Restrição</p></div>
                        <div className="bg-red-50 rounded-lg p-2"><p className="text-lg font-bold text-red-700">{d.total_inaptos || 0}</p><p className="text-xs text-gray-500">Inaptos</p></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="matriz">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead><tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Função</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Riscos Ocupacionais</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Exames Obrigatórios</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Periodicidade</th>
              </tr></thead>
              <tbody>
                {[...MATRIZ_PADRAO, ...matrizes.filter(m => !MATRIZ_PADRAO.find(p => p.funcao === m.funcao))].map((m, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{m.funcao}</td>
                    <td className="px-4 py-3 text-gray-600">{m.riscos || m.riscos_ocupacionais}</td>
                    <td className="px-4 py-3 text-gray-700">{m.exames || m.exames_obrigatorios}</td>
                    <td className="px-4 py-3 text-gray-600">{m.periodicidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-100 rounded-xl p-5 text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-green-700">{totalAptos}</p>
              <p className="text-sm text-gray-600">Aptos</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-amber-700">{totalRestricao}</p>
              <p className="text-sm text-gray-600">Aptos com Restrição</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-5 text-center">
              <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-red-700">{totalInaptos}</p>
              <p className="text-sm text-gray-600">Inaptos</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}