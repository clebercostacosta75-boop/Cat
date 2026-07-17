import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { BarChart3, FileSpreadsheet, Printer } from "lucide-react";
import { situacaoCertificado, certificadosAtivos } from "./situacao";

function toCSV(header, rows) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [header, ...rows].map((r) => r.map(esc).join(";")).join("\n");
}
function baixarCSV(nome, header, rows) {
  const blob = new Blob(["\ufeff" + toCSV(header, rows)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  URL.revokeObjectURL(a.href);
}
function imprimirPDF(titulo, empresa, header, rows) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<html><head><title>${titulo}</title><style>
    body{font-family:Arial,sans-serif;font-size:11px;padding:16px}h1{font-size:15px}h2{font-size:11px;color:#666;font-weight:normal}
    table{border-collapse:collapse;width:100%;margin-top:10px}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#f3f4f6}
  </style></head><body><h1>${titulo}</h1><h2>${empresa} — gerado em ${new Date().toLocaleString("pt-BR")}</h2>
  <table><thead><tr>${header.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`);
  w.document.close();
  w.print();
}

export default function RelatoriosTab({ dados }) {
  const [msg, setMsg] = useState("");
  const alertDias = dados.alert_dias || [45, 30, 15, 5];
  const certs = certificadosAtivos(dados.certificates).map((c) => ({ ...c, sit: situacaoCertificado(c, alertDias) }));
  const empresa = dados.company.razao_social;

  const auditar = (detalhes) => {
    base44.functions.invoke("portalEmpresaConformidade", { action: "auditar", tipo: "export", company_id: dados.company.id, detalhes }).catch(() => {});
  };

  const linha = (c) => [c.student_name, c.cpf_exibicao, c.course_name, c.certification_type || "", c.end_date || "", c.valid_until || "Validade pendente", c.sit.label, c.certificate_code || ""];
  const HEADER = ["Aluno", "CPF", "Curso", "Tipo", "Realização", "Validade", "Situação", "Código"];

  const relatorios = [
    { nome: "Certificados válidos", filtro: (c) => !["Vencido", "Validade pendente"].includes(c.sit.label) },
    { nome: "Certificados vencidos", filtro: (c) => c.sit.label === "Vencido" },
    { nome: "Próximos do vencimento (45/30/15/5)", filtro: (c) => c.sit.label.startsWith("Vence em") },
    { nome: "Histórico por aluno (todos os certificados)", filtro: () => true },
  ];

  const exportar = (rel, formato) => {
    const rows = certs.filter(rel.filtro).sort((a, b) => (a.student_name || "").localeCompare(b.student_name || "")).map(linha);
    if (rows.length === 0) { setMsg(`"${rel.nome}": nenhum registro para exportar.`); return; }
    setMsg("");
    auditar(`Exportação de relatório "${rel.nome}" (${formato}) — ${rows.length} registro(s)`);
    if (formato === "CSV") baixarCSV(`${rel.nome}.csv`, HEADER, rows);
    else imprimirPDF(rel.nome, empresa, HEADER, rows);
  };

  // Matriz de conformidade: aluno × curso (calculada dos mesmos certificados filtrados; nada é persistido)
  const cursosUnicos = [...new Set(certs.map((c) => c.course_name).filter(Boolean))].sort();
  const alunosUnicos = [...new Set(certs.map((c) => c.student_name).filter(Boolean))].sort();
  const celula = (aluno, curso) => {
    const doAluno = certs.filter((c) => c.student_name === aluno && c.course_name === curso);
    if (!doAluno.length) return "";
    const melhor = doAluno.sort((a, b) => (b.sit.dias ?? -99999) - (a.sit.dias ?? -99999))[0];
    if (melhor.sit.label === "Regular") return "✓";
    if (melhor.sit.label === "Vencido") return "Vencido";
    if (melhor.sit.label === "Validade pendente") return "Pendente";
    return melhor.sit.label.replace("Vence em ", "").replace(" dias", "d");
  };
  const exportarMatriz = (formato) => {
    const header = ["Aluno", ...cursosUnicos];
    const rows = alunosUnicos.map((a) => [a, ...cursosUnicos.map((c) => celula(a, c) || "—")]);
    if (rows.length === 0) { setMsg("Matriz: nenhum registro para exportar."); return; }
    setMsg("");
    auditar(`Exportação da matriz de conformidade aluno × curso (${formato}) — ${rows.length} aluno(s)`);
    if (formato === "CSV") baixarCSV("Matriz de conformidade.csv", header, rows);
    else imprimirPDF("Matriz de conformidade — aluno × curso", empresa, header, rows);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-gray-800 text-sm">Relatórios da empresa</span>
          <span className="ml-auto text-[11px] text-gray-400">Somente dados da empresa autorizada · exportações auditadas</span>
        </div>
        {msg && <div className="px-4 py-2 text-xs text-amber-600 border-b bg-amber-50">{msg}</div>}
        <div className="divide-y">
          {relatorios.map((rel) => {
            const total = certs.filter(rel.filtro).length;
            return (
              <div key={rel.nome} className="px-4 py-3 flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-medium text-gray-800">{rel.nome}</p>
                  <p className="text-xs text-gray-400">{total} registro(s)</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => exportar(rel, "CSV")}><FileSpreadsheet className="w-3 h-3" /> Planilha</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => exportar(rel, "PDF")}><Printer className="w-3 h-3" /> PDF</Button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex flex-wrap items-center gap-2">
          <span className="font-semibold text-gray-800 text-sm">Matriz de conformidade — aluno × curso/NR</span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => exportarMatriz("CSV")}><FileSpreadsheet className="w-3 h-3" /> Planilha</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => exportarMatriz("PDF")}><Printer className="w-3 h-3" /> PDF</Button>
          </div>
        </div>
        {alunosUnicos.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">Nenhum certificado para montar a matriz.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-500 sticky left-0 bg-gray-50">Aluno</th>
                  {cursosUnicos.map((c) => <th key={c} className="px-2 py-2 font-medium text-gray-500 max-w-[120px]"><div className="truncate">{c}</div></th>)}
                </tr>
              </thead>
              <tbody>
                {alunosUnicos.map((a) => (
                  <tr key={a} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-700 sticky left-0 bg-white whitespace-nowrap">{a}</td>
                    {cursosUnicos.map((c) => {
                      const v = celula(a, c);
                      const cor = v === "✓" ? "text-green-600" : v === "Vencido" ? "text-red-600 font-medium" : v === "Pendente" ? "text-slate-500" : v ? "text-orange-600" : "text-gray-300";
                      return <td key={c} className={`px-2 py-2 text-center ${cor}`}>{v || "—"}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}