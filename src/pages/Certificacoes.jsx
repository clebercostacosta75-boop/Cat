import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, PenLine, Shield, Palette, Users } from "lucide-react";

// Importa os conteúdos de cada sub-aba
import Certificates from "./Certificates";
import DigitalSignatures from "./DigitalSignatures";
import CertificateAuditPanel from "./CertificateAuditPanel";
import CertDesigner from "./CertDesigner";
import StudentList from "@/components/students/StudentList";

export default function Certificacoes() {
  const [activeTab, setActiveTab] = useState("certificados");

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
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
          <TabsTrigger value="certificados" className="flex items-center gap-1.5 text-xs">
            <Award className="w-3.5 h-3.5" /> Certificados
          </TabsTrigger>
          <TabsTrigger value="alunos" className="flex items-center gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" /> Cadastro de Alunos
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

        <TabsContent value="certificados" className="mt-4">
          <Certificates />
        </TabsContent>

        <TabsContent value="alunos" className="mt-4">
          <StudentList />
        </TabsContent>

        <TabsContent value="assinaturas" className="mt-4">
          <DigitalSignatures />
        </TabsContent>

        <TabsContent value="auditoria" className="mt-4">
          <CertificateAuditPanel />
        </TabsContent>

        <TabsContent value="designer" className="mt-4">
          <CertDesigner />
        </TabsContent>
      </Tabs>
    </div>
  );
}