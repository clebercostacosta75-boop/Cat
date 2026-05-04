import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Search, Shield, Award, CheckCircle2, Clock,
  XCircle, AlertTriangle, Ban, ExternalLink,
  ChevronDown, ChevronUp, RefreshCw, Link as LinkIcon, Users, Edit
} from "lucide-react";
import { format, parseISO, isBefore, differenceInDays } from "date-fns";
import CertificateDownloader from "@/components/certificates/CertificateDownloader";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

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
      <tr className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(e => !e)}>
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
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 inline" /> : <ChevronDown className="w-4 h-4 text-gray-400 inline" />}
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
                <p className="text-gray-700">{cert.issue_date ? format(parseISO(cert.issue_date), "dd/MM/yyyy HH:mm") : "-"}</p>
              </div>
              <div className="col-span-full flex gap-2 pt-2">
                {status === "signed" && <CertificateDownloader certificate={cert} certModel={model} size="sm" />}
                {status === "signed" && (
                  <a href={`/CertificateValidate?code=${cert.certificate_code}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="text-xs gap-1">
                      <ExternalLink className="w-3 h-3" /> Validar
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

export default function CompanyPortalView() {
  const [cnpjInput, setCnpjInput] = useState("");
  const [company, setCompany] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [certModels, setCertModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    base44.entities.CertificateModel.list().then(setCertModels).catch(() => {});
    base44.entities.Company.list().then(setCompanies).catch(() => {});
  }, []);

  const handleSearch = async (cnpjOverride) => {
    const cnpjRaw = (cnpjOverride || cnpjInput).replace(/\D/g, "");
    if (cnpjRaw.length < 11) { setError("Informe um CNPJ válido."); return; }
    setLoading(true);
    setError("");
    setSearched(false);

    try {
      const companyFull = companies.find(c => (c.cnpj || "").replace(/\D/g, "") === cnpjRaw)
        || (await base44.entities.Company.filter({ cnpj: cnpjRaw })).find(c => (c.cnpj || "").replace(/\D/g, "") === cnpjRaw);

      if (!companyFull) {
        setError("Empresa não encontrada. Verifique o CNPJ informado.");
        setCompany(null);
        setCertificates([]);
        setLoading(false);
        return;
      }

      setCompany(companyFull);
      const certs = await base44.entities.Certificate.filter({ client_id: companyFull.id });
      setCertificates(certs);
      setSearched(true);
    } catch (e) {
      setError("Erro ao buscar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompany = (e) => {
    const selected = companies.find(c => c.id === e.target.value);
    if (selected) {
      setCnpjInput(selected.cnpj || "");
      handleSearch(selected.cnpj || "");
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
    <div className="space-y-4">
      {/* Busca */}
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-gray-800">Visualizar Portal da Empresa</h3>
          <Badge variant="outline" className="ml-auto text-xs bg-blue-50 text-blue-700 border-blue-200">
            Modo Administrador
          </Badge>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Selecione ou busque por CNPJ para visualizar o portal exatamente como a empresa o vê.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            className="border rounded-md px-3 py-2 text-sm text-gray-700 flex-1 bg-white"
            onChange={handleSelectCompany}
            defaultValue=""
          >
            <option value="" disabled>Selecionar empresa cadastrada...</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social} — {c.cnpj}</option>
            ))}
          </select>
          <span className="text-sm text-gray-400 self-center hidden sm:block">ou</span>
          <Input
            placeholder="Buscar por CNPJ..."
            className="flex-1"
            value={cnpjInput}
            onChange={e => setCnpjInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            maxLength={18}
          />
          <Button onClick={() => handleSearch()} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
            {loading ? "Buscando..." : "Buscar"}
          </Button>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}
      </div>

      {/* Resultado */}
      {company && searched && (
        <>
          {/* Company Header com ações admin */}
          <div className="bg-emerald-600 text-white rounded-xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{company.nome_fantasia || company.razao_social}</h2>
                  <p className="text-emerald-200 text-sm">{company.razao_social}</p>
                  <p className="text-emerald-200 text-xs mt-1">CNPJ: {company.cnpj}</p>
                </div>
              </div>
              {/* Ações Administrativas */}
              <div className="flex gap-2 flex-wrap justify-end">
                <a href={`/CompanyPortal?cnpj=${company.cnpj}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-xs gap-1">
                    <ExternalLink className="w-3 h-3" /> Ver Portal
                  </Button>
                </a>
                <Link to={`/Certificacoes`}>
                  <Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-xs gap-1">
                    <Award className="w-3 h-3" /> Certificados
                  </Button>
                </Link>
                <Link to={`${createPageUrl('Companies')}`}>
                  <Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-xs gap-1">
                    <Edit className="w-3 h-3" /> Editar Empresa
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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

          {stats.expiring > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-orange-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span><strong>{stats.expiring}</strong> certificado(s) vencendo nos próximos 30 dias.</span>
            </div>
          )}

          {/* Tabela de Certificados */}
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
              <div className="py-12 text-center text-gray-400">
                <Award className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum certificado encontrado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b text-xs">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Colaborador</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Curso</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Realização</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Vencimento</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCerts.map(cert => (
                      <CertRow key={cert.id} cert={cert} certModels={certModels} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!searched && !loading && (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="w-16 h-16 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Selecione uma empresa ou informe o CNPJ para visualizar o portal.</p>
        </div>
      )}
    </div>
  );
}