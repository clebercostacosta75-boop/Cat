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
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allData, setAllData] = useState({});

  const loadAll = async () => {
    setLoading(true);
    const empresas = await base44.entities.EmpresaMestre.list("razao_social", 1);
    const emp = empresas[0] || null;
    setEmpresa(emp);

    if (emp) {
      const [pgrs, pcmsos, ltcats, colaboradores, asos, epis, entregas, estoques, alertas, certificados, usuariosEmp] = await Promise.all([
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
      ]);
      setAllData({ pgrs, pcmsos, ltcats, colaboradores, asos, epis, entregas, estoques, alertas, certificados, usuariosEmp });
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
    </div>
  );

  if (!empresa) return (
    <div className="p-8 text-center">
      <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 font-medium">Nenhuma Empresa Mestre cadastrada.</p>
      <p className="text-sm text-gray-400 mt-1">Acesse "Central de Empresas" para cadastrar a primeira empresa.</p>
    </div>
  );

  const shared = { empresa, ...allData, reload: loadAll };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-5 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{empresa.razao_social}</h1>
            <p className="text-xs text-gray-500">CNPJ: {empresa.cnpj} {empresa.grau_risco ? `| Grau de Risco ${empresa.grau_risco}` : ""}</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto bg-gray-100 p-1 mb-4">
          {TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs py-1.5 px-2.5 data-[state=active]:bg-white">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard"><C360Dashboard {...shared} /></TabsContent>
        <TabsContent value="documentos"><C360DocumentosSST {...shared} /></TabsContent>
        <TabsContent value="colaboradores"><C360Colaboradores {...shared} /></TabsContent>
        <TabsContent value="epi"><C360GestaoEPI {...shared} /></TabsContent>
        <TabsContent value="treinamentos"><C360Treinamentos {...shared} /></TabsContent>
        <TabsContent value="certificados"><C360Certificados {...shared} /></TabsContent>
        <TabsContent value="relatorios"><C360Relatorios {...shared} /></TabsContent>
        <TabsContent value="usuarios"><C360Usuarios {...shared} /></TabsContent>
      </Tabs>
    </div>
  );
}