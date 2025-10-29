import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Users, Brain, Zap, TrendingUp, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ImportPage() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const queryClient = useQueryClient();

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    e.target.value = null;

    setUploading(true);
    setProgress(5);
    setError(null);
    setResult(null);
    setAiAnalysis(null);

    try {
      // Upload do arquivo
      setCurrentStep("Fazendo upload do arquivo...");
      setProgress(10);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Chamar a IA de processamento
      setCurrentStep("🤖 IA analisando e processando dados...");
      setProgress(20);

      const aiResult = await base44.functions.invoke('processarCronograma', { file_url });

      // Simular progresso enquanto processa
      const etapas = aiResult.etapas || [];
      const progressoStep = 60 / (etapas.length || 1);
      let currentProgress = 20;

      for (const etapa of etapas) {
        setCurrentStep(`${etapa.nome}...`);
        currentProgress += progressoStep;
        setProgress(Math.min(currentProgress, 80));
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setCurrentStep("Finalizando importação...");
      setProgress(95);
      
      // Invalidar queries para atualizar os dados
      await queryClient.invalidateQueries({ queryKey: ['instructors'] });
      await queryClient.invalidateQueries({ queryKey: ['courses'] });
      await queryClient.invalidateQueries({ queryKey: ['schedules'] });

      setProgress(100);
      setCurrentStep("Concluído!");
      
      setResult({
        instrutores: aiResult.inseridos?.instrutores || 0,
        cursos: aiResult.inseridos?.cursos || 0,
        cronogramas: aiResult.inseridos?.cronogramas || 0
      });

      setAiAnalysis(aiResult);

    } catch (err) {
      console.error("Erro na importação:", err);
      setError(err.message || "Erro ao processar arquivo. Verifique o formato e tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Criar template de exemplo
    const csvContent = `Nome do Treinamento,Instrutor,Empresa,Mês,Data,Horas,Custo Instrutor,Valor Padrão,Participantes,Status
Segurança do Trabalho,João Silva,Empresa A,Janeiro/2025,2025-01-15,8,800,600,20,Planejado
Excel Avançado,Maria Santos,Empresa B,Janeiro/2025,2025-01-20,4,400,350,15,Confirmado`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_cronograma.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-2 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-stone-900">CAT Assistant IA</h1>
              <p className="text-stone-600">Processamento inteligente com validação automática</p>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="border-none shadow-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert className="border-none shadow-lg bg-green-50 text-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold mb-2">✅ Importação concluída com sucesso!</p>
                {result.instrutores > 0 && <p>👤 {result.instrutores} instrutor(es) importado(s)</p>}
                {result.cursos > 0 && <p>📚 {result.cursos} curso(s) importado(s)</p>}
                {result.cronogramas > 0 && <p>📅 {result.cronogramas} treinamento(s) agendado(s)</p>}
                <div className="flex gap-2 mt-4">
                  <Link to={createPageUrl("Dashboard")}>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      Ver Dashboard
                    </Button>
                  </Link>
                  <Link to={createPageUrl("Schedule")}>
                    <Button size="sm" variant="outline">
                      Ver Cronograma
                    </Button>
                  </Link>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-none shadow-xl bg-gradient-to-br from-purple-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <Zap className="w-6 h-6 text-purple-600" />
              Upload Inteligente com IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-purple-300 rounded-xl p-12 text-center hover:border-purple-500 transition-colors bg-white">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-stone-900 mb-1">
                      Clique para fazer upload da planilha
                    </p>
                    <p className="text-sm text-stone-600">
                      Suporta: Excel (.xlsx, .xls) e CSV
                    </p>
                  </div>
                  {!uploading && (
                    <Button type="button" className="mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Selecionar Arquivo
                    </Button>
                  )}
                </div>
              </label>
            </div>

            <div className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={downloadTemplate}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Baixar Template de Exemplo
              </Button>
            </div>

            {uploading && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                  <span className="text-sm font-medium text-stone-700">{currentStep}</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-stone-500 text-center">{progress}% concluído</p>
              </div>
            )}

            <div className="bg-white rounded-lg p-6 space-y-4 shadow-md">
              <h3 className="font-semibold text-stone-900 mb-3 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                Inteligência Artificial Integrada
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100">
                  <CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-stone-900">Validação Inteligente</p>
                    <p className="text-sm text-stone-600">Detecta inconsistências, duplicatas e conflitos automaticamente</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                  <Zap className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-stone-900">Correção Automática</p>
                    <p className="text-sm text-stone-600">Corrige problemas de formatação, datas e status automaticamente</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-stone-900">Propostas de Melhoria</p>
                    <p className="text-sm text-stone-600">Sugere otimizações de custo e distribuição de carga</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                  <Users className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-stone-900">Inserção Inteligente</p>
                    <p className="text-sm text-stone-600">Evita duplicatas e insere apenas dados validados</p>
                  </div>
                </div>
              </div>
            </div>

            {aiAnalysis && (
              <div className="space-y-4">
                {/* Inconsistências Detectadas */}
                {aiAnalysis.inconsistencias && aiAnalysis.inconsistencias.length > 0 && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        Inconsistências Detectadas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {aiAnalysis.inconsistencias.slice(0, 5).map((inc, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <span className="font-semibold text-amber-700">{inc.severidade}:</span>
                            <span className="text-stone-700">{inc.descricao}</span>
                            {inc.auto_corrigivel && (
                              <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                ✓ Corrigido
                              </span>
                            )}
                          </div>
                        ))}
                        {aiAnalysis.inconsistencias.length > 5 && (
                          <p className="text-xs text-stone-500 mt-2">
                            + {aiAnalysis.inconsistencias.length - 5} outras inconsistências
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Propostas de Melhoria */}
                {aiAnalysis.propostas && aiAnalysis.propostas.length > 0 && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        Propostas de Melhoria
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {aiAnalysis.propostas.slice(0, 3).map((prop, idx) => (
                          <div key={idx} className="p-3 bg-white rounded-lg border border-blue-200">
                            <div className="flex items-start justify-between mb-1">
                              <p className="font-semibold text-stone-900">{prop.titulo}</p>
                              <span className={`text-xs px-2 py-1 rounded ${
                                prop.impacto === 'high' ? 'bg-red-100 text-red-700' :
                                prop.impacto === 'medium' ? 'bg-amber-100 text-amber-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {prop.impacto}
                              </span>
                            </div>
                            <p className="text-sm text-stone-600">{prop.descricao}</p>
                            {prop.economia_estimada && (
                              <p className="text-xs text-green-600 mt-1">
                                💰 Economia estimada: R$ {prop.economia_estimada.toLocaleString('pt-BR')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Estatísticas */}
                {aiAnalysis.estatisticas && (
                  <Card className="border-purple-200 bg-purple-50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                        Estatísticas do Processamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-2xl font-bold text-purple-600">
                            {aiAnalysis.estatisticas.total_processados}
                          </p>
                          <p className="text-xs text-stone-600">Total Processados</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-2xl font-bold text-green-600">
                            {aiAnalysis.estatisticas.validos}
                          </p>
                          <p className="text-xs text-stone-600">Válidos</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-2xl font-bold text-amber-600">
                            {aiAnalysis.estatisticas.correcoes_aplicadas}
                          </p>
                          <p className="text-xs text-stone-600">Correções</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-2xl font-bold text-red-600">
                            {aiAnalysis.estatisticas.invalidos}
                          </p>
                          <p className="text-xs text-stone-600">Inválidos</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}