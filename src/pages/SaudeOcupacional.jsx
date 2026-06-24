import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, FileText, Microscope, ClipboardList, Activity, Building2, Loader2 } from "lucide-react";
import PGRTab from "@/components/saude/PGRTab";
import PCMSOTab from "@/components/saude/PCMSOTab";
import LTCATTab from "@/components/saude/LTCATTab";
import ASOTab from "@/components/saude/ASOTab";
import ExamesTab from "@/components/saude/ExamesTab";

export default function SaudeOcupacional() {
  const [activeTab, setActiveTab] = useState("pgr");
  const [empresas, setEmpresas] = useState([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState("");
  const [empresa, setEmpresa] = useState(null);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);

  useEffect(() => {
    base44.entities.EmpresaMestre.list("razao_social", 200).then(emps => {
      setEmpresas(emps);
      setLoadingEmpresas(false);
      if (emps.length === 1) {
        setSelectedEmpresaId(emps[0].id);
        setEmpresa(emps[0]);
      }
    });
  }, []);

  const handleEmpresaChange = (id) => {
    setSelectedEmpresaId(id);
    setEmpresa(empresas.find(e => e.id === id) || null);
  };

  const onEmpresaAtualizada = (dadosNovos) => {
    // Atualiza o objeto empresa local quando uma tab salvar dados novos
    setEmpresa(prev => prev ? { ...prev, ...dadosNovos } : prev);
    setEmpresas(prev => prev.map(e => e.id === selectedEmpresaId ? { ...e, ...dadosNovos } : e));
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Heart className="w-6 h-6 text-rose-600" />
          Saúde Ocupacional
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Gestão centralizada de PGR, PCMSO, LTCAT, ASO e Exames por empresa
        </p>
      </div>

      {/* Seletor de empresa */}
      <div className="bg-white border rounded-xl p-4 mb-5 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Building2 className="w-4 h-4 text-rose-500" />
          Empresa:
        </div>
        {loadingEmpresas ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        ) : (
          <select
            value={selectedEmpresaId}
            onChange={e => handleEmpresaChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[260px] bg-white"
          >
            <option value="">— Selecione a empresa —</option>
            {empresas.map(e => (
              <option key={e.id} value={e.id}>{e.razao_social}{e.cnpj ? ` (${e.cnpj})` : ""}</option>
            ))}
          </select>
        )}
        {empresa && (
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            {empresa.cnpj && <span>CNPJ: <strong>{empresa.cnpj}</strong></span>}
            {empresa.cnae && <span>CNAE: <strong>{empresa.cnae}</strong></span>}
            {empresa.grau_risco && <span>Grau de Risco: <strong>{empresa.grau_risco}</strong></span>}
            {empresa.municipio && <span>{empresa.municipio}/{empresa.estado}</span>}
          </div>
        )}
      </div>

      {/* Estado vazio */}
      {!selectedEmpresaId && (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl bg-gray-50">
          <Building2 className="w-14 h-14 text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">Selecione uma empresa para acessar os documentos de saúde ocupacional.</p>
          <p className="text-sm text-gray-400 mt-1">PGR, PCMSO, LTCAT, ASO e Exames serão filtrados por empresa.</p>
        </div>
      )}

      {/* Abas — só renderiza se empresa selecionada */}
      {selectedEmpresaId && empresa && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap gap-1 h-auto bg-gray-100 p-1 mb-6">
            <TabsTrigger value="pgr" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 py-2 px-3 text-sm">
              <FileText className="w-4 h-4" /> PGR
            </TabsTrigger>
            <TabsTrigger value="pcmso" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 py-2 px-3 text-sm">
              <Activity className="w-4 h-4" /> PCMSO
            </TabsTrigger>
            <TabsTrigger value="ltcat" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 py-2 px-3 text-sm">
              <ClipboardList className="w-4 h-4" /> LTCAT
            </TabsTrigger>
            <TabsTrigger value="aso" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 py-2 px-3 text-sm">
              <Heart className="w-4 h-4" /> ASO
            </TabsTrigger>
            <TabsTrigger value="exames" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 py-2 px-3 text-sm">
              <Microscope className="w-4 h-4" /> Exames
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pgr">
            <PGRTab empresa={empresa} onEmpresaAtualizada={onEmpresaAtualizada} />
          </TabsContent>
          <TabsContent value="pcmso">
            <PCMSOTab empresa={empresa} onEmpresaAtualizada={onEmpresaAtualizada} />
          </TabsContent>
          <TabsContent value="ltcat">
            <LTCATTab empresa={empresa} onEmpresaAtualizada={onEmpresaAtualizada} />
          </TabsContent>
          <TabsContent value="aso">
            <ASOTab empresa={empresa} />
          </TabsContent>
          <TabsContent value="exames">
            <ExamesTab empresa={empresa} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}