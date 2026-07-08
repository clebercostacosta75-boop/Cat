/**
 * Prontuário Digital do Colaborador — página interna.
 * Visão integrada: dados pessoais, função, matriz de treinamentos, auditorias e vencimento de certificados.
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User, Search, Award, Shield, AlertTriangle, CheckCircle,
  Clock, XCircle, BookOpen, FileText, Activity, Calendar,
  Building2, MapPin, Briefcase, Loader2, ChevronDown, ChevronUp,
  Download, ExternalLink
} from "lucide-react";
import { format, parseISO, differenceInDays, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatDate(d) {
  if (!d) return "—";
  try { return format(new Date(d + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }); } catch { return d; }
}

function getDaysLeft(dateStr) {
  if (!dateStr) return null;
  return Math.round((new Date(dateStr) - new Date()) / 86400000);
}

function StatusBadge({ status, validUntil }) {
  if (status === "revoked") return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Revogado</Badge>;
  if (!validUntil) return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Válido</Badge>;
  const days = getDaysLeft(validUntil);
  if (days < 0) return <Badge className="bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3 mr-1" />Vencido</Badge>;
  if (days <= 30) return <Badge className="bg-orange-100 text-orange-700"><Clock className="w-3 h-3 mr-1" />Vence em {days}d</Badge>;
  return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Válido</Badge>;
}

function CertRow({ cert, expanded, onToggle }) {
  const days = getDaysLeft(cert.valid_until);
  return (
    <>
      <div className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <Award className={`w-4 h-4 ${days !== null && days < 0 ? "text-red-400" : "text-emerald-500"}`} />
          <div>
            <p className="text-sm font-medium text-gray-800">{cert.course_name}</p>
            <p className="text-xs text-gray-400">{cert.course_duration} • {formatDate(cert.end_date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={cert.status} validUntil={cert.valid_until} />
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>
      {expanded && (
        <div className="px-4 py-3 bg-gray-50 border-b grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div><span className="text-xs text-gray-400 block">Código</span><span className="font-mono text-gray-700">{cert.certificate_code || "—"}</span></div>
          <div><span className="text-xs text-gray-400 block">Instrutor</span><span className="text-gray-700">{cert.instructor_name || "—"}</span></div>
          <div><span className="text-xs text-gray-400 block">Validade</span>
            <span className={days !== null && days < 0 ? "text-red-600" : days !== null && days <= 30 ? "text-orange-600" : "text-emerald-600"}>
              {formatDate(cert.valid_until)}
              {days !== null && days >= 0 && <span className="text-gray-400 text-xs ml-1">({days}d)</span>}
              {days !== null && days < 0 && <span className="text-gray-400 text-xs ml-1">(vencido há {Math.abs(days)}d)</span>}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

export default function ProntuarioDigital() {
  const [cpf, setCpf] = useState("");
  const [student, setStudent] = useState(null);
  const [certs, setCerts] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchDone, setSearchDone] = useState(false);
  const [expandedCerts, setExpandedCerts] = useState({});
  const [conformidade, setConformidade] = useState(null);
  const [loadingConformidade, setLoadingConformidade] = useState(false);

  const handleSearch = async () => {
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length !== 11) { setError("Digite um CPF válido."); return; }
    setError("");
    setLoading(true);
    setSearchDone(false);
    try {
      const students = await base44.entities.Student.filter({ cpf: cleaned });
      if (students.length === 0) {
        const r2 = await base44.entities.Student.filter({ cpf: cpf });
        if (r2.length === 0) { setError("Aluno não encontrado."); setLoading(false); return; }
        students.push(...r2);
      }
      const st = students[0];
      setStudent(st);

      const [allCerts, allEnrollments, allDocs] = await Promise.all([
        base44.entities.Certificate.filter({ student_cpf: st.cpf }),
        base44.entities.StudentCourseEnrollment.filter({ student_cpf: st.cpf }),
        base44.entities.StudentDocument.filter({ student_cpf: st.cpf }),
      ]);
      setDocuments(allDocs);

      allCerts.sort((a, b) => {
        const da = getDaysLeft(a.valid_until) ?? 9999;
        const db = getDaysLeft(b.valid_until) ?? 9999;
        if (da < 0 && db >= 0) return 1;
        if (da >= 0 && db < 0) return -1;
        return db - da;
      });
      setCerts(allCerts);
      setEnrollments(allEnrollments);

      // Buscar empresas vinculadas
      if (st.company_id) {
        try {
          const comp = await base44.entities.Company.get(st.company_id);
          if (comp) setCompanies([comp]);
        } catch {}
      }

      // Verificar conformidade da matriz
      setLoadingConformidade(true);
      try {
        const confRes = await base44.functions.invoke('verificarConformidadeMatriz', {
          student_id: st.id,
          student_cpf: st.cpf
        });
        if (confRes.data && !confRes.data.error) {
          setConformidade(confRes.data);
        }
      } catch {}
      setLoadingConformidade(false);

      setSearchDone(true);
    } catch {
      setError("Erro ao buscar dados.");
    } finally {
      setLoading(false);
    }
  };

  const toggleCert = (id) => setExpandedCerts(prev => ({ ...prev, [id]: !prev[id] }));

  const validCerts = certs.filter(c => c.status !== "revoked" && (getDaysLeft(c.valid_until) === null || getDaysLeft(c.valid_until) >= 0));
  const expiredCerts = certs.filter(c => c.status === "revoked" || (getDaysLeft(c.valid_until) !== null && getDaysLeft(c.valid_until) < 0));
  const expiringSoon = certs.filter(c => {
    if (c.status === "revoked") return false;
    const days = getDaysLeft(c.valid_until);
    return days !== null && days >= 0 && days <= 30;
  });

  const formatCpf = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <User className="w-6 h-6 text-emerald-600" />
          Prontuário Digital do Colaborador
        </h1>
        <p className="text-gray-500 text-sm mt-1">Visão integrada de dados, matriz de treinamentos, auditorias e vencimento de certificados</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Input
              placeholder="CPF do colaborador"
              value={cpf}
              onChange={e => setCpf(formatCpf(e.target.value))}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              maxLength={14}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Search className="w-4 h-4 mr-1" />}
              Buscar
            </Button>
          </div>
          {error && <p className="text-sm text-red-500 mt-2 flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{error}</p>}
        </CardContent>
      </Card>

      {searchDone && !student && (
        <div className="text-center py-16 text-gray-400">
          <User className="w-16 h-16 mx-auto mb-3 opacity-20" />
          <p>Nenhum colaborador encontrado com este CPF.</p>
        </div>
      )}

      {student && (
        <>
          {/* Dados Pessoais */}
          <div className="bg-emerald-600 text-white rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold">{student.full_name}</h2>
                {student.social_name && <p className="text-emerald-200 text-sm">{student.social_name}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-emerald-100">
                  <span>CPF: {student.cpf}</span>
                  {student.rg && <span>RG: {student.rg}</span>}
                  {student.data_nascimento && <span>Nasc: {formatDate(student.data_nascimento)}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Grid de informações */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Vínculo Empresa */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-500" /> Vínculo Empresarial
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm font-medium text-gray-800">{student.company_name || "Sem empresa vinculada"}</p>
                {companies.map(c => (
                  <div key={c.id} className="text-xs text-gray-500 space-y-0.5">
                    <p>{c.razao_social}</p>
                    <p>CNPJ: {c.cnpj}</p>
                  </div>
                ))}
                <div className="flex gap-3 mt-2 text-xs text-gray-500">
                  {student.cidade && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{student.cidade}/{student.estado}</span>}
                </div>
              </CardContent>
            </Card>

            {/* Contato */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-500" /> Contato & Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {student.email && <p className="text-gray-700">{student.email}</p>}
                {student.whatsapp && <p className="text-gray-700">{student.whatsapp}</p>}
                <Badge className={student.status === "Ativo" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                  {student.status || "Ativo"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Conformidade Matriz */}
          {conformidade && conformidade.conformidade !== null && (
            <div className={`rounded-2xl p-5 ${conformidade.score >= 80 ? "bg-green-50 border border-green-200" : conformidade.score >= 50 ? "bg-yellow-50 border border-yellow-200" : "bg-red-50 border border-red-200"}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  Conformidade Regulatória (Matriz)
                </h3>
                <div className={`text-2xl font-bold ${conformidade.score >= 80 ? "text-green-600" : conformidade.score >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                  {conformidade.score}%
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                <div className={`h-2.5 rounded-full transition-all ${conformidade.score >= 80 ? "bg-green-500" : conformidade.score >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${conformidade.score}%` }} />
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div><span className="text-green-600 font-bold block">{conformidade.conformes}</span><span className="text-gray-500">Conformes</span></div>
                <div><span className="text-yellow-600 font-bold block">{conformidade.vencendo}</span><span className="text-gray-500">Vencendo</span></div>
                <div><span className="text-red-600 font-bold block">{conformidade.vencidos}</span><span className="text-gray-500">Vencidos</span></div>
                <div><span className="text-gray-600 font-bold block">{conformidade.pendentes}</span><span className="text-gray-500">Pendentes</span></div>
              </div>
              {conformidade.funcao && (
                <p className="text-xs text-gray-500 mt-2">Função: <span className="font-medium">{conformidade.funcao}</span> • {conformidade.total_requisitos} requisitos na matriz</p>
              )}
              {!conformidade.funcao && conformidade.message && (
                <p className="text-xs text-indigo-600 mt-2">{conformidade.message}</p>
              )}
              {/* Alertas */}
              {conformidade.alertas && conformidade.alertas.length > 0 && (
                <div className="mt-3 space-y-1">
                  {conformidade.alertas.map((a, i) => (
                    <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded ${
                      a.tipo === 'vencido' ? 'bg-red-100 text-red-800' :
                      a.tipo === 'vencendo' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {a.mensagem}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Certificados", value: certs.length, color: "bg-blue-50 text-blue-700 border-blue-100", icon: Award },
              { label: "Válidos", value: validCerts.length, color: "bg-green-50 text-green-700 border-green-100", icon: CheckCircle },
              { label: "Vencendo (30d)", value: expiringSoon.length, color: "bg-orange-50 text-orange-700 border-orange-100", icon: Clock },
              { label: "Vencidos", value: expiredCerts.length, color: "bg-red-50 text-red-700 border-red-100", icon: AlertTriangle },
              { label: "Matrículas", value: enrollments.length, color: "bg-purple-50 text-purple-700 border-purple-100", icon: BookOpen },
            ].map(s => (
              <div key={s.label} className={`rounded-xl border p-3 ${s.color}`}>
                <div className="flex items-center gap-1.5 mb-0.5"><s.icon className="w-3.5 h-3.5" /><span className="text-xs">{s.label}</span></div>
                <div className="text-2xl font-bold">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Certificados */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" /> Certificados ({certs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {certs.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <Award className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum certificado encontrado.</p>
                </div>
              ) : (
                <div>
                  {certs.map(cert => (
                    <CertRow key={cert.id} cert={cert} expanded={!!expandedCerts[cert.id]} onToggle={() => toggleCert(cert.id)} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico de Matrículas */}
          {enrollments.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-500" /> Histórico de Matrículas ({enrollments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {enrollments.map((e, i) => (
                  <div key={e.id || i} className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{e.course_name}</p>
                      <p className="text-xs text-gray-400">{e.company_name} • {formatDate(e.start_date)} — {formatDate(e.end_date)}</p>
                    </div>
                    <Badge className={
                      e.status === "Certificado Gerado" || e.status === "Assinado" ? "bg-green-100 text-green-700" :
                      e.status === "Aguardando Autorização" ? "bg-yellow-100 text-yellow-700" :
                      e.status === "Vencido" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                    }>{e.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Documentos do Aluno */}
          {documents.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" /> Documentos ({documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{doc.document_type?.replace(/_/g, " ")}</p>
                      <p className="text-xs text-gray-400">{doc.file_name || "arquivo"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        doc.status === "Aprovado" ? "bg-green-100 text-green-700" :
                        doc.status === "Rejeitado" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                      }>{doc.status?.replace(/_/g, " ")}</Badge>
                      {doc.file_uri && (
                        <Button
                          size="sm" variant="ghost" className="h-7 w-7 p-0" title="Abrir documento"
                          onClick={async () => {
                            const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: doc.file_uri });
                            if (res?.signed_url) window.open(res.signed_url, "_blank");
                          }}
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Pendências */}
          {expiredCerts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Certificados Vencidos ou Revogados</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Este colaborador possui {expiredCerts.length} certificado(s) com pendência. 
                  Entre em contato com o RH para providenciar a renovação.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}