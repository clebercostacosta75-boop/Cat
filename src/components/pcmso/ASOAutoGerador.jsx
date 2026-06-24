import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { addYears, addMonths, format } from "date-fns";

/**
 * ASOAutoGerador — gera ASOs automaticamente para todos os colaboradores
 * da empresa com base na matriz de exames do PCMSO importado.
 *
 * Props:
 *   doc        — DocumentoPCMSO completo
 *   matrizes   — array de PCMSOMatrizExame do PCMSO
 *   onConcluido — callback chamado após geração
 */
export default function ASOAutoGerador({ doc, matrizes, onConcluido }) {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null); // { criados, ignorados, detalhes }
  const [expandido, setExpandido] = useState(false);

  const hoje = new Date().toISOString().split("T")[0];

  /** Calcula data de vencimento com base na periodicidade da função */
  const calcVencimento = (periodicidade) => {
    const p = (periodicidade || "Anual").toLowerCase();
    if (p.includes("bienal") || p.includes("2 ano")) return format(addYears(new Date(), 2), "yyyy-MM-dd");
    if (p.includes("semestral")) return format(addMonths(new Date(), 6), "yyyy-MM-dd");
    if (p.includes("trimestral")) return format(addMonths(new Date(), 3), "yyyy-MM-dd");
    return format(addYears(new Date(), 1), "yyyy-MM-dd"); // Anual (padrão)
  };

  /** Extrai exames obrigatórios de admissional/periódico da base_tecnica */
  const extrairExames = (matriz) => {
    if (matriz.base_tecnica) {
      const match = matriz.base_tecnica.match(/Per:\s*([^|]+)/i);
      if (match) return match[1].trim().replace("—", "Exame Clínico");
    }
    return matriz.exames_obrigatorios || "Exame Clínico";
  };

  const gerarASOs = async () => {
    if (!doc.empresa_mestre_id) {
      alert("PCMSO não vinculado a uma empresa. Verifique o cadastro.");
      return;
    }
    setLoading(true);
    setResultado(null);

    // 1. Buscar colaboradores ativos da empresa
    const colaboradores = await base44.entities.ColaboradorSST.filter({
      empresa_mestre_id: doc.empresa_mestre_id,
      status: "Ativo"
    }).catch(() => []);

    // 2. Buscar ASOs já existentes para não duplicar
    const asosExistentes = await base44.entities.ASORegistro.filter({
      empresa_mestre_id: doc.empresa_mestre_id
    }).catch(() => []);

    // Mapa: colaborador_sst_id → último ASO periódico
    const mapaUltimoASO = {};
    asosExistentes.forEach(aso => {
      if (!mapaUltimoASO[aso.colaborador_sst_id] ||
          aso.data_exame > mapaUltimoASO[aso.colaborador_sst_id].data_exame) {
        mapaUltimoASO[aso.colaborador_sst_id] = aso;
      }
    });

    // Mapa de funções → matriz de exames
    const normalize = s => (s || "").trim().toLowerCase();
    const mapaMatriz = {};
    matrizes.forEach(m => {
      mapaMatriz[normalize(m.funcao)] = m;
    });

    const criados = [];
    const ignorados = [];

    for (const colab of colaboradores) {
      const funcaoKey = normalize(colab.funcao || colab.cargo);
      const matrizFuncao = mapaMatriz[funcaoKey] ||
        // Fallback: busca por correspondência parcial
        matrizes.find(m => normalize(m.funcao).includes(funcaoKey) || funcaoKey.includes(normalize(m.funcao)));

      // Verificar se já tem ASO periódico válido recente (nos últimos 12 meses)
      const ultimoASO = mapaUltimoASO[colab.id];
      const temASORecente = ultimoASO && ultimoASO.data_exame &&
        (new Date() - new Date(ultimoASO.data_exame)) < (365 * 24 * 60 * 60 * 1000);

      if (temASORecente) {
        ignorados.push({
          colaborador: colab.nome,
          motivo: `ASO recente em ${format(new Date(ultimoASO.data_exame), "dd/MM/yyyy")}`
        });
        continue;
      }

      // Determinar periodicidade e exames
      const periodicidade = matrizFuncao?.periodicidade || "Anual";
      const examesObrigatorios = matrizFuncao ? extrairExames(matrizFuncao) : "Exame Clínico";
      const vencimento = calcVencimento(periodicidade);
      const tipoExame = ultimoASO ? "Periódico" : "Admissional";

      // Criar ASO
      const aso = await base44.entities.ASORegistro.create({
        empresa_mestre_id: doc.empresa_mestre_id,
        empresa_mestre_nome: doc.empresa_nome,
        colaborador_sst_id: colab.id,
        nome_colaborador: colab.nome,
        cpf: colab.cpf || "",
        funcao: colab.funcao || colab.cargo || "",
        data_exame: hoje,
        tipo_exame: tipoExame,
        medico_responsavel: doc.medico_responsavel || "",
        crm: doc.crm || "",
        resultado: "Apto",
        data_vencimento: vencimento,
        status: "Válido",
        // Campos extras (notas)
        observacoes_aso: `Gerado automaticamente via PCMSO. Exames: ${examesObrigatorios}. Periodicidade: ${periodicidade}.`,
      }).catch(err => { console.error(err); return null; });

      if (aso) {
        criados.push({
          colaborador: colab.nome,
          funcao: colab.funcao || colab.cargo,
          tipo: tipoExame,
          vencimento: format(new Date(vencimento), "dd/MM/yyyy"),
          exames: examesObrigatorios,
        });
      } else {
        ignorados.push({ colaborador: colab.nome, motivo: "Erro ao criar ASO" });
      }
    }

    setResultado({ criados, ignorados });
    setLoading(false);
    if (onConcluido) onConcluido();
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-blue-800 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Geração Automática de ASOs
          </p>
          <p className="text-xs text-blue-600 mt-0.5">
            Gera ASOs para todos os colaboradores ativos com base na matriz de exames do PCMSO.
            Colaboradores com ASO recente (12 meses) são ignorados.
          </p>
        </div>
        <Button
          onClick={gerarASOs}
          disabled={loading || matrizes.length === 0}
          className="bg-blue-600 hover:bg-blue-700 gap-1.5 shrink-0"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
            : <><FileText className="w-4 h-4" /> Gerar ASOs Automáticos</>
          }
        </Button>
      </div>

      {matrizes.length === 0 && (
        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" />
          Nenhuma função na Matriz de Exames. Importe o PCMSO primeiro.
        </p>
      )}

      {resultado && (
        <div className="mt-4 space-y-3">
          {/* Resumo */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-green-100 text-green-800 rounded-lg px-3 py-1.5 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              {resultado.criados.length} ASO(s) criado(s)
            </div>
            {resultado.ignorados.length > 0 && (
              <div className="flex items-center gap-1.5 bg-gray-100 text-gray-600 rounded-lg px-3 py-1.5 text-sm">
                <AlertTriangle className="w-4 h-4" />
                {resultado.ignorados.length} ignorado(s)
              </div>
            )}
          </div>

          {/* Detalhes expansíveis */}
          {resultado.criados.length > 0 && (
            <div className="bg-white border rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setExpandido(e => !e)}
              >
                <span>Ver detalhes dos ASOs gerados</span>
                {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandido && (
                <div className="border-t">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Colaborador</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Função</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Tipo</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Vencimento</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Exames</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.criados.map((r, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{r.colaborador}</td>
                          <td className="px-3 py-2 text-gray-600">{r.funcao || "—"}</td>
                          <td className="px-3 py-2">
                            <Badge className={`text-xs ${r.tipo === "Admissional" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                              {r.tipo}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-gray-700">{r.vencimento}</td>
                          <td className="px-3 py-2 text-gray-500 max-w-[180px] truncate" title={r.exames}>{r.exames}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {resultado.ignorados.length > 0 && (
                    <div className="px-4 py-3 border-t bg-gray-50">
                      <p className="text-xs font-medium text-gray-500 mb-1">Ignorados:</p>
                      {resultado.ignorados.map((r, i) => (
                        <p key={i} className="text-xs text-gray-400">• {r.colaborador} — {r.motivo}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}