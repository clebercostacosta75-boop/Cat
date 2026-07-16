import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, PenLine, Shield, Palette, Users, LayoutDashboard, Building2, User } from "lucide-react";

import CertificacoesDashboard from "@/components/certificates/CertificacoesDashboard";
import Certificates from "./Certificates";
import CertificateControlPanel from "@/components/certificates/CertificateControlPanel";
import DigitalSignatures from "./DigitalSignatures";
import CertificateAuditPanel from "./CertificateAuditPanel";
import CertDesigner from "./CertDesigner";
import StudentListCertificacoes from "@/components/certificates/StudentListCertificacoes";

export default function Certificacoes() {
  const [activeTab, setActiveTab] = useState("certificados");
  // SPR-2B-2: navegação profunda do Dashboard para as sub-abas da Fila
  const [navTarget, setNavTarget] = useState(null);
  const handleNavigate = (tab, target) => {
    if (target) setNavTarget({ ...target, ts: Date.now() });
    // Fila unificada: a antiga aba "controle" agora vive dentro de Empresas (PJ)
    setActiveTab(tab === "controle" ? "controle-pj" : tab);
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Award className="w-6 h-6 text-emerald-600" />
          Certificações
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Central de gestão de certificados, assinaturas, modelos e alunos
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap gap-1 h-auto bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="dashboard" className="flex items-center gap-1.5 text-xs">
            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="certificados" className="flex items-center gap-1.5 text-xs">
            <Award className="w-3.5 h-3.5" /> Certificados
          </TabsTrigger>
          <TabsTrigger value="alunos" className="flex items-center gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" /> Cadastro de Alunos
          </TabsTrigger>
          <TabsTrigger value="controle-pj" className="flex items-center gap-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5" /> Empresas (PJ)
          </TabsTrigger>
          <TabsTrigger value="controle-pf" className="flex items-center gap-1.5 text-xs">
            <User className="w-3.5 h-3.5" /> Individual (PF)
          </TabsTrigger>
          <TabsTrigger value="assinaturas" className="flex items-center gap-1.5 text-xs">
            <PenLine className="w-3.5 h-3.5" /> Assinaturas Digitais
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="flex items-center gap-1.5 text-xs">
            <Shield className="w-3.5 h-3.5" /> Auditoria
          </TabsTrigger>
          <TabsTrigger value="designer" className="flex items-center gap-1.5 text-xs">
            <Palette className="w-3.5 h-3.5" /> Designer de Modelos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4"><CertificacoesDashboard onNavigate={handleNavigate} /></TabsContent>
        <TabsContent value="certificados" className="mt-4"><Certificates /></TabsContent>
        <TabsContent value="alunos" className="mt-4"><StudentListCertificacoes /></TabsContent>
        <TabsContent value="controle-pj" className="mt-4"><CertificateControlPanel origemFixa="empresa" navTarget={navTarget} /></TabsContent>
        <TabsContent value="controle-pf" className="mt-4"><CertificateControlPanel origemFixa="individual" navTarget={navTarget} /></TabsContent>
        <TabsContent value="assinaturas" className="mt-4"><DigitalSignatures /></TabsContent>
        <TabsContent value="auditoria" className="mt-4"><CertificateAuditPanel /></TabsContent>
        <TabsContent value="designer" className="mt-4"><CertDesigner /></TabsContent>
      </Tabs>
    </div>
  );
}