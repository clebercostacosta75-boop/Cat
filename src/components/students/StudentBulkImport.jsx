import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Gera e baixa o modelo Excel (CSV compatível com Excel)
function downloadTemplate() {
  const header = ["Nome Completo", "CPF", "Email", "WhatsApp", "Curso"].join(";");
  const example = ["João da Silva", "123.456.789-00", "joao@email.com", "(91) 99999-9999", "NR-35 – Trabalho em Altura"].join(";");
  const csv = ["\uFEFF" + header, example].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modelo_importacao_alunos.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  // Remove BOM se houver
  const header = lines[0].replace(/^\uFEFF/, "").split(";").map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(";").map(c => c.trim().replace(/^"|"$/g, ""));
    const obj = {};
    header.forEach((h, i) => { obj[h] = cols[i] || ""; });
    return obj;
  }).filter(r => r["Nome Completo"]);
}

export default function StudentBulkImport({ companies = [], courses = [], onSuccess }) {
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedCompanyName, setSelectedCompanyName] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleCompanyChange = (id) => {
    const company = companies.find(c => c.id === id);
    setSelectedCompanyId(id);
    setSelectedCompanyName(company ? (company.nome_fantasia || company.name || "") : "");
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResults([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const rows = parseCSV(text);
      setPreview(rows);
    };
    reader.readAsText(f, "UTF-8");
  };

  const handleImport = async () => {
    if (!selectedCompanyId) {
      toast.error("Selecione uma empresa antes de importar.");
      return;
    }
    if (preview.length === 0) {
      toast.error("Nenhum dado encontrado na planilha.");
      return;
    }

    setLoading(true);
    const resultados = [];

    // SPR-2B-1: validação de CPF e duplicidade — importação NUNCA gera certificado
    const existentes = await base44.entities.Student.list("-created_date", 1000);
    const cpfsExistentes = new Set(existentes.map(s => (s.cpf || "").replace(/\D/g, "")).filter(Boolean));

    for (const row of preview) {
      try {
        const cpfDigits = (row["CPF"] || "").replace(/\D/g, "");
        if (!cpfDigits) {
          resultados.push({ name: row["Nome Completo"], ok: false, error: "CPF ausente ou inválido" });
          continue;
        }
        if (cpfsExistentes.has(cpfDigits)) {
          resultados.push({ name: row["Nome Completo"], ok: false, error: "CPF já cadastrado (duplicidade bloqueada)" });
          continue;
        }
        cpfsExistentes.add(cpfDigits);
        const courseName = row["Curso"] || "";
        const course = courses.find(c => c.name?.toLowerCase() === courseName.toLowerCase());

        await base44.entities.Student.create({
          full_name: row["Nome Completo"],
          cpf: row["CPF"],
          email: row["Email"] || "",
          whatsapp: row["WhatsApp"] || "",
          company_id: selectedCompanyId,
          company_name: selectedCompanyName,
          course_id: course?.id || "",
          course_name: courseName,
          status: "Ativo",
        });
        resultados.push({ name: row["Nome Completo"], ok: true });
      } catch (err) {
        resultados.push({ name: row["Nome Completo"], ok: false, error: err.message });
      }
    }

    setResults(resultados);

    // SPR-2B-1: auditoria da importação (nenhum certificado é gerado pela importação)
    try {
      const user = await base44.auth.me().catch(() => null);
      await base44.entities.AuditLog.create({
        user_email: user?.email || "desconhecido",
        user_name: user?.full_name || user?.email || "desconhecido",
        action: "create",
        entity_type: "Student",
        entity_name: `Importação em massa — ${selectedCompanyName}`,
        details: `IMPORTAÇÃO EM MASSA (Certificação) em ${new Date().toLocaleString("pt-BR")}. Empresa: ${selectedCompanyName}. Total na planilha: ${preview.length}. Importados: ${resultados.filter(r => r.ok).length}. Rejeitados: ${resultados.filter(r => !r.ok).length}. Nenhum certificado gerado pela importação.`,
      });
    } catch { /* log não bloqueia */ }

    setLoading(false);

    const ok = resultados.filter(r => r.ok).length;
    const fail = resultados.filter(r => !r.ok).length;

    if (ok > 0) {
      toast.success(`${ok} aluno(s) cadastrado(s) com sucesso!`);
      if (fail === 0 && onSuccess) onSuccess();
    }
    if (fail > 0) toast.error(`${fail} aluno(s) falharam na importação.`);
  };

  return (
    <div className="space-y-5">
      {/* Passo 1: Baixar modelo */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm font-medium text-blue-800 mb-2">Passo 1: Baixe o modelo da planilha</p>
        <p className="text-xs text-blue-600 mb-3">
          Preencha com os dados dos alunos (Nome, CPF, Email, WhatsApp, Curso) e salve em formato CSV.
        </p>
        <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
          <Download className="w-4 h-4" /> Baixar Modelo Excel (CSV)
        </Button>
      </div>

      {/* Passo 2: Selecionar empresa */}
      <div className="space-y-2">
        <Label>Passo 2: Selecione a Empresa *</Label>
        <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
          <SelectTrigger>
            <SelectValue placeholder="Vincular todos os alunos à empresa..." />
          </SelectTrigger>
          <SelectContent>
            {companies.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome_fantasia || c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Passo 3: Upload da planilha */}
      <div className="space-y-2">
        <Label>Passo 3: Envie a planilha preenchida *</Label>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
        />
      </div>

      {/* Preview */}
      {preview.length > 0 && results.length === 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 border-b">
            {preview.length} aluno(s) encontrado(s) na planilha
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
            {preview.map((r, i) => (
              <div key={i} className="px-4 py-2 flex justify-between text-sm">
                <span className="font-medium text-gray-800">{r["Nome Completo"]}</span>
                <span className="text-gray-400 text-xs">{r["CPF"]} • {r["Curso"]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resultados */}
      {results.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 border-b">Resultado da Importação</div>
          <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
            {results.map((r, i) => (
              <div key={i} className="px-4 py-2 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-800">{r.name}</span>
                {r.ok
                  ? <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle className="w-3.5 h-3.5" /> Importado</span>
                  : <span className="flex items-center gap-1 text-red-500 text-xs"><XCircle className="w-3.5 h-3.5" /> {r.error || "Erro"}</span>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botão importar */}
      {preview.length > 0 && (
        <Button onClick={handleImport} disabled={loading || !selectedCompanyId} className="w-full gap-2">
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
            : <><Upload className="w-4 h-4" /> Importar {preview.length} Aluno(s)</>
          }
        </Button>
      )}
    </div>
  );
}