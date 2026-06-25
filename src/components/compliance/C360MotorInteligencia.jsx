import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { differenceInDays, parseISO } from "date-fns";
import { Brain, RefreshCw, AlertTriangle, CheckCircle, Loader2, ChevronDown, ChevronRight } from "lucide-react";

const NIVEL = {
  critico: { label: "Crítico", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  alto:    { label: "Alto",    color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  medio:   { label: "Médio",   color: "bg-yellow-100 text-yellow-700 border-yellow-200", dot: "bg-yellow-400" },
  ok:      { label: "OK",      color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
};

function GapItem({ gap }) {
  const [open, setOpen] = useState(false);
  const n = NIVEL[gap.nivel] || NIVEL.medio;
  return (
    <div className={`border rounded-lg p-3 ${n.color}`}>
      <div className="flex items-start gap-3 cursor-pointer" onClick={() => setOpen(!open)}>
        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.dot}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{gap.titulo}</p>
            <div className="flex items-center gap-1">
              <Badge className={`text-xs border ${n.color}`}>{n.label}</Badge>
              {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </div>
          </div>
          {gap.itens?.length > 0 && <p className="text-xs mt-0.5 opacity-70">{gap.itens.length} item(ns) afetado(s)</p>}
        </div>
      </div>
      {open && gap.itens?.length > 0 && (
        <div className="mt-2 pt-2 border-t border-current/20 space-y-1">
          {gap.itens.slice(0, 10).map((it, i) => (
            <p key={i} className="text-xs opacity-80">• {it}</p>
          ))}
          {gap.itens.length > 10 && <p className="text-xs opacity-60">+ {gap.itens.length - 10} mais...</p>}
          {gap.acao && <p className="text-xs font-semibold mt-2 opacity-90">→ Ação: {gap.acao}</p>}
        </div>
      )}
    </div>
  );
}

export default function C360MotorInteligencia({ empresa, pgrs, pcmsos, ltcats, colaboradores, asos, epis, entregas, certificados, treinamentos }) {
  const [gaps, setGaps] = useState([]);
  const [score, setScore] = useState(null);
  const [rodando, setRodando] = useState(false);
  const [matrizes, setMatrizes] = useState([]);
  const [matrizNR, setMatrizNR] = useState([]);
  const [rodouUmaVez, setRodouUmaVez] = useState(false);

  const today = new Date();
  const isVencido = (d) => d && differenceInDays(parseISO(d), today) < 0;
  const isVencendo = (d, dias = 90) => {
    if (!d) return false;
    const diff = differenceInDays(parseISO(d), today);
    return diff >= 0 && diff <= dias;
  };

  const rodarMotor = async () => {
    setRodando(true);
    // Buscar matrizes de exames e treinamentos NR adicionais
    let mats = matrizes, matNR = matrizNR;
    if (empresa?.id && mats.length === 0) {
      const pcmsoIds = (pcmsos || []).map(p => p.id);
      const results = await Promise.all(pcmsoIds.map(id => base44.entities.PCMSOMatrizExame.filter({ pcmso_detalhe_id: id })));
      mats = results.flat();
      setMatrizes(mats);
      const matNRData = await base44.entities.MatrizTreinamentoNR.filter({ empresa_mestre_id: empresa.id });
      matNR = matNRData;
      setMatrizNR(matNRData);
    }

    const novosGaps = [];
    const colabs = colaboradores || [];
    const asosArr = asos || [];
    const certsArr = certificados || [];
    const epEnt = entregas || [];

    // 1. Riscos sem exame correspondente no PCMSO
    const funcoesComExame = new Set(mats.map(m => (m.funcao || "").toLowerCase().trim()));
    const funcoesColabs = [...new Set(colabs.map(c => (c.funcao || c.cargo || "")).filter(Boolean))];
    const funcoesSemExame = funcoesColabs.filter(f => !funcoesComExame.has(f.toLowerCase().trim()));
    novosGaps.push({
      nivel: funcoesSemExame.length > 0 ? "critico" : "ok",
      titulo: "Funções sem exames definidos no PCMSO",
      itens: funcoesSemExame,
      acao: "Incluir funções na Matriz de Exames do PCMSO",
    });

    // 2. Colaboradores sem ASO válido
    const colabsSemASO = colabs.filter(c => {
      const meuASO = asosArr.find(a => a.colaborador_sst_id === c.id);
      if (!meuASO) return true;
      return isVencido(meuASO.data_vencimento);
    });
    novosGaps.push({
      nivel: colabsSemASO.length > 5 ? "critico" : colabsSemASO.length > 0 ? "alto" : "ok",
      titulo: "Colaboradores sem ASO válido",
      itens: colabsSemASO.map(c => `${c.nome_completo || c.nome} — ${c.funcao || c.cargo || "—"}`),
      acao: "Agendar exames periódicos urgentes",
    });

    // 3. ASOs vencendo em 30 dias
    const asosVencendo = asosArr.filter(a => isVencendo(a.data_vencimento, 30));
    novosGaps.push({
      nivel: asosVencendo.length > 0 ? "medio" : "ok",
      titulo: "ASOs vencendo em 30 dias",
      itens: asosVencendo.map(a => `${a.nome_colaborador} — vence em ${differenceInDays(parseISO(a.data_vencimento), today)}d`),
      acao: "Agendar exames preventivamente",
    });

    // 4. Documentos SST vencidos
    const docsVencidos = [
      ...(pgrs || []).filter(d => isVencido(d.vigencia_fim)).map(d => `PGR: ${d.empresa_nome}`),
      ...(pcmsos || []).filter(d => isVencido(d.vigencia_fim)).map(d => `PCMSO: ${d.empresa_nome}`),
      ...(ltcats || []).filter(d => isVencido(d.vigencia_fim)).map(d => `LTCAT: ${d.empresa_nome}`),
    ];
    novosGaps.push({
      nivel: docsVencidos.length > 0 ? "critico" : "ok",
      titulo: "Programas SST vencidos (PGR/PCMSO/LTCAT)",
      itens: docsVencidos,
      acao: "Providenciar atualização e reelaboração dos documentos",
    });

    // 5. Documentos SST vencendo em 90 dias
    const docsVencendo = [
      ...(pgrs || []).filter(d => isVencendo(d.vigencia_fim)).map(d => `PGR: ${d.empresa_nome} (${differenceInDays(parseISO(d.vigencia_fim), today)}d)`),
      ...(pcmsos || []).filter(d => isVencendo(d.vigencia_fim)).map(d => `PCMSO: ${d.empresa_nome} (${differenceInDays(parseISO(d.vigencia_fim), today)}d)`),
      ...(ltcats || []).filter(d => isVencendo(d.vigencia_fim)).map(d => `LTCAT: ${d.empresa_nome} (${differenceInDays(parseISO(d.vigencia_fim), today)}d)`),
    ];
    novosGaps.push({
      nivel: docsVencendo.length > 0 ? "medio" : "ok",
      titulo: "Programas SST vencendo em 90 dias",
      itens: docsVencendo,
      acao: "Iniciar processo de revisão e renovação",
    });

    // 6. Certificados de treinamento vencidos
    const certsVencidos = certsArr.filter(c => isVencido(c.valid_until));
    novosGaps.push({
      nivel: certsVencidos.length > 5 ? "critico" : certsVencidos.length > 0 ? "alto" : "ok",
      titulo: "Certificados de treinamento vencidos",
      itens: certsVencidos.map(c => `${c.student_name} — ${c.course_name}`),
      acao: "Solicitar reciclagem dos treinamentos vencidos",
    });

    // 7. Funções sem treinamento NR correspondente
    if (matNR.length > 0) {
      const nrsNecessarias = [...new Set(matNR.map(m => m.nr_codigo).filter(Boolean))];
      const certsNRs = new Set(certsArr.map(c => c.course_name?.match(/NR-?\d+/i)?.[0]?.toUpperCase()).filter(Boolean));
      const nrsSemCertificado = nrsNecessarias.filter(nr => !certsNRs.has(nr.toUpperCase()));
      novosGaps.push({
        nivel: nrsSemCertificado.length > 0 ? "alto" : "ok",
        titulo: "NRs obrigatórias sem cobertura de treinamento",
        itens: nrsSemCertificado,
        acao: "Programar treinamentos para as NRs identificadas",
      });
    }

    // 8. Colaboradores sem EPI entregue
    const colabsSemEPI = colabs.filter(c => !epEnt.some(e => e.colaborador_sst_id === c.id));
    novosGaps.push({
      nivel: colabsSemEPI.length > 0 ? "medio" : "ok",
      titulo: "Colaboradores sem registro de entrega de EPI",
      itens: colabsSemEPI.map(c => c.nome_completo || c.nome).filter(Boolean),
      acao: "Emitir fichas de entrega de EPI",
    });

    // 9. EPIs com CA vencido / próximos de vencer
    const episCA = (epis || []);
    const episCAVencendo = episCA.filter(e => {
      if (!e.ca_vencimento) return false;
      const diff = differenceInDays(parseISO(e.ca_vencimento), today);
      return diff >= 0 && diff <= 180;
    });
    const episCAVencido = episCA.filter(e => e.ca_vencimento && isVencido(e.ca_vencimento));
    novosGaps.push({
      nivel: episCAVencido.length > 0 ? "alto" : episCAVencendo.length > 0 ? "medio" : "ok",
      titulo: "EPIs com Certificado de Aprovação (CA) vencido ou próximo do vencimento",
      itens: [
        ...episCAVencido.map(e => `VENCIDO: ${e.nome} — CA ${e.numero_ca}`),
        ...episCAVencendo.map(e => `Vencendo: ${e.nome} — CA ${e.numero_ca} (${differenceInDays(parseISO(e.ca_vencimento), today)}d)`),
      ],
      acao: "Renovar CA dos EPIs junto ao fabricante / MTE",
    });

    // 10. PCMSO sem Médico do Trabalho definido
    const pcmsoSemMedico = (pcmsos || []).filter(p => !p.medico_responsavel);
    novosGaps.push({
      nivel: pcmsoSemMedico.length > 0 ? "alto" : "ok",
      titulo: "PCMSO sem médico coordenador definido",
      itens: pcmsoSemMedico.map(p => p.empresa_nome || "Sem nome"),
      acao: "Designar médico coordenador do PCMSO (NR-7)",
    });

    // 11. Colaboradores com ASO Inapto
    const inaptos = asosArr.filter(a => a.resultado === "Inapto");
    novosGaps.push({
      nivel: inaptos.length > 0 ? "critico" : "ok",
      titulo: "Colaboradores com resultado Inapto no ASO",
      itens: inaptos.map(a => `${a.nome_colaborador} — ${a.funcao || "—"} (${a.data_exame})`),
      acao: "Verificar situação legal e afastar colaboradores inaptos imediatamente",
    });

    // 12. Colaboradores sem cargo/função definida
    const semFuncao = colabs.filter(c => !c.funcao && !c.cargo);
    novosGaps.push({
      nivel: semFuncao.length > 0 ? "medio" : "ok",
      titulo: "Colaboradores sem função/cargo definido",
      itens: semFuncao.map(c => c.nome_completo || c.nome).filter(Boolean),
      acao: "Preencher cargo/função no cadastro do colaborador para vincular GHE e exames",
    });

    setGaps(novosGaps);

    // Calcular score
    const nOk = novosGaps.filter(g => g.nivel === "ok").length;
    const sc = Math.round((nOk / novosGaps.length) * 100);
    setScore(sc);
    setRodando(false);
    setRodouUmaVez(true);
  };

  const criticos = gaps.filter(g => g.nivel === "critico");
  const altos = gaps.filter(g => g.nivel === "alto");
  const medios = gaps.filter(g => g.nivel === "medio");
  const oks = gaps.filter(g => g.nivel === "ok");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Motor de Inteligência SST</h2>
              <p className="text-xs text-gray-500">12 verificações automáticas · Detecção de gaps e incoerências · Score por módulo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {score !== null && (
              <div className={`text-center px-5 py-2 rounded-xl border ${score >= 80 ? "bg-green-50 border-green-300 text-green-700" : score >= 50 ? "bg-yellow-50 border-yellow-300 text-yellow-700" : "bg-red-50 border-red-300 text-red-700"}`}>
                <p className="text-3xl font-bold">{score}%</p>
                <p className="text-xs font-medium">Conformidade</p>
              </div>
            )}
            <Button
              onClick={rodarMotor}
              disabled={rodando}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              {rodando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {rodando ? "Analisando..." : rodouUmaVez ? "Re-analisar" : "Rodar Motor IA"}
            </Button>
          </div>
        </div>

        {!rodouUmaVez && !rodando && (
          <div className="mt-4 grid sm:grid-cols-3 gap-3 text-xs text-indigo-700">
            {[
              "🔴 Riscos sem exame no PCMSO",
              "🔴 Colaboradores sem ASO válido",
              "🔴 Programas SST vencidos",
              "🟡 ASOs vencendo em 30 dias",
              "🟡 Certificados de treinamento vencidos",
              "🟡 NRs obrigatórias sem cobertura",
              "🟡 CAs de EPIs vencidos/vencendo",
              "🟡 PCMSO sem médico coordenador",
              "🔴 Colaboradores com ASO Inapto",
              "🟡 EPIs sem registro de entrega",
              "🟡 Colaboradores sem função definida",
              "🟡 Documentos vencendo em 90 dias",
            ].map((item, i) => (
              <div key={i} className="bg-white/60 rounded-lg px-3 py-1.5">{item}</div>
            ))}
          </div>
        )}
      </div>

      {rodouUmaVez && (
        <>
          {/* Resumo por nível */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Críticos", count: criticos.length, cls: "bg-red-50 border-red-200 text-red-700" },
              { label: "Altos", count: altos.length, cls: "bg-orange-50 border-orange-200 text-orange-700" },
              { label: "Médios", count: medios.length, cls: "bg-yellow-50 border-yellow-200 text-yellow-700" },
              { label: "Conformes", count: oks.length, cls: "bg-green-50 border-green-200 text-green-700" },
            ].map(c => (
              <div key={c.label} className={`border rounded-xl p-4 text-center ${c.cls}`}>
                <p className="text-3xl font-bold">{c.count}</p>
                <p className="text-xs font-medium">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Gaps ordenados por criticidade */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Gaps identificados — clique para expandir
            </h3>
            {[...criticos, ...altos, ...medios, ...oks].map((gap, i) => (
              <GapItem key={i} gap={gap} />
            ))}
          </div>

          {oks.length === gaps.length && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">Empresa em plena conformidade!</p>
                <p className="text-xs text-green-600">Todas as 12 verificações passaram sem gaps identificados.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}