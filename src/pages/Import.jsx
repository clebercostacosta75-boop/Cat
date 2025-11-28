import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2, AlertCircle, Loader2, Brain, MessageSquare, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ImportPage() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [textInput, setTextInput] = useState("");
  const queryClient = useQueryClient();

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    e.target.value = null;
    setUploading(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      setCurrentStep("Enviando arquivo...");
      setProgress(20);
      
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      
      if (!uploadResult.file_url) {
        throw new Error('Erro ao enviar arquivo');
      }

      setCurrentStep("Processando dados...");
      setProgress(50);

      const response = await base44.functions.invoke('processarCronograma', { 
        file_url: uploadResult.file_url 
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setProgress(80);
      setCurrentStep("Atualizando...");
      
      await queryClient.invalidateQueries({ queryKey: ['instructors'] });
      await queryClient.invalidateQueries({ queryKey: ['courses'] });
      await queryClient.invalidateQueries({ queryKey: ['schedules'] });

      setProgress(100);
      setCurrentStep("Concluído!");
      
      setResult({
        instrutores: response.data.inseridos?.instrutores || 0,
        cursos: response.data.inseridos?.cursos || 0,
        cronogramas: response.data.inseridos?.cronogramas || 0
      });

    } catch (err) {
      console.error("Erro:", err);
      setError(err.message || "Erro ao processar. Verifique o arquivo e tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) {
      setError("Digite as informações dos treinamentos");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      setCurrentStep("Analisando texto...");
      setProgress(40);

      const response = await base44.functions.invoke('processarTexto', { 
        texto: textInput 
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setProgress(70);
      setCurrentStep("Atualizando...");
      
      await queryClient.invalidateQueries({ queryKey: ['instructors'] });
      await queryClient.invalidateQueries({ queryKey: ['courses'] });
      await queryClient.invalidateQueries({ queryKey: ['schedules'] });

      setProgress(100);
      setCurrentStep("Concluído!");
      
      setResult({
        instrutores: response.data.inseridos?.instrutores || 0,
        cursos: response.data.inseridos?.cursos || 0,
        cronogramas: response.data.inseridos?.cronogramas || 0
      });

      setTextInput("");

    } catch (err) {
      console.error("Erro:", err);
      setError(err.message || "Erro ao processar texto.");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Template</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #000000; padding: 8px; }
          th { 
            background-color: #10B981; 
            color: #FFFFFF; 
            font-weight: bold; 
            text-align: center;
            font-size: 12pt;
          }
          td { text-align: left; font-size: 11pt; }
          .numero { text-align: right; }
          .titulo { 
            background-color: #065F46; 
            color: #FFFFFF; 
            font-size: 14pt; 
            font-weight: bold; 
            text-align: center; 
          }
          .subtitulo { 
            background-color: #ECFDF5; 
            font-size: 10pt; 
            text-align: center; 
            color: #374151;
          }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="10" class="titulo">TEMPLATE DE IMPORTAÇÃO - CAT</td>
          </tr>
          <tr>
            <td colspan="10" class="subtitulo">Preencha os dados abaixo e importe o arquivo</td>
          </tr>
          <tr><td colspan="10"></td></tr>
          <tr>
            <th>Treinamento</th>
            <th>Instrutor</th>
            <th>Empresa</th>
            <th>Mês</th>
            <th>Data</th>
            <th>Horas</th>
            <th>Custo HP</th>
            <th>Valor</th>
            <th>Participantes</th>
            <th>Status</th>
          </tr>
          <tr>
            <td>NR-35</td>
            <td>João Silva</td>
            <td>ABC Ltda</td>
            <td>Jan/2025</td>
            <td>2025-01-15</td>
            <td class="numero">8</td>
            <td class="numero">800</td>
            <td class="numero">600</td>
            <td class="numero">20</td>
            <td>Planejado</td>
          </tr>
          <tr>
            <td>Excel</td>
            <td>Maria Santos</td>
            <td>XPTO SA</td>
            <td>Jan/2025</td>
            <td>2025-01-20</td>
            <td class="numero">4</td>
            <td class="numero">400</td>
            <td class="numero">350</td>
            <td class="numero">15</td>
            <td>Confirmado</td>
          </tr>
        </table>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_importacao.xls';
    link.click();
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Logo e Título */}
        <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
          <div className="flex-shrink-0">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png" 
              alt="CAT Logo" 
              className="h-24 w-auto"
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-stone-900">Importação Inteligente</h1>
            </div>
            <p className="text-stone-600">Envie planilha ou digite os dados</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <p className="font-semibold mb-2">✅ Sucesso!</p>
              {result.instrutores > 0 && <p>👤 {result.instrutores} instrutor(es)</p>}
              {result.cursos > 0 && <p>📚 {result.cursos} curso(s)</p>}
              {result.cronogramas > 0 && <p>📅 {result.cronogramas} treinamento(s)</p>}
              <div className="flex gap-2 mt-3">
                <Link to={createPageUrl("Dashboard")}>
                  <Button size="sm">Dashboard</Button>
                </Link>
                <Link to={createPageUrl("Schedule")}>
                  <Button size="sm" variant="outline">Cronograma</Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Escolha o método de importação</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="file">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file">
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar Planilha
                </TabsTrigger>
                <TabsTrigger value="text">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Digitar Texto
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4 mt-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                    id="file"
                  />
                  <label htmlFor="file" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-stone-400" />
                    <p className="font-semibold mb-1">Clique para selecionar</p>
                    <p className="text-sm text-stone-500">Excel ou CSV</p>
                  </label>
                </div>
                <Button variant="outline" onClick={downloadTemplate} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Exemplo
                </Button>
              </TabsContent>

              <TabsContent value="text" className="space-y-4 mt-4">
                <Textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Cole aqui os dados dos treinamentos...

Exemplo:
Treinamento de NR-35 com João Silva para ABC Ltda em 15/01/2025
Excel com Maria Santos para XPTO em 20/01/2025"
                  rows={10}
                  disabled={uploading}
                />
                <Button 
                  onClick={handleTextSubmit} 
                  disabled={uploading || !textInput.trim()}
                  className="w-full"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Processar
                </Button>
              </TabsContent>
            </Tabs>

            {uploading && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{currentStep}</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}