/**
 * Portal do Aluno (SPR-004B) — página pública.
 * O aluno se identifica pelo CPF; o sistema localiza o cadastro (Student),
 * matrículas, certificados e documentos, e deriva o perfil:
 * Aluno Corporativo | Aluno Comunidade | Aluno com Matrículas Mistas.
 */
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Search, XCircle, GraduationCap } from "lucide-react";
import { perfilAluno, mostraFinanceiro } from "@/lib/portalAluno";
import PortalHeader from "@/components/portalaluno/PortalHeader";
import PortalMenu from "@/components/portalaluno/PortalMenu";
import PortalDashboard from "@/components/portalaluno/PortalDashboard";
import PortalCursos from "@/components/portalaluno/PortalCursos";
import PortalCertificados from "@/components/portalaluno/PortalCertificados";
import PortalCarteira from "@/components/portalaluno/PortalCarteira";
import PortalFinanceiro from "@/components/portalaluno/PortalFinanceiro";
import PortalAgenda from "@/components/portalaluno/PortalAgenda";
import PortalProntuario from "@/components/portalaluno/PortalProntuario";
import PortalDocumentos from "@/components/portalaluno/PortalDocumentos";
import PortalComunicacao from "@/components/portalaluno/PortalComunicacao";

const SECTION_TITLES = {
  dashboard: "Dashboard",
  cursos: "Meus Cursos",
  agenda: "Agenda",
  certificados: "Central de Certificados",
  carteira: "Carteira Digital",
  financeiro: "Financeiro",
  prontuario: "Prontuário",
  documentos: "Documentos",
  comunicacao: "Comunicação",
};

export default function PortalAluno() {
  const [cpf, setCpf] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [section, setSection] = useState("dashboard");

  useEffect(() => {
    base44.functions.invoke("portalAluno", {}).then((res) => {
      if (!res.data?.legacy_limited) setData(res.data);
    }).catch(() => {});
  }, []);

  const formatCpf = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  };

  const handleEntrar = async () => {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) { setError("Digite um CPF válido com 11 dígitos."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke("portalAluno", { cpf: digits });
      setData(res.data);
      if (res.data?.legacy_limited) setError("Consulta por CPF em modo limitado. Entre pelo convite do aluno para acessar matrículas, financeiro e documentos.");
      setSection("certificados");
    } catch (e) {
      if (e?.response?.status === 404) setError("Nenhum cadastro encontrado para este CPF.");
      else setError("Erro ao carregar seus dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ── Tela de identificação ──
  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-7 h-7 text-emerald-700" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Portal do Aluno</h1>
            <p className="text-sm text-gray-500 mt-1">CAT Cursos — Acompanhe seus cursos, certificados e mais</p>
          </div>
          <input
            type="text"
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && handleEntrar()}
            placeholder="Digite seu CPF"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent mb-3"
            maxLength={14}
          />
          <Button onClick={handleEntrar} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 py-3">
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Carregando...
              </span>
            ) : (
              <span className="flex items-center gap-2"><Search className="w-4 h-4" /> Entrar</span>
            )}
          </Button>
          {error && (
            <p className="text-sm text-red-500 flex items-center gap-1 mt-3">
              <XCircle className="w-4 h-4 flex-shrink-0" />{error}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Portal carregado ──
  const enrollments = data.enrollments || [];
  const certificates = data.certificates || [];
  const perfil = perfilAluno(enrollments);
  const showFinanceiro = mostraFinanceiro(enrollments);

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader
        student={data.student}
        perfil={perfil}
        onSair={() => { setData(null); setCpf(""); }}
      />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <PortalMenu active={section} onSelect={setSection} showFinanceiro={showFinanceiro} />
        <h2 className="text-lg font-bold text-gray-900">{SECTION_TITLES[section]}</h2>

        {section === "dashboard" && (
          <PortalDashboard enrollments={enrollments} certificates={certificates} showFinanceiro={showFinanceiro} />
        )}
        {section === "cursos" && <PortalCursos enrollments={enrollments} />}
        {section === "agenda" && <PortalAgenda enrollments={enrollments} />}
        {section === "certificados" && <PortalCertificados certificates={certificates} />}
        {section === "carteira" && <PortalCarteira certificates={certificates} />}
        {section === "financeiro" && showFinanceiro && <PortalFinanceiro enrollments={enrollments} />}
        {section === "prontuario" && <PortalProntuario student={data.student} />}
        {section === "documentos" && <PortalDocumentos documents={data.documents} />}
        {section === "comunicacao" && <PortalComunicacao />}
      </div>
    </div>
  );
}