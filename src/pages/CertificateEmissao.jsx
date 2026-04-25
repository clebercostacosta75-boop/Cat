import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Users, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import CertificateEmissaoIndividual from "@/components/certificates/CertificateEmissaoIndividual";
import CertificateEmissaoMassa from "@/components/certificates/CertificateEmissaoMassa";

export default function CertificateEmissao() {
  const [activeTab, setActiveTab] = useState("individual");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-6 h-6" /> Emitir Certificado
          </h1>
          <p className="text-gray-500 text-sm mt-1">Emissão de certificados de treinamentos NR</p>
        </div>
        <Link to="/Certificates">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="individual" className="gap-2">
            <Award className="w-4 h-4" /> Individual
          </TabsTrigger>
          <TabsTrigger value="massa" className="gap-2">
            <Users className="w-4 h-4" /> Em Massa
          </TabsTrigger>
        </TabsList>

        {/* Emissão Individual */}
        <TabsContent value="individual" className="mt-6">
          <div className="max-w-3xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Emitir Certificado Individual</CardTitle>
                <p className="text-sm text-gray-500 mt-2">Preencha os dados para gerar um novo certificado</p>
              </CardHeader>
              <CardContent>
                <CertificateEmissaoIndividual onSuccess={() => {}} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Emissão em Massa */}
        <TabsContent value="massa" className="mt-6">
          <div className="max-w-3xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Emissão em Massa</CardTitle>
                <p className="text-sm text-gray-500 mt-2">Cole os dados da planilha para gerar múltiplos certificados</p>
              </CardHeader>
              <CardContent>
                <CertificateEmissaoMassa onSuccess={() => {}} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}