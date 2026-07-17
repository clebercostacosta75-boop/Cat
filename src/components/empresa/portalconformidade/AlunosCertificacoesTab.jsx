import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Users, Search, ChevronDown, ChevronUp, Award } from "lucide-react";
import { format, parseISO } from "date-fns";
import CertificateDownloader from "@/components/certificates/CertificateDownloader";
import { situacaoCertificado } from "./situacao";

const fmt = (d, p = "dd/MM/yyyy") => { try { return d ? format(parseISO(d), p) : "—"; } catch { return "—"; } };

function FichaAluno({ ficha, alertDias, certModels, companyId }) {
  const [aberto, setAberto] = useState(false);
  const auditarDownload = (cert) => {
    base44.functions.invoke("portalEmpresaConformidade", {
      action: "auditar", tipo: "export", company_id: companyId,
      detalhes: `Download de certificado ${cert.certificate_code || cert.id} — ${cert.student_name} / ${cert.course_name}`,
    }).catch(() => {});
  };
  return (
    <div className="border-b">
      <button onClick={() => setAberto((v) => !v)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm truncate">{ficha.nome}</p>
          <p className="text-xs text-gray-400">CPF: {ficha.cpf || "—"} · {ficha.email || "e-mail não informado"} · {ficha.phone || "WhatsApp não informado"}</p>
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap">{ficha.certs.length} certificado(s)</span>
        {aberto ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {aberto && (
        <div className="px-4 pb-4 space-y-2 bg-gray-50/60">
          {ficha.certs.map((c) => {
            const sit = situacaoCertificado(c, alertDias);
            const model = certModels.find((m) => m.id === c.certificate_model_id);
            const assinado = ["signed", "active"].includes(c.status);
            return (
              <div key={c.id} className="bg-white border rounded-lg px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-[180px]">
                    <p className="text-sm font-medium text-gray-800">{c.course_name}</p>
                    <p className="text-xs text-gray-400">
                      {c.certification_type || "—"} · {c.course_duration || "—"} · Realização: {fmt(c.end_date)} · Validade: {c.valid_until ? fmt(c.valid_until) : "Validade pendente"}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${sit.cor}`}>{sit.label}</span>
                  {assinado && (
                    <span onClickCapture={() => auditarDownload(c)}>
                      <CertificateDownloader certificate={c} certModel={model} size="sm" />
                    </span>
                  )}
                </div>
                <div className="mt-1.5 text-[11px] text-gray-400 flex flex-wrap gap-x-4">
                  <span>Código: {c.certificate_code || "—"}</span>
                  <span>Emitido: {fmt(c.issue_date, "dd/MM/yyyy HH:mm")}</span>
                  {c.signed_at && <span>Assinado: {fmt(c.signed_at, "dd/MM/yyyy HH:mm")}</span>}
                  {c.version > 1 && <span>Versão {c.version} (reemissão)</span>}
                  {c.status === "revoked" && <span className="text-red-500">Revogado: {c.revocation_reason || "—"}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AlunosCertificacoesTab({ dados }) {
  const [busca, setBusca] = useState("");
  const alertDias = dados.alert_dias || [45, 30, 15, 5];
  const porAluno = new Map();
  for (const c of dados.certificates) {
    const chave = c.student_id || `${c.student_name}|${c.student_cpf}`;
    if (!porAluno.has(chave)) {
      const aluno = dados.students.find((s) => s.id === c.student_id) || {};
      porAluno.set(chave, {
        chave, nome: c.student_name, cpf: c.cpf_exibicao,
        email: c.student_email || aluno.email, phone: c.student_phone || aluno.phone,
        certs: [],
      });
    }
    porAluno.get(chave).certs.push(c);
  }
  const fichas = [...porAluno.values()]
    .filter((f) => !busca || [f.nome, f.cpf, ...f.certs.map((c) => c.course_name)].some((v) => v && v.toLowerCase().includes(busca.toLowerCase())))
    .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-gray-800 text-sm">Alunos e Certificações ({fichas.length})</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input placeholder="Buscar aluno ou curso..." className="pl-8 h-8 text-xs w-52" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
      </div>
      {fichas.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <Award className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{dados.certificates.length === 0 ? "Nenhum certificado emitido para esta empresa." : "Nenhum aluno encontrado para a busca."}</p>
        </div>
      ) : (
        fichas.map((f) => (
          <FichaAluno key={f.chave} ficha={f} alertDias={alertDias} certModels={dados.certificate_models || []} companyId={dados.company.id} />
        ))
      )}
    </div>
  );
}