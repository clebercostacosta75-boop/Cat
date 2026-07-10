import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { logAction } from "@/components/audit/AuditLogger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, FileText, Upload, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format, addMonths } from "date-fns";
import { gerarCodigoInternoControle } from "@/lib/certControl";
import { verificarAptidao } from "@/lib/aptidaoCertificacao";
import { carregarContextoAptidao, registrarTentativaBloqueada } from "@/lib/validarEmissao";

const MODELO_PADRAO = `Nome;CPF;Telefone;Data_Inicio;Data_Termino
João Silva;123.456.789-00;(91) 99999-9999;2025-01-01;2025-01-10
Maria Souza;987.654.321-99;(91) 98888-8888;2025-02-15;2025-02-28`;

const MODELO_DETRAN = `Nome;CPF;Telefone;Data_Inicio;Data_Termino;RENACH;Categoria_CNH;Registro_DETRAN
João Silva;123.456.789-00;(91) 99999-9999;2025-01-01;2025-01-10;REN001;B;DET001
Maria Souza;987.654.321-99;(91) 98888-8888;2025-02-15;2025-02-28;REN002;AB;DET002`;

function gerarCodigo() {
  const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `CAT-${new Date().getFullYear()}-${rand}`;
}

function parseCsvData(text) {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows = lines.slice(1).map(line => {
    const vals = line.split(sep).map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  });
  return { headers, rows };
}

export default function CertificateEmissaoMassa({ onSuccess }) {
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState("");
  const [modelId, setModelId] = useState("");
  const [csvText, setCsvText] = useState("");
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState([]);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("nome_fantasia", 100),
  });

  const { data: models = [] } = useQuery({
    queryKey: ["certificateModels"],
    queryFn: () => base44.entities.CertificateModel.list("-created_date", 100),
  });

  const selectedCompany = companies.find(c => c.id === clientId);
  const selectedModel = models.find(m => m.id === modelId);

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target.result);
    reader.readAsText(file, "UTF-8");
  };

  const handleGenerate = async () => {
    if (!clientId) { toast.error("Selecione o cliente."); return; }
    if (!modelId) { toast.error("Selecione o modelo."); return; }
    if (!csvText.trim()) { toast.error("Cole os dados ou importe uma planilha."); return; }

    const { rows } = parseCsvData(csvText);
    if (rows.length === 0) { toast.error("Nenhum dado válido encontrado."); return; }

    setSaving(true);
    setResults([]);
    const newResults = [];

    // SPR-2B-1 — Blindagem: contexto do motor central + matrículas (CSV não gera certificado direto)
    const ctx = await carregarContextoAptidao();
    const allEnrollments = await base44.entities.StudentCourseEnrollment.list("-created_date", 500);

    for (const row of rows) {
      const name = row["nome"] || row["name"] || "";
      const cpf = row["cpf"] || "";
      const phone = row["telefone"] || row["whatsapp"] || "";
      const startDate = row["data_inicio"] || row["data_de_inicio"] || "";
      const endDate = row["data_termino"] || row["data_de_termino"] || "";
      const renach = row["renach"] || "";
      const categoriaCnh = row["categoria_cnh"] || "";
      const registroDetran = row["registro_detran"] || "";

      if (!name || !cpf) {
        newResults.push({ name: name || "(sem nome)", status: "error", message: "Nome ou CPF ausente" });
        continue;
      }

      // SPR-2B-1 — Blindagem: cada aluno do lote precisa de matrícula apta pelo motor central
      const cpfDigits = cpf.replace(/\D/g, "");
      const candidatos = allEnrollments.filter(e => (e.student_cpf || "").replace(/\D/g, "") === cpfDigits);
      if (candidatos.length === 0) {
        await registrarTentativaBloqueada(
          { student_name: name, student_cpf: cpf, course_name: selectedModel?.name || "", company_id: clientId, company_name: selectedCompany?.nome_fantasia || "" },
          "Aluno sem matrícula cadastrada — CSV não pode gerar certificado direto",
          "Emissão em Massa"
        );
        newResults.push({ name, status: "blocked", message: "Sem matrícula cadastrada" });
        continue;
      }
      let escolhida = candidatos[0];
      let aval = verificarAptidao(escolhida, ctx);
      for (const cand of candidatos) {
        const a = verificarAptidao(cand, ctx);
        if (a.grupo === "aguardando") { escolhida = cand; aval = a; break; }
      }
      if (aval.grupo !== "aguardando") {
        const motivoBloqueio = (aval.bloqueios || []).join("; ") || "Matrícula não apta";
        await registrarTentativaBloqueada(escolhida, motivoBloqueio, "Emissão em Massa");
        newResults.push({ name, status: "blocked", message: motivoBloqueio });
        continue;
      }

      try {
        const code = gerarCodigo();
        const validMonths = selectedModel?.validity_period_months || 12;
        const validUntil = endDate
          ? format(addMonths(new Date(endDate), validMonths), "yyyy-MM-dd")
          : null;

        const certData = {
          certificate_code: code,
          internal_control_code: gerarCodigoInternoControle(),
          enrollment_id: escolhida.id,
          student_id: escolhida.student_id || "",
          student_name: name,
          student_cpf: cpf,
          student_phone: phone || null,
          course_name: selectedModel?.name || "",
          course_duration: selectedModel?.duration || "",
          course_modality: selectedModel?.modality || "",
          programmatic_content: selectedModel?.programmatic_content || [],
          start_date: startDate,
          end_date: endDate,
          valid_until: validUntil,
          location_and_date: `Barcarena/PA, ${format(new Date(), "dd 'de' MMMM 'de' yyyy")}`,
          client_id: clientId,
          client_name: selectedCompany?.nome_fantasia || selectedCompany?.razao_social || "",
          technical_responsibles: selectedModel?.technical_responsibles || [],
          front_background_url: selectedModel?.front_background_url || "",
          back_background_url: selectedModel?.back_background_url || "",
          show_programmatic_hours: selectedModel?.show_programmatic_hours ?? true,
          issue_date: new Date().toISOString(),
          status: "pending_signature",
          whatsapp_sent: false,
        };

        if (renach) certData.renach = renach;
        if (categoriaCnh) certData.categoria_cnh = categoriaCnh;
        if (registroDetran) certData.detran_registro = registroDetran;

        const created = await base44.entities.Certificate.create(certData);
        // SPR-2B-1: vincula certificado à matrícula (mesmo ciclo da fila)
        await base44.entities.StudentCourseEnrollment.update(escolhida.id, { status: "Certificado Gerado", certificate_id: created.id });
        newResults.push({ name, status: "success", code });
      } catch (err) {
        newResults.push({ name, status: "error", message: err?.message || "Erro ao criar" });
      }
    }

    setResults(newResults);
    queryClient.invalidateQueries({ queryKey: ["certificates"] });

    const ok = newResults.filter(r => r.status === "success").length;
    const blocked = newResults.filter(r => r.status === "blocked").length;
    const fail = newResults.filter(r => r.status === "error").length;
    toast.success(`${ok} certificado(s) emitido(s). ${blocked > 0 ? `${blocked} bloqueado(s) pelo motor de aptidão.` : ""}${fail > 0 ? ` ${fail} com erro.` : ""}`);

    // Registrar auditoria da emissão em massa
    if (ok > 0) {
      logAction("emissao_massa", "Certificate", null, `Emissão em massa — ${selectedModel?.name || ""}`, {
        descricao: `Emissão em massa: ${ok} certificados gerados${fail > 0 ? `, ${fail} com erro` : ""}`,
        modelo: selectedModel?.name || "",
        empresa: selectedCompany?.nome_fantasia || selectedCompany?.razao_social || "",
        total_processados: newResults.length,
        total_gerados: ok,
        total_bloqueados: blocked,
        total_erros: fail,
        bloqueados: newResults.filter(r => r.status === "blocked").map(r => `${r.name}: ${r.message}`),
        alunos: newResults.filter(r => r.status === "success").map(r => r.name),
      });
    }

    if (ok > 0) onSuccess?.();
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      {/* 1. Cliente */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Building2 className="w-4 h-4" /> 1. Selecione o Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger>
              <SelectValue placeholder="🏢 Selecione a empresa..." />
            </SelectTrigger>
            <SelectContent>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  🏢 {c.nome_fantasia || c.razao_social}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 2. Modelo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FileText className="w-4 h-4" /> 2. Selecione o Modelo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={modelId} onValueChange={setModelId}>
            <SelectTrigger>
              <SelectValue placeholder="📜 Selecione o modelo..." />
            </SelectTrigger>
            <SelectContent>
              {models.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  📜 {m.name} ({m.duration})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 3. Dados em Massa */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Upload className="w-4 h-4" /> 3. Importe ou Cole os Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Botões de modelo */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCsvText(MODELO_PADRAO)}
            >
              Modelo Padrão
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCsvText(MODELO_DETRAN)}
            >
              Modelo DETRAN
            </Button>
            <label>
              <Button variant="outline" size="sm" asChild>
                <span className="cursor-pointer">
                  <Upload className="w-3 h-3 mr-1" /> Importar Planilha
                </span>
              </Button>
              <input type="file" accept=".csv,.txt,.xlsx" className="hidden" onChange={handleFileImport} />
            </label>
          </div>

          <p className="text-xs text-gray-500">
            ou cole os dados abaixo<br />
            <span className="text-gray-400">
              Campos obrigatórios: <strong>Nome, CPF, Data_Inicio, Data_Termino</strong><br />
              Opcionais: Telefone, RENACH, Categoria_CNH, Registro_DETRAN
            </span>
          </p>

          <Textarea
            className="font-mono text-xs min-h-[160px]"
            placeholder={"Nome;CPF;Telefone;Data_Inicio;Data_Termino\nJoão Silva;123.456.789-00;(91) 99999-9999;2025-01-01;2025-01-10"}
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
          />

          {/* Preview de linhas detectadas */}
          {csvText.trim() && (() => {
            const { rows } = parseCsvData(csvText);
            return rows.length > 0 ? (
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">{rows.length}</span> participante(s) detectado(s).
              </p>
            ) : null;
          })()}
        </CardContent>
      </Card>

      <Button
        className="w-full"
        onClick={handleGenerate}
        disabled={saving}
      >
        {saving
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando certificados...</>
          : "Gerar Certificados em Massa"
        }
      </Button>

      {/* Resultados */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Resultado da Geração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {r.status === "success"
                  ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  : r.status === "blocked"
                  ? <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                }
                <span className="flex-1 truncate">{r.name}</span>
                {r.status === "success"
                  ? <Badge className="bg-green-100 text-green-700 border-0 text-xs">{r.code}</Badge>
                  : <span className={`text-xs ${r.status === "blocked" ? "text-amber-600" : "text-red-500"}`}>{r.message}</span>
                }
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}