import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Loader2 } from "lucide-react";
import C360Dashboard from "@/components/compliance/C360Dashboard";
import C360DocumentosSST from "@/components/compliance/C360DocumentosSST";
import C360Colaboradores from "@/components/compliance/C360Colaboradores";
import C360GestaoEPI from "@/components/compliance/C360GestaoEPI";
import C360Treinamentos from "@/components/compliance/C360Treinamentos";
import C360Certificados from "@/components/compliance/C360Certificados";
import C360Relatorios from "@/components/compliance/C360Relatorios";
import C360Usuarios from "@/components/compliance/C360Usuarios";

const TABS = [
  { value: "dashboard", label: "📊 Dashboard" },
  { value: "documentos", label: "📄 Documentos SST" },
  { value: "colaboradores", label: "👥 Colaboradores" },
  { value: "epi", label: "🦺 EPI" },
  { value: "treinamentos", label: "🎓 Treinamentos" },
  { value: "certificados", label: "🏅 Certificados" },
  { value: "relatorios", label: "📋 Relatórios" },
  { value: "usuarios", label: "👤 Usuários" },
];

export default function Compliance360() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [empresas, setEmpresas] = useState([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState("");
  const [empresa, setEmpresa] = useState(null);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [loading, setLoading] = useState(false);
  const [allData, setAllData] = useState({});

  // Carrega lista de empresas uma vez
  useEffect(() => {
    base44.entities.EmpresaMestre.list("razao_social", 200).then(emps => {
      setEmpresas(emps);
      setLoadingEmpresas(false);
    });
  }, []);

  // Quando empresa selecionada muda, carrega dados dela
  useEffect(() => {
    if (!selectedEmpresaId) { setEmpresa(null); setAllData({}); return; }
    const emp = empresas.find(e => e.id === selectedEmpresaId);
    if (!emp) return;
    setEmpresa(emp);
    loadDados(emp);
  }, [selectedEmpresaId, empresas]);

  const loadDados = async (emp) => {
    setLoading(true);
    const [pgrs, pcmsos, ltcats, colaboradores, asos, epis, entregas, estoques, alertas, certificados, usuariosEmp, treinamentos] = await Promise.all([
      base44.entities.DocumentoPGR.filter({ cnpj: emp.cnpj }),
      base44.entities.DocumentoPCMSO.filter({ cnpj: emp.cnpj }),
      base44.entities.DocumentoLTCAT.filter({ cnpj: emp.cnpj }),
      base44.entities.ColaboradorSST.filter({ empresa_mestre_id: emp.id }),
      base44.entities.ASORegistro.filter({ empresa_mestre_id: emp.id }),
      base44.entities.EPICadastro.filter({ empresa_mestre_id: emp.id }),
      base44.entities.EPIEntrega.filter({ empresa_mestre_id: emp.id }),
      base44.entities.EPIEstoque.filter({ empresa_mestre_id: emp.id }),
      base44.entities.ComplianceAlerta.filter({ empresa_mestre_id: emp.id }),
      base44.entities.Certificate.filter({ client_id: emp.id }),
      base44.entities.UsuarioEmpresa.filter({ empresa_mestre_id: emp.id }),
      base44.entities.SolicitacaoTreinamento.filter({ empresa_mestre_id: emp.id }),
    ]);
    setAllData({ pgrs, pcmsos, ltcats, colaboradores, asos, epis, entregas, estoques, alertas, certificados, usuariosEmp, treinamentos });
    setLoading(false);
  };

  const reload = () => { if (empresa) loadDados(empresa); };

  if (loadingEmpresas) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Seletor de empresa */}
      <div className="mb-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Compliance 360°</h1>
              <p className="text-xs text-gray-500">Portal de conformidade SST por empresa</p>
            </div>
          </div>
          <div className="ml-auto">
            <select
              value={selectedEmpresaId}
              onChange={e => { setSelectedEmpresaId(e.target.value); setActiveTab("dashboard"); }}
              className="border rounded-lg px-3 py-2 text-sm min-w-[260px] bg-white shadow-sm"
            >
              <option value="">Selecione a empresa</option>
              {empresas.map(e => (
                <option key={e.id} value={e.id}>{e.razao_social}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Info da empresa selecionada */}
        {empresa && (
          <div className="mt-3 flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <div>
              <span className="font-semibold text-gray-900 text-sm">{empresa.razao_social}</span>
              <span className="text-xs text-gray-500 ml-3">CNPJ: {empresa.cnpj}</span>
              {empresa.grau_risco && <span className="text-xs text-gray-500 ml-3">Grau de Risco: {empresa.grau_risco}</span>}
              {empresa.municipio && <span className="text-xs text-gray-500 ml-3">{empresa.municipio}/{empresa.estado}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Estado vazio */}
      {!selectedEmpresaId && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="w-16 h-16 text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium text-lg">Selecione uma empresa para visualizar o painel de conformidade.</p>
          <p className="text-sm text-gray-400 mt-1">Todos os dados serão filtrados exclusivamente para a empresa selecionada.</p>
        </div>
      )}

      {/* Loading dados empresa */}
      {selectedEmpresaId && loading && (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-rose-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Carregando dados de {empresa?.razao_social}...</p>
          </div>
        </div>
      )}

      {/* Conteúdo por abas */}
      {selectedEmpresaId && !loading && empresa && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap gap-1 h-auto bg-gray-100 p-1 mb-4">
            {TABS.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs py-1.5 px-2.5 data-[state=active]:bg-white">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {(() => {
            const shared = { empresa, ...allData, reload };
            return (
              <>
                <TabsContent value="dashboard"><C360Dashboard {...shared} /></TabsContent>
                <TabsContent value="documentos"><C360DocumentosSST {...shared} /></TabsContent>
                <TabsContent value="colaboradores"><C360Colaboradores {...shared} /></TabsContent>
                <TabsContent value="epi"><C360GestaoEPI {...shared} /></TabsContent>
                <TabsContent value="treinamentos"><C360Treinamentos {...shared} /></TabsContent>
                <TabsContent value="certificados"><C360Certificados {...shared} /></TabsContent>
                <TabsContent value="relatorios"><C360Relatorios {...shared} /></TabsContent>
                <TabsContent value="usuarios"><C360Usuarios {...shared} /></TabsContent>
              </>
            );
          })()}
        </Tabs>
      )}
    </div>
  );
}