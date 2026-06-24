import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle } from "lucide-react";

export default function LTCATDetalhe() {
  const [detalhes, setDetalhes] = useState([]);
  const [inventarios, setInventarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [d, inv] = await Promise.all([
        base44.entities.LTCATDetalhe.list("-created_date", 100),
        base44.entities.LTCATInventario.list("-created_date", 500)
      ]);
      setDetalhes(d);
      setInventarios(inv);
      setLoading(false);
    };
    load();
  }, []);

  const isVencido = (d) => d && new Date(d + "T00:00:00") < new Date();

  const aposentadoria = inventarios.filter(i => i.aposentadoria_especial);
  const tiposAgentes = [...new Set(inventarios.map(i => i.tipo_agente).filter(Boolean))];
  const funcoesUnicas = [...new Set(inventarios.map(i => i.cargo).filter(Boolean))];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">LTCAT — Detalhamento</h1>
        <p className="text-gray-500 text-sm">Laudo Técnico das Condições Ambientais do Trabalho</p>
      </div>

      <Tabs defaultValue="identificacao">
        <TabsList className="mb-4">
          <TabsTrigger value="identificacao">Identificação</TabsTrigger>
          <TabsTrigger value="inventario">Inventário Previdenciário</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="identificacao">
          {loading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
            <div className="space-y-3">
              {detalhes.length === 0 ? <p className="text-center py-12 text-gray-400">Nenhum LTCAT cadastrado</p> :
                detalhes.map(d => (
                  <div key={d.id} className={`bg-white border rounded-xl p-4 ${isVencido(d.vigencia_fim) ? "border-red-300 bg-red-50/30" : "border-gray-200"}`}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold">{d.empresa_mestre_nome || "Empresa"}</p>
                        <p className="text-sm text-gray-600">LTCAT nº {d.numero_ltcat || "—"} | CREA: {d.crea || "—"} | ART: {d.art || "—"}</p>
                        <p className="text-xs text-gray-500 mt-1">Vigência até: {d.vigencia_fim || "—"}</p>
                      </div>
                      <Badge className={d.status_doc === "Vigente" ? "bg-green-100 text-green-700 text-xs" : "bg-red-100 text-red-700 text-xs"}>
                        {isVencido(d.vigencia_fim) ? "⚠ Vencido" : d.status_doc}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inventario">
          {loading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Setor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cargo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Agente Nocivo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Intensidade</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cod. eSocial</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Aposen. Especial</th>
                </tr></thead>
                <tbody>
                  {inventarios.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum inventário</td></tr> :
                    inventarios.map(inv => (
                      <tr key={inv.id} className={`border-b hover:bg-gray-50 ${inv.aposentadoria_especial ? "bg-red-50" : ""}`}>
                        <td className="px-4 py-3">{inv.setor || "—"}</td>
                        <td className="px-4 py-3">{inv.cargo || "—"}</td>
                        <td className="px-4 py-3 font-medium">{inv.agente_nocivo || "—"}</td>
                        <td className="px-4 py-3"><Badge className="text-xs bg-gray-100 text-gray-700">{inv.tipo_agente || "—"}</Badge></td>
                        <td className="px-4 py-3 text-gray-600">{inv.intensidade_concentracao || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{inv.codigo_esocial || "—"}</td>
                        <td className="px-4 py-3 text-center">
                          {inv.aposentadoria_especial
                            ? <span className="text-red-600 font-bold flex items-center gap-1"><AlertTriangle className="w-4 h-4" />SIM</span>
                            : <span className="text-gray-400">Não</span>}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-center">
              <p className="text-3xl font-bold text-blue-700">{funcoesUnicas.length}</p>
              <p className="text-sm text-gray-600">Funções Expostas</p>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-5 text-center">
              <p className="text-3xl font-bold text-purple-700">{inventarios.length}</p>
              <p className="text-sm text-gray-600">Agentes Nocivos</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
              <p className="text-3xl font-bold text-red-700">{aposentadoria.length}</p>
              <p className="text-sm text-gray-600">Aposent. Especial</p>
            </div>
            {tiposAgentes.map(tipo => (
              <div key={tipo} className="bg-gray-50 border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-700">{inventarios.filter(i => i.tipo_agente === tipo).length}</p>
                <p className="text-sm text-gray-500">{tipo}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}