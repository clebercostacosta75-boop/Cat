import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, FileText, CheckCircle } from "lucide-react";

const CONSENT_VERSION = "v1.0";

export default function ConsentForm({ onConsented }) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAccept = async () => {
    if (!accepted) return;
    setLoading(true);
    try {
      const user = await base44.auth.me();

      // Obtém o IP do usuário via API pública
      let ipAddress = "desconhecido";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        ipAddress = ipData.ip;
      } catch {}

      // Registra o consentimento via função segura (whitelist de campos, sem autoelevação)
      await base44.functions.invoke("atualizarMeuPerfil", {
        action: "consent",
        consent_ip_address: ipAddress,
        consent_term_version: CONSENT_VERSION,
      });

      // Registra no AuditLog
      await base44.entities.AuditLog.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        action: "update",
        entity_type: "UserProfile",
        entity_name: "Termo de Consentimento LGPD",
        details: `Usuário aceitou os termos de uso e política de privacidade (${CONSENT_VERSION}) em ${new Date().toLocaleString("pt-BR")} — IP: ${ipAddress}`,
        ip_address: ipAddress,
      });

      if (onConsented) onConsented();
    } catch (err) {
      console.error("Erro ao salvar consentimento:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="bg-gray-900 text-white px-8 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-7 h-7" />
            <h1 className="text-xl font-bold">Termo de Uso e Consentimento LGPD</h1>
          </div>
          <p className="text-gray-400 text-sm">CAT Cursos e Treinamentos — Versão {CONSENT_VERSION}</p>
        </div>

        {/* Conteúdo */}
        <div className="p-8">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">Proteção dos seus dados</p>
                <p className="text-sm text-blue-800">
                  Em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>, precisamos do seu consentimento para continuar utilizando este sistema.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-sm text-gray-700 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <p>Seus dados pessoais são utilizados <strong>exclusivamente</strong> para gestão de treinamentos, emissão de certificados e cumprimento de obrigações legais.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <p>Seus dados <strong>não são vendidos ou compartilhados</strong> com terceiros para fins comerciais.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <p>Você pode <strong>solicitar acesso, correção ou exclusão</strong> dos seus dados a qualquer momento pelo e-mail privacidade@catcursos.com.br.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <p>O sistema registra <strong>logs de auditoria</strong> de todas as ações para garantir a segurança e rastreabilidade dos dados.</p>
            </div>
          </div>

          {/* Link para Política */}
          <div className="flex items-center gap-2 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-700">Leia a política completa antes de aceitar:</p>
              <button
                onClick={() => window.open("/PrivacyPolicy", "_blank")}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800 underline"
              >
                📄 Política de Privacidade — CAT Cursos e Treinamentos
              </button>
            </div>
          </div>

          {/* Checkbox de aceite */}
          <div className="flex items-start gap-3 mb-8 p-4 border-2 border-dashed border-gray-300 rounded-xl">
            <Checkbox
              id="consent"
              checked={accepted}
              onCheckedChange={setAccepted}
              className="mt-0.5"
            />
            <label htmlFor="consent" className="text-sm text-gray-700 cursor-pointer leading-relaxed">
              Li, compreendi e <strong>aceito os Termos de Uso e a Política de Privacidade</strong> da CAT Cursos e Treinamentos ({CONSENT_VERSION}), e consinto com o tratamento dos meus dados pessoais conforme descrito.
            </label>
          </div>

          {/* Botão */}
          <Button
            onClick={handleAccept}
            disabled={!accepted || loading}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white h-12 text-base font-semibold rounded-xl"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Salvando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Aceitar e Continuar
              </span>
            )}
          </Button>

          <p className="text-xs text-gray-400 text-center mt-4">
            Ao aceitar, registraremos a data, hora e IP desta confirmação em nosso sistema de auditoria.
          </p>
        </div>
      </div>
    </div>
  );
}