import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck } from "lucide-react";
import EPIDashboard from "@/components/epi/EPIDashboard";
import EPICadastroTab from "@/components/epi/EPICadastroTab";
import EPIEstoqueTab from "@/components/epi/EPIEstoqueTab";
import EPIFuncaoMatrizTab from "@/components/epi/EPIFuncaoMatrizTab";
import EPIEntregasTab from "@/components/epi/EPIEntregasTab";
import EPIFichasTab from "@/components/epi/EPIFichasTab";
import EPIVencimentosTab from "@/components/epi/EPIVencimentosTab";

export default function GestaoEPI() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [empresas, setEmpresas] = useState([]);
  const [epis, setEpis] = useState([]);
  const [entregas, setEntregas] = useState([]);
  const [estoques, setEstoques] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    const [emps, episData, entregasData, estoquesData, colabs] = await Promise.all([
      base44.entities.EmpresaMestre.list("razao_social", 200),
      base44.entities.EPICadastro.list("-created_date", 500),
      base44.entities.EPIEntrega.list("-data_entrega", 1000),
      base44.entities.EPIEstoque.list("-created_date", 500),
      base44.entities.ColaboradorSST.list("nome", 500),
    ]);
    setEmpresas(emps);
    setEpis(episData);
    setEntregas(entregasData);
    setEstoques(estoquesData);
    setColaboradores(colabs);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const shared = { empresas, epis, entregas, estoques, colaboradores, loading, reload: loadAll };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-rose-600" /> Gestão de EPI
        </h1>
        <p className="text-gray-500 text-sm">Equipamentos de Proteção Individual — Cadastro, Estoque, Entregas e Controle</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto bg-gray-100 p-1 mb-4">
          {[
            ["dashboard", "📊 Dashboard"],
            ["cadastro", "🛡️ Cadastro EPI"],
            ["estoque", "📦 Estoque"],
            ["funcao", "🔧 EPI por Função"],
            ["entregas", "📋 Entregas"],
            ["fichas", "👤 Fichas"],
            ["vencimentos", "⚠️ Vencimentos"],
          ].map(([v, l]) => (
            <TabsTrigger key={v} value={v} className="text-xs py-1.5 px-3 data-[state=active]:bg-white">
              {l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard"><EPIDashboard {...shared} /></TabsContent>
        <TabsContent value="cadastro"><EPICadastroTab {...shared} /></TabsContent>
        <TabsContent value="estoque"><EPIEstoqueTab {...shared} /></TabsContent>
        <TabsContent value="funcao"><EPIFuncaoMatrizTab {...shared} /></TabsContent>
        <TabsContent value="entregas"><EPIEntregasTab {...shared} /></TabsContent>
        <TabsContent value="fichas"><EPIFichasTab {...shared} /></TabsContent>
        <TabsContent value="vencimentos"><EPIVencimentosTab {...shared} /></TabsContent>
      </Tabs>
    </div>
  );
}