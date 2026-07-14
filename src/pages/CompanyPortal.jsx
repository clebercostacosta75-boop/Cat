import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Search, Shield, Award, CheckCircle2, Clock,
  XCircle, AlertTriangle, Ban, Download, ExternalLink,
  ChevronDown, ChevronUp, RefreshCw, Filter, Users,
  FileText, LayoutDashboard, Activity
} from "lucide-react";
import { format, parseISO, isBefore, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import CertificateDownloader from "@/components/certificates/CertificateDownloader";

const STATUS_CONFIG = {
  signed: { label: "Assinado", className: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  active: { label: "Ativo", className: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  pending_signature: { label: "Pendente", className: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
  revoked: { label: "Revogado", className: "bg-gray-100 text-gray-600 border-gray-200", icon: Ban },
  expired: { label: "Vencido", className: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

function getEffectiveStatus(cert) {
  if (cert.status === "revoked") return "revoked";
  if (cert.valid_until && isBefore(parseISO(cert.valid_until), new Date())) return "expired";
  return cert.status;
}

function ValidityBadge({ validUntil, status }) {
  if (!validUntil || status === "revoked") return null;
  const date = parseISO(validUntil);
  const days = differenceInDays(date, new Date());
  if (days < 0) return <span className="text-xs text-red-600 font-medium">Vencido há {Math.abs(days)}d</span>;
  if (days <= 30) return <span className="text-xs text-orange-500 font-medium">⚠ Vence em {days}d</span>;
  return <span className="text-xs text-gray-400">{format(date, "dd/MM/yyyy")}</span>;
}

function CertRow({ cert, certModels }) {
  const [expanded, setExpanded] = useState(false);
  const status = getEffectiveStatus(cert);
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending_signature;
  const Icon = cfg.icon;
  const model = certModels.find(m => m.id === cert.certificate_model_id);

  return (
    <>
      <tr
        className="border-b hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <td className="px-4 py-3">
          <div className="font-medium text-gray-900 text-sm">{cert.student_name}</div>
          <div className="text-xs text-gray-400">{cert.student_cpf}</div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px]">
          <div className="truncate">{cert.course_name}</div>
          {cert.course_duration && <div className="text-xs text-gray-400">{cert.course_duration}</div>}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {cert.end_date ? format(parseISO(cert.end_date), "dd/MM/yyyy") : "-"}
        </td>
        <td className="px-4 py-3">
          <ValidityBadge validUntil={cert.valid_until} status={status} />
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.className}`}>
            <Icon className="w-3 h-3" /> {cfg.label}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            {status === "signed" && (
              <a
                href={`/CertificateValidate?code=${cert.certificate_code}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="p-1.5 rounded-md hover:bg-gray-200 text-gray-500 hover:text-emerald-600"
                title="Validar"
              >
                <Shield className="w-4 h-4" />
              </a>
            )}
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50 border-b">
          <td colSpan={6} className="px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-1">Código do Certificado</p>
                <p className="font-mono text-gray-700 font-medium">{cert.certificate_code || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Instrutor</p>
                <p className="text-gray-700">{cert.instructor_name || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Emitido em</p>
                <p className="text-gray-700">
                  {cert.issue_date ? format(parseISO(cert.issue_date), "dd/MM/yyyy HH:mm") : "-"}
                </p>
              </div>
              {cert.signed_at && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Assinado em</p>
                  <p className="text-gray-700">{format(parseISO(cert.signed_at), "dd/MM/yyyy HH:mm")}</p>
                </div>
              )}
              {cert.status === "revoked" && cert.revocation_reason && (
                <div className="col-span-full">
                  <p className="text-xs text-gray-400 mb-1">Motivo da Revogação</p>
                  <p className="text-red-600">{cert.revocation_reason}</p>
                </div>
              )}
              {cert.programmatic_content?.length > 0 && (
                <div className="col-span-full">
                  <p className="text-xs text-gray-400 mb-2">Conteúdo Programático</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {cert.programmatic_content.map((item, i) => (
                      <div key={i} className="flex justify-between bg-white border rounded px-3 py-1.5 text-xs">
                        <span className="text-gray-600">{item.module}</span>
                        {item.hours && <span className="text-gray-400">{item.hours}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="col-span-full flex gap-2 pt-2">
                {status === "signed" && (
                  <CertificateDownloader certificate={cert} certModel={model} size="sm" />
                )}
                {status === "signed" && (
                  <a
                    href={`/CertificateValidate?code=${cert.certificate_code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline" className="text-xs gap-1">
                      <ExternalLink className="w-3 h-3" /> Validar Autenticidade
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function CompanyPortal() {
  const params = new URLSearchParams(window.location.search);
  const cnpjParam = params.get("cnpj");

  const [cnpjInput, setCnpjInput] = useState(cnpjParam || "");
  const [company, setCompany] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [certModels, setCertModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("certificados");
  const [students, setStudents] = useState([]);
  const [activeModules, setActiveModules] = useState([]);
  const [complianceData, setComplianceData] = useState(null);
  const [complianceLoading, setComplianceLoading] = useState(false);

  useEffect(() => {
    if (cnpjParam) handleSearch(cnpjParam);
  }, []);

  const handleSearch = async (cnpjOverride) => {
    const cnpjRaw = (cnpjOverride || cnpjInput).replace(/\D/g, "");
    if (cnpjRaw.length < 11) { setError("Informe um CNPJ válido."); return; }
    setLoading(true);
    setError("");
    setSearched(false);

    try {
      const response = await base44.functions.invoke("portalEmpresa", { cnpj: cnpjRaw });
      const result = response.data;
      const companyFull = result.company;
      setCompany(companyFull);
      setComplianceData(null);

      const mods = companyFull.modulos_contratados?.filter(m => m.active) || [];
      if (mods.length === 0) {
        mods.push({ module_key: "certificados", module_name: "Certificados", active: true });
      }
      setActiveModules(mods);
      setCertificates(result.certificates || []);
      setStudents(result.students || []);
      setCertModels(result.certificateModels || []);
      setSearched(true);
    } catch (e) {
      setError("Erro ao buscar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const filteredCerts = certificates.filter(cert => {
    const status = getEffectiveStatus(cert);
    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (search) {
      return [cert.student_name, cert.course_name, cert.certificate_code, cert.student_cpf]
        .some(v => v && v.toLowerCase().includes(search.toLowerCase()));
    }
    return true;
  });

  const stats = {
    total: certificates.length,
    signed: certificates.filter(c => ["signed", "active"].includes(c.status)).length,
    pending: certificates.filter(c => c.status === "pending_signature").length,
    expiring: certificates.filter(c => {
      if (!c.valid_until || c.status === "revoked") return false;
      const days = differenceInDays(parseISO(c.valid_until), new Date());
      return days >= 0 && days <= 30;
    }).length,
    expired: certificates.filter(c => getEffectiveStatus(c) === "expired").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png"
            alt="CAT Logo" className="h-10 object-contain"
          />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Portal da Empresa</h1>
            <p className="text-xs text-gray-500">Consulte os certificados dos colaboradores</p>
          </div>
          <div className="ml-auto flex items-center gap-1 text-xs text-emerald-600">
            <Shield className="w-3.5 h-3.5" />
            <span>Acesso seguro</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Search Card */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-gray-800">Identificação da Empresa</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Informe o CNPJ da sua empresa para consultar os certificados dos colaboradores.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="00.000.000/0000-00"
              className="flex-1"
              value={cnpjInput}
              onChange={e => setCnpjInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              maxLength={18}
            />
            <Button
              onClick={() => handleSearch()}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 sm:w-auto w-full"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}
        </div>

        {/* Company Info */}
        {company && searched && (
          <>
            <div className="bg-emerald-600 text-white rounded-2xl p-5 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{company.nome_fantasia || company.razao_social}</h2>
                  <p className="text-emerald-200 text-sm">{company.razao_social}</p>
                  <p className="text-emerald-200 text-xs mt-1">CNPJ: {company.cnpj}</p>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              {[
                { label: "Total", value: stats.total, color: "bg-blue-50 text-blue-700 border-blue-100" },
                { label: "Assinados", value: stats.signed, color: "bg-green-50 text-green-700 border-green-100" },
                { label: "Pendentes", value: stats.pending, color: "bg-yellow-50 text-yellow-700 border-yellow-100" },
                { label: "A vencer (30d)", value: stats.expiring, color: "bg-orange-50 text-orange-700 border-orange-100" },
                { label: "Vencidos", value: stats.expired, color: "bg-red-50 text-red-700 border-red-100" },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border p-3 ${s.color}`}>
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Alerts */}
            {stats.expiring > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm text-orange-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span><strong>{stats.expiring}</strong> certificado(s) vencendo nos próximos 30 dias. Entre em contato para renovação.</span>
              </div>
            )}

            {/* Tabs de Módulos */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
              {activeModules.map(mod => (
                <button
                  key={mod.module_key}
                  onClick={() => setActiveTab(mod.module_key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
                    activeTab === mod.module_key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {mod.module_key === "certificados" && <Award className="w-3.5 h-3.5" />}
                  {mod.module_key === "colaboradores" && <Users className="w-3.5 h-3.5" />}
                  {mod.module_key === "documentos" && <FileText className="w-3.5 h-3.5" />}
                  {mod.module_key === "compliance_360" && <Shield className="w-3.5 h-3.5" />}
                  {mod.module_key === "financeiro" && <Activity className="w-3.5 h-3.5" />}
                  {!["certificados","colaboradores","documentos","compliance_360","financeiro"].includes(mod.module_key) && <LayoutDashboard className="w-3.5 h-3.5" />}
                  {mod.module_name}
                </button>
              ))}
            </div>

            {/* Tab: Certificados */}
            {activeTab === "certificados" && (
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-gray-800 text-sm">Certificados ({filteredCerts.length})</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <Input placeholder="Buscar colaborador..." className="pl-8 h-8 text-xs w-44" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="border rounded-md px-2 py-1 text-xs text-gray-600 h-8" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                      <option value="all">Todos</option>
                      <option value="signed">✅ Assinados</option>
                      <option value="pending_signature">⏳ Pendentes</option>
                      <option value="expired">❌ Vencidos</option>
                      <option value="revoked">🚫 Revogados</option>
                    </select>
                  </div>
                </div>
                {filteredCerts.length === 0 ? (
                  <div className="py-12 text-center text-gray-400"><Award className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Nenhum certificado encontrado.</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b text-xs">
                        <tr><th className="text-left px-4 py-2 font-medium text-gray-500">Colaborador</th><th className="text-left px-4 py-2 font-medium text-gray-500">Curso</th><th className="text-left px-4 py-2 font-medium text-gray-500">Realização</th><th className="text-left px-4 py-2 font-medium text-gray-500">Vencimento</th><th className="text-left px-4 py-2 font-medium text-gray-500">Status</th><th className="px-4 py-2"></th></tr>
                      </thead>
                      <tbody>{filteredCerts.map(cert => <CertRow key={cert.id} cert={cert} certModels={certModels} />)}</tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Colaboradores */}
            {activeTab === "colaboradores" && (
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-gray-800 text-sm">Colaboradores ({students.length})</span>
                </div>
                {students.length === 0 ? (
                  <div className="py-12 text-center text-gray-400"><Users className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Nenhum colaborador cadastrado.</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b text-xs">
                        <tr><th className="text-left px-4 py-2 font-medium text-gray-500">Nome</th><th className="text-left px-4 py-2 font-medium text-gray-500">CPF</th><th className="text-left px-4 py-2 font-medium text-gray-500">Função</th><th className="text-left px-4 py-2 font-medium text-gray-500">Status</th></tr>
                      </thead>
                      <tbody>
                        {students.map(s => (
                          <tr key={s.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-800">{s.full_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{s.cpf}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{s.funcao_nome || s.funcao || "—"}</td>
                            <td className="px-4 py-3"><Badge className={s.status === "Ativo" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>{s.status}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Documentos */}
            {activeTab === "documentos" && (
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-gray-800 text-sm">Documentos da Empresa</span>
                </div>
                <div className="py-12 text-center text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Módulo de documentos em desenvolvimento.</p>
                  <p className="text-xs mt-1">Em breve: PGR, PCMSO, LTCAT, ASO e outros documentos.</p>
                </div>
              </div>
            )}

            {/* Tab: Compliance 360 */}
            {activeTab === "compliance_360" && (
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold text-gray-800 text-sm">Compliance 360</span>
                  </div>
                  {!complianceData && !complianceLoading && (
                    <button
                      onClick={async () => {
                        setComplianceLoading(true);
                        try {
                          const res = await base44.functions.invoke("calcularCompliance360", { company_id: company.id });
                          setComplianceData(res.data);
                        } catch { setComplianceData({ error: true }); }
                        setComplianceLoading(false);
                      }}
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3 h-3" /> Calcular Score
                    </button>
                  )}
                </div>
                {complianceLoading && (
                  <div className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-indigo-500" />
                    <p className="text-sm">Calculando conformidade...</p>
                  </div>
                )}
                {!complianceLoading && !complianceData && (
                  <div className="py-12 text-center text-gray-400">
                    <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Clique em "Calcular Score" para ver o índice de conformidade.</p>
                  </div>
                )}
                {!complianceLoading && complianceData && !complianceData.error && (
                  <div className="p-5 space-y-5">
                    {/* Score geral */}
                    <div className="flex items-center gap-6">
                      <div className={`w-24 h-24 rounded-full flex flex-col items-center justify-center text-white font-bold text-xl border-4 ${
                        complianceData.resumo?.score_geral >= 80 ? "bg-green-500 border-green-400" :
                        complianceData.resumo?.score_geral >= 50 ? "bg-yellow-500 border-yellow-400" :
                        "bg-red-500 border-red-400"
                      }`}>
                        <span>{complianceData.resumo?.score_geral ?? 0}%</span>
                        <span className="text-xs font-normal opacity-80">score</span>
                      </div>
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: "Conformes", value: complianceData.resumo?.conformes ?? 0, color: "text-green-700 bg-green-50" },
                          { label: "Pendentes", value: complianceData.resumo?.pendentes ?? 0, color: "text-yellow-700 bg-yellow-50" },
                          { label: "Vencidos", value: complianceData.resumo?.vencidos ?? 0, color: "text-red-700 bg-red-50" },
                          { label: "Total checks", value: complianceData.resumo?.total_checks ?? 0, color: "text-gray-700 bg-gray-50" },
                        ].map(s => (
                          <div key={s.label} className={`rounded-lg p-3 ${s.color}`}>
                            <div className="text-2xl font-bold">{s.value}</div>
                            <div className="text-xs">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Por função */}
                    {complianceData.byFuncao?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Por Função</p>
                        <div className="space-y-2">
                          {complianceData.byFuncao.slice(0, 5).map((f, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-sm text-gray-700 w-40 truncate">{f.nome}</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div className={`h-2 rounded-full ${f.score >= 80 ? "bg-green-500" : f.score >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${f.score}%` }} />
                              </div>
                              <span className="text-xs font-semibold w-10 text-right text-gray-600">{f.score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <button onClick={() => setComplianceData(null)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Recalcular
                    </button>
                  </div>
                )}
                {!complianceLoading && complianceData?.error && (
                  <div className="py-8 text-center text-red-500 text-sm">Erro ao calcular. Tente novamente.</div>
                )}
              </div>
            )}

            {/* Tab: Financeiro */}
            {activeTab === "financeiro" && (
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-gray-800 text-sm">Financeiro</span>
                </div>
                <div className="py-12 text-center text-gray-400">
                  <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Módulo financeiro em desenvolvimento.</p>
                  <p className="text-xs mt-1">Em breve: Faturamento, BMM, contas a receber.</p>
                </div>
              </div>
            )}

            {/* Tab: módulo não reconhecido */}
            {!["certificados","colaboradores","documentos","compliance_360","financeiro"].includes(activeTab) && (
              <div className="bg-white rounded-xl border shadow-sm p-8 text-center text-gray-400">
                <LayoutDashboard className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Conteúdo deste módulo será carregado em breve.</p>
              </div>
            )}

            <p className="text-xs text-gray-400 text-center mt-4">
              Dados exibidos em tempo real. Para dúvidas, entre em contato com o CAT Cursos.
            </p>
          </>
        )}

        {!searched && !loading && (
          <div className="text-center py-16 text-gray-400">
            <Building2 className="w-16 h-16 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Informe o CNPJ acima para visualizar os certificados da sua empresa.</p>
          </div>
        )}
      </div>
    </div>
  );
}