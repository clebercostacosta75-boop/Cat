import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, CheckCircle, AlertTriangle, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

const statusConfig = {
  pending_signature: { label: "Aguardando Assinatura", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
  signed: { label: "Assinado", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
  active: { label: "Ativo", color: "bg-green-100 text-green-800", icon: CheckCircle },
  revoked: { label: "Revogado", color: "bg-red-100 text-red-800", icon: XCircle },
};

export default function CertificateValidation() {
  const [code, setCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);

  const { data: allCertificates = [] } = useQuery({
    queryKey: ["certificates"],
    queryFn: () => base44.entities.Certificate.list("-created_date", 500),
  });

  const handleSearch = async () => {
    if (!code.trim()) {
      toast.error("Informe o código de validação.");
      return;
    }

    setSearching(true);
    setResult(null);

    try {
      // Buscar por código de validação ou certificate_code
      const cert = allCertificates.find(
        c => c.certificate_code === code.trim() || c.id === code.trim()
      );

      if (cert) {
        setResult({
          found: true,
          authentic: true,
          data: cert,
          status: cert.status,
        });
      } else {
        setResult({
          found: false,
          authentic: false,
          message: "Certificado não encontrado. Verifique o código digitado.",
        });
      }
    } catch (err) {
      toast.error("Erro ao verificar: " + (err?.message || "Tente novamente."));
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pt-4">
      {/* Form de Busca */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5" /> Validação de Autenticidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">
              Código de Validação / Número de Registro
            </Label>
            <Input
              id="code"
              placeholder="Ex: CAT-2026-A1B2C3D4 ou certificate-id"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyPress={handleKeyPress}
              className="text-base"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={searching || !code.trim()}
            className="w-full"
          >
            {searching ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verificando...</>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" /> Verificar Certificado
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Resultados */}
      {result && (
        result.found ? (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800 ml-2">
                ✓ Certificado autêntico encontrado no sistema
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Dados do Certificado</CardTitle>
                  <Badge className={statusConfig[result.status]?.color || "bg-gray-100"}>
                    {statusConfig[result.status]?.label || "Desconhecido"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Aluno */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Participante</p>
                    <p className="text-sm font-medium text-gray-900">{result.data.student_name}</p>
                  </div>

                  {/* CPF */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">CPF</p>
                    <p className="text-sm font-mono text-gray-900">{result.data.student_cpf}</p>
                  </div>

                  {/* Curso */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Curso</p>
                    <p className="text-sm font-medium text-gray-900">{result.data.course_name}</p>
                  </div>

                  {/* Carga Horária */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Carga Horária</p>
                    <p className="text-sm text-gray-900">{result.data.course_duration || "—"}</p>
                  </div>

                  {/* Cliente */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Cliente/Empresa</p>
                    <p className="text-sm text-gray-900">{result.data.client_name || "—"}</p>
                  </div>

                  {/* Modalidade */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Modalidade</p>
                    <p className="text-sm text-gray-900">{result.data.course_modality || "—"}</p>
                  </div>

                  {/* Data de Início */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Data de Início</p>
                    <p className="text-sm text-gray-900">{result.data.start_date || "—"}</p>
                  </div>

                  {/* Data de Término */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Data de Término</p>
                    <p className="text-sm text-gray-900">{result.data.end_date || "—"}</p>
                  </div>

                  {/* Validade */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Válido Até</p>
                    <p className="text-sm text-gray-900">{result.data.valid_until || "—"}</p>
                  </div>

                  {/* Instrutor */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Instrutor</p>
                    <p className="text-sm text-gray-900">{result.data.instructor_name || "—"}</p>
                  </div>

                  {/* Código do Certificado */}
                  <div className="col-span-1 md:col-span-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Código de Validação</p>
                    <p className="text-sm font-mono font-bold text-gray-900 break-all">{result.data.certificate_code}</p>
                  </div>

                  {/* Local e Data de Emissão */}
                  {result.data.location_and_date && (
                    <div className="col-span-1 md:col-span-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Local e Data de Emissão</p>
                      <p className="text-sm text-gray-900">{result.data.location_and_date}</p>
                    </div>
                  )}
                </div>

                {/* Data de Assinatura (se assinado) */}
                {result.data.signed_at && (
                  <div className="border-t pt-4 mt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Informações de Assinatura Digital</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Assinado em:</p>
                        <p className="font-medium text-gray-900">{new Date(result.data.signed_at).toLocaleString("pt-BR")}</p>
                      </div>
                      {result.data.signed_ip && (
                        <div>
                          <p className="text-xs text-gray-500">IP do Assinante:</p>
                          <p className="font-mono text-gray-900">{result.data.signed_ip}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800 ml-2">
              ✗ {result.message}
            </AlertDescription>
          </Alert>
        )
      )}
    </div>
  );
}